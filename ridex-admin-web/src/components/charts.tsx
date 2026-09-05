/**
 * Small SVG charts for the console.
 *
 * ponytail: hand-drawn SVG, not a charting library. Three chart shapes over a series of at most
 * ninety points does not need 400KB of Recharts, and the mark specs are easier to hold to when
 * the geometry is right here.
 *
 * Colours are validated against the dataviz six checks on the light surface: #0d8a74 and #2563c9
 * pass the lightness band, chroma floor, CVD separation and 3:1 contrast.
 */
import { useState } from 'react';

const SERIES = {
  teal: '#0d8a74',
  blue: '#2563c9',
} as const;

type Point = { label: string; value: number };

function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / magnitude) * magnitude;
}

/**
 * A single series over time.
 *
 * One series, so no legend: the card title already says what is plotted. The endpoint carries a
 * direct label; the rest is the axis and the tooltip, because a number on every point is chaos.
 */
export function TrendChart({
  points,
  color = SERIES.teal,
  format = (value: number) => String(value),
  formatTick,
  height = 180,
  width = 720,
}: {
  points: Point[];
  color?: string;
  /** The full value, for the tooltip. */
  format?: (value: number) => string;
  /** The short value, for the axis and the endpoint. Falls back to the full one. */
  formatTick?: (value: number) => string;
  height?: number;
  /**
   * viewBox width. The SVG scales to its container, and text scales with it - a 720-wide chart
   * in a 560-wide card renders 11px labels at 8.6px. Narrow the box for a narrow card.
   */
  width?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="chart-empty">Nothing to plot yet.</p>;
  }

  const tick = formatTick ?? format;
  const max = niceCeiling(Math.max(...points.map((point) => point.value), 1));

  // The gutters are sized from the text that goes in them. Fixed padding clipped "INR 40000.00"
  // on the left and ran the endpoint label off the right edge of the card.
  const em = 6.6;
  const widestTick = Math.max(...[0, 0.5, 1].map((f) => tick(Math.round(max * f)).length));
  const last = points[points.length - 1]!;

  const padding = {
    top: 16,
    right: Math.max(tick(last.value).length * em + 18, 24),
    bottom: 26,
    left: widestTick * em + 12,
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const x = (index: number) => padding.left + index * stepX;
  const y = (value: number) => padding.top + plotHeight - (value / max) * plotHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const area = `${padding.left},${padding.top + plotHeight} ${line} ${x(points.length - 1)},${
    padding.top + plotHeight
  }`;

  const active = hover === null ? null : points[hover];

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="chart-svg">
        {/* Hairline gridlines, one step off the surface: present, never competing. */}
        {[0, 0.5, 1].map((fraction) => (
          <line
            key={fraction}
            x1={padding.left}
            x2={padding.left + plotWidth}
            y1={padding.top + plotHeight * fraction}
            y2={padding.top + plotHeight * fraction}
            className="chart-grid"
          />
        ))}
        {[1, 0.5, 0].map((fraction) => (
          <text
            key={fraction}
            x={padding.left - 8}
            y={padding.top + plotHeight * (1 - fraction) + 4}
            className="chart-tick"
            textAnchor="end"
          >
            {tick(Math.round(max * fraction))}
          </text>
        ))}

        {/* A wash, never a saturated block. */}
        <polygon points={area} fill={color} opacity="0.1" />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Endpoint marker with a surface ring, so it stays legible over the line. */}
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="4.5" fill={color}
                stroke="var(--surface)" strokeWidth="2" />
        <text x={x(points.length - 1) + 10} y={y(last.value) + 4} className="chart-endlabel">
          {tick(last.value)}
        </text>

        {points.map((point, index) => (
          <g key={point.label}>
            {hover === index ? (
              <line x1={x(index)} x2={x(index)} y1={padding.top} y2={padding.top + plotHeight}
                    className="chart-crosshair" />
            ) : null}
            {/* Hit target far wider than the mark: a 2px line is not a pointer target. */}
            <rect
              x={x(index) - stepX / 2}
              y={padding.top}
              width={Math.max(stepX, 8)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}

        {points.map((point, index) =>
          index % Math.ceil(points.length / 7) === 0 ? (
            <text key={point.label} x={x(index)} y={height - 8} className="chart-tick"
                  textAnchor="middle">
              {point.label}
            </text>
          ) : null,
        )}
      </svg>

      {active ? (
        <div className="chart-tooltip">
          <strong>{active.label}</strong> · {format(active.value)}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Magnitude across a handful of named things.
 *
 * Horizontal, because the labels are words; one hue, because this is magnitude and not identity.
 */
export function RankedBars({
  points,
  color = SERIES.blue,
  format = (value: number) => String(value),
}: {
  points: Point[];
  color?: string;
  format?: (value: number) => string;
}) {
  if (points.length === 0) {
    return <p className="chart-empty">Nothing to plot yet.</p>;
  }

  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="bars">
      {points.map((point) => (
        <div className="bar-row" key={point.label}>
          <span className="bar-label">{point.label}</span>
          <span className="bar-track">
            {/* Capped thickness, rounded at the data end, square at the baseline. */}
            <span
              className="bar-fill"
              style={{ width: `${Math.max((point.value / max) * 100, 1.5)}%`, background: color }}
            />
          </span>
          <span className="bar-value">{format(point.value)}</span>
        </div>
      ))}
    </div>
  );
}

export const CHART_COLORS = SERIES;
