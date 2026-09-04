import { useState } from 'react';

import { formatMoney, listPayments, type AdminPayment, type PaymentStatus } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';

const FILTERS: { label: string; value?: PaymentStatus }[] = [
  { label: 'All' },
  { label: 'Succeeded', value: 'SUCCEEDED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export function PaymentsPage() {
  const [status, setStatus] = useState<PaymentStatus | undefined>(undefined);
  const { data, loading, error } = useQuery(() => listPayments(status), [status]);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={data ? `${data.totalItems} charges` : loading ? 'Loading...' : ''}
      />

      <Card
        actions={
          <span style={{ display: 'inline-flex', gap: 8 }}>
            {FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className={status === filter.value ? 'chip chip-active' : 'chip'}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </span>
        }
      >
        <Table<AdminPayment>
          columns={[
            { key: 'id', header: 'Payment', render: (row) => (
              <span className="mono">{row.id.slice(-8)}</span>
            ) },
            { key: 'rider', header: 'Rider', render: (row) => row.riderEmail },
            { key: 'method', header: 'Method', render: (row) => (
              <Pill tone={row.method === 'CASH' ? 'warning' : 'info'}>{humanState(row.method)}</Pill>
            ) },
            { key: 'status', header: 'Status', render: (row) => (
              <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>
            ) },
            { key: 'gross', header: 'Fare', align: 'right', render: (row) =>
              formatMoney(row.grossAmountMinor, row.currency) },
            { key: 'discount', header: 'Discount', align: 'right', render: (row) =>
              // Funded by the platform, never by the driver: the driver is paid on the fare above.
              row.discountAmountMinor > 0
                ? `-${formatMoney(row.discountAmountMinor, row.currency)}`
                : '—' },
            { key: 'net', header: 'Charged', align: 'right', render: (row) => (
              <span className="cell-strong">{formatMoney(row.netAmountMinor, row.currency)}</span>
            ) },
            { key: 'when', header: 'When', render: (row) => (
              <span className="cell-muted">{new Date(row.createdAt).toLocaleString()}</span>
            ) },
          ]}
          rows={data?.items ?? []}
          empty={error ?? (loading ? 'Loading payments...' : 'No payments yet.')}
        />
      </Card>
    </>
  );
}
