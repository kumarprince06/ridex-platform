import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenTitle } from '../components/Screen';
import { SwipeAction } from '../components/SwipeAction';
import { CANCEL_REASONS } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'CancelTrip'>;

/**
 * Produces CANCELLED_BY_DRIVER. States the consequence before the confirm, not after: who
 * cancelled, whether a fee applies and what it does to the driver's rate are all decided here,
 * and the driver is entitled to know before committing.
 */
export function CancelTripScreen({ navigation }: Props) {
  const [reason, setReason] = useState<string | null>(null);

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Cancel trip"
      footer={
        reason ? (
          <SwipeAction
            label="Swipe to cancel trip"
            icon="close"
            danger
            onComplete={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
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

      {CANCEL_REASONS.map((option) => {
        const selected = reason === option;

        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setReason(option)}
            style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={19}
              color={selected ? colors.primary : colors.textFaint}
            />
            <Text style={styles.optionLabel}>{option}</Text>
          </Pressable>
        );
      })}

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
