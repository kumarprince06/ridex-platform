package com.ridex.shuttle;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.notification.DeliveryChannel;
import com.ridex.notification.Notifier;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.payment.PaymentService;
import com.ridex.shared.money.Money;
import com.ridex.shared.util.OtpGenerator;
import com.ridex.shared.util.UlidGenerator;
import com.ridex.shuttle.domain.*;
import com.ridex.shuttle.dto.*;

import lombok.RequiredArgsConstructor;

/**
 * Shuttle booking: a chosen seat on a scheduled departure.
 *
 * <p>Seat inventory, not dispatch. Nobody is searching for a driver - the vehicle is already going,
 * and the only question is whether 4A is free.
 */
@Service
@RequiredArgsConstructor
public class ShuttleService {

    private final RouteRepository routeRepository;
    private final ShuttleScheduleRepository scheduleRepository;
    private final ShuttleTripRepository shuttleTripRepository;
    private final ShuttleBookingRepository bookingRepository;
    private final RouteFareRepository routeFareRepository;
    private final PassRepository passRepository;
    private final Notifier notifier;
    private final com.ridex.payment.OutstandingPayments outstandingPayments;
    private final RiderProfileRepository riderProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final ShuttleCrew shuttleCrew;
    private final com.ridex.payment.PaymentService paymentService;
    private final com.ridex.points.PointsService pointsService;

    /** How long a picked seat is held while the rider pays for it. */
    private static final java.time.Duration HOLD = java.time.Duration.ofMinutes(10);

    /**
     * Cancellation closes half an hour before the shuttle leaves, and what comes back is 80% of
     * the fare as points. The seat cannot be resold at that point - the vehicle is already on its
     * way to the first stop - so the fifth is what the empty seat costs the operator.
     */
    private static final java.time.Duration CANCEL_CUTOFF = java.time.Duration.ofMinutes(30);
    private static final java.math.BigDecimal REFUND_RATE = new java.math.BigDecimal("0.80");

    /**
     * The zone the timetable is written in. A departure time is a wall clock at a bus stop, so
     * reading 08:15 as UTC put every Kolkata departure on the app at 13:45.
     */
    @org.springframework.beans.factory.annotation.Value("${app.reporting.zone:Asia/Kolkata}")
    private String serviceZone;

