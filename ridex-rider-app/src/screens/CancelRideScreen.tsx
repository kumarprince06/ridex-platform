import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { cancellationQuote, cancelRide, formatMoney } from '../api/rides';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CancelRide'>;

const REASONS = [
  'Driver is too far',
  'Wrong vehicle info',
  'Found another ride',
  'Plans changed',
  'Driver not responding',
  'Other',
];

export function CancelRideScreen({ navigation, route }: Props) {
  const rideId = route.params?.rideId ?? null;
  const [reason, setReason] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Asked before the rider commits, so the fee is never a surprise afterwards. A ride that is
  // already gone has nothing to quote.
  const { data: quote } = useQuery(
    () => (rideId ? cancellationQuote(rideId) : Promise.resolve(null)),
    [rideId],
  );

  async function confirm() {
    if (!rideId) {
      navigation.replace('RideCancelled');
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      await cancelRide(rideId, reason ?? undefined);
      navigation.replace('RideCancelled');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not cancel the ride.');
      setCancelling(false);
    }
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Cancel Ride"
      footer={
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.keep, pressed && styles.pressed]}
          >
            <Text style={styles.keepText}>Keep Ride</Text>
          </Pressable>

          <Pressable
            // Destructive, so it stays inert until a reason is chosen - and it is the muted
            // rather than the loud button, because Keep Ride is the safer default.
            disabled={!reason || cancelling}
            onPress={confirm}
            accessibilityRole="button"
            accessibilityState={{ disabled: !reason || cancelling }}
            style={({ pressed }) => [
              styles.cancel,
              (!reason || cancelling) && styles.cancelDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>{cancelling ? 'Cancelling...' : 'Cancel Ride'}</Text>
          </Pressable>
        </View>
      }
    >
      {/* The real quote, not a guess about two minutes: the fee is the server's decision and it
          changes the moment a driver is assigned. */}
      <View style={[styles.notice, quote?.free && styles.noticeFree]}>
        <Ionicons
          name={quote?.free ? 'checkmark-circle' : 'warning'}
          size={19}
          color={quote?.free ? colors.primary : colors.amber}
        />
        <View style={styles.flex}>
          <Text style={[styles.noticeTitle, quote?.free && styles.noticeTitleFree]}>
            {quote == null
              ? 'Checking the cancellation fee'
              : quote.free
                ? 'Free to cancel'
                : `Cancellation fee ${formatMoney(quote.feeMinor, quote.currency)}`}
          </Text>
          <Text style={styles.noticeBody}>
            {quote?.free === false
              ? 'A driver is already on the way to you.'
              : 'You will not be charged for this cancellation.'}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionLabel}>REASON FOR CANCELLATION</Text>

      {REASONS.map((option) => {
        const selected = reason === option;

        return (
          <Pressable
            key={option}
            onPress={() => setReason(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.reason, selected && styles.reasonSelected]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioCore} /> : null}
            </View>
            <Text style={styles.reasonText}>{option}</Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.amberSurface,
    borderWidth: 1,
    borderColor: 'rgba(217, 160, 91, 0.4)',
  },
  noticeFree: {
    backgroundColor: 'rgba(46, 231, 199, 0.12)',
    borderColor: 'rgba(46, 231, 199, 0.35)',
  },
  noticeTitle: {
    ...type.button,
    fontSize: 14,
    color: colors.amber,
  },
  noticeTitleFree: {
    color: colors.primary,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  noticeBody: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  reasonSelected: {
    borderColor: colors.primary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioCore: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  reasonText: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  keep: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.lg,
    backgroundColor: '#1B2A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepText: {
    ...type.button,
    color: colors.text,
  },
  cancel: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.lg,
    backgroundColor: '#A63450',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.8,
  },
  cancelText: {
    ...type.button,
    color: colors.text,
  },
});
