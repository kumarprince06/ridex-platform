import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatMoney, listTrips, type AdminTrip } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, humanState, PageHeader, Pill, Table, stateTone } from '../components/ui';

const FILTERS = [
  { label: 'All' },
  { label: 'Searching', value: 'SEARCHING' },
  { label: 'In progress', value: 'TRIP_STARTED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Expired', value: 'EXPIRED' },
];

export function TripsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | undefined>(undefined);

  const { data, loading, error } = useQuery(() => listTrips(status), [status]);

  return (
    <>
      <PageHeader
        title="Trips"
        subtitle={data ? `${data.totalItems} rides` : loading ? 'Loading...' : ''}
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
      </Card>
    </>
  );
}
