import { useState } from 'react';

import {
  assignDeparture,
  driverVehicles,
  listDepartures,
  listDrivers,
  type Departure,
} from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Button, Card, PageHeader, Pill, stateTone, Table } from '../components/ui';

/** Today, in the browser's own zone - the operator is standing in it. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Departures as they are running: who is on the 08:15, and who is driving it.
 *
 * <p>Separate from the routes screen, which is about what the platform runs. This one is about one
 * day, and it is the only place the assign endpoint can be reached from a departure rather than
 * from an id typed out of another page.
 */
export function ShuttleOpsPage() {
  const [date, setDate] = useState(today());
  const [open, setOpen] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Departure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(() => listDepartures(date), [date]);

  return (
    <>
      <PageHeader
        title="Shuttle departures"
        subtitle="A departure appears here once its first seat sells."
        actions={
          <input
            type="date"
            className="input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        }
      />

      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Card title={loading ? 'Loading...' : `${data?.length ?? 0} departures on ${date}`}>
        <Table<Departure>
          columns={[
            {
              key: 'departsAt',
              header: 'Departs',
              render: (row) => (
                <span className="cell-strong">
                  {new Date(row.departsAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              ),
            },
            { key: 'routeName', header: 'Route', render: (row) => row.routeName },
            {
              key: 'occupancy',
              header: 'Seats',
              render: (row) => (
                <>
                  {row.seatsSold} / {row.seatCapacity}
                  {row.seatsCancelled ? (
                    <span className="cell-muted"> · {row.seatsCancelled} cancelled</span>
                  ) : null}
                </>
              ),
            },
            { key: 'boarded', header: 'Boarded', align: 'right', render: (row) => row.boarded },
            {
              key: 'crew',
              header: 'Crew',
              render: (row) =>
                row.driverId ? (
                  <>
                    {row.driverName}
                    <span className="cell-muted"> · {row.registrationNumber}</span>
                  </>
                ) : (
                  <Pill tone="warning">Nobody driving</Pill>
                ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <span className="row-actions">
                  <Button onClick={() => setOpen(open === row.shuttleTripId ? null : row.shuttleTripId)}>
                    {open === row.shuttleTripId ? 'Hide seats' : 'Seats'}
                  </Button>
                  <Button variant="primary" onClick={() => setAssigning(row)}>
                    {row.driverId ? 'Swap crew' : 'Assign crew'}
                  </Button>
                </span>
              ),
            },
          ]}
          rows={data ?? []}
          empty={error ?? 'Nothing has sold for this date yet.'}
        />
      </Card>

      {data
        ?.filter((departure) => departure.shuttleTripId === open)
        .map((departure) => (
          <Card key={departure.shuttleTripId} title={`Manifest · ${departure.routeName}`}>
            <Table
              columns={[
                { key: 'seat', header: 'Seat', render: (row: Departure['seats'][number]) => row.seatLabel },
                {
                  key: 'rider',
                  header: 'Rider',
                  render: (row: Departure['seats'][number]) => (
                    <>
                      <span className="cell-strong">{row.riderName}</span>
                      <span className="cell-muted"> · {row.riderEmail}</span>
                    </>
                  ),
                },
                {
                  key: 'leg',
                  header: 'Leg',
                  render: (row: Departure['seats'][number]) =>
                    `${row.boardingStopName ?? '--'} → ${row.alightingStopName ?? '--'}`,
                },
                {
                  key: 'status',
                  header: 'Seat',
                  render: (row: Departure['seats'][number]) => (
                    <Pill tone={stateTone(row.status)}>{row.status}</Pill>
                  ),
                },
                {
                  key: 'payment',
                  header: 'Payment',
                  render: (row: Departure['seats'][number]) => (
                    <Pill tone={stateTone(row.paymentStatus)}>{row.paymentStatus}</Pill>
                  ),
                },
                {
                  key: 'boarded',
                  header: 'Boarded',
                  align: 'right',
                  render: (row: Departure['seats'][number]) =>
                    row.boardedAt ? (
                      new Date(row.boardedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      <span className="cell-muted">--</span>
                    ),
                },
              ]}
              rows={departure.seats}
              empty="Nobody has booked this departure."
            />
          </Card>
        ))}

      {assigning ? (
        <AssignCrew
          departure={assigning}
          onCancel={() => setAssigning(null)}
          onDone={(message) => {
            setAssigning(null);
            setNotice(message);
            refetch();
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Pick a driver, then one of their vehicles.
 *
 * <p>Two dropdowns rather than two id fields: an operator swapping a driver at 07:50 should not be
 * copying ULIDs out of another page, and the vehicle list is the driver's own so the server's
 * "that vehicle belongs to another driver" can never be hit by accident.
 */
function AssignCrew({
  departure,
  onCancel,
  onDone,
}: {
  departure: Departure;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: drivers } = useQuery(() => listDrivers('APPROVED', '', 0, 100));
  const { data: vehicles } = useQuery(
    () => (driverId ? driverVehicles(driverId) : Promise.resolve([])),
    [driverId],
  );

  const serviceDate = departure.departsAt.slice(0, 10);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await assignDeparture(departure.scheduleId, serviceDate, driverId, vehicleId);
      onDone(`Crew assigned to the ${departure.routeName} departure.`);
    } catch (caught) {
      // "That vehicle seats 12, and 20 seats are scheduled" arrives here, which is the one an
      // operator needs to read before they put somebody on the roadside.
      setError(caught instanceof Error ? caught.message : 'Could not assign that crew.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`Crew for ${new Date(departure.departsAt).toLocaleString()}`}>
      <div>
        <label className="field">
          <span className="field-label">Driver</span>
          <select
            className="input"
            value={driverId}
            onChange={(event) => {
              setDriverId(event.target.value);
              setVehicleId('');
            }}
          >
            <option value="">Choose an approved driver</option>
            {drivers?.items.map((driver) => (
              <option key={driver.driverId} value={driver.driverId}>
                {[driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.email}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Vehicle</span>
          <select
            className="input"
            value={vehicleId}
            disabled={!driverId}
            onChange={(event) => setVehicleId(event.target.value)}
          >
            <option value="">
              {driverId ? 'Choose one of their vehicles' : 'Pick a driver first'}
            </option>
            {vehicles?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.make} {vehicle.model} · {vehicle.registrationNumber} · {vehicle.seatCapacity} seats
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="assign-error">{error}</p> : null}

      <span className="row-actions">
        <Button variant="primary" disabled={!driverId || !vehicleId || busy} onClick={() => void submit()}>
          {busy ? 'Assigning...' : 'Assign'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </span>
    </Card>
  );
}
