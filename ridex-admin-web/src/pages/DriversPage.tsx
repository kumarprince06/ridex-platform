import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listDrivers, type AdminDriver, type OnboardingStatus } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, humanState, PageHeader, Pill, SearchInput, Table, stateTone } from '../components/ui';

const FILTERS: { label: string; value?: OnboardingStatus }[] = [
  { label: 'All' },
  { label: 'Awaiting review', value: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Rejected', value: 'REJECTED' },
];

/** FR-OPS-002. Filtered and searched on the server: the driver somebody wants is rarely on page one. */
export function DriversPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OnboardingStatus | undefined>(undefined);

  const { data, loading, error } = useQuery(() => listDrivers(status, query.trim()), [status, query]);

  return (
    <>
      <PageHeader
        title="Drivers"
        subtitle={data ? `${data.totalItems} accounts` : loading ? 'Loading...' : ''}
      />

      <Card
        actions={
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
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
            <SearchInput value={query} onChange={setQuery} placeholder="Name or email" />
          </span>
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
      </Card>
    </>
  );
}
