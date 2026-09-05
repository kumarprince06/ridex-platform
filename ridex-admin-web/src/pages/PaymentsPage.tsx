import { useState } from 'react';

import { DEFAULT_PAGE_SIZE, formatMoney, listPayments, type AdminPayment, type PaymentStatus } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, FilterTabs, humanState, PageHeader, Pagination, Pill, Table, stateTone } from '../components/ui';

// 'ALL' is the sentinel for "no filter": a tab strip needs every choice to be a value,
// while the API takes an absent status rather than a magic one.
const FILTERS = ['ALL', 'SUCCEEDED', 'PROCESSING', 'FAILED', 'REFUNDED'] as const;
type Filter = (typeof FILTERS)[number];

export function PaymentsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const status = filter === 'ALL' ? undefined : (filter as PaymentStatus);
  const { data, loading, error } = useQuery(() => listPayments(status, page, size), [status, page, size]);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={data ? `${data.totalItems} charges` : loading ? 'Loading...' : ''}
      />

      <Card
        actions={
          <FilterTabs
            options={FILTERS}
            value={filter}
            onChange={(next) => {
              setFilter(next);
              // Narrowing the list invalidates the page number it was on.
              setPage(0);
            }}
          />
        }
      >
        <Table<AdminPayment>
          columns={[
            { key: 'id', header: 'Payment', render: (row) => (
              <span className="mono">{row.id.slice(-8)}</span>
            ) },
            { key: 'rider', header: 'Rider', render: (row) => row.riderEmail },
            // A payment now has two possible subjects, and "which one" is the first thing
            // somebody looking at a charge needs to know.
            { key: 'for', header: 'For', render: (row) => (
              <Pill tone={row.tripId ? 'info' : 'muted'}>
                {row.tripId ? 'Ride' : 'Shuttle seat'}
              </Pill>
            ) },
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

        {data ? (
          <Pagination
            page={data.page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="payments"
            onPage={setPage}
            onSize={(next) => {
              // Row 30 at ten per page is not row 30 at fifty; the old page number means nothing.
              setSize(next);
              setPage(0);
            }}
          />
        ) : null}
      </Card>
    </>
  );
}
