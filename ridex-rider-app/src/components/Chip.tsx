import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Selectable pill. Covers the ride-history filters, the rating tags, the language picker and the
 * payment-method row - they differ only in what selection means.
 */
export function Chip({ label, selected = false, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  labelSelected: {
    color: colors.onPrimary,
  },
});