    /**
     * The rider's route list, mapped inside the transaction.
     *
     * <p>It used to return entities and let the controller walk {@code route.getStops()}, which is
     * a lazy collection with no session by then - so this endpoint answered 500 for every caller.
     * Anything that touches a lazy association has to finish before the transaction does.
     */
    @Transactional(readOnly = true)
    public List<RouteResponse> routeResponses() {
        return routeRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(route -> new RouteResponse(
                        route.getId(), route.getCode(), route.getName(), route.getDescription(),
                        route.getStops().stream()
                                .map(stop -> new RouteResponse.StopResponse(
                                        stop.getId(), stop.getSequence(), stop.getName(),
                                        // Strings, not doubles: these are NUMERIC(9,6) and a
                                        // double round-trip is how a pin drifts a few metres.
                                        stop.getLatitude().toPlainString(),
                                        stop.getLongitude().toPlainString(),
                                        stop.getOffsetMinutes()))
                                .toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Route> routes() {
        return routeRepository.findByActiveTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<ShuttleSchedule> schedulesFor(String routeId) {
        return scheduleRepository.findByRouteIdAndActiveTrueOrderByDepartureTimeAsc(routeId);
    }

    /**
     * The seat picker, for the leg the rider is actually travelling.
     *
     * <p>Availability is per leg, not per departure. A seat sold from stop 1 to stop 2 is free
     * again from stop 2 onwards - treating it as gone for the whole run empties the far end of a
     * commuter route while telling people it is full.
     *
     * <p>With no leg given it falls back to the whole route, which is the honest answer to "what
     * is free on this bus" and the wrong one to show somebody booking two stops of it.
     */
    @Transactional
    public SeatMapResponse seatMap(String scheduleId, LocalDate serviceDate,
            String boardingStopId, String alightingStopId) {
        ShuttleTrip trip = departureFor(scheduleId, serviceDate);

        short fromSeq = 1;
        short toSeq = Short.MAX_VALUE;
        if (boardingStopId != null && alightingStopId != null) {
            RouteStop boarding = stopOn(trip, boardingStopId);
            RouteStop alighting = stopOn(trip, alightingStopId);
            if (boarding.getSequence() >= alighting.getSequence()) {
                throw new ValidationException("Choose a stop further along the route to get off at.");
            }
            fromSeq = boarding.getSequence();
            toSeq = alighting.getSequence();
        }

        Set<String> taken = Set.copyOf(
                bookingRepository.takenSeatsOverLeg(trip.getId(), fromSeq, toSeq));

        List<SeatMapResponse.SeatResponse> seats =
                SeatMap.labelsFor(trip.getSeatCapacity(), trip.getSeatsPerRow()).stream()
                .map(label -> new SeatMapResponse.SeatResponse(label, !taken.contains(label)))
                .toList();

        return new SeatMapResponse(
                trip.getId(),
                trip.getSchedule().getRoute().getName(),
                trip.getDepartsAt(),
                trip.getSeatCapacity(),
                trip.getSeatsPerRow(),
                SeatMap.aisleAfter(trip.getSeatsPerRow()),
                seats,
                // Counted off the seats being shown, not capacity minus bookings: a label that is
                // no longer on the vehicle would otherwise subtract from a total it is not in, and
                // the picker would show four free seats above a count of three.
                (int) seats.stream().filter(SeatMapResponse.SeatResponse::available).count());
    }

    /**
     * Books one seat.
     *
     * <p>A live pass covers the fare if the rider holds one for this route. Otherwise the published
     * stop-pair fare applies - fixed, because a commute somebody takes twice a day cannot surge.
     */
    @Transactional
    public ShuttleBookingResponse book(String riderUserId, BookSeatRequest request) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        // The same rule as an on-demand ride: settle the last fare before starting another
        // journey. A shuttle seat is a journey.
        outstandingPayments.requireNoneFor(rider.getId());

        LocalDate serviceDate = LocalDate.parse(request.serviceDate());
        ShuttleTrip trip = departureFor(request.scheduleId(), serviceDate);

        if (trip.getDepartsAt().isBefore(Instant.now())) {
            throw new ConflictException("That departure has already left.");
        }
        if (!SeatMap.isValid(request.seatLabel(), trip.getSeatCapacity(), trip.getSeatsPerRow())) {
            throw new ValidationException("There is no seat " + request.seatLabel() + " on this shuttle.");
        }

        RouteStop boarding = stopOn(trip, request.boardingStopId());
        RouteStop alighting = stopOn(trip, request.alightingStopId());
        if (boarding.getSequence() >= alighting.getSequence()) {
            // The route runs one way. Boarding after your destination is not a shorter trip.
            throw new ValidationException("Choose a stop further along the route to get off at.");
        }

        // One seat per rider per leg, which the database also enforces. Checked first because the
        // constraint violation below cannot tell the two rules apart, and told a rider trying to
        // book a second seat that the seat they picked was taken - which it was not.
        if (bookingRepository.hasLiveSeatOnLeg(trip.getId(), rider.getId(), boarding.getSequence())) {
            throw new ConflictException(
                    "You already have a seat on this departure from " + boarding.getName() + ".");
        }

        String routeId = trip.getSchedule().getRoute().getId();
        Pass pass = passRepository.findLive(rider.getId(), routeId, serviceDate).stream()
                .filter(candidate -> candidate.coversOn(serviceDate, routeId))
                .findFirst()
                .orElse(null);

        long published = pass != null ? 0 : fareBetween(routeId, boarding, alighting);
        long fare = published;
        String boardingCode = OtpGenerator.generate();

        ShuttleBooking booking = new ShuttleBooking();
        booking.setShuttleTrip(trip);
        booking.setRider(rider);
        booking.setSeatLabel(request.seatLabel());
        booking.setBoardingStopId(boarding.getId());
        booking.setAlightingStopId(alighting.getId());
        booking.setBoardingSeq(boarding.getSequence());
        booking.setAlightingSeq(alighting.getSequence());
        booking.setCurrency(currencyFor(routeId, boarding, alighting));
        // The published price. What is actually charged is this minus any points spent below.
        booking.setFareMinor(published);
        booking.setPassId(pass == null ? null : pass.getId());
        // One secret, shown as digits and encoded in a QR - the same rule as an on-demand pickup.
        booking.setBoardingCodeHash(passwordEncoder.encode(boardingCode));
        // Kept, so a ticket reopened from My Rides can still show the code and its QR. The hash
        // beside it is what the driver's scan is checked against.
        booking.setBoardingCode(boardingCode);

        try {
            bookingRepository.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            // The gist exclusion constraint is what actually decides this. Two riders tapping 4A
            // for overlapping legs at the same instant both pass an availability check; only one
            // survives the insert.
            throw new ConflictException("That seat has just been taken. Please pick another.");
        }

        if (pass != null) {
            // Counted up rather than down: a used count reconciles against the bookings.
            pass.setRidesUsed((short) (pass.getRidesUsed() + 1));
            passRepository.save(pass);
        }

        // Points, spent once the seat is actually held: the entry references this booking, and a
        // seat that lost the race for 4A must not have cost the rider their balance. Capped by the
        // fare inside the service - taking more than a fare can absorb spends them for nothing.
        int requested = request.redeemPoints() == null ? 0 : request.redeemPoints();
        if (requested > 0 && pass == null && published > 0) {
            int spent = pointsService.redeemOnSeat(rider.getUser().getId(), requested, published,
                    booking.getId());
            booking.setRedeemedPoints(spent);
            booking.setDiscountMinor(pointsService.valueOf(spent));
            fare = Math.max(0, published - booking.getDiscountMinor());
            bookingRepository.save(booking);
        }

        PaymentService.ShuttleCheckout checkout = null;
        if (fare > 0) {
            var method = request.methodOrDefault();
            java.util.Currency currency = java.util.Currency.getInstance(booking.getCurrency());
            // Gross and discount both go on the payment, not just the net: "why was I charged
            // this" is answered by the two numbers, and the admin payments table shows both.
            Money gross = Money.of(booking.getFareMinor(), currency);
            Money discount = Money.of(booking.getDiscountMinor(), currency);

            if (method == com.ridex.payment.domain.PaymentMethod.CASH) {
                // Nothing to authorise - the money changes hands at the door. The seat is confirmed
                // now, and the fare is settled when the driver checks the passenger in.
                booking.setPaymentStatus("CASH_DUE");
                bookingRepository.save(booking);
                paymentService.startShuttlePayment(booking.getId(), rider, gross, discount, method);
                confirmBooking(booking);
            } else {
                // An online seat is held, not confirmed, until the money arrives. The row is
                // already BOOKED so nobody else can take it - the constraints that stop a double
                // sale are scoped to that status - and the hold releases it if checkout is
                // abandoned.
                booking.setPaymentStatus("PENDING");
                booking.setHoldExpiresAt(Instant.now().plus(HOLD));
                bookingRepository.save(booking);
                checkout = paymentService.startShuttlePayment(booking.getId(), rider, gross,
                        discount, method);
            }
        } else {
            confirmBooking(booking);
        }

        return toResponse(booking, boarding, alighting, boardingCode, checkout);
    }

    @Transactional
    public void cancel(String riderUserId, String bookingId) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        ShuttleBooking booking = bookingRepository.findOwn(bookingId, rider.getId())
                .orElseThrow(() -> new NotFoundException("No such booking."));

        if (!"BOOKED".equals(booking.getStatus())) {
            throw new ConflictException("That booking is already cancelled.");
        }

        // Past the cutoff the seat cannot be sold to anybody else, so it is not cancellable at all
        // rather than cancellable for nothing - a refusal a rider can plan around beats a refund
        // of zero they only find out about afterwards.
        if (Instant.now().isAfter(cancellableUntil(booking))) {
            throw new ConflictException(
                    "Seats cannot be cancelled within 30 minutes of departure.");
        }

        long credit = creditIfCancelled(booking);

        booking.setStatus("CANCELLED");
        booking.setCancelledAt(Instant.now());
        if (credit > 0) {
            // Back as points, not to the card: the fare has already settled, and points are
            // instant where a gateway refund is a fee and three days.
            pointsService.creditCancelledShuttleSeat(rider.getUser().getId(), credit,
                    booking.getId());
            booking.setPaymentStatus("POINTS_CREDITED");
        } else {
            // Nothing was captured. The open order is closed so it stops counting as a fare owed.
            paymentService.voidShuttlePayment(booking.getId(), "Seat cancelled before payment");
        }
        bookingRepository.save(booking);

        // The seat goes back into the pool, and a pass ride is handed back with it.
        if (booking.getPassId() != null) {
            passRepository.findById(booking.getPassId()).ifPresent(pass -> {
                pass.setRidesUsed((short) Math.max(0, pass.getRidesUsed() - 1));
                passRepository.save(pass);
            });
        }
    }

    /**
     * The rider's shuttle seats, newest first.
     *
     * <p>Without this a booked seat existed only on the screen that booked it - the rider had no
     * way back to their own departure time or seat number, and no way to cancel it later.
     *
     * <p>No boarding code: only its hash is stored, on purpose. The code is shown once, at
     * booking, and a list that could reprint it would be a list worth stealing a phone for.
     */
    @Transactional(readOnly = true)
    public List<ShuttleBookingResponse> myBookings(String riderUserId) {
        return riderProfileRepository.findByUserId(riderUserId)
                .map(rider -> bookingRepository.findByRiderIdOrderByCreatedAtDesc(rider.getId())
                        .stream()
                        .map(booking -> toResponse(
                                booking,
                                stopOn(booking.getShuttleTrip(), booking.getBoardingStopId()),
                                stopOn(booking.getShuttleTrip(), booking.getAlightingStopId()),
                                null, null))
                        .toList())
                .orElse(List.of());
    }

    /**
     * Called when checkout closes. The gateway is asked; the app is not believed.
     *
     * <p>Idempotent: a rider who taps twice, or an app retrying on a flaky network, must not turn
     * one seat into two payments.
     */
    @Transactional
    public ShuttleBookingResponse confirmPayment(String riderUserId, String bookingId,
            String gatewayPaymentId) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        ShuttleBooking booking = bookingRepository.findOwn(bookingId, rider.getId())
                .orElseThrow(() -> new NotFoundException("No such booking."));

        var status = paymentService.confirmShuttlePayment(bookingId, gatewayPaymentId);
        if (status == com.ridex.payment.domain.PaymentStatus.SUCCEEDED) {
            confirmBooking(booking);
        }

        return toResponse(booking,
                stopOn(booking.getShuttleTrip(), booking.getBoardingStopId()),
                stopOn(booking.getShuttleTrip(), booking.getAlightingStopId()),
                null, null);
    }

    /**
     * The seat is paid for: lift the hold, tell the rider, send the invoice.
     *
     * <p>Also the webhook's landing point, for the rider who pays and closes the app before the
     * confirmation call is made - which is most of the reason webhooks exist.
     */
    @Transactional
    public void confirmBooking(ShuttleBooking booking) {
        if ("PAID".equals(booking.getPaymentStatus())) {
            return;
        }

        // A cash seat is confirmed but not paid for; that stays true until the driver collects.
        if (!"CASH_DUE".equals(booking.getPaymentStatus())) {
            booking.setPaymentStatus("PAID");
        }
        booking.setHoldExpiresAt(null);
        bookingRepository.save(booking);

        ShuttleTrip trip = booking.getShuttleTrip();
        notifier.enqueue(DeliveryChannel.PUSH, booking.getRider().getUser().getId(),
                "SHUTTLE_BOOKED", booking.getSeatLabel());
        emailInvoice(booking, trip,
                stopOn(trip, booking.getBoardingStopId()),
                stopOn(trip, booking.getAlightingStopId()),
                booking.getRider());
    }

    /**
     * Releases seats nobody paid for.
     *
     * <p>Without this an abandoned checkout holds a seat for ever and the departure sells out to
     * people who never paid. Cancelled rather than deleted: the attempt is part of the record.
     */
    @Scheduled(fixedDelayString = "${app.shuttle.hold-sweep-ms:60000}")
    @Transactional
    public void releaseExpiredHolds() {
        for (ShuttleBooking booking : bookingRepository.expiredHolds(Instant.now())) {
            booking.setStatus("CANCELLED");
            booking.setCancelledAt(Instant.now());
            booking.setPaymentStatus("EXPIRED");
            booking.setHoldExpiresAt(null);
            bookingRepository.save(booking);
            // The order is closed with the seat, or the rider is blocked from booking again by a
            // fare they were never charged.
            paymentService.voidShuttlePayment(booking.getId(), "Seat hold expired unpaid");
        }
    }

    /** The moment cancellation closes: half an hour before the shuttle leaves. */
    private static Instant cancellableUntil(ShuttleBooking booking) {
        return booking.getShuttleTrip().getDepartsAt().minus(CANCEL_CUTOFF);
    }

    /**
     * What would be credited back as points if the seat were cancelled right now.
     *
     * <p>Zero for cash (nothing was taken), for a pass (nothing was charged), and once the cutoff
     * has passed - at which point cancelling is refused outright.
     */
    private static long creditIfCancelled(ShuttleBooking booking) {
        if (!"PAID".equals(booking.getPaymentStatus())
                || booking.getPassId() != null
                || Instant.now().isAfter(cancellableUntil(booking))) {
            return 0;
        }
        // On what was actually charged: points already spent are not money, and crediting the
        // published fare would mint value out of a discount.
        return java.math.BigDecimal.valueOf(booking.getFareMinor() - booking.getDiscountMinor())
                .multiply(REFUND_RATE)
                .setScale(0, java.math.RoundingMode.DOWN)
                .longValue();
    }

    /**
     * Queues the invoice.
     *
     * <p>Flattened into the payload rather than looked up at send time: the dispatcher may run
     * after a mail outage, and an invoice has to say what was charged then, not what the fare
     * table says now. The same rows become the mail body and the attached PDF.
     */
    private void emailInvoice(ShuttleBooking booking, ShuttleTrip trip, RouteStop boarding,
            RouteStop alighting, RiderProfile rider) {
        String currency = booking.getCurrency();
        java.time.ZonedDateTime departs =
                trip.getDepartsAt().atZone(java.time.ZoneId.of(serviceZone));

        var payment = paymentService.shuttlePaymentSummary(booking.getId());
        boolean paid = "PAID".equals(booking.getPaymentStatus());
        String paymentStatus = booking.getPassId() != null ? "Covered by pass"
                : paid ? "Paid"
                : "CASH_DUE".equals(booking.getPaymentStatus()) ? "Pay on board"
                : "Unpaid";

        StringBuilder payload = new StringBuilder(booking.getId())
                .append('|').append(paymentStatus)
                .append('|').append(paid || booking.getPassId() != null)
                .append('\n')
                .append("Route|").append(trip.getSchedule().getRoute().getName()).append('\n')
                .append("Seat|").append(booking.getSeatLabel()).append('\n')
                .append("Get on at|").append(boarding.getName()).append('\n')
                .append("Get off at|").append(alighting.getName()).append('\n')
                .append("Departs|").append(departs.format(
                        java.time.format.DateTimeFormatter.ofPattern("EEE d MMM, HH:mm"))).append('\n');

        CrewResponse crew = shuttleCrew.of(trip.getDriverId(), trip.getVehicleId());
        if (crew != null) {
            payload.append("Driver|").append(crew.driverName()).append('\n')
                    .append("Vehicle|").append(crew.vehicle()).append(" (")
                    .append(crew.registrationNumber()).append(")\n");
        }

        if (payment != null) {
            payload.append("Paid with|")
                    .append(payment.method() == com.ridex.payment.domain.PaymentMethod.CASH
                            ? "Cash to the driver"
                            : payment.method() + " · " + payment.provider())
                    .append('\n');
            // The gateway's own id. Without it a disputed charge is an amount and a date.
            if (payment.reference() != null) {
                payload.append("Payment ID|").append(payment.reference()).append('\n');
            }
        }

        if (booking.getDiscountMinor() > 0) {
            payload.append("Fare|").append(money(booking.getFareMinor(), currency)).append('\n')
                    .append("Points (").append(booking.getRedeemedPoints()).append(")|-")
                    .append(money(booking.getDiscountMinor(), currency)).append('\n');
        }

        // A pass already paid for this seat. "Total INR 0.00" reads as a billing error, so the
        // invoice says what actually happened.
        payload.append("Total|").append(booking.getPassId() != null
                ? "Covered by your pass"
                : money(booking.getFareMinor() - booking.getDiscountMinor(), currency));

        notifier.enqueue(DeliveryChannel.EMAIL, rider.getUser().getEmail(),
                "SHUTTLE_INVOICE", payload.toString());
    }

    /** Minor units to a display string. The currency is on the booking, never assumed. */
    private static String money(long amountMinor, String currency) {
        return "%s %s".formatted(currency,
                java.math.BigDecimal.valueOf(amountMinor, 2).toPlainString());
    }

    /** Materialised on first use, so an unbooked route does not fill the table with empty days. */
    private ShuttleTrip departureFor(String scheduleId, LocalDate serviceDate) {
        ShuttleSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new NotFoundException("No such departure."));

        if (!schedule.runsOn(serviceDate.getDayOfWeek())) {
            throw new ValidationException("This shuttle does not run on that day.");
        }

        return shuttleTripRepository.findByScheduleIdAndServiceDate(scheduleId, serviceDate)
                .orElseGet(() -> createDeparture(schedule, serviceDate));
    }

