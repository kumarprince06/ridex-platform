import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

/**
 * Bottom panel that sits over the map on every booking screen. Static: it does not drag. A real
 * draggable sheet needs a gesture library, and nothing in the flow depends on resizing it yet.
 */
export function Sheet({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={[styles.sheet, style]} edges={['bottom']}>
      <View style={styles.grabber} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
});
