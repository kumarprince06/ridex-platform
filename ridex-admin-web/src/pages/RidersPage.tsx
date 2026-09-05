import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_PAGE_SIZE, listRiders, type AdminRider } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, humanState, PageHeader, Pagination, Pill, SearchInput, Table, stateTone } from '../components/ui';

/** FR-OPS-002. One search box: operations arrives with a phone number or an ID, not a page number. */
export function RidersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Searched server-side, not filtered in the browser: the account somebody is looking for is
  // rarely on the first page, and shipping every rider to the client stops working at ten thousand.
  const { data, loading, error } = useQuery(() => listRiders(query.trim(), page, size), [query, page, size]);
  const rows = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Riders"
        subtitle={data ? `${data.totalItems} accounts` : loading ? 'Loading...' : ''}
      />

      <Card
        actions={
          <SearchInput
            value={query}
            onChange={(next) => {
              setQuery(next);
              // A new search starts at the top. Staying on page 4 of the old result shows nothing.
              setPage(0);
            }}
            placeholder="Name or email"
          />
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

        {data ? (
          <Pagination
            page={data.page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="riders"
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
