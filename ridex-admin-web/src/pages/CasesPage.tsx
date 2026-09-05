import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_PAGE_SIZE, listTickets, type Ticket, type TicketStatus } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, FilterTabs, humanState, PageHeader, Pagination, Pill, Table, stateTone } from '../components/ui';

// 'ALL' is the sentinel for "no filter": a tab strip needs every choice to be a value,
// while the API takes an absent status rather than a magic one.
const FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'AWAITING_REPLY', 'RESOLVED'] as const;
type Filter = (typeof FILTERS)[number];

/** Urgent first, then oldest: a safety ticket must never wait behind a lost umbrella. */
export function CasesPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const status = filter === 'ALL' ? undefined : (filter as TicketStatus);
  const { data, loading, error } = useQuery(() => listTickets(status, page, size), [status, page, size]);

  return (
    <>
      <PageHeader
        title="Support"
        subtitle={data ? `${data.totalItems} tickets` : loading ? 'Loading...' : ''}
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
        <Table<Ticket>
          columns={[
            { key: 'priority', header: 'Priority', render: (row) => (
              <Pill tone={row.priority === 'URGENT' ? 'danger' : row.priority === 'HIGH' ? 'warning' : 'default'}>
                {humanState(row.priority)}
              </Pill>
            ) },
            { key: 'subject', header: 'Subject', render: (row) => (
              <>
                <div className="cell-strong">{row.subject}</div>
                <div className="cell-muted">{humanState(row.category)}</div>
              </>
            ) },
            { key: 'from', header: 'Raised by', render: (row) => (
              <>
                <div>{row.raisedByEmail ?? '—'}</div>
                <div className="cell-muted">{humanState(row.raisedByRole)}</div>
              </>
            ) },
            { key: 'status', header: 'Status', render: (row) => (
              <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>
            ) },
            { key: 'response', header: 'First reply', render: (row) =>
              // The number an SLA is actually measured on.
              row.firstResponseAt
                ? <span className="cell-muted">{new Date(row.firstResponseAt).toLocaleString()}</span>
                : <Pill tone="warning">Waiting</Pill> },
            { key: 'created', header: 'Raised', render: (row) => (
              <span className="cell-muted">{new Date(row.createdAt).toLocaleString()}</span>
            ) },
          ]}
          rows={data?.items ?? []}
          onRowClick={(row) => navigate(`/cases/${row.id}`)}
          empty={error ?? (loading ? 'Loading tickets...' : 'Nothing waiting.')}
        />

        {data ? (
          <Pagination
            page={data.page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="tickets"
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
