import { useState } from 'react';
import { clockTime, dateTime } from '../lib/format';

import {
  assignDeparture,
  cancelDeparture,
  driverVehicles,
  listDepartures,
  listDrivers,
  type Departure,
} from '../api/admin';
import { useQuery } from '../api/useQuery';
import { FormDialog } from '../components/FormDialog';
import { Button, Card, Grid, PageHeader, Pill, StatTile, stateTone, Table } from '../components/ui';

/** Today, in the browser's own zone - the operator is standing in it (not UTC's date). */
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * The day's shuttles as a board: every timetable departure, sold or not, with its live state,
 * seats and crew. Click a card for its passengers.
 */
export function ShuttleOpsPage() {
  const [date, setDate] = useState(today());
  const [open, setOpen] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Departure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Departure | null>(null);

  const { data, loading, error, refetch } = useQuery(() => listDepartures(date), [date]);
  const departures = data ?? [];
  const running = departures.filter((row) => row.runStatus === 'RUNNING');
  const late = running.filter((row) => row.delayMinutes > 0);
  const uncrewed = departures.filter((row) => !row.driverId && row.runStatus !== 'COMPLETED');

  return (
    <>
      <PageHeader
        title={date === today() ? 'Today' : date}
        subtitle="Every departure on the timetable, whether or not a seat has sold."
        actions={
          <input type="date" className="input" value={date} onChange={(event) => setDate(event.target.value)} />
        }
      />

      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <Grid columns={4}>
        <StatTile label="Departures" value={String(departures.length)} note={loading ? 'Loading...' : 'On the timetable'} />
        <StatTile label="Running now" value={String(running.length)} note="Started, not finished" tone="primary" />
        <StatTile label="Running late" value={String(late.length)} note="Behind the timetable" tone={late.length ? 'warning' : 'default'} />
        <StatTile label="Need a driver" value={String(uncrewed.length)} note="Nobody rostered yet" tone={uncrewed.length ? 'warning' : 'default'} />
      </Grid>

      {!loading && departures.length === 0 ? (
        <Card>
          <p className="cell-muted">No shuttle runs on this date.</p>
        </Card>
      ) : null}

      <div className="board">
        {departures.map((row) => (
          <button
            key={row.shuttleTripId}
            type="button"
            className={open === row.shuttleTripId ? 'board-card open' : 'board-card'}
            onClick={() => setOpen(open === row.shuttleTripId ? null : row.shuttleTripId)}
          >
            <div className="board-top">
              <span className="board-time">{clockTime(row.departsAt)}</span>
              <RunState row={row} />
            </div>
            <div className="board-route">{row.routeName}</div>
            <div className="board-seats">
              <div className="board-bar">
                <span style={{ width: `${Math.min(100, (row.seatsSold / Math.max(1, row.seatCapacity)) * 100)}%` }} />
              </div>
              <span className="cell-muted">
                {row.seatsSold}/{row.seatCapacity} sold{row.boarded ? ` · ${row.boarded} on board` : ''}
              </span>
            </div>
            <div className="board-crew">
              {row.driverId ? (
                <span className="cell-muted">
                  {row.driverName} · {row.registrationNumber}
                </span>
              ) : (
                <Pill tone="warning">Nobody driving</Pill>
              )}
              <span
                role="button"
                tabIndex={0}
                className="board-link"
                onClick={(event) => {
                  event.stopPropagation();
                  setAssigning(row);
                }}
              >
                {row.driverId ? 'Swap crew' : 'Assign crew'}
              </span>
              {row.runStatus === 'SCHEDULED' ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="board-link board-danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    setCancelling(row);
                  }}
                >
                  Cancel
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

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
                      clockTime(row.boardedAt)
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

      {cancelling ? (
        <FormDialog
          title={`Cancel the ${clockTime(cancelling.departsAt)} ${cancelling.routeName}?`}
          body={`${cancelling.seatsSold} booked rider(s) get their whole fare back as points (pass riders get the ride back) and a notification with your reason. This cannot be undone.`}
          submitLabel="Cancel departure"
          fields={[{ name: 'reason', label: 'Reason (riders see this)', placeholder: 'The bus has broken down.' }]}
          onCancel={() => setCancelling(null)}
          onSubmit={(values) => {
            const departure = cancelling;
            setCancelling(null);
            cancelDeparture(departure.shuttleTripId, values.reason)
              .then((result) => {
                setNotice(`Departure cancelled. ${result.seatsCancelled} rider(s) refunded as points and told.`);
                refetch();
              })
              .catch((caught) => setNotice(caught instanceof Error ? caught.message : 'Could not cancel.'));
          }}
        />
      ) : null}

      {assigning ? (
        <AssignCrew
          departure={assigning}
          serviceDate={date}
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
  serviceDate,
  onCancel,
  onDone,
}: {
  departure: Departure;
  serviceDate: string;
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
    <Card title={`Crew for ${dateTime(departure.departsAt)}`}>
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

function RunState({ row }: { row: Departure }) {
  if (row.runStatus === 'RUNNING') {
    return (
      <span className="board-state">
        <Pill tone={row.delayMinutes > 0 ? 'warning' : 'success'}>
          {row.delayMinutes > 0 ? `${row.delayMinutes} min late` : 'On time'}
        </Pill>
        <span className="cell-muted">{row.currentStop ? `at ${row.currentStop}` : 'started'}</span>
      </span>
    );
  }
  if (row.runStatus === 'COMPLETED') return <Pill>Done</Pill>;
  if (row.runStatus === 'CANCELLED') return <Pill tone="danger">Cancelled</Pill>;
  // Half an hour past its time and never started: the driver did not run it.
  const missed = Date.now() > new Date(row.departsAt).getTime() + 30 * 60 * 1000;
  return missed ? <Pill tone="danger">Did not run</Pill> : <Pill tone="default">Scheduled</Pill>;
}
