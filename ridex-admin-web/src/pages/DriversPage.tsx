import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, FilterTabs, humanState, PageHeader, Pill, SearchInput, Table, stateTone } from '../components/ui';
import { Driver, DRIVERS } from '../data/mock';

const FILTERS = ['ALL', 'APPROVED', 'UNDER_REVIEW', 'SUSPENDED'] as const;

/** FR-OPS-002 and FR-OPS-003 seen as a list; the approval queue is its own screen. */
export function DriversPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  const needle = query.trim().toLowerCase();
  const rows = DRIVERS.filter((driver) => {
    const matchesFilter = filter === 'ALL' || driver.onboarding === filter;
    const matchesQuery =
      !needle ||
      [driver.name, driver.email, driver.phone, driver.id, driver.plate].some((field) =>
        field.toLowerCase().includes(needle),
      );
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      <PageHeader title="Drivers" subtitle={`${DRIVERS.length} accounts`} />

      <Card
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Name, phone, plate or driver ID" />}
      >
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
          <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <Table<Driver>
          columns={[
            { key: 'id', header: 'Driver', render: (row) => <span className="mono">{row.id}</span> },
            { key: 'name', header: 'Name', render: (row) => (
              <>
                <div className="cell-strong">{row.name}</div>
                <div className="cell-muted">{row.city}</div>
              </>
            ) },
            { key: 'vehicle', header: 'Vehicle', render: (row) => (
              <>
                <div>{row.vehicle}</div>
                <div className="cell-muted mono">{row.plate}</div>
              </>
            ) },
            { key: 'state', header: 'Onboarding', render: (row) => <Pill tone={stateTone(row.onboarding)}>{humanState(row.onboarding)}</Pill> },
            { key: 'duty', header: 'Duty', render: (row) => <Pill tone={row.online ? 'success' : 'default'}>{row.online ? 'Online' : 'Offline'}</Pill> },
            { key: 'rating', header: 'Rating', align: 'right', render: (row) => (row.rating ? row.rating.toFixed(2) : '—') },
            { key: 'trips', header: 'Trips', align: 'right', render: (row) => row.trips },
          ]}
          rows={rows}
          onRowClick={(row) => navigate(`/drivers/${row.id}`)}
          empty={`No driver matches “${query}”.`}
        />
      </Card>
    </>
  );
}
