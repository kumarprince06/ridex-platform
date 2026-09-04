import { useState } from 'react';

import { formatMoney, getAnalytics } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { CHART_COLORS, RankedBars, TrendChart } from '../components/charts';
import { Card, Grid, PageHeader, StatTile, humanState } from '../components/ui';

const RANGES = [7, 14, 30];

/**
 * Marketplace analytics.
 *
 * Two separate trend charts rather than one with two y-axes: rides and rupees are different
 * scales, and a dual axis is the single most common way to draw a relationship that is not there.
 */
export function AnalyticsPage() {
  const [days, setDays] = useState(14);
  const { data, loading, error } = useQuery(() => getAnalytics(days), [days]);

  const points = data?.days ?? [];
  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  const requested = points.map((day) => ({ label: shortDate(day.date), value: day.ridesRequested }));
  const completed = points.map((day) => ({ label: shortDate(day.date), value: day.ridesCompleted }));
  const revenue = points.map((day) => ({ label: shortDate(day.date), value: day.grossMinor }));

  const totalRides = points.reduce((sum, day) => sum + day.ridesRequested, 0);
  const totalCompleted = points.reduce((sum, day) => sum + day.ridesCompleted, 0);
  const totalGross = points.reduce((sum, day) => sum + day.grossMinor, 0);
  // Completion rate is the number that actually says whether the marketplace is working.
  const completionRate = totalRides > 0 ? Math.round((totalCompleted / totalRides) * 100) : null;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`Last ${days} days, UTC`}
        actions={
          <span style={{ display: 'inline-flex', gap: 8 }}>
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                className={days === range ? 'chip chip-active' : 'chip'}
                onClick={() => setDays(range)}
              >
                {range} days
              </button>
            ))}
          </span>
        }
      />

      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <Grid columns={4}>
        <StatTile label="Rides requested" value={loading ? '—' : totalRides} note={`Last ${days} days`} />
        <StatTile label="Completed" value={loading ? '—' : totalCompleted} note="Finished trips" tone="success" />
        <StatTile
          label="Completion rate"
          value={completionRate === null ? '—' : `${completionRate}%`}
          note="Requested that finished"
          tone={completionRate !== null && completionRate < 50 ? 'warning' : 'default'}
        />
        <StatTile
          label="Gross fares"
          value={data ? formatMoney(totalGross, data.currency) : '—'}
          note="Charged on completed trips"
          tone="success"
        />
      </Grid>

      <Card title="Rides requested per day">
        <TrendChart points={requested} color={CHART_COLORS.teal} />
      </Card>

      <Card title="Trips completed per day">
        <TrendChart points={completed} color={CHART_COLORS.teal} />
      </Card>

      {/* Its own chart, not a second axis on the one above: rupees and ride counts do not share
          a scale, and overlaying them invents a correlation. */}
      <Card title="Gross fares per day">
        <TrendChart
          points={revenue}
          color={CHART_COLORS.blue}
          format={(value) => (data ? formatMoney(value, data.currency) : String(value))}
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
