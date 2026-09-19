import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_PAGE_SIZE, listSoldPasses, passOverview, type RoutePassSummary, type SoldPass } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, PageHeader, Pagination, Pill, Table } from '../components/ui';
import { date } from '../lib/format';

const rupees = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN')}`;

/**
 * Passes across all routes: which routes sell them, and every pass riders bought. A route's prices
 * are set on its own page, under Routes → the route → Passes.
 */
export function ShuttlePassesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const overview = useQuery(() => passOverview(), []);
  const sold = useQuery(() => listSoldPasses(page, size), [page, size]);

  return (
    <>
      <PageHeader title="Passes" subtitle="A pass covers every seat on one route for a month, a quarter, half a year or a year." />

      <Card title="Routes" actions={<span className="cell-muted">Click a route to set its pass prices.</span>}>
        <Table<RoutePassSummary>
          columns={[
            { key: 'route', header: 'Route', render: (row) => <span className="cell-strong">{row.routeName}</span> },
            {
              key: 'state',
              header: 'Passes',
              render: (row) =>
                row.onSale ? <Pill tone="success">On sale</Pill> : row.monthlyPriceMinor ? <Pill tone="muted">Not on sale</Pill> : <Pill tone="warning">Not priced yet</Pill>,
            },
            { key: 'monthly', header: 'Monthly', align: 'right', render: (row) => (row.monthlyPriceMinor ? rupees(row.monthlyPriceMinor) : '—') },
            { key: 'active', header: 'Riders holding one', align: 'right', render: (row) => row.activePasses },
          ]}
          rows={overview.data ?? []}
          onRowClick={(row) => navigate(`/shuttle/routes/${row.routeId}?tab=Passes`)}
          empty={overview.loading ? 'Loading...' : 'No routes yet.'}
        />
      </Card>

      <Card title="Passes sold">
        <Table<SoldPass>
          columns={[
            {
              key: 'rider',
              header: 'Rider',
              render: (row) => (
                <>
                  <div className="cell-strong">{row.riderName}</div>
                  <div className="cell-muted">{row.riderEmail}</div>
                </>
              ),
            },
            { key: 'route', header: 'Route', render: (row) => row.routeName },
            { key: 'plan', header: 'Plan', render: (row) => row.plan },
            { key: 'valid', header: 'Valid', render: (row) => `${date(row.startsOn)} – ${date(row.endsOn)}` },
            { key: 'rides', header: 'Seats booked', align: 'right', render: (row) => row.ridesUsed },
            { key: 'paid', header: 'Paid', align: 'right', render: (row) => rupees(row.pricePaidMinor) },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Pill tone={row.status === 'ACTIVE' ? 'success' : row.status === 'PENDING_PAYMENT' ? 'warning' : 'muted'}>
                  {row.status === 'PENDING_PAYMENT' ? 'Not paid' : row.status === 'ACTIVE' ? 'Active' : row.status === 'EXPIRED' ? 'Expired' : row.status}
                </Pill>
              ),
            },
          ]}
          rows={sold.data?.items ?? []}
          empty={sold.loading ? 'Loading...' : 'No passes sold yet.'}
        />
        {sold.data && sold.data.totalItems > size ? (
          <Pagination
            page={page}
            size={size}
            totalPages={sold.data.totalPages}
            totalItems={sold.data.totalItems}
            noun="passes"
            onPage={setPage}
            onSize={(next) => {
              setSize(next);
              setPage(0);
            }}
          />
        ) : null}
      </Card>
    </>
  );
}
