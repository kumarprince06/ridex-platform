import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../api/problem';
import { cancellationQuote, cancellationReasons, cancelRide, formatMoney } from '../api/rides';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CancelRide'>;

export function CancelRideScreen({ navigation, route }: Props) {
  const rideId = route.params?.rideId ?? null;
  const [code, setCode] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // From the server, not a list in here: a code this app invents is one the server refuses.
  const { data: reasons } = useQuery(cancellationReasons, []);
  const chosen = (reasons ?? []).find((option) => option.code === code);
  // "Something else" says nothing on its own, so the button waits for the words.
  const ready = Boolean(chosen) && (!chosen?.needsDetail || detail.trim().length > 0);

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
      await cancelRide(rideId, code!, detail.trim() || undefined);
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
            disabled={!ready || cancelling}
            onPress={confirm}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready || cancelling }}
            style={({ pressed }) => [
              styles.cancel,
              (!ready || cancelling) && styles.cancelDisabled,
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
              ? 'A driver is already on the way to you. The fee is added to your next ride.'
              : 'You will not be charged for this cancellation.'}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionLabel}>REASON FOR CANCELLATION</Text>

      {(reasons ?? []).map((option) => {
        const selected = code === option.code;

        return (
          <Pressable
            key={option.code}
            onPress={() => setCode(option.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.reason, selected && styles.reasonSelected]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioCore} /> : null}
            </View>
            <Text style={styles.reasonText}>{option.label}</Text>
          </Pressable>
        );
      })}

      {chosen?.needsDetail ? (
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder="Tell us what happened"
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={500}
          style={styles.detail}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  detail: {
    ...type.body,
    minHeight: 92,
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    textAlignVertical: 'top',
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
