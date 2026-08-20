import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { Stars } from '../components/Stars';
import { DRIVER } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Ratings'>;

/** Weighted so the driver can see which number is at risk, not just what it is today. */
const RATES = [
  { label: 'Acceptance rate', value: DRIVER.acceptance, note: 'Last 100 offers', good: true },
  { label: 'Cancellation rate', value: DRIVER.cancellation, note: 'Last 100 accepted trips', good: true },
  { label: 'Completion rate', value: '98%', note: 'Last 100 accepted trips', good: true },
];

const BREAKDOWN = [
  { stars: 5, count: 1148 },
  { stars: 4, count: 96 },
  { stars: 3, count: 27 },
  { stars: 2, count: 8 },
  { stars: 1, count: 5 },
];

export function RatingsScreen({ navigation }: Props) {
  const total = BREAKDOWN.reduce((sum, row) => sum + row.count, 0);

  return (
    <Screen onBack={() => navigation.goBack()} title="Ratings">
      <View style={styles.hero}>
        <Text style={styles.rating}>{DRIVER.rating}</Text>
        <Stars value={Math.round(DRIVER.rating)} size={20} />
        <Text style={styles.count}>{total} rated trips</Text>
      </View>

      <SectionLabel>YOUR RATES</SectionLabel>

      {RATES.map((rate) => (
        <View key={rate.label} style={styles.rateRow}>
          <View style={styles.rateText}>
            <Text style={styles.rateLabel}>{rate.label}</Text>
            <Text style={styles.rateNote}>{rate.note}</Text>
          </View>
          <Text style={[styles.rateValue, { color: rate.good ? colors.success : colors.warning }]}>
            {rate.value}
          </Text>
        </View>
      ))}

      <SectionLabel>RATING BREAKDOWN</SectionLabel>

      {BREAKDOWN.map((row) => {
        const share = row.count / total;

        return (
          <View key={row.stars} style={styles.barRow}>
            <Text style={styles.barStar}>{row.stars}</Text>
            <Ionicons name="star" size={12} color={colors.primary} />
            <View style={styles.track}>
              <View style={[styles.fill, { flex: share }]} />
              <View style={{ flex: 1 - share }} />
            </View>
            <Text style={styles.barCount}>{row.count}</Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  rating: {
    ...type.hero,
    fontSize: 52,
    color: colors.text,
  },
  count: {
    ...type.caption,
    color: colors.textMuted,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  rateText: {
    flex: 1,
  },
  rateLabel: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  rateNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  rateValue: {
    ...type.button,
    fontSize: 17,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
  },
  barStar: {
    ...type.caption,
    color: colors.textMuted,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.primary,
  },
  barCount: {
    ...type.caption,
    width: 44,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
