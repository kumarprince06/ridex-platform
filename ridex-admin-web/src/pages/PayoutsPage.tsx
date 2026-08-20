import { useState } from 'react';

import { ConfirmWithReason } from '../components/ConfirmWithReason';
import { Button, Card, humanState, PageHeader, Pill, StatTile, Grid, Table, stateTone } from '../components/ui';
import { Payout, PAYOUTS } from '../data/mock';

/** FR-OPS-006 and T13. Adjustments are new dated rows; nothing recalculates a historical figure. */
export function PayoutsPage() {
  const [retrying, setRetrying] = useState<Payout | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageHeader title="Payouts" subtitle="Weekly settlement to driver accounts" />

      {notice ? (
        <Card>
          <strong>Recorded.</strong> <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Grid columns={4}>
        <StatTile label="In transit" value="$864.10" note="1 payout" tone="warning" />
        <StatTile label="Failed" value="$412.55" note="1 payout needs action" tone="danger" />
        <StatTile label="Settled this month" value="$18,204.20" tone="success" />
        <StatTile label="Next run" value="Monday" note="09:00 UTC" />
      </Grid>

      <Card title="Payout batches">
        <Table<Payout>
          columns={[
            { key: 'id', header: 'Payout', render: (row) => <span className="mono">{row.id}</span> },
            { key: 'driver', header: 'Driver', render: (row) => row.driver },
            { key: 'period', header: 'Period', render: (row) => <span className="cell-muted">{row.period}</span> },
            { key: 'destination', header: 'Destination', render: (row) => row.destination },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="cell-strong">{row.amount}</span> },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (row) =>
                row.state === 'FAILED' ? (
                  <Button onClick={() => setRetrying(row)}>Retry</Button>
                ) : null,
            },
          ]}
          rows={PAYOUTS}
        />
      </Card>

      {retrying ? (
        <ConfirmWithReason
          title={`Retry payout ${retrying.id}?`}
          body={`${retrying.amount} to ${retrying.destination}. The retry uses the original idempotency key, so a transfer that actually succeeded will not be sent twice.`}
          confirmLabel="Retry payout"
          presets={['Bank returned the transfer, details since corrected', 'Provider outage during the original run']}
          onCancel={() => setRetrying(null)}
          onConfirm={(reason) => {
            setNotice(`Audit entry written against ${retrying.id}: “${reason}”`);
            setRetrying(null);
          }}
        />
      ) : null}
    </>
  );
}
