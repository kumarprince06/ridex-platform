import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_PAGE_SIZE, formatMoney, listTrips, type AdminTrip } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, FilterTabs, humanState, PageHeader, Pagination, Pill, Table, stateTone } from '../components/ui';

// 'ALL' is the sentinel for "no filter": a tab strip needs every choice to be a value,
// while the API takes an absent status rather than a magic one.
const FILTERS = ['ALL', 'SEARCHING', 'TRIP_STARTED', 'COMPLETED', 'EXPIRED'] as const;
type Filter = (typeof FILTERS)[number];

export function TripsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const status = filter === 'ALL' ? undefined : (filter as string);

  const { data, loading, error } = useQuery(() => listTrips(status, page, size), [status, page, size]);

  return (
    <>
      <PageHeader
        title="Trips"
        subtitle={data ? `${data.totalItems} rides` : loading ? 'Loading...' : ''}
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
        <Table<AdminTrip>
          columns={[
            { key: 'rideId', header: 'Ride', render: (row) => (
              <span className="mono">{row.rideId.slice(-8)}</span>
            ) },
            { key: 'rider', header: 'Rider', render: (row) => row.riderEmail },
            { key: 'driver', header: 'Driver', render: (row) => row.driverEmail ?? '—' },
            { key: 'type', header: 'Type', render: (row) => row.rideTypeCode },
            { key: 'state', header: 'State', render: (row) => (
              <Pill tone={stateTone(row.status)}>{humanState(row.status)}</Pill>
            ) },
            { key: 'fare', header: 'Fare', align: 'right', render: (row) => (
              <>
                <div>{formatMoney(row.finalFareMinor ?? row.quotedFareMinor, row.currency)}</div>
                {/* Quoted and charged shown apart when they differ: that gap is the question
                    every fare complaint is about. */}
                {row.finalFareMinor != null && row.finalFareMinor !== row.quotedFareMinor ? (
                  <div className="cell-muted">
                    quoted {formatMoney(row.quotedFareMinor, row.currency)}
                  </div>
                ) : null}
              </>
            ) },
            { key: 'requested', header: 'Requested', render: (row) => (
              <span className="cell-muted">{new Date(row.requestedAt).toLocaleString()}</span>
            ) },
          ]}
          rows={data?.items ?? []}
          onRowClick={(row) => navigate(`/trips/${row.rideId}`)}
          empty={error ?? (loading ? 'Loading trips...' : 'No trips yet.')}
        />

        {data ? (
          <Pagination
            page={data.page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="trips"
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
