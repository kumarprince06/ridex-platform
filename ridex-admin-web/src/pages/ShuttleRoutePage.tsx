import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  addSchedule,
  addStop,
  createReturnRoute,
  deleteRoute,
  getPassPricing,
  getRoute,
  setPassPricing,
  removeStop,
  updateStop,
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

const TABS = ['Overview', 'Stops', 'Fares', 'Timetable', 'Passes'] as const;
type Tab = (typeof TABS)[number];

/** One route, a tab per thing you change about it. */
export function ShuttleRoutePage() {
  const { routeId = '' } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'Overview');
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

      {tab === 'Overview' ? <Overview route={route} busy={busy} act={act} onDeleted={() => navigate('/shuttle')} /> : null}
      {tab === 'Stops' ? <Stops route={route} busy={busy} act={act} /> : null}
      {tab === 'Fares' ? <Fares route={route} busy={busy} act={act} /> : null}
      {tab === 'Timetable' ? <Timetable route={route} busy={busy} act={act} /> : null}
      {tab === 'Passes' ? <Passes route={route} busy={busy} act={act} /> : null}
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

function Overview({ route, busy, act, onDeleted }: { route: ShuttleRoute; busy: boolean; act: Act; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [returning, setReturning] = useState(false);
  const navigate = useNavigate();
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
      <Card
        title="Details"
        actions={
          <span className="row-actions">
            <Button disabled={busy || route.stops.length < 2} onClick={() => setReturning(true)}>
              Create return route
            </Button>
            <Button disabled={busy} onClick={() => setEditing(true)}>
              Edit details
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setDeleting(true)}>
              Delete route
            </Button>
          </span>
        }
      >
        <DetailList
          items={[
            { label: 'Code', value: <span className="mono">{route.code}</span> },
            { label: 'Description', value: route.description || '—' },
            { label: 'Riders see it', value: route.active ? 'Yes' : 'No' },
          ]}
        />
      </Card>

      {returning ? (
        <FormDialog
          title="Create the return route"
          body="The same stops in reverse, the same gaps between them and the same fares each way. It starts hidden from riders - check it, then show it."
          submitLabel="Create return route"
          fields={[
            {
              name: 'times',
              label: 'Departure times, comma separated',
              initial: '17:30, 18:00, 18:30, 19:00',
              hint: 'Same days and vehicle size as this route.',
            },
          ]}
          onCancel={() => setReturning(false)}
          onSubmit={(values) => {
            setReturning(false);
            const times = values.times.split(',').map((time) => time.trim()).filter(Boolean);
            act(async () => {
              const back = await createReturnRoute(route.id, times);
              navigate(`/shuttle/routes/${back.id}`);
            }, 'Return route created.');
          }}
        />
      ) : null}

      {deleting ? (
        <FormDialog
          title={`Delete ${route.name}?`}
          body="Its stops, fares and timetable are deleted with it. A route riders have booked cannot be deleted - hide it from riders instead."
          submitLabel="Delete route"
          fields={[]}
          onCancel={() => setDeleting(false)}
          onSubmit={() => {
            setDeleting(false);
            act(async () => {
              await deleteRoute(route.id);
              onDeleted();
            });
          }}
        />
      ) : null}

      {editing ? (
        <FormDialog
          title="Route details"
          body="The code is printed on tickets, so it stays as it is."
          submitLabel="Save"
          fields={[
            { name: 'name', label: 'Name', initial: route.name },
            { name: 'description', label: 'Description (optional)', initial: route.description ?? '', required: false },
          ]}
          onCancel={() => setEditing(false)}
          onSubmit={(values) => {
            setEditing(false);
            act(
              () => updateRoute(route.id, { code: route.code, name: values.name, description: values.description || undefined, active: route.active }),
              'Route details saved.',
            );
          }}
        />
      ) : null}
    </>
  );
}

/** Add at the end, insert after a stop, or edit one. */
type StopDialog = { kind: 'add'; after: number } | { kind: 'edit'; stop: RouteStop } | { kind: 'delete'; stop: RouteStop };

