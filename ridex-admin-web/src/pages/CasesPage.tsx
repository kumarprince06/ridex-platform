import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listTickets, type Ticket, type TicketStatus } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';

const FILTERS: { label: string; value?: TicketStatus }[] = [
  { label: 'All' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Awaiting reply', value: 'AWAITING_REPLY' },
  { label: 'Resolved', value: 'RESOLVED' },
];

/** Urgent first, then oldest: a safety ticket must never wait behind a lost umbrella. */
export function CasesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined);
  const { data, loading, error } = useQuery(() => listTickets(status), [status]);

  return (
    <>
      <PageHeader
        title="Support"
        subtitle={data ? `${data.totalItems} tickets` : loading ? 'Loading...' : ''}
      />

      <Card
        actions={
          <span style={{ display: 'inline-flex', gap: 8 }}>
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
          </span>
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
      </Card>
    </>
  );
}
