import { useNavigate, useParams } from 'react-router-dom';
import { date, dateTime, money } from '../lib/format';

import { getRider } from '../api/admin';
import { useQuery } from '../api/useQuery';
import {
  Card,
  DetailList,
  Grid,
  humanState,
  PageHeader,
  Pill,
  StatTile,
  stateTone,
  Table,
} from '../components/ui';

/**
 * The rider support has on the phone: who they are, what they owe and where their last rides went.
 *
 * ponytail: read-only. Suspending a rider has no endpoint behind it, and a button that only wrote
 * a line to the screen told the operator something untrue.
 */
export function RiderDetailPage() {
  const { riderId = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(() => getRider(riderId), [riderId]);

  if (loading) {
    return <PageHeader title="Rider" subtitle="Loading..." />;
  }
  if (error || !data) {
    return <PageHeader title="Rider not found" subtitle={error ?? `No account ${riderId}`} />;
  }

  const { rider } = data;
  const name = [rider.firstName, rider.lastName].filter(Boolean).join(' ') || rider.email;

  return (
    <>
      <PageHeader
        title={name}
        subtitle={`${rider.riderId} · joined ${date(rider.joinedAt)}`}
      />

      <Grid columns={4}>
        <StatTile label="Status" value={humanState(rider.status)} tone={stateTone(rider.status)} />
        <StatTile label="Rides listed" value={data.recentRides.length} />
        <StatTile label="Points" value={data.pointsBalance} />
        <StatTile
          label="Outstanding dues"
          value={money(data.outstandingDuesMinor, data.currency)}
          tone={data.outstandingDuesMinor > 0 ? 'warning' : 'default'}
        />
      </Grid>

      <Grid columns={2}>
        <Card title="Profile">
          <DetailList
            items={[
              { label: 'Email', value: rider.email },
              { label: 'Phone', value: rider.phone ?? '--' },
              {
                label: 'Last signed in',
                value: rider.lastLoginAt ? dateTime(rider.lastLoginAt) : 'Never',
              },
              { label: 'Rider ID', value: <span className="mono">{rider.riderId}</span> },
              { label: 'User ID', value: <span className="mono">{rider.userId}</span> },
            ]}
          />
        </Card>

        <Card title="Dues">
          {data.outstandingDuesMinor > 0 ? (
            <p>
              This rider owes{' '}
              <strong>{money(data.outstandingDuesMinor, data.currency)}</strong> in unpaid
              cancellation fees. Booking is blocked until it is settled on their next ride.
            </p>
          ) : (
            <p className="cell-muted">Nothing outstanding.</p>
          )}
        </Card>
      </Grid>

      <Card title="Recent rides">
        <Table
          columns={[
            {
              key: 'rideId',
              header: 'Ride',
              render: (row) => <span className="mono">{row.rideId}</span>,
            },
            {
              key: 'route',
              header: 'Route',
              render: (row) => `${row.pickupAddress ?? 'Pickup'} → ${row.destinationAddress ?? 'Drop-off'}`,
            },
            {
              key: 'status',
              header: 'State',
              render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>,
            },
            {
              key: 'fare',
              header: 'Fare',
              align: 'right',
              render: (row) =>
                money(row.finalFareMinor ?? row.quotedFareMinor, row.currency),
            },
            {
              key: 'requestedAt',
              header: 'Requested',
              render: (row) => (
                <span className="cell-muted">{dateTime(row.requestedAt)}</span>
              ),
            },
          ]}
          rows={data.recentRides}
          empty="This rider has not booked anything yet."
          onRowClick={(row) => navigate(`/trips/${row.rideId}`)}
        />
      </Card>
    </>
  );
}
