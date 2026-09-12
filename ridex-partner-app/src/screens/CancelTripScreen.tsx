import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { cancelRide, cancellationReasons } from '../api/driver';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Screen, ScreenTitle } from '../components/Screen';
import { SwipeAction } from '../components/SwipeAction';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'CancelTrip'>;

/**
 * Produces CANCELLED_BY_DRIVER. States the consequence before the confirm, not after: who
 * cancelled, whether a fee applies and what it does to the driver's rate are all decided here,
 * and the driver is entitled to know before committing.
 */
export function CancelTripScreen({ navigation, route }: Props) {
  const rideId = route.params?.rideId;
  // From the server: an app that invents a code sends one the server refuses, mid-traffic.
  const { data: reasons } = useQuery(cancellationReasons);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = reasons?.find((option) => option.code === reason);
  const ready = chosen != null && (!chosen.needsDetail || detail.trim().length > 0);

  async function cancel() {
    if (!reason) {
      return;
    }
    if (!rideId) {
      // Opened outside a trip; there is nothing to cancel, so leave rather than pretend.
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await cancelRide(rideId, reason, detail.trim() || undefined);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not cancel that trip.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Cancel trip"
      footer={
        ready ? (
          <SwipeAction
            label={busy ? 'Cancelling...' : 'Swipe to cancel trip'}
            icon="close"
            danger
            onComplete={() => void cancel()}
          />
        ) : (
          <Text style={styles.hint}>Choose a reason to continue</Text>
        )
      }
    >
      <ScreenTitle
        title="Why are you cancelling?"
        subtitle="Operations sees this reason. It decides whether the rider is charged and whether this counts against you."
      />

      {reasons?.map((option) => {
        const selected = reason === option.code;

        return (
          <Pressable
            key={option.code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setReason(option.code)}
            style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={19}
              color={selected ? colors.primary : colors.textFaint}
            />
            <Text style={styles.optionLabel}>{option.label}</Text>
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
          style={styles.detail}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.warning}>
        <Ionicons name="information-circle" size={17} color={colors.warning} />
        <Text style={styles.warningText}>
          Cancelling after arriving affects your cancellation rate. Frequent cancellations can pause
          your access to offers.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detail: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 90,
    padding: spacing.md,
    marginTop: spacing.sm,
    textAlignVertical: 'top',
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  optionLabel: {
    ...type.body,
    flex: 1,
    color: colors.text,
  },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.amberSurface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warningText: {
    ...type.caption,
    flex: 1,
    color: colors.textMuted,
  },
  hint: {
    ...type.caption,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
