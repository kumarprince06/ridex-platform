import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, FilterTabs, humanState, PageHeader, Pill, SearchInput, Table, stateTone } from '../components/ui';
import { Trip, TRIPS } from '../data/mock';

const FILTERS = ['ALL', 'SEARCHING', 'TRIP_STARTED', 'COMPLETED', 'CANCELLED_BY_DRIVER'] as const;

/** FR-OPS-004. */
export function TripsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  const needle = query.trim().toLowerCase();
  const rows = TRIPS.filter((trip) => {
    const matchesFilter = filter === 'ALL' || trip.state === filter;
    const matchesQuery =
      !needle ||
      [trip.id, trip.rider, trip.driver, trip.pickup, trip.dropoff].some((field) =>
        field.toLowerCase().includes(needle),
      );
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      <PageHeader title="Trips" subtitle="Every ride request, whatever state it ended in" />

      <Card actions={<SearchInput value={query} onChange={setQuery} placeholder="Trip ID, rider, driver or place" />}>
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
          <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <Table<Trip>
          columns={[
            { key: 'id', header: 'Trip', render: (row) => <span className="mono">{row.id}</span> },
            { key: 'route', header: 'Route', render: (row) => (
              <>
                <div>{row.pickup}</div>
                <div className="cell-muted">→ {row.dropoff}</div>
              </>
            ) },
            { key: 'people', header: 'Rider / driver', render: (row) => (
              <>
                <div>{row.rider}</div>
                <div className="cell-muted">{row.driver || 'Unassigned'}</div>
              </>
            ) },
            { key: 'state', header: 'State', render: (row) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'payment', header: 'Payment', render: (row) => <Pill tone={stateTone(row.payment)}>{humanState(row.payment)}</Pill> },
            { key: 'gross', header: 'Fare', align: 'right', render: (row) => row.gross },
            { key: 'requested', header: 'Requested', render: (row) => <span className="cell-muted">{row.requested}</span> },
          ]}
          rows={rows}
          onRowClick={(row) => navigate(`/trips/${row.id}`)}
          empty={`No trip matches “${query}”.`}
        />
      </Card>
    </>
  );
}
