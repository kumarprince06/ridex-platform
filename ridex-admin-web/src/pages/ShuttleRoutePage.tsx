import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  addSchedule,
  addStop,
  getRoute,
  removeLastStop,
  setFareMatrix,
  updateRoute,
  updateSchedule,
  type RouteSchedule,
  type RouteStop,
  type ShuttleRoute,
} from '../api/admin';
import { useQuery } from '../api/useQuery';
import { FareMatrix } from '../components/FareMatrix';
import { FormDialog } from '../components/FormDialog';
import { LocationPicker } from '../components/LocationPicker';
import { RouteMap } from '../components/RouteMap';
import { SeatLayout } from '../components/SeatLayout';
import { Button, Card, DetailList, EmptyState, Grid, PageHeader, Pill, StatTile, Table } from '../components/ui';
import { dayNames, legsFromRule } from '../lib/shuttle';

const TABS = ['Overview', 'Stops', 'Fares', 'Timetable'] as const;
type Tab = (typeof TABS)[number];

/** One route, a tab per thing you change about it. */
export function ShuttleRoutePage() {
  const { routeId = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('Overview');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { data: route, loading, error, refetch } = useQuery(() => getRoute(routeId), [routeId]);

  async function act(what: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setNotice(null);
    try {
      await what();
      await refetch();
      if (done) setNotice(done);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (!route) {
    return loading ? <EmptyState title="Opening the route">One moment.</EmptyState> : (
      <EmptyState title="Route not found">{error ?? 'It may have been removed.'}</EmptyState>
    );
  }

  return (
    <>
      <PageHeader
        title={route.name}
        subtitle={`${route.code} · ${route.stops.length} stops · ${route.schedules.filter((s) => s.active).length} departures running`}
        actions={
          <span className="row-actions">
            <Button onClick={() => navigate('/shuttle')}>All routes</Button>
            <Button
              variant={route.active ? 'secondary' : 'primary'}
              disabled={busy || (!route.active && missing(route) !== null)}
              onClick={() =>
                act(
                  () => updateRoute(route.id, { code: route.code, name: route.name, description: route.description ?? undefined, active: !route.active }),
                  route.active ? 'Route hidden from riders.' : 'Route is live for riders.',
                )
              }
            >
              {route.active ? 'Hide from riders' : 'Show to riders'}
            </Button>
          </span>
        }
      />

      {notice ? (
        <Card>
          <span className="cell-muted">{notice}</span>
        </Card>
      ) : null}

      <div className="filter-tabs" role="tablist" style={{ marginBottom: 16 }}>
        {TABS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            className={tab === option ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setTab(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? <Overview route={route} /> : null}
      {tab === 'Stops' ? <Stops route={route} busy={busy} act={act} /> : null}
      {tab === 'Fares' ? <Fares route={route} busy={busy} act={act} /> : null}
      {tab === 'Timetable' ? <Timetable route={route} busy={busy} act={act} /> : null}
    </>
  );
}

type Act = (what: () => Promise<unknown>, done?: string) => void;

/** What still stops the route going live, or null when it can. */
function missing(route: ShuttleRoute): string | null {
  if (route.stops.length < 2) return 'Add at least two stops.';
  if (route.fares.length === 0) return 'Set the fares.';
  if (!route.schedules.some((schedule) => schedule.active)) return 'Add a departure to the timetable.';
  return null;
}

function Overview({ route }: { route: ShuttleRoute }) {
  const todo = missing(route);
  const fares = route.fares.map((fare) => fare.fareMinor);
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];

  return (
    <>
      {todo ? (
        <Card>
          <strong>Not ready for riders yet.</strong> <span className="cell-muted">{todo}</span>
        </Card>
      ) : null}
      <Grid columns={4}>
        <StatTile label="Stops" value={String(route.stops.length)} note={first && last ? `${first.name} → ${last.name}` : 'None yet'} />
        <StatTile label="Journey" value={last ? `${last.offsetMinutes} min` : '—'} note="First stop to last" />
        <StatTile
          label="Fares"
          value={fares.length ? `₹${Math.min(...fares) / 100}–${Math.max(...fares) / 100}` : '—'}
          note={`${route.fares.length} legs priced`}
        />
        <StatTile
          label="Departures"
          value={String(route.schedules.filter((schedule) => schedule.active).length)}
          note="Running on the timetable"
        />
      </Grid>
      <Card title="Map">
        <RouteMap stops={route.stops} />
      </Card>
      <Card title="Details">
        <DetailList
          items={[
            { label: 'Code', value: <span className="mono">{route.code}</span> },
            { label: 'Description', value: route.description || '—' },
            { label: 'Riders see it', value: route.active ? 'Yes' : 'No' },
          ]}
        />
      </Card>
    </>
  );
}

function Stops({ route, busy, act }: { route: ShuttleRoute; busy: boolean; act: Act }) {
  const [adding, setAdding] = useState(false);
  const lastStop = route.stops[route.stops.length - 1];

  return (
    <Card
      title="Stops, in travel order"
      actions={
        <span className="row-actions">
          <Button variant="primary" disabled={busy} onClick={() => setAdding(true)}>
            Add stop
          </Button>
          {route.stops.length > 0 ? (
            <Button disabled={busy} onClick={() => act(() => removeLastStop(route.id), 'Last stop removed.')}>
              Remove last
            </Button>
          ) : null}
        </span>
      }
    >
      <RouteMap stops={route.stops} />
      <Table<RouteStop>
        columns={[
          { key: 'sequence', header: '#', width: '60px', render: (row) => row.sequence },
          { key: 'name', header: 'Stop', render: (row) => <span className="cell-strong">{row.name}</span> },
          {
            key: 'offset',
            header: 'Reached',
            // Minutes after departure: one row serves every departure on the route.
            render: (row) => (row.offsetMinutes === 0 ? 'Departure' : `+${row.offsetMinutes} min`),
          },
        ]}
        rows={route.stops}
        empty="No stops yet. A route needs at least two."
      />

      {adding ? (
        <FormDialog
          title={`Add a stop to ${route.name}`}
          body="Search for the place or click the map, then say how long the shuttle takes to get there from the previous stop."
          submitLabel="Add stop"
          fields={[
            { name: 'name', label: 'Stop name', placeholder: 'Dunlop More' },
            { name: 'latitude', label: 'Latitude', type: 'number' },
            { name: 'longitude', label: 'Longitude', type: 'number' },
            {
              name: 'gap',
              label: lastStop ? `Minutes from ${lastStop.name}` : 'Minutes after departure',
              type: 'number',
              initial: lastStop ? '6' : '0',
            },
          ]}
          extra={(values, set) => (
            <LocationPicker
              latitude={values.latitude}
              longitude={values.longitude}
              near={lastStop ? [Number(lastStop.longitude), Number(lastStop.latitude)] : undefined}
              onPick={(place) =>
                set({
                  latitude: place.latitude.toFixed(6),
                  longitude: place.longitude.toFixed(6),
                  ...(place.label && !values.name ? { name: place.label } : {}),
                })
              }
            />
          )}
          onCancel={() => setAdding(false)}
          onSubmit={(values) => {
            setAdding(false);
            act(
              () =>
                addStop(route.id, {
                  name: values.name,
                  latitude: Number(values.latitude),
                  longitude: Number(values.longitude),
                  offsetMinutes: (lastStop?.offsetMinutes ?? 0) + Number(values.gap || 0),
                }),
              `${values.name} added.`,
            );
          }}
        />
      ) : null}
    </Card>
  );
}

function Fares({ route, busy, act }: { route: ShuttleRoute; busy: boolean; act: Act }) {
  const [base, setBase] = useState('20');
  const [perStop, setPerStop] = useState('5');
  const [advanced, setAdvanced] = useState(false);
  const stopIds = route.stops.map((stop) => stop.id);
  const preview = legsFromRule(stopIds, Number(base), Number(perStop));
  const longest = preview.find((leg) => leg.fromStopId === stopIds[0] && leg.toStopId === stopIds[stopIds.length - 1]);

  if (route.stops.length < 2) {
    return <EmptyState title="Add stops first">Fares are priced between stops, so a route needs two.</EmptyState>;
  }

  return (
    <>
      <Card title="Fare rule">
        <p className="cell-muted">
          Every leg costs the base fare, plus an amount for each extra stop travelled. Applying the rule replaces all
          the fares on this route.
        </p>
        <div className="rule-row">
          <label className="field">
            <span className="field-label">Base fare (₹)</span>
            <input className="input" type="number" min={0} value={base} onChange={(event) => setBase(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Per extra stop (₹)</span>
            <input className="input" type="number" min={0} value={perStop} onChange={(event) => setPerStop(event.target.value)} />
          </label>
          <Button
            variant="primary"
            disabled={busy || base === '' || perStop === ''}
            onClick={() => act(() => setFareMatrix(route.id, 'INR', preview), `${preview.length} fares set.`)}
          >
            Apply to all {preview.length} legs
          </Button>
        </div>
        <p className="cell-muted">
          Next stop: ₹{Number(base)} · whole route ({route.stops[0].name} → {route.stops[route.stops.length - 1].name}):
          ₹{(longest?.fareMinor ?? 0) / 100}
        </p>
      </Card>

      <Card
        title="Every fare"
        actions={<Button onClick={() => setAdvanced((on) => !on)}>{advanced ? 'Hide' : 'Edit fares one by one'}</Button>}
      >
        {advanced ? (
          <FareMatrix
            key={route.id + route.fares.length}
            stops={route.stops}
            fares={route.fares}
            busy={busy}
            onSave={(legs) => act(() => setFareMatrix(route.id, 'INR', legs), 'Fares saved.')}
          />
        ) : (
          <p className="cell-muted">
            {route.fares.length} of {preview.length} legs priced. Open the grid to change a single fare.
          </p>
        )}
      </Card>
    </>
  );
}

function Timetable({ route, busy, act }: { route: ShuttleRoute; busy: boolean; act: Act }) {
  const [adding, setAdding] = useState(false);

  const toggle = (schedule: RouteSchedule) =>
    act(
      () =>
        updateSchedule(route.id, schedule.id, {
          departureTime: schedule.departureTime,
          daysOfWeek: schedule.daysOfWeek,
          seatCapacity: schedule.seatCapacity,
          seatsPerRow: schedule.seatsPerRow,
          active: !schedule.active,
        }),
      schedule.active ? 'Departure paused.' : 'Departure running again.',
    );

  return (
    <Card
      title="Timetable"
      actions={
        <Button variant="primary" disabled={busy || route.stops.length < 2} onClick={() => setAdding(true)}>
          Add departure
        </Button>
      }
    >
      <Table<RouteSchedule>
        columns={[
          { key: 'time', header: 'Leaves', render: (row) => <span className="cell-strong">{row.departureTime.slice(0, 5)}</span> },
          { key: 'days', header: 'Runs', render: (row) => dayNames(row.daysOfWeek) },
          {
            key: 'seats',
            header: 'Vehicle',
            render: (row) => (
              <span className="cell-muted">
                {row.seatCapacity} seats · {row.seatsPerRow} across
              </span>
            ),
          },
          {
            key: 'state',
            header: 'State',
            render: (row) => <Pill tone={row.active ? 'success' : 'muted'}>{row.active ? 'Running' : 'Paused'}</Pill>,
          },
          {
            key: 'action',
            header: '',
            align: 'right',
            render: (row) => (
              <Button disabled={busy} onClick={() => toggle(row)}>
                {row.active ? 'Pause' : 'Resume'}
              </Button>
            ),
          },
        ]}
        rows={route.schedules}
        empty="No departures. Crew for each day is set on the Today board."
      />

      {adding ? (
        <FormDialog
          title={`Add a departure to ${route.name}`}
          body="Crew is assigned per day on the Today board."
          submitLabel="Add departure"
          fields={[
            { name: 'departureTime', label: 'Leaves at', type: 'time', initial: '08:30' },
            {
              name: 'daysOfWeek',
              label: 'Runs on',
              initial: '1,2,3,4,5,6',
              options: [
                { value: '1,2,3,4,5', label: 'Weekdays' },
                { value: '1,2,3,4,5,6', label: 'Monday to Saturday' },
                { value: '1,2,3,4,5,6,7', label: 'Every day' },
                { value: '6,7', label: 'Weekends' },
              ],
            },
            { name: 'seatCapacity', label: 'Seats', type: 'number', initial: '40', hint: 'Between 1 and 60.' },
            {
              name: 'seatsPerRow',
              label: 'Seats per row',
              initial: '4',
              options: [
                { value: '4', label: '4 across - bus or minibus' },
                { value: '3', label: '3 across - 2+1 coach' },
                { value: '2', label: '2 across' },
              ],
            },
          ]}
          extra={(values) => <SeatLayout capacity={Number(values.seatCapacity)} seatsPerRow={Number(values.seatsPerRow)} />}
          onCancel={() => setAdding(false)}
          onSubmit={(values) => {
            setAdding(false);
            act(
              () =>
                addSchedule(route.id, {
                  departureTime: `${values.departureTime}:00`,
                  daysOfWeek: values.daysOfWeek,
                  seatCapacity: Number(values.seatCapacity),
                  seatsPerRow: Number(values.seatsPerRow),
                  active: true,
                }),
              `${values.departureTime} departure added.`,
            );
          }}
        />
      ) : null}
    </Card>
  );
}
