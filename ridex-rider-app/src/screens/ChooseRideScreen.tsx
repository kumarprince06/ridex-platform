import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { estimate, formatMoney, type EstimateOption } from '../api/rides';
import { ApiError } from '../api/problem';
import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { RIDE_TIERS } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChooseRide'>;

// Fixed pickup until live location is wired; the destination comes from the search screen.
const FALLBACK_PICKUP: [number, number] = [12.9352, 77.6245];

export function ChooseRideScreen({ navigation, route }: Props) {
  const { destination, destinationCoord } = route.params;
  const [options, setOptions] = useState<EstimateOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const priced = await estimate(
          FALLBACK_PICKUP,
          destinationCoord ?? [12.9784, 77.6408],
        );
        setOptions(priced);
        setSelectedId(priced[0]?.estimateId ?? null);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.userMessage : 'Could not price this trip.');
      }
    })();
  }, [destinationCoord]);

  const selected = options?.find((option) => option.estimateId === selectedId) ?? null;
  // The server priced every option; anything the local mock adds is presentation only.
  const iconFor = (index: number) => RIDE_TIERS[index % RIDE_TIERS.length]!;

  return (
    <View style={styles.root}>
      <MapCanvas showRoute />

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backChip}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <Text style={styles.title}>Choose your ride</Text>
        <Text style={styles.subtitle}>
          {destination}
          {selected ? ` · ${(selected.distanceMeters / 1000).toFixed(1)} km` : ''}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {(options ?? []).map((option, index) => {
            const tier = iconFor(index);
            const isSelected = option.estimateId === selectedId;

            return (
              <Pressable
                key={option.estimateId}
                onPress={() => setSelectedId(option.estimateId)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[styles.tier, isSelected && styles.tierSelected]}
              >
                <View style={[styles.tierIcon, { backgroundColor: `${tier.tone}2E` }]}>
                  <Ionicons name={tier.icon} size={22} color={tier.tone} />
                </View>

                <View style={styles.flex}>
                  <View style={styles.tierNameRow}>
                    <Text style={styles.tierName}>{option.displayName}</Text>
                    {tier.popular ? (
                      <View style={styles.popular}>
                        <Text style={styles.popularText}>Popular</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.tierBlurb}>{option.description ?? tier.blurb}</Text>

                  <View style={styles.tierMeta}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <Text style={styles.tierMetaText}>
                      {Math.round(option.durationSeconds / 60)} min
                    </Text>
                    <Ionicons name="people" size={11} color={colors.textMuted} />
                    <Text style={styles.tierMetaText}>{option.seatCapacity}</Text>
                  </View>
                </View>

                <View style={styles.tierRight}>
                  <Text style={styles.tierPrice}>
                    {formatMoney(option.totalMinor, option.currency)}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          label={selected ? `Continue with ${selected.displayName}` : 'Pricing your trip...'}
          disabled={!selected}
          onPress={() =>
            selected &&
            navigation.navigate('FareEstimate', {
              destination,
              tierId: selected.rideTypeCode,
              estimateId: selected.estimateId,
            })
          }
          style={styles.action}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    // Caps the panel at roughly two-thirds so the map stays visible above it, and the tier list
    // scrolls inside rather than pushing the button off-screen on a short device.
    marginTop: 'auto',
    maxHeight: '74%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  subtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  list: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tierSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(46, 231, 199, 0.07)',
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierName: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  popular: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.16)',
  },
  popularText: {
    ...type.caption,
    fontSize: 10,
    color: colors.primary,
  },
  tierBlurb: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  tierMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  tierMetaText: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  tierRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  tierPrice: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  action: {
    marginBottom: spacing.sm,
  },
});
