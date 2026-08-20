import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, humanState, PageHeader, Pill, SearchInput, Table, stateTone } from '../components/ui';
import { RIDERS, Rider } from '../data/mock';

/** FR-OPS-002. One search box: operations arrives with a phone number or an ID, not a page number. */
export function RidersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const rows = needle
    ? RIDERS.filter((rider) =>
        [rider.name, rider.email, rider.phone, rider.id].some((field) =>
          field.toLowerCase().includes(needle),
        ),
      )
    : RIDERS;

  return (
    <>
      <PageHeader title="Riders" subtitle={`${RIDERS.length} accounts`} />

      <Card
        actions={
          <SearchInput value={query} onChange={setQuery} placeholder="Name, email, phone or rider ID" />
        }
      >
        <Table<Rider>
          columns={[
            { key: 'id', header: 'Rider', render: (row) => <span className="mono">{row.id}</span> },
            { key: 'name', header: 'Name', render: (row) => <span className="cell-strong">{row.name}</span> },
            { key: 'contact', header: 'Contact', render: (row) => (
              <>
                <div>{row.email}</div>
                <div className="cell-muted">{row.phone}</div>
              </>
            ) },
            { key: 'city', header: 'City', render: (row) => row.city },
            { key: 'trips', header: 'Trips', align: 'right', render: (row) => row.trips },
            { key: 'rating', header: 'Rating', align: 'right', render: (row) => (row.rating ? row.rating.toFixed(2) : '—') },
            { key: 'status', header: 'Status', render: (row) => <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill> },
          ]}
          rows={rows}
          onRowClick={(row) => navigate(`/riders/${row.id}`)}
          empty={`No rider matches “${query}”. Try the full phone number including country code.`}
        />
      </Card>
    </>
  );
}
