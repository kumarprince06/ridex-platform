import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

type Props = {
  value: number;
  /** Omit to render read-only, as in the ride history rows. */
  onChange?: (value: number) => void;
  size?: number;
};

export function Stars({ value, onChange, size = 16 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const icon = (
          <Ionicons
            name={filled ? 'star' : 'star'}
            size={size}
            color={filled ? colors.amber : colors.surfaceAlt}
          />
        );

        // Read-only rows must not advertise a press target to screen readers.
        return onChange ? (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} of 5`}
            hitSlop={6}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
