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
import { formatMoney, getDashboard } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { CASES, TRIPS, TRIPS_BY_STATE } from '../data/mock';

/** FR-OPS-001. Answers "is the marketplace healthy right now", and every number links onward. */
export function DashboardPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { data: metrics, error } = useQuery(() => getDashboard(), []);

  // Dashes until the numbers arrive: a zero that is really "not loaded yet" is worse than a blank,
  // because an operator will act on it.
  const value = (n: number | undefined) => (n === undefined ? '—' : String(n));
  const pendingApprovals = metrics?.driversAwaitingReview ?? 0;

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
        <Card title="Trips by state">
          <Table
            columns={[
              { key: 'state', header: 'State', render: (row: (typeof TRIPS_BY_STATE)[number]) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
              { key: 'count', header: 'Trips', align: 'right', render: (row) => <span className="cell-strong">{row.count}</span> },
            ]}
            rows={TRIPS_BY_STATE}
          />
        </Card>

        <Card title="Needs attention">
          <Table
            columns={[
              { key: 'what', header: 'Queue', render: (row: { what: string; count: number; to: string }) => row.what },
              { key: 'count', header: 'Waiting', align: 'right', render: (row) => <span className="cell-strong">{row.count}</span> },
            ]}
            rows={[
              { what: 'Drivers awaiting approval', count: pendingApprovals, to: '/approvals' },
              { what: 'Urgent support cases', count: CASES.filter((c) => c.priority === 'Urgent' && c.state !== 'RESOLVED').length, to: '/cases' },
              { what: 'Failed payments to review', count: 1, to: '/payments' },
              { what: 'Failed payouts to retry', count: 1, to: '/payouts' },
            ]}
            onRowClick={(row) => navigate(row.to)}
          />
        </Card>
      </Grid>

      <Card title="Latest trips">
        <Table
          columns={[
            { key: 'id', header: 'Trip', render: (row: (typeof TRIPS)[number]) => <span className="mono">{row.id}</span> },
            { key: 'rider', header: 'Rider', render: (row) => row.rider },
            { key: 'driver', header: 'Driver', render: (row) => row.driver },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'gross', header: 'Fare', align: 'right', render: (row) => row.gross },
            { key: 'requested', header: 'Requested', render: (row) => <span className="cell-muted">{row.requested}</span> },
          ]}
          rows={TRIPS}
          onRowClick={(row) => navigate(`/trips/${row.id}`)}
        />
      </Card>
    </>
  );
}
