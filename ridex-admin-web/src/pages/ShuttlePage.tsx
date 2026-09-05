import { useState } from 'react';

import {
  addSchedule,
  addStop,
  createRoute,
  formatMoney,
  listRoutes,
  removeFare,
  removeLastStop,
  setFare,
  type RouteStop,
  type ShuttleRoute,
} from '../api/admin';
import { useQuery } from '../api/useQuery';
import { RouteMap } from '../components/RouteMap';
import { Button, Card, EmptyState, PageHeader, Pill, Table } from '../components/ui';

/**
 * Routes, stops, fares and departures on one screen.
 *
 * <p>Nested rather than four list pages: a stop with no route is not a place, and a fare with no
 * stops is a number. Building a route is one sitting, so it is one screen.
 */
export function ShuttlePage() {
  const { data, loading, error, refetch } = useQuery(listRoutes, []);
  const routes = data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Re-read from the fresh list rather than holding the route object, or an edit would render
  // against the copy taken before the write.
  const selected = routes.find((route) => route.id === selectedId) ?? null;

  async function act(what: () => Promise<unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      await what();
      refetch();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Shuttle routes"
        subtitle={data ? `${routes.length} routes` : loading ? 'Loading...' : ''}
        actions={
          <Button
            disabled={busy}
            onClick={() => {
              const code = window.prompt('Route code (A-Z, 0-9, underscore)');
              if (!code) return;
              const name = window.prompt('Route name, e.g. Whitefield to Electronic City');
              if (!name) return;
              act(async () => {
                const created = await createRoute({ code: code.toUpperCase(), name, active: true });
                setSelectedId(created.id);
              });
            }}
          >
            New route
          </Button>
        }
      />

      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <Card title="Routes">
        <Table<ShuttleRoute>
          columns={[
            { key: 'code', header: 'Code', render: (row) => <span className="mono">{row.code}</span> },
            { key: 'name', header: 'Name', render: (row) => <span className="cell-strong">{row.name}</span> },
            { key: 'stops', header: 'Stops', align: 'right', render: (row) => row.stops.length },
            { key: 'fares', header: 'Fares', align: 'right', render: (row) => row.fares.length },
            {
              key: 'departures',
              header: 'Departures',
              align: 'right',
              render: (row) => row.schedules.filter((schedule) => schedule.active).length,
            },
            {
              key: 'state',
              header: 'State',
              render: (row) => (
                <Pill tone={row.active ? 'success' : 'muted'}>{row.active ? 'Active' : 'Off'}</Pill>
              ),
            },
          ]}
          rows={routes}
          onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
          empty={error ?? (loading ? 'Loading routes...' : 'No routes yet. Create one to start.')}
        />
      </Card>

      {selected ? (
        <RouteDetail route={selected} busy={busy} act={act} />
      ) : routes.length > 0 ? (
        <EmptyState title="Pick a route">
          Open a route to add its stops, price the legs and set departures.
        </EmptyState>
      ) : null}
    </>
  );
}

