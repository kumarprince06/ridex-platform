import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { RouteStops } from '../components/RouteStops';
import { Screen } from '../components/Screen';
import { DRIVER, FARE_LINES } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TripReceipt'>;

export function TripReceiptScreen({ navigation, route }: Props) {
  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Trip Receipt"
      headerRight={
        <View style={styles.chip}>
          <Ionicons name="share-outline" size={18} color={colors.text} />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Ionicons name="navigate" size={22} color={colors.onPrimary} />
        </View>

        <Text style={styles.total}>$10.88</Text>
        <Text style={styles.date}>Aug 16, 2026 · 2:30 PM</Text>

        <View style={styles.paidPill}>
          <Text style={styles.paidText}>Paid · Visa ••4892</Text>
        </View>
      </View>

      <View style={styles.card}>
        <RouteStops
          pickup={{ name: 'Midtown, New York', detail: '2:12 PM' }}
          dropoff={{ name: 'Grand Central Terminal', detail: '2:30 PM · 18 min · 2.4 km' }}
        />
      </View>

      <View style={styles.card}>
        {FARE_LINES.map((line) => (
          <View key={line.label} style={styles.row}>
            <Text style={styles.label}>{line.label}</Text>
            <Text style={[styles.amount, line.credit && styles.credit]}>{line.amount}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>$10.88</Text>
        </View>
      </View>

      <View style={[styles.card, styles.driverCard]}>
        <Avatar name={DRIVER.name} size={44} />
        <View style={styles.flex}>
          <Text style={styles.driverName}>{DRIVER.name}</Text>
          <Text style={styles.driverMeta}>
            ★ {DRIVER.rating} · {DRIVER.tier}
          </Text>
        </View>
        <View style={styles.tripPill}>
          <Text style={styles.tripPillText}>Trip #{route.params.rideId}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '10deg' }],
  },
  total: {
    ...type.hero,
    fontSize: 34,
    color: colors.primary,
    marginTop: spacing.lg,
  },
  date: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  paidPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
    marginTop: spacing.md,
  },
  paidText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: {
    ...type.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  amount: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
  },
  credit: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    ...type.button,
    color: colors.text,
  },
  totalAmount: {
    ...type.button,
    fontSize: 17,
    color: colors.primary,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  driverMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  tripPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  tripPillText: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
