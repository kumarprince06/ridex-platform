import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listRiders, type AdminRider } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, humanState, PageHeader, Pill, SearchInput, Table, stateTone } from '../components/ui';

/** FR-OPS-002. One search box: operations arrives with a phone number or an ID, not a page number. */
export function RidersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Searched server-side, not filtered in the browser: the account somebody is looking for is
  // rarely on the first page, and shipping every rider to the client stops working at ten thousand.
  const { data, loading, error } = useQuery(() => listRiders(query.trim()), [query]);
  const rows = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Riders"
        subtitle={data ? `${data.totalItems} accounts` : loading ? 'Loading...' : ''}
      />

      <Card
        actions={
          <SearchInput value={query} onChange={setQuery} placeholder="Name or email" />
        }
      >
        <Table<AdminRider>
          columns={[
            { key: 'riderId', header: 'Rider', render: (row) => <span className="mono">{row.riderId.slice(-8)}</span> },
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
            { key: 'joined', header: 'Joined', render: (row) => new Date(row.joinedAt).toLocaleDateString() },
            { key: 'lastSeen', header: 'Last sign-in', render: (row) =>
              row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : 'Never' },
            { key: 'status', header: 'Status', render: (row) => (
              <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>
            ) },
          ]}
          rows={rows}
          onRowClick={(row) => navigate(`/riders/${row.riderId}`)}
          empty={
            error
              ? error
              : loading
                ? 'Loading riders...'
                : query
                  ? `No rider matches \u201c${query}\u201d.`
                  : 'No riders yet.'
          }
        />
      </Card>
    </>
  );
}