function Stops({ route, busy, act }: { route: ShuttleRoute; busy: boolean; act: Act }) {
  const [dialog, setDialog] = useState<StopDialog | null>(null);
  const stops = route.stops;

  // The stop a new or edited one is timed from, and the one it must stay ahead of.
  const previous = !dialog || dialog.kind === 'delete' ? undefined
    : dialog.kind === 'add' ? stops[dialog.after - 1] : stops[stops.indexOf(dialog.stop) - 1];
  const editing = dialog?.kind === 'edit' ? dialog.stop : undefined;

  return (
    <Card
      title="Stops, in travel order"
      actions={
        <Button variant="primary" disabled={busy} onClick={() => setDialog({ kind: 'add', after: stops.length })}>
          Add stop at the end
        </Button>
      }
    >
      <RouteMap stops={stops} />
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
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <span className="row-actions">
                <Button variant="ghost" disabled={busy} onClick={() => setDialog({ kind: 'edit', stop: row })}>
                  Edit
                </Button>
                {row.sequence < stops.length ? (
                  <Button variant="ghost" disabled={busy} onClick={() => setDialog({ kind: 'add', after: row.sequence })}>
                    Insert after
                  </Button>
                ) : null}
                <Button variant="ghost" disabled={busy} onClick={() => setDialog({ kind: 'delete', stop: row })}>
                  Delete
                </Button>
              </span>
            ),
          },
        ]}
        rows={stops}
        empty="No stops yet. A route needs at least two."
      />

      {dialog && dialog.kind !== 'delete' ? (
        <FormDialog
          title={editing ? `Edit ${editing.name}` : dialog.kind === 'add' && dialog.after < stops.length ? `Insert a stop after ${stops[dialog.after - 1]?.name ?? 'the start'}` : `Add a stop to ${route.name}`}
          body="Search for the place or click the map. Time is counted from the stop before."
          submitLabel={editing ? 'Save stop' : 'Add stop'}
          fields={[
            { name: 'name', label: 'Stop name', placeholder: 'Dunlop More', initial: editing?.name },
            { name: 'latitude', label: 'Latitude', type: 'number', initial: editing?.latitude },
            { name: 'longitude', label: 'Longitude', type: 'number', initial: editing?.longitude },
            ...(previous
              ? [{
                  name: 'gap',
                  label: `Minutes from ${previous.name}`,
                  type: 'number' as const,
                  initial: editing ? String(editing.offsetMinutes - previous.offsetMinutes) : '5',
                }]
              : []),
          ]}
          extra={(values, set) => (
            <LocationPicker
              latitude={values.latitude}
              longitude={values.longitude}
              near={previous ? [Number(previous.longitude), Number(previous.latitude)] : undefined}
              onPick={(place) =>
                set({
                  latitude: place.latitude.toFixed(6),
                  longitude: place.longitude.toFixed(6),
                  ...(place.label && !values.name ? { name: place.label } : {}),
                })
              }
            />
          )}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => {
            const current = dialog;
            setDialog(null);
            const stop = {
              name: values.name,
              latitude: Number(values.latitude),
              longitude: Number(values.longitude),
              offsetMinutes: previous ? previous.offsetMinutes + Number(values.gap || 0) : 0,
            };
            act(
              () =>
                current.kind === 'edit'
                  ? updateStop(route.id, current.stop.id, stop)
                  : addStop(route.id, stop, current.after < stops.length ? current.after : undefined),
              current.kind === 'edit' ? `${values.name} saved.` : `${values.name} added.`,
            );
          }}
        />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <FormDialog
          title={`Delete ${dialog.stop.name}?`}
          body="Its fares are deleted with it and the stops after it move up. A stop riders have booked cannot be deleted - rename it or move its pin instead."
          submitLabel="Delete stop"
          fields={[]}
          onCancel={() => setDialog(null)}
          onSubmit={() => {
            const stop = dialog.stop;
            setDialog(null);
            act(() => removeStop(route.id, stop.id), `${stop.name} deleted.`);
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

/**
 * Passes for this route: one monthly price, and a discount for each longer plan. A pass covers
 * every seat on this route only - other routes are still paid for.
 */
function Passes({ route, busy, act }: { route: ShuttleRoute; busy: boolean; act: Act }) {
  const { data: pricing, refetch } = useQuery(() => getPassPricing(route.id), [route.id]);
  const [monthly, setMonthly] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<Record<string, string> | null>(null);

  // A starting point: one full-route trip every working day, less 15% for committing to the month.
  const longestFare = Math.max(0, ...route.fares.map((fare) => fare.fareMinor));
  const suggested = Math.round((longestFare * 22 * 0.85) / 100 / 10) * 10;

  const savedMonthly = pricing?.monthlyPriceMinor != null ? String(pricing.monthlyPriceMinor / 100) : '';
  const monthlyValue = monthly ?? (savedMonthly || String(suggested || ''));
  const discountOf = (plan: string, fallback: number) =>
    discounts?.[plan] ?? String(pricing?.plans.find((row) => row.plan === plan && row.priceMinor != null)?.discountPercent ?? fallback);
  const values = { QUARTERLY: discountOf('QUARTERLY', 5), HALF_YEARLY: discountOf('HALF_YEARLY', 10), YEARLY: discountOf('YEARLY', 15) };

  const rows = (pricing?.plans ?? []).map((plan) => {
    const discount = plan.plan === 'MONTHLY' ? 0 : Number(values[plan.plan as keyof typeof values] || 0);
    const price = Math.round((Number(monthlyValue || 0) * plan.months * (100 - discount)) / 100);
    return { ...plan, discount, price, perMonth: Math.round(price / plan.months) };
  });

  if (route.fares.length === 0) {
    return <EmptyState title="Set the fares first">Pass prices are compared against what the trips cost.</EmptyState>;
  }

  const save = (onSale: boolean) =>
    act(async () => {
      await setPassPricing(route.id, {
        monthlyPriceMinor: Number(monthlyValue) * 100,
        quarterlyDiscountPercent: Number(values.QUARTERLY || 0),
        halfYearlyDiscountPercent: Number(values.HALF_YEARLY || 0),
        yearlyDiscountPercent: Number(values.YEARLY || 0),
        onSale,
      });
      setMonthly(null);
      setDiscounts(null);
      await refetch();
    }, onSale ? 'Passes are on sale for this route.' : 'Passes saved, not on sale.');

  return (
    <>
      <Card
        title="Pass prices"
        actions={
          pricing?.onSale ? <Pill tone="success">On sale</Pill> : <Pill tone="muted">Not on sale</Pill>
        }
      >
        <p className="cell-muted">
          A pass covers every seat on {route.name} for its whole period, so riders book without paying. Other routes are
          still paid. Longer plans cost less per month.
        </p>
        <div className="rule-row">
          <label className="field">
            <span className="field-label">Monthly price (₹)</span>
            <input className="input" type="number" min={1} value={monthlyValue} onChange={(event) => setMonthly(event.target.value)} />
          </label>
          {(['QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as const).map((plan) => (
            <label className="field" key={plan}>
              <span className="field-label">{plan === 'QUARTERLY' ? 'Quarterly' : plan === 'HALF_YEARLY' ? 'Half-yearly' : 'Yearly'} discount (%)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={60}
                value={values[plan]}
                onChange={(event) => setDiscounts({ ...values, [plan]: event.target.value })}
              />
            </label>
          ))}
        </div>
        {suggested ? (
          <p className="cell-muted">
            Suggested monthly price: ₹{suggested} - the whole route (₹{longestFare / 100}) every working day, 15% off.
          </p>
        ) : null}
      </Card>

      <Card title="What riders will see">
        <Table
          columns={[
            { key: 'label', header: 'Plan', render: (row: (typeof rows)[number]) => <span className="cell-strong">{row.label}</span> },
            { key: 'days', header: 'Valid for', render: (row) => `${row.durationDays} days` },
            { key: 'price', header: 'Price', align: 'right', render: (row) => <span className="cell-strong">₹{row.price.toLocaleString('en-IN')}</span> },
            { key: 'perMonth', header: 'Per month', align: 'right', render: (row) => `₹${row.perMonth.toLocaleString('en-IN')}` },
            { key: 'save', header: 'Saving', align: 'right', render: (row) => (row.discount ? <Pill tone="success">{row.discount}% off</Pill> : '—') },
            { key: 'active', header: 'Riders holding it', align: 'right', render: (row) => row.activePasses },
          ]}
          rows={rows}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          {pricing?.onSale ? (
            <Button disabled={busy} onClick={() => save(false)}>
              Stop selling
            </Button>
          ) : null}
          <Button variant="primary" disabled={busy || !Number(monthlyValue)} onClick={() => save(true)}>
            {pricing?.onSale ? 'Save prices' : 'Put on sale'}
          </Button>
        </div>
        <p className="cell-muted">Riders who already hold a pass keep the price they paid.</p>
      </Card>
    </>
  );
}

