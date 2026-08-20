import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useSession } from '../auth/session';
import { ConfirmWithReason } from '../components/ConfirmWithReason';
import { Button, Card, DetailList, Grid, humanState, PageHeader, StatTile, stateTone, Timeline } from '../components/ui';
import { CASES } from '../data/mock';

export function CaseDetailPage() {
  const { caseId } = useParams();
  const { can } = useSession();
  const [resolving, setResolving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const item = CASES.find((candidate) => candidate.id === caseId);
  if (!item) {
    return <PageHeader title="Case not found" subtitle={`No case with ID ${caseId}`} />;
  }

  return (
    <>
      <PageHeader
        title={item.subject}
        subtitle={`${item.id} · opened ${item.opened}`}
        actions={
          item.state !== 'RESOLVED' ? <Button variant="primary" onClick={() => setResolving(true)}>Resolve case</Button> : null
        }
      />

      {notice ? (
        <Card>
          <strong>Recorded.</strong> <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Grid columns={4}>
        <StatTile label="State" value={humanState(item.state)} tone={stateTone(item.state)} />
        <StatTile label="Priority" value={item.priority} tone={item.priority === 'Urgent' ? 'danger' : 'default'} />
        <StatTile label="Age" value={`${item.ageHours}h`} tone={item.ageHours > 24 ? 'warning' : 'default'} />
        <StatTile label="Assignee" value={item.assignee} />
      </Grid>

      <Grid columns={2}>
        <Card title="Case">
          <DetailList
            items={[
              { label: 'Category', value: item.category },
              { label: 'Reported by', value: item.reporter },
              { label: 'Trip', value: <Link to={`/trips/${item.tripId}`}>{item.tripId}</Link> },
              { label: 'Opened', value: item.opened },
            ]}
          />
        </Card>

        <Card title="Activity">
          <Timeline
            items={[
              { title: 'Case opened', at: item.opened, actor: item.reporter, tone: 'info' },
              { title: 'Assigned', at: '+ 12 min', actor: item.assignee, tone: 'info' },
              ...(item.state === 'RESOLVED'
                ? [{ title: 'Resolved with refund', at: '+ 3h 40m', actor: 'Aisha Bello', tone: 'success' as const }]
                : []),
            ]}
          />
        </Card>
      </Grid>

      <Card title="Financial action">
        {/* Support raises the case; finance releases the money. One person doing both is the
            single most common internal-fraud pattern in a marketplace. */}
        {can('FINANCE') ? (
          <p>
            Refunds and adjustments are issued from the payment behind the trip.{' '}
            <Link to="/payments">Open payments</Link>.
          </p>
        ) : (
          <p className="cell-muted">
            Your role can record the case and its outcome, but not move money. Escalate to finance
            with the trip and payment reference above.
          </p>
        )}
      </Card>

      {resolving ? (
        <ConfirmWithReason
          title={`Resolve ${item.id}?`}
          body="The resolution is shown to the reporter and stays attached to the trip."
          confirmLabel="Resolve case"
          presets={['Fare recalculated and explained to the rider', 'No fault found, evidence reviewed', 'Escalated to finance for a refund']}
          onCancel={() => setResolving(false)}
          onConfirm={(reason) => {
            setResolving(false);
            setNotice(`Audit entry written against ${item.id}: “${reason}”`);
          }}
        />
      ) : null}
    </>
  );
}
