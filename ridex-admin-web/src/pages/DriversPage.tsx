import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_PAGE_SIZE, listDrivers, type AdminDriver, type OnboardingStatus } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, FilterTabs, humanState, PageHeader, Pagination, Pill, SearchInput, Table, stateTone } from '../components/ui';

// 'ALL' is the sentinel for "no filter" - a tab strip needs every choice to be a value, and the
// API takes an absent status rather than a magic one.
const FILTERS = ['ALL', 'UNDER_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED'] as const;
type Filter = (typeof FILTERS)[number];

/** FR-OPS-002. Filtered and searched on the server: the driver somebody wants is rarely on page one. */
export function DriversPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const status = filter === 'ALL' ? undefined : (filter as OnboardingStatus);
  const { data, loading, error } = useQuery(
    () => listDrivers(status, query.trim(), page, size),
    [status, query, page, size],
  );

  return (
    <>
      <PageHeader
        title="Drivers"
        subtitle={data ? `${data.totalItems} accounts` : loading ? 'Loading...' : ''}
      />

      <Card
        actions={
          <div className="card-filters">
            <FilterTabs
              options={FILTERS}
              value={filter}
              onChange={(next) => {
                setFilter(next);
                // Narrowing the list invalidates the page number it was on.
                setPage(0);
              }}
            />
            <SearchInput
              value={query}
              onChange={(next) => {
                setQuery(next);
                setPage(0);
              }}
              placeholder="Name or email"
            />
          </div>
        }
      >
        <Table<AdminDriver>
          columns={[
            { key: 'driverId', header: 'Driver', render: (row) => (
              <span className="mono">{row.driverId.slice(-8)}</span>
            ) },
            { key: 'name', header: 'Name', render: (row) => (
              <span className="cell-strong">
                {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
              </span>
            ) },
            { key: 'contact', header: 'Contact', render: (row) => (
              <>
                <div>{row.email}</div>
                <div className="cell-muted">{row.phone ?? 'No phone'}</div>
              </>
            ) },
            { key: 'onboarding', header: 'Onboarding', render: (row) => (
              <Pill tone={stateTone(row.onboardingStatus)}>{humanState(row.onboardingStatus)}</Pill>
            ) },
            { key: 'duty', header: 'Duty', render: (row) => (
              <Pill tone={row.onDuty ? 'success' : 'default'}>
                {row.onDuty ? 'On duty' : 'Off duty'}
              </Pill>
            ) },
            { key: 'rating', header: 'Rating', align: 'right', render: (row) =>
              // Null is not zero: a driver nobody has rated yet has no rating, and showing 0.00
              // reads as the worst possible one.
              row.rating != null ? `${Number(row.rating).toFixed(2)} (${row.ratingCount})` : '—' },
          ]}
          rows={data?.items ?? []}
          onRowClick={(row) => navigate(`/drivers/${row.driverId}`)}
          empty={error ?? (loading ? 'Loading drivers...' : 'No drivers match.')}
        />

        {data ? (
          <Pagination
            page={data.page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="drivers"
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
