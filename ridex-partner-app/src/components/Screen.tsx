import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  children: ReactNode;
  /** Renders the circular back chip every inner screen in the mockups carries. */
  onBack?: () => void;
  /** Centred header title. Present on the detail screens, absent on the auth flow. */
  title?: string;
  /** Trailing header slot - the share chip on Trip Details, "+ Add" on Saved Places. */
  headerRight?: ReactNode;
  /** Pinned to the bottom, outside the scroll area, as the mockups show. */
  footer?: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, onBack, title, headerRight, footer, scroll = true }: Props) {
  const body = <View style={styles.body}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        // Android already pans the window; adding padding on top of that double-counts it.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {onBack || title || headerRight ? (
          <View style={styles.header}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={onBack}
                style={({ pressed }) => [styles.backChip, pressed && styles.pressed]}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </Pressable>
            ) : (
              // Keeps the title optically centred when there is no back button to balance it.
              <View style={styles.backChipSpacer} />
            )}

            {title ? <Text style={styles.headerTitle}>{title}</Text> : <View style={styles.flex} />}

            {headerRight ?? <View style={styles.backChipSpacer} />}
          </View>
        ) : null}

        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...type.button,
    flex: 1,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChipSpacer: {
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titleBlock: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
