import { useMemo, useState } from 'react';

import type { RouteFare, RouteStop } from '../api/admin';
import { Button } from './ui';
import './ui.css';

/**
 * Every leg on the route, priced in one grid.
 *
 * <p>A route with nine stops has thirty-six forward legs. Priced one dialog at a time, that is
 * thirty-six round trips and no way to see which pair was missed - which is exactly the mistake
 * that shows up as a rider who cannot book a leg the shuttle actually runs.
 *
 * <p>Only the upper triangle is editable: the shuttle runs one way, so boarding after your
 * destination is not a cheaper journey, it is not a journey.
 */
export function FareMatrix({
  stops,
  fares,
  busy,
  onSave,
}: {
  stops: RouteStop[];
  fares: RouteFare[];
  busy: boolean;
  onSave: (legs: { fromStopId: string; toStopId: string; fareMinor: number }[]) => void;
}) {
  // Rupees as typed, keyed by leg. Strings, not numbers: a half-typed "1." is a valid keystroke
  // and Number() would turn it into 1 under the operator's fingers.
  const initial = useMemo(() => {
    const seed: Record<string, string> = {};
    fares.forEach((fare) => {
      seed[`${fare.fromStopId}>${fare.toStopId}`] = (fare.fareMinor / 100).toString();
    });
    return seed;
  }, [fares]);

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [dirty, setDirty] = useState(false);

  if (stops.length < 2) {
    return (
      <div className="empty">
        <strong>Nothing to price yet</strong>
        <div className="empty-body">Add at least two stops first.</div>
      </div>
    );
  }

  const priced = Object.values(values).filter((value) => value.trim() !== '').length;
  const total = (stops.length * (stops.length - 1)) / 2;

  function save() {
    const legs = Object.entries(values)
      .filter(([, value]) => value.trim() !== '')
      .map(([key, value]) => {
        const [fromStopId, toStopId] = key.split('>');
        return {
          fromStopId: fromStopId!,
          toStopId: toStopId!,
          // Minor units all the way to the server: a rupee figure would be rounded twice.
          fareMinor: Math.round(Number(value) * 100),
        };
      })
      // A cell someone typed a letter into is not a fare. Dropping it silently would be worse,
      // but the input is type=number, so this only catches an empty-after-trim edge.
      .filter((leg) => Number.isFinite(leg.fareMinor));

    onSave(legs);
    setDirty(false);
  }

  return (
    <>
      <div className="table-scroll">
        <table className="table fare-matrix">
          <thead>
            <tr>
              <th className="fare-corner">Board ↓ / Off →</th>
              {stops.slice(1).map((stop) => (
                <th key={stop.id} title={stop.name}>
                  {stop.sequence}. {stop.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stops.slice(0, -1).map((from) => (
              <tr key={from.id}>
                <td className="fare-row-head">
                  {from.sequence}. {from.name}
                </td>
                {stops.slice(1).map((to) => {
                  // Blanked, not disabled-looking: a cell that cannot exist should read as absent
                  // rather than as an empty fare somebody forgot to fill in.
                  if (to.sequence <= from.sequence) {
                    return <td key={to.id} className="fare-blank" />;
                  }

                  const key = `${from.id}>${to.id}`;
                  return (
                    <td key={to.id}>
                      <input
                        className="fare-input"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="decimal"
                        placeholder="—"
                        aria-label={`Fare from ${from.name} to ${to.name}`}
                        value={values[key] ?? ''}
                        onChange={(event) => {
                          setValues((current) => ({ ...current, [key]: event.target.value }));
                          setDirty(true);
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fare-matrix-foot">
        <span className="pagination-count">
          <strong>{priced}</strong> of {total} legs priced · blank means the leg is not sold
        </span>
        <Button variant="primary" disabled={busy || !dirty} onClick={save}>
          {busy ? 'Saving…' : 'Save fares'}
        </Button>
      </div>
    </>
  );
}
