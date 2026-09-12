import { Link, useParams } from 'react-router-dom';

import { formatMoney, getPayment } from '../api/admin';
import { useQuery } from '../api/useQuery';
import {
  Card,
  DetailList,
  Grid,
  humanState,
  PageHeader,
  StatTile,
  stateTone,
  Timeline,
} from '../components/ui';

/**
 * FR-OPS-007. Read-only on purpose: a refund creates a new record and needs the wallet work first
 * (docs/32), and a button that only wrote a notice to the screen was worse than no button.
 */
export function PaymentDetailPage() {
  const { paymentId = '' } = useParams();
  const { data, loading, error } = useQuery(() => getPayment(paymentId), [paymentId]);

  if (loading) {
    return <PageHeader title="Payment" subtitle="Loading..." />;
  }
  if (error || !data) {
    return <PageHeader title="Payment not found" subtitle={error ?? `No payment ${paymentId}`} />;
  }

  const { payment } = data;
  const amount = formatMoney(payment.netAmountMinor, payment.currency);

  return (
    <>
      <PageHeader
        title={`Payment ${payment.id}`}
        subtitle={`${amount} · ${payment.method} · ${new Date(payment.createdAt).toLocaleString()}`}
      />

      <Grid columns={4}>
        <StatTile label="State" value={humanState(payment.status)} tone={stateTone(payment.status)} />
        <StatTile label="Net" value={amount} />
        <StatTile label="Gross" value={formatMoney(payment.grossAmountMinor, payment.currency)} />
        <StatTile label="Discount" value={formatMoney(payment.discountAmountMinor, payment.currency)} />
      </Grid>

      <Grid columns={2}>
        <Card title="Gateway events">
          {/* Immutable rows straight from the provider: what they sent, and when it arrived. */}
          {data.events.length ? (
            <Timeline
              items={data.events.map((event) => ({
                title: event.eventType,
                at: new Date(event.receivedAt).toLocaleString(),
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
                value: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'Not yet',
              },
              ...(data.failureReason ? [{ label: 'Failure', value: data.failureReason }] : []),
            ]}
          />
        </Card>
      </Grid>
    </>
  );
}
