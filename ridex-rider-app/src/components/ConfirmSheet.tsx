import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Renders the confirm action in the danger colour, for anything that cannot be undone. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

/**
 * A confirmation in the app's own skin.
 *
 * <p>The system Alert is a white box with blue text dropped into a dark app - it reads as the OS
 * interrupting, not as part of the screen the rider is on.
 */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Not now',
  destructive = false,
  busy = false,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirm,
              destructive && styles.confirmDestructive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.confirmText, destructive && styles.confirmTextDestructive]}>
              {busy ? 'Working…' : confirmLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
          >
            <Text style={styles.dismissText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  title: {
    ...type.title,
    fontSize: 20,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
  },
  confirm: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  confirmDestructive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  confirmText: {
    ...type.button,
    fontSize: 15,
    color: colors.onPrimary,
  },
  confirmTextDestructive: { color: colors.danger },
  dismiss: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dismissText: {
    ...type.button,
    fontSize: 15,
    color: colors.textMuted,
  },
  pressed: { opacity: 0.75 },
});
