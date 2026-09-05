import { useState } from 'react';

import { formatMoney, getAnalytics } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { CHART_COLORS, RankedBars, TrendChart } from '../components/charts';
import { Card, Grid, PageHeader, StatTile, humanState } from '../components/ui';

// Day counts, not states, so these keep their own labels instead of going through FilterTabs.
const RANGES = [7, 14, 30];

/**
 * Marketplace analytics.
 *
 * Two separate trend charts rather than one with two y-axes: rides and rupees are different
 * scales, and a dual axis is the single most common way to draw a relationship that is not there.
 */
export function AnalyticsPage() {
  const [days, setDays] = useState(14);
  // Twice the window in one request: the older half is what "up 12%" is measured against.
  const { data, loading, error } = useQuery(() => getAnalytics(days * 2), [days]);

  const all = data?.days ?? [];
  const points = all.slice(-days);
  const previous = all.slice(0, all.length - days);
  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  const requested = points.map((day) => ({ label: shortDate(day.date), value: day.ridesRequested }));
  const completed = points.map((day) => ({ label: shortDate(day.date), value: day.ridesCompleted }));
  const revenue = points.map((day) => ({ label: shortDate(day.date), value: day.grossMinor }));

  type Day = (typeof all)[number];
  const sum = (rows: Day[], pick: (day: Day) => number) =>
    rows.reduce((total, day) => total + pick(day), 0);

  const totalRides = sum(points, (day) => day.ridesRequested);
  const totalCompleted = sum(points, (day) => day.ridesCompleted);
  const totalGross = sum(points, (day) => day.grossMinor);
  // Completion rate is the number that actually says whether the marketplace is working.
  const completionRate = totalRides > 0 ? Math.round((totalCompleted / totalRides) * 100) : null;

  // No previous period, or a previous period of zero, means there is no honest percentage to
  // show - an increase from nothing is not "up 100%".
  const changeIn = (pick: (day: Day) => number) => {
    if (previous.length === 0) return null;
    const before = sum(previous, pick);
    if (before === 0) return null;
    return ((sum(points, pick) - before) / before) * 100;
  };

  // Axis labels carry the magnitude, not the currency code - the card title and the tile do that.
  const compact = (value: number) =>
    Math.abs(value) >= 100000
      ? `${(value / 100000).toFixed(1)}L`
      : Math.abs(value) >= 1000
        ? `${(value / 1000).toFixed(1)}k`
        : String(value);
  const compactMoney = (minor: number) => compact(Math.round(minor / 100));

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`Last ${days} days, against the ${days} before them`}
        actions={
          <div className="filter-tabs" role="tablist">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                role="tab"
                aria-selected={days === range}
                className={days === range ? 'filter-tab active' : 'filter-tab'}
                onClick={() => setDays(range)}
              >
                {range} days
              </button>
            ))}
          </div>
        }
      />

      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <Grid columns={4}>
        <StatTile
          label="Rides requested"
          value={loading ? '—' : totalRides.toLocaleString()}
          delta={changeIn((day) => day.ridesRequested)}
          note={`Last ${days} days`}
        />
        <StatTile
          label="Completed"
          value={loading ? '—' : totalCompleted.toLocaleString()}
          delta={changeIn((day) => day.ridesCompleted)}
          note="Finished trips"
          tone="success"
        />
        <StatTile
          label="Completion rate"
          value={completionRate === null ? '—' : `${completionRate}%`}
          note="Requested that finished"
          tone={completionRate !== null && completionRate < 50 ? 'warning' : 'default'}
        />
        <StatTile
          label="Gross fares"
          value={data ? formatMoney(totalGross, data.currency) : '—'}
          delta={changeIn((day) => day.grossMinor)}
          note="Charged on completed trips"
          tone="success"
        />
      </Grid>

      <Grid columns={2}>
        <Card title="Rides requested per day">
          <TrendChart points={requested} color={CHART_COLORS.teal} formatTick={compact} width={520} />
        </Card>

        <Card title="Trips completed per day">
          <TrendChart points={completed} color={CHART_COLORS.teal} formatTick={compact} width={520} />
        </Card>
      </Grid>

      {/* Its own chart, not a second axis on the one above: rupees and ride counts do not share
          a scale, and overlaying them invents a correlation. */}
      <Card title={`Gross fares per day (${data?.currency ?? 'INR'})`}>
        <TrendChart
          points={revenue}
          color={CHART_COLORS.blue}
          format={(value) => (data ? formatMoney(value, data.currency) : String(value))}
          formatTick={compactMoney}
        />
      </Card>

      <Grid columns={2}>
        <Card title="Rides by state">
          <RankedBars
            points={(data?.ridesByStatus ?? []).map((slice) => ({
              label: humanState(slice.label),
              value: slice.count,
            }))}
          />
        </Card>

        <Card title="Payments by method">
          <RankedBars
            points={(data?.paymentsByMethod ?? []).map((slice) => ({
              label: humanState(slice.label),
              value: slice.count,
            }))}
            color={CHART_COLORS.teal}
          />
        </Card>
      </Grid>
    </>
  );
}
