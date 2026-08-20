import { Link, useParams } from 'react-router-dom';

import { useSession } from '../auth/session';
import {
  Card,
  DetailList,
  Grid,
  humanState,
  PageHeader,
  Pill,
  StatTile,
  stateTone,
  Timeline,
} from '../components/ui';
import { TRIPS } from '../data/mock';

/**
 * FR-OPS-004. The screen a dispute is settled on, so it shows who did what and when - the state
 * machine from docs/11 with an actor and a timestamp per transition, not just where the trip ended.
 */
export function TripDetailPage() {
  const { tripId } = useParams();
  const { can } = useSession();

  const trip = TRIPS.find((candidate) => candidate.id === tripId);
  if (!trip) {
    return <PageHeader title="Trip not found" subtitle={`No trip with ID ${tripId}`} />;
  }

  return (
    <>
      <PageHeader
        title={`Trip ${trip.id}`}
        subtitle={`${trip.pickup} → ${trip.dropoff} · requested ${trip.requested}`}
      />

      <Grid columns={4}>
        <StatTile label="State" value={humanState(trip.state)} tone={stateTone(trip.state)} />
        <StatTile label="Payment" value={humanState(trip.payment)} tone={stateTone(trip.payment)} />
        <StatTile label="Gross fare" value={trip.gross} />
        <StatTile label="Driver net" value={trip.net} tone="success" />
      </Grid>

      <Grid columns={2}>
        <Card title="Timeline">
          {/* Actor per transition: "who cancelled" is the first question in every dispute. */}
          <Timeline
            items={trip.timeline.map((event) => ({
              title: humanState(event.state),
              at: event.at,
              actor: event.actor,
              tone: stateTone(event.state),
            }))}
          />
        </Card>

        <div>
          <Card title="Participants">
            <DetailList
              items={[
                { label: 'Rider', value: <Link to={`/riders/${trip.riderId}`}>{trip.rider}</Link> },
                { label: 'Driver', value: trip.driverId ? <Link to={`/drivers/${trip.driverId}`}>{trip.driver}</Link> : '—' },
                { label: 'Ride type', value: trip.tier },
                { label: 'Distance', value: trip.distance },
                { label: 'Duration', value: trip.duration },
              ]}
            />
          </Card>

          <Card title="Fare breakdown">
            {/* Split, never blended: docs/04 requires gross, fee and net to stay distinguishable. */}
            <DetailList
              items={[
                { label: 'Gross fare', value: trip.gross },
                { label: 'Platform fee', value: trip.fee },
                { label: 'Driver net', value: <strong>{trip.net}</strong> },
                {
                  label: 'Payment',
                  value: can('FINANCE') ? (
                    <Link to={`/payments/${trip.paymentId}`}>
                      {trip.paymentId} · {humanState(trip.payment)}
                    </Link>
                  ) : (
                    <Pill tone={stateTone(trip.payment)}>{humanState(trip.payment)}</Pill>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </Grid>
    </>
  );
}
