import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney, getEarnings, type EarningLine } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Earnings'>;

const PERIODS = [
  { label: 'Today', days: 1 },
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
] as const;

const DAY_MS = 86_400_000;

export function EarningsScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0]);
  const { data, loading, error } = useQuery(getEarnings, []);

  // Windowed in the app, not the API: the endpoint returns the last fifty lines, which covers
  // every window this screen offers. A per-period query would be three round trips for one answer.
  const since = Date.now() - period.days * DAY_MS;
  const lines = (data?.recent ?? []).filter((line) => Date.parse(line.createdAt) >= since);

  const gross = sum(lines, (line) => line.grossAmountMinor);
  const commission = sum(lines, (line) => line.commissionMinor);
  const net = sum(lines, (line) => line.netAmountMinor);
  const currency = data?.currency ?? 'INR';

  return (
    <Screen title="Earnings">
      <View style={styles.periods}>
        {PERIODS.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={period.label === option.label}
            onPress={() => setPeriod(option)}
            style={styles.period}
          />
        ))}
      </View>

      {loading && data == null ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Net, not gross. Gross is not spendable, and a single blended number fails an audit. */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>NET EARNINGS</Text>
        <Text style={styles.heroValue}>{formatMoney(net, currency)}</Text>
        <Text style={styles.heroNote}>
          {lines.length} {lines.length === 1 ? 'trip' : 'trips'} · owed{' '}
          {formatMoney(data?.ledgerBalanceMinor ?? 0, currency)}
        </Text>
      </View>

      <SectionLabel>BREAKDOWN</SectionLabel>

      {/* Three lines, not seven. Tips, taxes and adjustments are not on the earnings response and
          showing them as zero would read as "you got no tips" rather than "not recorded yet". */}
      <View style={styles.card}>
        <Line label="Gross fares" value={formatMoney(gross, currency)} />
        <Line label="Platform fee" value={`-${formatMoney(commission, currency)}`} muted />
        <View style={styles.divider} />
        <Line label="Net" value={formatMoney(net, currency)} strong />
      </View>

      <SectionLabel>PER TRIP</SectionLabel>

      {lines.length === 0 && !loading ? (
        <Text style={styles.empty}>No trips in this period.</Text>
      ) : null}

      {lines.map((line) => (
        <TripLine key={line.tripId} line={line} currency={currency} />
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Payouts')}
        style={({ pressed }) => [styles.payoutLink, pressed && styles.pressed]}
      >
        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
        <Text style={styles.payoutLinkText}>See payouts</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </Screen>
  );
}

/** The commission rate is on every line so the driver can check the fee against their own trip. */
function TripLine({ line, currency }: { line: EarningLine; currency: string }) {
  return (
    <View style={styles.tripRow}>
      <View style={styles.tripText}>
        <Text style={styles.tripId}>Trip #{line.tripId.slice(-8)}</Text>
        <Text style={styles.tripMeta}>
          {new Date(line.createdAt).toLocaleDateString()} ·{' '}
          {formatMoney(line.grossAmountMinor, currency)} gross ·{' '}
          {(line.commissionRate * 100).toFixed(1)}% fee
        </Text>
      </View>
      <Text style={styles.tripNet}>{formatMoney(line.netAmountMinor, currency)}</Text>
    </View>
  );
}

function sum(lines: EarningLine[], pick: (line: EarningLine) => number): number {
  return lines.reduce((total, line) => total + pick(line), 0);
}

function Line({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, muted && styles.lineMuted, strong && styles.lineStrong]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  periods: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  period: {
    flex: 1,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  hero: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    ...type.caption,
    color: colors.primary,
    letterSpacing: 1,
  },
  heroValue: {
    ...type.title,
    fontSize: 34,
    color: colors.text,
    marginVertical: 2,
  },
  heroNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  lineLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  lineValue: {
    ...type.body,
    color: colors.text,
  },
  lineMuted: {
    color: colors.textMuted,
  },
  lineStrong: {
    ...type.label,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tripText: {
    flex: 1,
  },
  tripId: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  tripMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  tripNet: {
    ...type.label,
    fontSize: 15,
    color: colors.text,
  },
  payoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  payoutLinkText: {
    ...type.label,
    flex: 1,
    color: colors.text,
  },
  pressed: {
    opacity: 0.75,
  },
});
