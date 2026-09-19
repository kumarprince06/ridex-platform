import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_PAGE_SIZE, listRoutes, type ShuttleRouteSummary } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Button, Card, PageHeader, Pagination, Pill, Table } from '../components/ui';

/** The routes the platform runs. Open one to edit it; building a new one is a guided flow. */
export function ShuttlePage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const { data, loading, error } = useQuery(() => listRoutes(page, size), [page, size]);

  return (
    <>
      <PageHeader
        title="Routes"
        subtitle={data ? `${data.totalItems} routes` : loading ? 'Loading...' : ''}
        actions={
          <Button variant="primary" onClick={() => navigate('/shuttle/routes/new')}>
            New route
          </Button>
        }
      />
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <Card>
        <Table<ShuttleRouteSummary>
          columns={[
            {
              key: 'name',
              header: 'Route',
              render: (row) => (
                <>
                  <div className="cell-strong">{row.name}</div>
                  <div className="cell-muted mono">{row.code}</div>
                </>
              ),
            },
            { key: 'stops', header: 'Stops', align: 'right', render: (row) => row.stopCount },
            { key: 'departures', header: 'Departures', align: 'right', render: (row) => row.activeDepartures },
            {
              key: 'ready',
              header: 'Setup',
              render: (row) =>
                row.stopCount < 2 ? (
                  <Pill tone="warning">Needs stops</Pill>
                ) : row.fareCount === 0 ? (
                  <Pill tone="warning">Needs fares</Pill>
                ) : row.activeDepartures === 0 ? (
                  <Pill tone="warning">Needs a timetable</Pill>
                ) : (
                  <Pill tone="success">Ready</Pill>
                ),
            },
            {
              key: 'state',
              header: 'Riders see it',
              render: (row) => <Pill tone={row.active ? 'success' : 'muted'}>{row.active ? 'Yes' : 'No'}</Pill>,
            },
          ]}
          rows={data?.items ?? []}
          onRowClick={(row) => navigate(`/shuttle/routes/${row.id}`)}
          empty={loading ? 'Loading...' : 'No routes yet. Create the first one.'}
        />
        {data && data.totalItems > size ? (
          <Pagination
            page={page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="routes"
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
