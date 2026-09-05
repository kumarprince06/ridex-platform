import './ui.css';

/**
 * The seat grid a rider will actually be shown, drawn from capacity and row width.
 *
 * <p>The labels are generated, not stored - the same rule the server uses, so what operations sees
 * here is what the picker renders. A number in a form does not tell anybody that 18 seats three
 * abreast leaves a row of two at the back.
 */
export function SeatLayout({
  capacity,
  seatsPerRow,
}: {
  capacity: number;
  seatsPerRow: number;
}) {
  const width = Math.min(Math.max(1, seatsPerRow || 1), 4);
  const seats = Number.isFinite(capacity) && capacity > 0 ? Math.min(capacity, 60) : 0;

  if (seats === 0) {
    return null;
  }

  const labels = Array.from({ length: seats }, (_, index) => {
    const row = Math.floor(index / width) + 1;
    return `${row}${'ABCD'[index % width]}`;
  });

  return (
    <div className="seat-layout">
      <span className="field-label">
        {seats} seats · {Math.ceil(seats / width)} rows
      </span>
      <div
        className="seat-grid"
        style={{ gridTemplateColumns: `repeat(${width}, 34px)` }}
        aria-hidden="true"
      >
        {labels.map((label) => (
          <span className="seat" key={label}>
            {label}
          </span>
        ))}
      </div>
      {/* The remainder is the thing worth naming: a part-filled last row is fine, but seeing it
          is how somebody notices they meant 20 seats rather than 18. */}
      {seats % width !== 0 ? (
        <span className="field-hint">
          The last row holds {seats % width} of {width}.
        </span>
      ) : null}
    </div>
  );
}
