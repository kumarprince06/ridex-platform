import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

export function CancelRideScreen({ navigation }: Props) {
  const [reason, setReason] = useState<string | null>(null);

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
            disabled={!reason}
            onPress={() => navigation.replace('RideCancelled')}
            accessibilityRole="button"
            accessibilityState={{ disabled: !reason }}
            style={({ pressed }) => [
              styles.cancel,
              !reason && styles.cancelDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.notice}>
        <Ionicons name="warning" size={19} color={colors.amber} />
        <View style={styles.flex}>
          <Text style={styles.noticeTitle}>Cancellation Fee May Apply</Text>
          <Text style={styles.noticeBody}>
            You won&apos;t be charged since it&apos;s been less than 2 minutes.
          </Text>
        </View>
      </View>

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
  noticeTitle: {
    ...type.button,
    fontSize: 14,
    color: colors.amber,
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