    /**
     * Find-or-create, which is a race: two riders booking the first seat on a departure both find
     * nothing and both insert. uk_shuttle_trips_departure decides it, and the loser reads the row
     * the winner just wrote rather than failing a booking over bookkeeping.
     */
    private ShuttleTrip createDeparture(ShuttleSchedule schedule, LocalDate serviceDate) {
        shuttleTripRepository.insertIfAbsent(
                UlidGenerator.generateUlid(),
                schedule.getId(),
                serviceDate,
                serviceDate.atTime(schedule.getDepartureTime())
                        .atZone(java.time.ZoneId.of(serviceZone)).toInstant(),
                schedule.getSeatCapacity(),
                schedule.getSeatsPerRow(),
                // The timetable's regular crew, frozen onto this departure. A per-date swap is
                // set on the trip afterwards and does not reach back to the schedule.
                schedule.getDriverId(),
                schedule.getVehicleId());

        // Re-read rather than trusting the insert: whether this call created the row or found it
        // already there, the row is the same one and its id came from whoever won.
        return shuttleTripRepository.findByScheduleIdAndServiceDate(schedule.getId(), serviceDate)
                .orElseThrow(() -> new ConflictException("That departure could not be opened."));
    }

    private RouteStop stopOn(ShuttleTrip trip, String stopId) {
        return trip.getSchedule().getRoute().getStops().stream()
                .filter(stop -> stop.getId().equals(stopId))
                .findFirst()
                .orElseThrow(() -> new ValidationException("That stop is not on this route."));
    }