function RouteDetail({
  route,
  busy,
  act,
}: {
  route: ShuttleRoute;
  busy: boolean;
  act: (what: () => Promise<unknown>) => void;
}) {
  const stopName = (stopId: string) =>
    route.stops.find((stop) => stop.id === stopId)?.name ?? 'Unknown stop';

  return (
    <>
      <Card
        title={`${route.code} · stops`}
        actions={
          <span className="row-actions">
            <Button
              disabled={busy}
              onClick={() => {
                const name = window.prompt('Stop name');
                if (!name) return;
                const coords = window.prompt('Latitude, longitude — e.g. 12.9698, 77.75');
                if (!coords) return;
                const [latitude, longitude] = coords.split(',').map((part) => Number(part.trim()));
                const offset = window.prompt('Minutes after departure');
                if (offset === null) return;
                act(() =>
                  addStop(route.id, {
                    name,
                    latitude,
                    longitude,
                    offsetMinutes: Number(offset),
                  }),
                );
              }}
            >
              Add stop
            </Button>
            {route.stops.length > 0 ? (
              <Button disabled={busy} onClick={() => act(() => removeLastStop(route.id))}>
                Remove last
              </Button>
            ) : null}
          </span>
        }
      >
        {/* Above the table, not instead of it: the pin catches a coordinate typed into the wrong
            hemisphere, the table is what you read the offsets from. */}
        <RouteMap stops={route.stops} />

        <Table<RouteStop>
          columns={[
            { key: 'sequence', header: '#', width: '60px', render: (row) => row.sequence },
            { key: 'name', header: 'Stop', render: (row) => <span className="cell-strong">{row.name}</span> },
            {
              key: 'offset',
              header: 'Arrives',
              // Minutes after departure, not a clock time: one row serves every departure on the
              // route, which is why the timetable is not re-entered per schedule.
              render: (row) =>
                row.offsetMinutes === 0 ? 'At departure' : `+${row.offsetMinutes} min`,
            },
            {
              key: 'coords',
              header: 'Location',
              align: 'right',
              render: (row) => (
                <span className="cell-muted mono">
                  {row.latitude}, {row.longitude}
                </span>
              ),
            },
          ]}
          rows={route.stops}
          empty="No stops yet. A route needs at least two before it can carry anyone."
        />
      </Card>

      <Card
        title={`${route.code} · fares`}
        actions={
          <Button
            disabled={busy || route.stops.length < 2}
            onClick={() => {
              const from = window.prompt(
                `From which stop?\n${route.stops.map((stop) => `${stop.sequence}. ${stop.name}`).join('\n')}`,
              );
              if (!from) return;
              const to = window.prompt('To which stop? (number)');
              if (!to) return;
              const rupees = window.prompt('Fare in rupees');
              if (!rupees) return;

              const fromStop = route.stops.find((stop) => stop.sequence === Number(from));
              const toStop = route.stops.find((stop) => stop.sequence === Number(to));
              if (!fromStop || !toStop) return;

              act(() =>
                setFare(route.id, {
                  fromStopId: fromStop.id,
                  toStopId: toStop.id,
                  currency: 'INR',
                  // Minor units all the way to the server. A rupee figure would be rounded twice.
                  fareMinor: Math.round(Number(rupees) * 100),
                }),
              );
            }}
          >
            Set a fare
          </Button>
        }
      >
        <Table
          columns={[
            { key: 'leg', header: 'Leg', render: (row) => `${stopName(row.fromStopId)} → ${stopName(row.toStopId)}` },
            {
              key: 'fare',
              header: 'Fare',
              align: 'right',
              render: (row) => (
                <span className="cell-strong">{formatMoney(row.fareMinor, row.currency)}</span>
              ),
            },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (row) => (
                <Button disabled={busy} onClick={() => act(() => removeFare(route.id, row.id))}>
                  Remove
                </Button>
              ),
            },
          ]}
          rows={route.fares}
          empty="No fares priced. A leg with no fare cannot be booked."
        />
      </Card>

      <Card
        title={`${route.code} · departures`}
        actions={
          <Button
            disabled={busy || route.stops.length < 2}
            onClick={() => {
              const time = window.prompt('Departure time, 24h — e.g. 08:30');
              if (!time) return;
              const days = window.prompt('Days as ISO numbers, e.g. 1,2,3,4,5', '1,2,3,4,5');
              if (!days) return;
              const seats = window.prompt('Seats on the vehicle');
              if (!seats) return;
              act(() =>
                addSchedule(route.id, {
                  departureTime: time.length === 5 ? `${time}:00` : time,
                  daysOfWeek: days,
                  seatCapacity: Number(seats),
                  active: true,
                }),
              );
            }}
          >
            Add departure
          </Button>
        }
      >
        <Table
          columns={[
            { key: 'time', header: 'Departs', render: (row) => <span className="cell-strong">{row.departureTime.slice(0, 5)}</span> },
            { key: 'days', header: 'Days', render: (row) => dayNames(row.daysOfWeek) },
            { key: 'seats', header: 'Seats', align: 'right', render: (row) => row.seatCapacity },
            {
              key: 'state',
              header: 'State',
              render: (row) => (
                <Pill tone={row.active ? 'success' : 'muted'}>{row.active ? 'Running' : 'Paused'}</Pill>
              ),
            },
          ]}
          rows={route.schedules}
          empty="No departures. Add at least one so the route appears to riders."
        />
      </Card>
    </>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayNames(daysOfWeek: string): string {
  const days = daysOfWeek.split(',').map((day) => DAYS[Number(day) - 1] ?? day);
  // The two everyday cases named rather than listed, because "Mon–Fri" is what operations says.
  if (daysOfWeek === '1,2,3,4,5') return 'Weekdays';
  if (daysOfWeek === '1,2,3,4,5,6,7') return 'Every day';
  return days.join(', ');
}
