import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { EARNINGS, TRIPS } from '../data/mock';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Earnings'>;

const PERIODS = ['Today', 'Week', 'Month'] as const;

export function EarningsScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('Today');
  const data = EARNINGS[period];

  return (
    <Screen title="Earnings">
      <View style={styles.periods}>
        {PERIODS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={period === option}
            onPress={() => setPeriod(option)}
            style={styles.period}
          />
        ))}
      </View>

      {/* Net, not gross. Gross is not spendable, and a single blended number fails an audit. */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>NET EARNINGS</Text>
        <Text style={styles.heroValue}>{data.net}</Text>
        <Text style={styles.heroNote}>
          {data.trips} trips · {data.online} online · {data.perHour} per hour
        </Text>
      </View>

      <SectionLabel>BREAKDOWN</SectionLabel>

      <View style={styles.card}>
        <Line label="Gross fares" value={data.gross} />
        <Line label="Platform fee" value={data.fee} muted />
        <Line label="Taxes" value={data.tax} muted />
        <Line label="Tips" value={data.tips} positive />
        <Line label="Adjustments" value={data.adjustments} />
        <View style={styles.divider} />
        <Line label="Net" value={data.net} strong />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Payouts')}
        style={({ pressed }) => [styles.payout, pressed && styles.pressed]}
      >
        <View style={styles.payoutIcon}>
          <Ionicons name="cash" size={19} color={colors.success} />
        </View>
        <View style={styles.payoutText}>
          <Text style={styles.payoutTitle}>Next payout</Text>
          <Text style={styles.payoutNote}>Monday, to HDFC ••4412</Text>
        </View>
        <Text style={styles.payoutValue}>{EARNINGS.Week.net}</Text>
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </Pressable>

      <SectionLabel>TRIP EARNINGS</SectionLabel>

      {TRIPS.map((trip) => (
        <Pressable
          key={trip.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
          style={({ pressed }) => [styles.trip, pressed && styles.pressed]}
        >
          <View style={styles.tripText}>
            <Text style={styles.tripRoute} numberOfLines={1}>
              {trip.pickup} → {trip.dropoff}
            </Text>
            <Text style={styles.tripWhen}>
              {trip.when} · {trip.tier}
            </Text>
          </View>
          <View style={styles.tripMoney}>
            <Text style={styles.tripNet}>{trip.net}</Text>
            <Text style={styles.tripGross}>of {trip.gross}</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

function Line({
  label,
  value,
  muted = false,
  positive = false,
  strong = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  positive?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text
        style={[
          styles.lineValue,
          muted && styles.lineMuted,
          positive && styles.linePositive,
          strong && styles.lineStrong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  periods: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  period: {
    flex: 1,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  heroLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
  },
  heroValue: {
    ...type.hero,
    fontSize: 44,
    color: colors.text,
    marginTop: spacing.sm,
  },
  heroNote: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  linePositive: {
    color: colors.success,
  },
  lineStrong: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  payoutIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutText: {
    flex: 1,
  },
  payoutTitle: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  payoutNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  payoutValue: {
    ...type.button,
    fontSize: 15,
    color: colors.success,
  },
  pressed: {
    opacity: 0.75,
  },
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tripText: {
    flex: 1,
  },
  tripRoute: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  tripWhen: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  tripMoney: {
    alignItems: 'flex-end',
  },
  tripNet: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  tripGross: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
  },
});
