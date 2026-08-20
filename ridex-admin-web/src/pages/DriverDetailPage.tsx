import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
import { DRIVERS, TRIPS } from '../data/mock';

export function DriverDetailPage() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const { can } = useSession();
  const [confirming, setConfirming] = useState<'suspend' | 'reinstate' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const driver = DRIVERS.find((candidate) => candidate.id === driverId);
  if (!driver) {
    return <PageHeader title="Driver not found" subtitle={`No account with ID ${driverId}`} />;
  }

  const trips = TRIPS.filter((trip) => trip.driverId === driver.id);
  const suspended = driver.onboarding === 'SUSPENDED';

  return (
    <>
      <PageHeader
        title={driver.name}
        subtitle={`${driver.id} · submitted ${driver.submitted}`}
        actions={
          can('OPERATIONS') ? (
            <Button variant={suspended ? 'primary' : 'danger'} onClick={() => setConfirming(suspended ? 'reinstate' : 'suspend')}>
              {suspended ? 'Reinstate driver' : 'Suspend driver'}
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
        <StatTile label="Onboarding" value={humanState(driver.onboarding)} tone={stateTone(driver.onboarding)} />
        <StatTile label="Rating" value={driver.rating ? driver.rating.toFixed(2) : '—'} />
        <StatTile label="Acceptance" value={driver.acceptance} />
        <StatTile label="Cancellation" value={driver.cancellation} tone={driver.cancellation === '11%' ? 'warning' : 'default'} />
      </Grid>

      <Grid columns={2}>
        <Card title="Profile">
          <DetailList
            items={[
              { label: 'Email', value: driver.email },
              { label: 'Phone', value: driver.phone },
              { label: 'City', value: driver.city },
              { label: 'Trips completed', value: driver.trips },
            ]}
          />
        </Card>

        <Card title="Vehicle">
          <DetailList
            items={[
              { label: 'Vehicle', value: driver.vehicle },
              { label: 'Plate', value: <span className="mono">{driver.plate}</span> },
              { label: 'Duty', value: <Pill tone={driver.online ? 'success' : 'default'}>{driver.online ? 'Online' : 'Offline'}</Pill> },
            ]}
          />
        </Card>
      </Grid>

      <Card title="Documents" actions={can('OPERATIONS') ? <Button onClick={() => navigate('/approvals')}>Open approval queue</Button> : null}>
        <Table
          columns={[
            { key: 'type', header: 'Document', render: (row: (typeof driver.documents)[number]) => row.type },
            { key: 'detail', header: 'Detail', render: (row) => <span className="cell-muted">{row.detail}</span> },
            { key: 'status', header: 'Status', render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill> },
          ]}
          rows={driver.documents}
        />
      </Card>

      <Card title="Trips">
        <Table
          columns={[
            { key: 'id', header: 'Trip', render: (row: (typeof trips)[number]) => <span className="mono">{row.id}</span> },
            { key: 'route', header: 'Route', render: (row) => `${row.pickup} → ${row.dropoff}` },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'net', header: 'Driver net', align: 'right', render: (row) => row.net },
          ]}
          rows={trips}
          onRowClick={(row) => navigate(`/trips/${row.id}`)}
          empty="No trips yet."
        />
      </Card>

      {confirming ? (
        <ConfirmWithReason
          title={suspended ? `Reinstate ${driver.name}?` : `Suspend ${driver.name}?`}
          body={
            suspended
              ? 'The driver can go online and receive offers again as soon as this is saved.'
              : 'The driver stops receiving offers immediately. Earnings and payouts already accrued are unaffected.'
          }
          confirmLabel={suspended ? 'Reinstate' : 'Suspend'}
          danger={!suspended}
          presets={['Safety report under investigation', 'Document expired', 'Cancellation rate above policy']}
          onCancel={() => setConfirming(null)}
          onConfirm={(reason) => {
            setConfirming(null);
            setNotice(`Audit entry written against ${driver.id}: “${reason}”`);
          }}
        />
      ) : null}
    </>
  );
}