    private long fareBetween(String routeId, RouteStop from, RouteStop to) {
        return routeFareRepository
                .findByRouteIdAndFromStopIdAndToStopId(routeId, from.getId(), to.getId())
                .map(RouteFare::getFareMinor)
                .orElseThrow(() -> new ConflictException(
                        "No fare is published between those stops yet."));
    }

    private String currencyFor(String routeId, RouteStop from, RouteStop to) {
        return routeFareRepository
                .findByRouteIdAndFromStopIdAndToStopId(routeId, from.getId(), to.getId())
                .map(RouteFare::getCurrency)
                .orElse("INR");
    }

    private ShuttleBookingResponse toResponse(ShuttleBooking booking, RouteStop boarding,
            RouteStop alighting, String boardingCode, PaymentService.ShuttleCheckout fresh) {
        // Every unpaid seat carries its open order, not just the one just booked: a rider who
        // backed out of checkout reopens the ticket from their rides, and without the order id
        // there is nothing on that screen they can pay with.
        PaymentService.ShuttleCheckout checkout = fresh != null ? fresh
                : "PENDING".equals(booking.getPaymentStatus())
                        ? paymentService.checkoutFor(booking.getId())
                        : null;

        return new ShuttleBookingResponse(
                booking.getId(),
                booking.getShuttleTrip().getSchedule().getRoute().getName(),
                booking.getSeatLabel(),
                boarding.getName(),
                alighting.getName(),
                booking.getShuttleTrip().getDepartsAt(),
                booking.getCurrency(),
                booking.getFareMinor(),
                booking.getRedeemedPoints(),
                booking.getDiscountMinor(),
                booking.getPassId(),
                booking.getStatus(),
                // From the row, not the one-shot value: a ticket reopened later still has to show
                // the code and its QR, which is the whole point of keeping the ticket.
                booking.getBoardingCode() != null ? booking.getBoardingCode() : boardingCode,
                shuttleCrew.of(booking.getShuttleTrip().getDriverId(),
                        booking.getShuttleTrip().getVehicleId()),
                booking.getPaymentStatus(),
                cancellableUntil(booking),
                creditIfCancelled(booking),
                checkout == null ? null : new ShuttleBookingResponse.Checkout(
                        checkout.gatewayOrderId(), checkout.gatewayKeyId(),
                        checkout.amountMinor(), checkout.currency()));
    }
}
