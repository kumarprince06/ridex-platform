import { useState } from 'react';

import {
  DEFAULT_PAGE_SIZE,
  addSchedule,
  addStop,
  assignDeparture,
  createRoute,
  getRoute,
  listRoutes,
  removeLastStop,
  setFareMatrix,
  type RouteStop,
  type ShuttleRoute,
  type ShuttleRouteSummary,
} from '../api/admin';
import { useQuery } from '../api/useQuery';
import { FareMatrix } from '../components/FareMatrix';
import { FormDialog } from '../components/FormDialog';
import { LocationPicker } from '../components/LocationPicker';
import { RouteMap } from '../components/RouteMap';
import { SeatLayout } from '../components/SeatLayout';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Pill,
  Table,
} from '../components/ui';

/** Which dialog is open. One at a time - these are all edits to the same route. */
type Dialog = 'route' | 'stop' | 'schedule' | 'assign' | null;

/**
 * Routes, stops, fares and departures on one screen.
 *
 * <p>Nested rather than four list pages: a stop with no route is not a place, and a fare with no
 * stops is a number. Building a route is one sitting, so it is one screen.
 */
export function ShuttlePage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const { data, loading, error, refetch } = useQuery(() => listRoutes(page, size), [page, size]);
  const routes = data?.items ?? [];

  // Fetched on its own rather than picked out of the list: the list rows are counts, and the
  // stops, fares and departures below only exist on the full route.
  const {
    data: selected,
    loading: loadingRoute,
    refetch: refetchRoute,
  } = useQuery(
    () => (selectedId ? getRoute(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  async function act(what: () => Promise<unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      await what();
      // Both: a write changes the open route and the counts in its list row.
      refetchRoute();
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
        subtitle={data ? `${data.totalItems} routes` : loading ? 'Loading...' : ''}
        actions={
          <Button variant="primary" disabled={busy} onClick={() => setDialog('route')}>
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
        <Table<ShuttleRouteSummary>
          columns={[
            { key: 'code', header: 'Code', render: (row) => <span className="mono">{row.code}</span> },
            { key: 'name', header: 'Name', render: (row) => <span className="cell-strong">{row.name}</span> },
            { key: 'stops', header: 'Stops', align: 'right', render: (row) => row.stopCount },
            { key: 'fares', header: 'Fares', align: 'right', render: (row) => row.fareCount },
            {
              key: 'departures',
              header: 'Departures',
              align: 'right',
              render: (row) => row.activeDepartures,
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

        {data ? (
          <Pagination
            page={data.page}
            size={size}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="routes"
            onPage={(next) => {
              setPage(next);
              // The open route is almost certainly not on the page being moved to, and leaving its
              // detail below an unrelated list reads as if it were selected there.
              setSelectedId(null);
            }}
            onSize={(next) => {
              setSize(next);
              setPage(0);
              setSelectedId(null);
            }}
          />
        ) : null}
      </Card>

      {dialog === 'route' ? (
        <FormDialog
          title="New shuttle route"
          body="The code goes on tickets and cannot be changed later. Stops, fares and departures come next."
          submitLabel="Create route"
          fields={[
            {
              name: 'code',
              label: 'Route code',
              placeholder: 'WF_EC',
              hint: 'A-Z, 0-9 and underscore. Uppercased on save.',
            },
            {
              name: 'name',
              label: 'Name',
              placeholder: 'Whitefield to Electronic City',
            },
            {
              name: 'description',
              label: 'Description',
              placeholder: 'Morning commuter service',
              required: false,
            },
          ]}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => {
            setDialog(null);
            act(async () => {
              const created = await createRoute({
                code: values.code.toUpperCase(),
                name: values.name,
                description: values.description || undefined,
                active: true,
              });
              setSelectedId(created.id);
            });
          }}
        />
      ) : null}

      {selected ? (
        <RouteDetail route={selected} busy={busy} act={act} />
      ) : selectedId && loadingRoute ? (
        <EmptyState title="Opening the route">One moment.</EmptyState>
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
  const [dialog, setDialog] = useState<Dialog>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const lastStop = route.stops[route.stops.length - 1];

  return (
    <>
      <Card
        title={`${route.code} · stops`}
        actions={
          <span className="row-actions">
            <Button variant="primary" disabled={busy} onClick={() => setDialog('stop')}>
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

      <Card title={`${route.code} · fares`}>
        {/* One grid rather than a dialog per pair: nine stops are thirty-six legs, and the thing
            an operator needs to see is which of them are still blank. */}
        <FareMatrix
          key={route.id}
          stops={route.stops}
          fares={route.fares}
          busy={busy}
          onSave={(legs) => act(() => setFareMatrix(route.id, 'INR', legs))}
        />
      </Card>

      <Card
        title={`${route.code} · departures`}
        actions={
          <Button
            variant="primary"
            disabled={busy || route.stops.length < 2}
            onClick={() => setDialog('schedule')}
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
              key: 'layout',
              header: 'Layout',
              render: (row) => (
                <span className="cell-muted">
                  {row.seatsPerRow} across · {Math.ceil(row.seatCapacity / row.seatsPerRow)} rows
                </span>
              ),
            },
            {
              key: 'state',
              header: 'State',
              render: (row) => (
                <Pill tone={row.active ? 'success' : 'muted'}>{row.active ? 'Running' : 'Paused'}</Pill>
              ),
            },
            {
              key: 'assign',
              header: '',
              align: 'right',
              render: (row) => (
                <Button
                  disabled={busy}
                  onClick={() => {
                    setAssigning(row.id);
                    setDialog('assign');
                  }}
                >
                  Assign driver
                </Button>
              ),
            },
          ]}
          rows={route.schedules}
          empty="No departures. Add at least one so the route appears to riders."
        />
      </Card>

      {dialog === 'stop' ? (
        <FormDialog
          title={`Add a stop to ${route.code}`}
          body="Stops are appended in travel order. The offset is minutes after departure, so one row serves every departure on this route."
          submitLabel="Add stop"
          fields={[
            { name: 'name', label: 'Stop name', placeholder: 'Marathahalli' },
            { name: 'latitude', label: 'Latitude', type: 'number', placeholder: '12.9591' },
            { name: 'longitude', label: 'Longitude', type: 'number', placeholder: '77.6974' },
            {
              name: 'offsetMinutes',
              label: 'Minutes after departure',
              type: 'number',
              initial: lastStop ? String(lastStop.offsetMinutes + 15) : '0',
              hint: lastStop
                ? `Must be more than ${lastStop.offsetMinutes}, which is ${lastStop.name}.`
                : 'The first stop is 0 - the shuttle leaves from there.',
            },
          ]}
          extra={(values, set) => (
            <LocationPicker
              latitude={values.latitude}
              longitude={values.longitude}
              near={
                lastStop
                  ? [Number(lastStop.longitude), Number(lastStop.latitude)]
                  : undefined
              }
              onPick={(place) =>
                set({
                  latitude: place.latitude.toFixed(6),
                  longitude: place.longitude.toFixed(6),
                  // Only from a search hit, and only into an empty box: a drag is a correction to
                  // the pin, not a rename of a stop somebody already typed.
                  ...(place.label && !values.name ? { name: place.label } : {}),
                })
              }
            />
          )}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => {
            setDialog(null);
            act(() =>
              addStop(route.id, {
                name: values.name,
                latitude: Number(values.latitude),
                longitude: Number(values.longitude),
                offsetMinutes: Number(values.offsetMinutes),
              }),
            );
          }}
        />
      ) : null}

      {dialog === 'assign' && assigning ? (
        <FormDialog
          title="Assign a driver to a departure"
          body="One dated departure at a time. The departure exists only once a seat has been sold on it, and the vehicle must seat at least as many as the schedule."
          submitLabel="Assign"
          fields={[
            {
              name: 'serviceDate',
              label: 'Service date',
              placeholder: '2026-09-10',
              hint: 'The day this departure runs, as YYYY-MM-DD.',
            },
            {
              name: 'driverId',
              label: 'Driver ID',
              hint: 'From the driver page. They must be approved with valid documents.',
            },
            { name: 'vehicleId', label: 'Vehicle ID', hint: 'One of that driver\u2019s approved vehicles.' },
          ]}
          onCancel={() => {
            setDialog(null);
            setAssigning(null);
          }}
          onSubmit={(values) => {
            const scheduleId = assigning;
            setDialog(null);
            setAssigning(null);
            act(() =>
              assignDeparture(scheduleId, values.serviceDate, values.driverId, values.vehicleId),
            );
          }}
        />
      ) : null}

      {dialog === 'schedule' ? (
        <FormDialog
          title={`Add a departure to ${route.code}`}
          body="Seats and layout are frozen onto each dated departure as it opens, so a change here only affects future ones."
          submitLabel="Add departure"
          fields={[
            { name: 'departureTime', label: 'Departs at', type: 'time', initial: '08:30' },
            {
              name: 'daysOfWeek',
              label: 'Runs on',
              initial: '1,2,3,4,5',
              options: [
                { value: '1,2,3,4,5', label: 'Weekdays' },
                { value: '1,2,3,4,5,6,7', label: 'Every day' },
                { value: '6,7', label: 'Weekends' },
              ],
            },
            {
              name: 'seatCapacity',
              label: 'Seats',
              type: 'number',
              initial: '20',
              hint: 'Between 1 and 60.',
            },
            {
              name: 'seatsPerRow',
              label: 'Seats per row',
              initial: '4',
              options: [
                { value: '4', label: '4 across — minibus' },
                { value: '3', label: '3 across — 2+1 coach' },
                { value: '2', label: '2 across — MPV or auto' },
                { value: '1', label: '1 across — single file' },
              ],
              hint: 'This decides the seat labels riders pick from.',
            },
          ]}
          extra={(values) => (
            <SeatLayout
              capacity={Number(values.seatCapacity)}
              seatsPerRow={Number(values.seatsPerRow)}
            />
          )}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => {
            setDialog(null);
            act(() =>
              addSchedule(route.id, {
                // The picker gives HH:MM; the server parses a LocalTime, which wants seconds.
                departureTime: `${values.departureTime}:00`,
                daysOfWeek: values.daysOfWeek,
                seatCapacity: Number(values.seatCapacity),
                seatsPerRow: Number(values.seatsPerRow),
                active: true,
              }),
            );
          }}
        />
      ) : null}
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
