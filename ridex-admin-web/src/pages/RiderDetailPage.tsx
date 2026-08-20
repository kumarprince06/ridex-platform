import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useSession } from '../auth/session';
import { ConfirmWithReason } from '../components/ConfirmWithReason';
import {
  Button,
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
import { RIDERS, TRIPS } from '../data/mock';

export function RiderDetailPage() {
  const { riderId } = useParams();
  const navigate = useNavigate();
  const { can } = useSession();
  const [confirming, setConfirming] = useState<null | 'suspend'>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rider = RIDERS.find((candidate) => candidate.id === riderId);
  if (!rider) {
    return <PageHeader title="Rider not found" subtitle={`No account with ID ${riderId}`} />;
  }

  const trips = TRIPS.filter((trip) => trip.riderId === rider.id);

  return (
    <>
      <PageHeader
        title={rider.name}
        subtitle={`${rider.id} · joined ${rider.joined}`}
        actions={
          can('OPERATIONS') ? (
            <Button variant="danger" onClick={() => setConfirming('suspend')}>
              {rider.status === 'SUSPENDED' ? 'Reinstate rider' : 'Suspend rider'}
            </Button>
          ) : null
        }
      />

      {notice ? (
        <Card>
          <strong>Recorded.</strong> <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Grid columns={4}>
        <StatTile label="Status" value={humanState(rider.status)} tone={stateTone(rider.status)} />
        <StatTile label="Trips" value={rider.trips} />
        <StatTile label="Rating" value={rider.rating ? rider.rating.toFixed(2) : '—'} />
        <StatTile label="City" value={rider.city} />
      </Grid>

      <Grid columns={2}>
        <Card title="Profile">
          <DetailList
            items={[
              { label: 'Email', value: rider.email },
              { label: 'Phone', value: rider.phone },
              { label: 'Joined', value: rider.joined },
              { label: 'Rider ID', value: <span className="mono">{rider.id}</span> },
            ]}
          />
        </Card>

        <Card title="Payment methods">
          {/* Masked, always. A console that can show a full card number is a console that leaks one. */}
          <DetailList
            items={[
              { label: 'Default', value: 'Visa ••4242 · expires 04/29' },
              { label: 'Backup', value: 'RideX Wallet · $24.50' },
              { label: 'Full card number', value: <span className="cell-muted">Never stored or shown</span> },
            ]}
          />
        </Card>
      </Grid>

      <Card title="Trips">
        <Table
          columns={[
            { key: 'id', header: 'Trip', render: (row: (typeof trips)[number]) => <span className="mono">{row.id}</span> },
            { key: 'route', header: 'Route', render: (row) => `${row.pickup} → ${row.dropoff}` },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'gross', header: 'Fare', align: 'right', render: (row) => row.gross },
            { key: 'requested', header: 'Requested', render: (row) => <span className="cell-muted">{row.requested}</span> },
          ]}
          rows={trips}
          onRowClick={(row) => navigate(`/trips/${row.id}`)}
          empty="This rider has not taken a trip yet."
        />
      </Card>

      <Card title="Support cases">
        <p className="cell-muted">
          Open cases appear here with their resolution and any financial action taken.{' '}
          <Link to="/cases">Go to the case queue</Link>.
        </p>
      </Card>

      {confirming ? (
        <ConfirmWithReason
          title={rider.status === 'SUSPENDED' ? `Reinstate ${rider.name}?` : `Suspend ${rider.name}?`}
          body={
            rider.status === 'SUSPENDED'
              ? 'The rider will be able to request rides again immediately.'
              : 'The rider cannot request rides while suspended. Trips already in flight are unaffected.'
          }
          confirmLabel={rider.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
          danger={rider.status !== 'SUSPENDED'}
          presets={['Payment fraud investigation', 'Repeated no-shows', 'Safety report from a driver']}
          onCancel={() => setConfirming(null)}
          onConfirm={(reason) => {
            setConfirming(null);
            setNotice(`Audit entry written against ${rider.id}: “${reason}”`);
          }}
        />
      ) : null}
    </>
  );
}
