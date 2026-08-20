import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ConfirmWithReason } from '../components/ConfirmWithReason';
import {
  Button,
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
import { PAYMENTS } from '../data/mock';

/**
 * FR-OPS-007. A refund creates a new record; nothing here edits a historical figure, because
 * docs/04 forbids changing what a past transaction meant. The ledger is the truth, and this screen
 * shows the events rather than a mutable balance.
 */
export function PaymentDetailPage() {
  const { paymentId } = useParams();
  const [refunding, setRefunding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const payment = PAYMENTS.find((candidate) => candidate.id === paymentId);
  if (!payment) {
    return <PageHeader title="Payment not found" subtitle={`No payment with ID ${paymentId}`} />;
  }

  const refundable = payment.state === 'SUCCEEDED';

  return (
    <>
      <PageHeader
        title={`Payment ${payment.id}`}
        subtitle={`${payment.amount} · ${payment.method} · ${payment.created}`}
        actions={
          <Button variant="danger" disabled={!refundable} onClick={() => setRefunding(true)}>
            Issue refund
          </Button>
        }
      />

      {notice ? (
        <Card>
          <strong>Refund recorded.</strong> <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Grid columns={4}>
        <StatTile label="State" value={humanState(payment.state)} tone={stateTone(payment.state)} />
        <StatTile label="Amount" value={payment.amount} />
        <StatTile label="Provider" value={payment.provider} />
        <StatTile label="Trip" value={payment.tripId} />
      </Grid>

      <Grid columns={2}>
        <Card title="Event ledger">
          {/* Immutable rows, never a balance field - a refund appends, it does not rewrite. */}
          <Timeline
            items={payment.events.map((event) => ({
              title: event.type,
              at: event.at,
              actor: event.detail,
              tone: event.type.includes('failed') ? 'danger' : 'success',
            }))}
          />
        </Card>

        <Card title="References">
          <DetailList
            items={[
              { label: 'Trip', value: <Link to={`/trips/${payment.tripId}`}>{payment.tripId}</Link> },
              { label: 'Rider', value: payment.rider },
              { label: 'Provider reference', value: <span className="mono">{payment.providerRef}</span> },
              { label: 'Idempotency key', value: <span className="mono">{payment.idempotencyKey}</span> },
              { label: 'Method', value: payment.method },
            ]}
          />
        </Card>
      </Grid>

      <Card title="Refunds">
        <Table
          columns={[
            { key: 'id', header: 'Refund', render: () => '—' },
            { key: 'amount', header: 'Amount', render: () => '—' },
          ]}
          rows={[]}
          empty="No refund has been issued against this payment."
        />
      </Card>

      {refunding ? (
        <ConfirmWithReason
          title={`Refund ${payment.amount} to ${payment.rider}?`}
          body="This creates a refund record against the original payment. The original transaction is never altered, and the provider is called with a fresh idempotency key."
          confirmLabel="Issue refund"
          danger
          presets={['Duplicate charge confirmed with the provider', 'Trip cancelled after capture', 'Fare dispute upheld, case reference below']}
          onCancel={() => setRefunding(false)}
          onConfirm={(reason) => {
            setRefunding(false);
            setNotice(`Audit entry written against ${payment.id}: “${reason}”`);
          }}
        />
      ) : null}
    </>
  );
}
