import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { addSchedule, addStop, createRoute, setFareMatrix, updateRoute, type RouteStop } from '../api/admin';
import { LocationPicker } from '../components/LocationPicker';
import { RouteMap } from '../components/RouteMap';
import { SeatLayout } from '../components/SeatLayout';
import { Button, Card, PageHeader, Table } from '../components/ui';
import { codeFrom, DAY_CHOICES, legsFromRule } from '../lib/shuttle';

const STEPS = ['Name', 'Stops', 'Fares', 'First departure'] as const;

type DraftStop = { name: string; latitude: number; longitude: number; offsetMinutes: number };

/**
 * A new route in four steps. Nothing is saved until the last one, and the route is created hidden
 * and only shown to riders once every part of it exists - a half-built route is never bookable.
 */
export function ShuttleNewRoutePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [stops, setStops] = useState<DraftStop[]>([]);
  const [base, setBase] = useState('20');
  const [perStop, setPerStop] = useState('5');
  const [time, setTime] = useState('08:00');
  const [days, setDays] = useState<string[]>(['1', '2', '3', '4', '5', '6']);
  const [seats, setSeats] = useState('40');
  const [perRow, setPerRow] = useState('4');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeCode = code || codeFrom(name);
  const canNext = [
    name.trim().length > 0 && /^[A-Z0-9_]+$/.test(routeCode),
    stops.length >= 2,
    base !== '' && perStop !== '',
    time !== '' && days.length > 0 && Number(seats) >= 1 && Number(seats) <= 60,
  ][step];

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const created = await createRoute({ code: routeCode, name: name.trim(), description: description || undefined, active: false });
      let route = created;
      // One at a time: stops are numbered in the order they arrive.
      for (const stop of stops) {
        route = await addStop(created.id, stop);
      }
      await setFareMatrix(created.id, 'INR', legsFromRule(route.stops.map((stop) => stop.id), Number(base), Number(perStop)));
      await addSchedule(created.id, {
        departureTime: `${time}:00`,
        daysOfWeek: [...days].sort().join(','),
        seatCapacity: Number(seats),
        seatsPerRow: Number(perRow),
        active: true,
      });
      await updateRoute(created.id, { code: routeCode, name: name.trim(), description: description || undefined, active: true });
      navigate(`/shuttle/routes/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the route.');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="New route" subtitle="Four steps. Riders see it only after the last one." />

      <ol className="steps">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? 'step active' : index < step ? 'step done' : 'step'}>
            <span className="step-number">{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card title="What is the route called?">
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" placeholder="Bally Halt to Sector V" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Code</span>
            <input
              className="input mono"
              placeholder={codeFrom(name) || 'BALLY_V'}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <span className="cell-muted">Printed on tickets. Capital letters, numbers and _ only. Leave empty to use {codeFrom(name) || 'one made from the name'}.</span>
          </label>
          <label className="field">
            <span className="field-label">Description (optional)</span>
            <input className="input" placeholder="Morning office run via BT Road" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
        </Card>
      ) : null}

      {step === 1 ? <StopsStep stops={stops} setStops={setStops} /> : null}

      {step === 2 ? (
        <Card title="How much does it cost?">
          <p className="cell-muted">
            Every trip costs the base fare, plus an amount for each extra stop. You can change single fares later.
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
          </div>
          <p className="cell-muted">
            {stops[0]?.name} → {stops[1]?.name}: ₹{Number(base)} · whole route ({stops[0]?.name} → {stops[stops.length - 1]?.name}): ₹
            {Number(base) + Number(perStop) * (stops.length - 2)}
          </p>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card title="When does it run?">
          <p className="cell-muted">Add the first departure now; more can be added from the route's Timetable.</p>
          <div className="rule-row">
            <label className="field">
              <span className="field-label">Leaves at</span>
              <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Seats</span>
              <input className="input" type="number" min={1} max={60} value={seats} onChange={(event) => setSeats(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Seats per row</span>
              <select className="input" value={perRow} onChange={(event) => setPerRow(event.target.value)}>
                <option value="4">4 across</option>
                <option value="3">3 across</option>
                <option value="2">2 across</option>
              </select>
            </label>
          </div>
          <span className="field-label">Runs on</span>
          <div className="filter-tabs">
            {DAY_CHOICES.map((day) => (
              <button
                key={day.value}
                type="button"
                className={days.includes(day.value) ? 'filter-tab active' : 'filter-tab'}
                onClick={() =>
                  setDays((current) =>
                    current.includes(day.value) ? current.filter((value) => value !== day.value) : [...current, day.value],
                  )
                }
              >
                {day.label}
              </button>
            ))}
          </div>
          <SeatLayout capacity={Number(seats)} seatsPerRow={Number(perRow)} />
        </Card>
      ) : null}

      {error ? <p className="assign-error">{error}</p> : null}

      <div className="row-actions" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <Button onClick={() => (step === 0 ? navigate('/shuttle') : setStep(step - 1))} disabled={busy}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="primary" disabled={!canNext || busy} onClick={() => void publish()}>
            {busy ? 'Creating...' : 'Create route'}
          </Button>
        )}
      </div>
    </>
  );
}

/** Stops added one after another, each timed from the one before it. */
function StopsStep({ stops, setStops }: { stops: DraftStop[]; setStops: (next: DraftStop[]) => void }) {
  const [stopName, setStopName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gap, setGap] = useState('6');
  const last = stops[stops.length - 1];

  function add() {
    setStops([
      ...stops,
      {
        name: stopName.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        offsetMinutes: last ? last.offsetMinutes + Number(gap || 0) : 0,
      },
    ]);
    setStopName('');
    setLatitude('');
    setLongitude('');
  }

  // The map wants the saved-stop shape; these are drafts, so they are shaped to match.
  const mapped: RouteStop[] = stops.map((stop, index) => ({
    id: String(index),
    sequence: index + 1,
    name: stop.name,
    latitude: String(stop.latitude),
    longitude: String(stop.longitude),
    offsetMinutes: stop.offsetMinutes,
  }));

  return (
    <Card title="Where does it stop?">
      <p className="cell-muted">Add the stops in the order the shuttle reaches them. At least two.</p>
      <div className="doc-layout">
        <div>
          <span className="field-label">Find the stop</span>
          <LocationPicker
            // A fresh picker per stop, so the last stop's search text is not left in the box.
            key={stops.length}
            latitude={latitude}
            longitude={longitude}
            near={last ? [last.longitude, last.latitude] : undefined}
            onPick={(place) => {
              setLatitude(place.latitude.toFixed(6));
              setLongitude(place.longitude.toFixed(6));
              // A search hit names the stop; a drag only moves the pin.
              if (place.label) setStopName(place.label);
            }}
          />
          <label className="field">
            <span className="field-label">Stop name (as riders will see it)</span>
            <input className="input" placeholder="Bally Halt Bus Stop" value={stopName} onChange={(event) => setStopName(event.target.value)} />
          </label>
          {last ? (
            <label className="field">
              <span className="field-label">Minutes from {last.name}</span>
              <input className="input" type="number" min={1} value={gap} onChange={(event) => setGap(event.target.value)} />
            </label>
          ) : null}
          <Button variant="primary" disabled={!stopName.trim() || !latitude || !longitude} onClick={add}>
            Add stop {stops.length + 1}
          </Button>
        </div>
        <div>
          <RouteMap stops={mapped} />
          <Table<DraftStop>
            columns={[
              { key: 'n', header: '#', width: '40px', render: (row) => stops.indexOf(row) + 1 },
              { key: 'name', header: 'Stop', render: (row) => <span className="cell-strong">{row.name}</span> },
              { key: 'at', header: 'Reached', render: (row) => (row.offsetMinutes === 0 ? 'Departure' : `+${row.offsetMinutes} min`) },
            ]}
            rows={stops}
            empty="No stops yet."
          />
          {stops.length > 0 ? <Button onClick={() => setStops(stops.slice(0, -1))}>Remove last</Button> : null}
        </div>
      </div>
    </Card>
  );
}
