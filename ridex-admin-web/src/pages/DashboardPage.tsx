import { useNavigate } from 'react-router-dom';

import { useSession } from '../auth/session';
import {
  Card,
  Grid,
  humanState,
  PageHeader,
  Pill,
  StatTile,
  stateTone,
  Table,
} from '../components/ui';
import { formatMoney, getDashboard, listTrips, type AdminTrip } from '../api/admin';
import { useQuery } from '../api/useQuery';

/** FR-OPS-001. Answers "is the marketplace healthy right now", and every number links onward. */
export function DashboardPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { data: metrics, error } = useQuery(() => getDashboard(), []);

  // Dashes until the numbers arrive: a zero that is really "not loaded yet" is worse than a blank,
  // because an operator will act on it.
  const { data: latest } = useQuery(() => listTrips(undefined, 0), []);

  // Dashes until the numbers arrive: a zero that is really "not loaded yet" is worse than a blank,
  // because an operator will act on it.
  const value = (n: number | undefined) => (n === undefined ? '—' : String(n));
  const pendingApprovals = metrics?.driversAwaitingReview ?? 0;

  const byState = Object.entries(metrics?.ridesByStatus ?? {})
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        title={`Good evening, ${session?.email.split('@')[0] ?? 'there'}`}
        subtitle="Live marketplace health. Updated a few seconds ago."
      />

      {error ? <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p> : null}

      <Grid columns={4}>
        <StatTile label="Live trips" value={value(metrics?.ridesInProgress)} note="In flight right now" tone="primary" onClick={() => navigate('/trips')} />
        <StatTile label="Drivers on duty" value={value(metrics?.driversOnDuty)} note={`of ${value(metrics?.driversTotal)} registered`} onClick={() => navigate('/drivers')} />
        <StatTile label="Awaiting review" value={value(metrics?.driversAwaitingReview)} note="Driver applications" tone={pendingApprovals > 0 ? 'warning' : 'default'} onClick={() => navigate('/approvals')} />
        <StatTile label="Riders" value={value(metrics?.ridersTotal)} note="Registered accounts" onClick={() => navigate('/riders')} />
      </Grid>

      <Grid columns={4}>
        <StatTile label="Rides today" value={value(metrics?.ridesToday)} note="Requested since midnight UTC" />
        <StatTile label="Completed today" value={value(metrics?.ridesCompletedToday)} note="Finished trips" tone="success" />
        <StatTile
          label="Gross fares today"
          value={metrics ? formatMoney(metrics.grossFaresTodayMinor, metrics.currency) : '—'}
          note="Charged on completed trips"
          tone="success"
        />
        {/* Not wired: the platform fee needs the payments ledger (T12). Showing a mock number
            next to real ones is worse than showing none. */}
        <StatTile label="Platform fee today" value="—" note="Needs payments (T12)" />
      </Grid>

      <Grid columns={2}>
        <Card title="Rides by state">
          <Table
            columns={[
              { key: 'state', header: 'State', render: (row: { state: string; count: number }) => (
                <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill>
              ) },
              { key: 'count', header: 'Rides', align: 'right', render: (row) => (
                <span className="cell-strong">{row.count}</span>
              ) },
            ]}
            rows={byState}
            empty="No rides yet."
          />
        </Card>

        <Card title="Needs attention">
          <Table
            columns={[
              { key: 'what', header: 'Queue', render: (row: { what: string; count: string; to: string }) => row.what },
              { key: 'count', header: 'Waiting', align: 'right', render: (row) => (
                <span className="cell-strong">{row.count}</span>
              ) },
            ]}
            rows={[
              { what: 'Drivers awaiting approval', count: String(pendingApprovals), to: '/approvals' },
              // Dashes, not numbers: these queues need endpoints that do not exist, and an
              // invented count is one an operator would act on.
              { what: 'Urgent support cases', count: '—', to: '/cases' },
              { what: 'Failed payments to review', count: '—', to: '/payments' },
              { what: 'Failed payouts to retry', count: '—', to: '/payouts' },
            ]}
            onRowClick={(row) => navigate(row.to)}
          />
        </Card>
      </Grid>

      <Card title="Latest rides">
        <Table
          columns={[
            { key: 'rideId', header: 'Ride', render: (row: AdminTrip) => (
              <span className="mono">{row.rideId.slice(-8)}</span>
            ) },
            { key: 'rider', header: 'Rider', render: (row) => row.riderEmail },
            { key: 'driver', header: 'Driver', render: (row) => row.driverEmail ?? '—' },
            { key: 'state', header: 'State', render: (row) => (
              <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>
            ) },
            { key: 'fare', header: 'Fare', align: 'right', render: (row) =>
              formatMoney(row.finalFareMinor ?? row.quotedFareMinor, row.currency) },
            { key: 'requested', header: 'Requested', render: (row) => (
              <span className="cell-muted">{new Date(row.requestedAt).toLocaleString()}</span>
            ) },
          ]}
          rows={latest?.items.slice(0, 8) ?? []}
          onRowClick={(row) => navigate(`/trips/${row.rideId}`)}
          empty="No rides yet."
        />
      </Card>
    </>
  );
}
