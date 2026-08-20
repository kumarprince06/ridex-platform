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
import { CASES, DRIVERS, METRICS, TRIPS, TRIPS_BY_STATE } from '../data/mock';

/** FR-OPS-001. Answers "is the marketplace healthy right now", and every number links onward. */
export function DashboardPage() {
  const navigate = useNavigate();
  const { can, session } = useSession();
  const pendingApprovals = DRIVERS.filter((driver) => driver.onboarding === 'UNDER_REVIEW').length;

  return (
    <>
      <PageHeader
        title={`Good evening, ${session?.name.split(' ')[0]}`}
        subtitle="Live marketplace health. Updated a few seconds ago."
      />

      <Grid columns={4}>
        <StatTile label="Live trips" value={METRICS.liveTrips} note="In flight right now" tone="primary" onClick={() => navigate('/trips')} />
        <StatTile label="Drivers online" value={METRICS.driversOnline} note={`of ${METRICS.driversTotal} approved`} onClick={() => navigate('/drivers')} />
        <StatTile label="Unmatched 15m" value={METRICS.unmatched15m} note="Requests with no driver" tone={METRICS.unmatched15m > 3 ? 'warning' : 'default'} onClick={() => navigate('/trips')} />
        <StatTile label="Open cases" value={METRICS.openCases} note="Support queue" onClick={() => navigate(can('SUPPORT_CASE') ? '/cases' : '/')} />
      </Grid>

      <Grid columns={4}>
        <StatTile label="Cancellation rate" value={METRICS.cancellationRate} note="Last 24 hours" />
        <StatTile label="Payment failures" value={METRICS.paymentFailureRate} note="Last 24 hours" tone="warning" />
        <StatTile label="GMV today" value={METRICS.gmvToday} note="Gross rider fares" tone="success" />
        <StatTile label="Platform fee today" value={METRICS.feeToday} note="Before adjustments" tone="success" />
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
