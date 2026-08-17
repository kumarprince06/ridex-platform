import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { RouteStops } from '../components/RouteStops';
import { Screen } from '../components/Screen';
import { FARE_LINES, RIDE_TIERS } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FareEstimate'>;

const METHODS = [
  { id: 'visa', icon: 'card' as const, tone: '#E0B252', label: 'Visa ••4892' },
  { id: 'wallet', icon: 'wallet' as const, tone: '#E06FA8', label: 'RideX $24' },
  { id: 'cash', icon: 'cash' as const, tone: '#5FD68A', label: 'Cash' },
];

export function FareEstimateScreen({ navigation, route }: Props) {
  const { destination, tierId } = route.params;
  const [methodId, setMethodId] = useState('visa');

  const tier = RIDE_TIERS.find((item) => item.id === tierId) ?? RIDE_TIERS[0]!;

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Fare Estimate"
      footer={
        <Button
          label="Request Ride · $10.88"
          onPress={() => navigation.navigate('FindingDriver', { destination })}
        />
      }
    >
      <View style={styles.card}>
        <RouteStops
          pickup={{ name: 'Midtown, New York', detail: 'Pickup location' }}
          dropoff={{ name: destination, detail: '89 E 42nd St' }}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.tierRow}>
          <View style={[styles.tierIcon, { backgroundColor: `${tier.tone}2E` }]}>
            <Ionicons name={tier.icon} size={20} color={tier.tone} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierMeta}>
              ETA {tier.eta} · {tier.seats} seats · {tier.blurb}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {FARE_LINES.map((line) => (
          <View key={line.label} style={styles.fareRow}>
            <Text style={styles.fareLabel}>{line.label}</Text>
            <Text style={[styles.fareAmount, line.credit && styles.credit]}>{line.amount}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.fareRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>$10.88</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.methodsLabel}>PAYMENT METHOD</Text>
        <View style={styles.methods}>
          {METHODS.map((method) => {
            const selected = method.id === methodId;
            return (
              <Pressable
                key={method.id}
                onPress={() => setMethodId(method.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.method, selected && styles.methodSelected]}
              >
                <Ionicons name={method.icon} size={18} color={method.tone} />
                <Text style={styles.methodLabel}>{method.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tierIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierName: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  tierMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  fareLabel: {
    ...type.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  fareAmount: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
  },
  credit: {
    color: colors.primary,
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
  methodsLabel: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  methods: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  methodSelected: {
    borderColor: colors.primary,
  },
  methodLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.text,
  },
});
