# RideX B2C — Use Cases

## UC-01 Rider registration
Actor: Rider
1. Enter registration data.
2. Verify identity/contact.
3. Account becomes usable.
4. Rider can request a ride.

## UC-02 Driver registration
Actor: Driver
1. Register.
2. Submit identity information.
3. Submit vehicle information.
4. Upload required documents.
5. Complete approval.
6. Driver becomes eligible for dispatch.

## UC-03 Request ride
1. Rider chooses pickup.
2. Rider chooses destination.
3. System validates route/location.
4. System estimates fare.
5. Rider confirms.
6. Ride enters REQUESTED state.

## UC-04 Dispatch
1. Dispatch finds eligible drivers.
2. Offers are sent according to dispatch policy.
3. Driver accepts.
4. Ride becomes ACCEPTED.
5. Rider receives driver details.

## UC-05 Complete ride
1. Driver arrives.
2. Driver starts trip.
3. Location/trip telemetry is recorded as required.
4. Driver completes trip.
5. Fare is finalized.
6. Payment is captured/settled.
7. Receipt is created.

## UC-06 Cancel ride
Cancellation may occur by rider, driver or system.
The platform must determine:
- who cancelled
- when
- cancellation reason
- whether a fee applies
- whether compensation applies

## UC-07 Payment failure
1. Payment attempt fails.
2. Payment record becomes FAILED.
3. Trip/payment state remains auditable.
4. Rider receives recovery options.

## UC-08 Driver payout
1. Completed trips contribute to driver earnings.
2. Platform fees/adjustments are calculated.
3. Settlement is generated.
4. Payout is initiated.
5. Provider result is reconciled.

## UC-09 Support case
1. Rider/driver opens case.
2. Case is categorized.
3. Support agent investigates.
4. Resolution is recorded.
5. Financial adjustment, if any, is separately audited.
