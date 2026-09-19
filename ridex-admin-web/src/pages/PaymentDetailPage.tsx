import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { dateTime, money } from '../lib/format';

import { getPayment, refundAsPoints } from '../api/admin';
import { FormDialog } from '../components/FormDialog';
import { useQuery } from '../api/useQuery';
import {
  Button,
  Card,
  DetailList,
  Grid,
  humanState,
  PageHeader,
  StatTile,
  stateTone,
  Timeline,
} from '../components/ui';

/** One payment: its amounts, the gateway's events, and refunds - paid to the rider as points. */
export function PaymentDetailPage() {
  const { paymentId = '' } = useParams();
  const { data, loading, error, refetch } = useQuery(() => getPayment(paymentId), [paymentId]);
  const [refunding, setRefunding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) {
    return <PageHeader title="Payment" subtitle="Loading..." />;
  }
  if (error || !data) {
    return <PageHeader title="Payment not found" subtitle={error ?? `No payment ${paymentId}`} />;
  }

  const { payment } = data;
  const amount = money(payment.netAmountMinor, payment.currency);

  return (
    <>
      <PageHeader
        title={`Payment ${payment.id}`}
        subtitle={`${amount} · ${payment.method} · ${dateTime(payment.createdAt)}`}
        actions={
          payment.status === 'SUCCEEDED' || payment.status === 'PARTIALLY_REFUNDED' ? (
            <Button variant="primary" onClick={() => setRefunding(true)}>
              Refund as points
            </Button>
          ) : undefined
        }
      />

      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      {refunding ? (
        <FormDialog
          title="Refund as points"
          body={`The rider gets the amount as RideX points (100 points = Rs 1) and a notification with your reason. At most ${amount} in total across refunds.`}
          submitLabel="Refund"
          fields={[
            { name: 'amount', label: 'Amount (₹)', type: 'number', initial: String(payment.netAmountMinor / 100) },
            { name: 'reason', label: 'Reason (the rider sees this)', placeholder: 'Driver skipped your stop' },
          ]}
          onCancel={() => setRefunding(false)}
          onSubmit={(values) => {
            setRefunding(false);
            refundAsPoints(payment.id, Math.round(Number(values.amount) * 100), values.reason)
              .then(() => {
                setNotice(`Refunded ₹${values.amount} as points.`);
                refetch();
              })
              .catch((caught) => setNotice(caught instanceof Error ? caught.message : 'Could not refund.'));
          }}
        />
      ) : null}

      <Grid columns={4}>
        <StatTile label="State" value={humanState(payment.status)} tone={stateTone(payment.status)} />
        <StatTile label="Net" value={amount} />
        <StatTile label="Gross" value={money(payment.grossAmountMinor, payment.currency)} />
        <StatTile label="Discount" value={money(payment.discountAmountMinor, payment.currency)} />
      </Grid>

      <Grid columns={2}>
        <Card title="Gateway events">
          {/* Immutable rows straight from the provider: what they sent, and when it arrived. */}
          {data.events.length ? (
            <Timeline
              items={data.events.map((event) => ({
                title: event.eventType,
                at: dateTime(event.receivedAt),
                actor: event.provider,
                tone: /fail|cancel/i.test(event.eventType) ? 'danger' : 'success',
              }))}
            />
          ) : (
            <p className="cell-muted">
              No gateway events. Cash payments never touch a provider, and an online payment that
              has not settled yet has nothing to show.
            </p>
          )}
        </Card>

        <Card title="References">
          <DetailList
            items={[
              {
                label: payment.tripId ? 'Trip' : 'Shuttle booking',
                value: payment.tripId ? (
                  <Link to={`/trips/${payment.tripId}`}>{payment.tripId}</Link>
                ) : (
                  <span className="mono">{payment.shuttleBookingId ?? '--'}</span>
                ),
              },
              { label: 'Rider', value: payment.riderEmail },
              { label: 'Provider', value: data.provider },
              {
                label: 'Provider reference',
                value: <span className="mono">{data.providerPaymentId ?? '--'}</span>,
              },
              { label: 'Method', value: payment.method },
              {
                label: 'Paid at',
                value: payment.paidAt ? dateTime(payment.paidAt) : 'Not yet',
              },
              ...(data.failureReason ? [{ label: 'Failure', value: data.failureReason }] : []),
            ]}
          />
        </Card>
      </Grid>
    </>
  );
}
