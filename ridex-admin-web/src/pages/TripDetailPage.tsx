import { useParams } from 'react-router-dom';
import { dateTime, money } from '../lib/format';

import { getTrip, type FareLine } from '../api/admin';
import { useQuery } from '../api/useQuery';
import {
  Card,
  DetailList,
  Grid,
  humanState,
  PageHeader,
  StatTile,
  stateTone,
  Table,
  Timeline,
} from '../components/ui';

/**
 * FR-OPS-004. The screen a dispute is settled on, so it shows who did what and when - the state
 * machine from docs/11 with an actor and a timestamp per transition, not just where the ride ended.
 */
export function TripDetailPage() {
  const { tripId = '' } = useParams();
  const { data, loading, error } = useQuery(() => getTrip(tripId), [tripId]);

  if (loading) {
    return <PageHeader title="Trip" subtitle="Loading..." />;
  }
  if (error || !data) {
    return <PageHeader title="Trip not found" subtitle={error ?? `No ride ${tripId}`} />;
  }

  const { trip } = data;
  const km = (metres: number | null) => (metres == null ? '--' : `${(metres / 1000).toFixed(1)} km`);

  return (
    <>
      <PageHeader
        title={`Trip ${trip.rideId}`}
        subtitle={`${trip.pickupAddress ?? 'Pickup'} → ${trip.destinationAddress ?? 'Drop-off'} · requested ${dateTime(trip.requestedAt)}`}
      />

      <Grid columns={4}>
        <StatTile label="State" value={humanState(trip.status)} tone={stateTone(trip.status)} />
        <StatTile label="Quoted" value={money(trip.quotedFareMinor, trip.currency)} />
        <StatTile
          label="Charged"
          value={trip.finalFareMinor == null ? '--' : money(trip.finalFareMinor, trip.currency)}
          tone="success"
        />
        <StatTile label="Distance driven" value={km(data.actualDistanceMeters)} />
      </Grid>

      <Grid columns={2}>
        <Card title="Timeline">
          {/* Actor per transition: "who cancelled" is the first question in every dispute. */}
          {data.timeline.length ? (
            <Timeline
              items={data.timeline.map((event) => ({
                title: humanState(event.toStatus),
                at: dateTime(event.occurredAt),
                actor: event.reason ? `${event.actorType} · ${event.reason}` : event.actorType,
                tone: stateTone(event.toStatus),
              }))}
            />
          ) : (
            <p className="cell-muted">
              Nothing recorded yet. A ride gets a timeline once a driver is assigned.
            </p>
          )}
        </Card>

        <div>
          <Card title="Participants">
            <DetailList
              items={[
                { label: 'Rider', value: trip.riderEmail },
                { label: 'Driver', value: trip.driverEmail ?? 'Not assigned' },
                { label: 'Ride type', value: trip.rideTypeCode },
                { label: 'Quoted distance', value: km(data.quotedDistanceMeters) },
                {
                  label: 'Waiting at pickup',
                  value: `${Math.round(data.waitingSeconds / 60)} min`,
                },
                ...(data.cancellationReason
                  ? [{ label: 'Cancellation reason', value: data.cancellationReason }]
                  : []),
              ]}
            />
          </Card>

          <Card title="Fare: quoted against charged">
            {/* Both sides in the same shape, because "why is this different" is the whole question. */}
            <Table
              columns={[
                { key: 'label', header: 'Line', render: (row: Row) => row.label },
                {
                  key: 'quoted',
                  header: 'Quoted',
                  align: 'right',
                  render: (row: Row) => amount(row.quoted, trip.currency),
                },
                {
                  key: 'charged',
                  header: 'Charged',
                  align: 'right',
                  render: (row: Row) => amount(row.charged, trip.currency),
                },
              ]}
              rows={merge(data.quotedLines, data.chargedLines)}
              empty="No fare lines on this ride."
            />
          </Card>
        </div>
      </Grid>
    </>
  );
}

type Row = { label: string; quoted: number | null; charged: number | null };

/** A line the other side does not have reads as absent, not as zero. */
function amount(amountMinor: number | null, currency: string) {
  return amountMinor == null ? <span className="cell-muted">--</span> : money(amountMinor, currency);
}

/**
 * One row per line type, so the two columns line up instead of being compared by eye.
 *
 * A quote-only line (the ride was never driven) and a charge-only line (waiting time nobody
 * quoted) both have to survive, which is why this is a union of the two key sets rather than a
 * walk down either one.
 */
function merge(quoted: FareLine[], charged: FareLine[]): Row[] {
  const byType = (lines: FareLine[]) => new Map(lines.map((line) => [line.type, line]));
  const quotedByType = byType(quoted);
  const chargedByType = byType(charged);

  return [...new Set([...quotedByType.keys(), ...chargedByType.keys()])].map((type) => ({
    label: (quotedByType.get(type) ?? chargedByType.get(type))!.label,
    quoted: quotedByType.get(type)?.amountMinor ?? null,
    charged: chargedByType.get(type)?.amountMinor ?? null,
  }));
}
