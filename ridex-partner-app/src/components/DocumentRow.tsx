import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DocumentStatus } from '../api/documents';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = {
  type: string;
  status: RowStatus;
  detail: string;
  onPress?: () => void;
};

/** MISSING is not a server status - it is this app's word for a required document not yet sent. */
export type RowStatus = DocumentStatus | 'MISSING';

const TONE: Record<RowStatus, { label: string; colour: string; surface: string; icon: IconName }> = {
  APPROVED: { label: 'Approved', colour: colors.success, surface: colors.successSurface, icon: 'checkmark-circle' },
  PENDING_REVIEW: { label: 'Under review', colour: colors.warning, surface: colors.amberSurface, icon: 'hourglass' },
  REJECTED: { label: 'Rejected', colour: colors.danger, surface: colors.dangerSurface, icon: 'close-circle' },
  // Its own tone, not "rejected": an expired document was valid work that simply ran out, and the
  // driver's next step is a renewal rather than an appeal.
  EXPIRED: { label: 'Expired', colour: colors.danger, surface: colors.dangerSurface, icon: 'alert-circle' },
  MISSING: { label: 'Missing', colour: colors.textMuted, surface: colors.surfaceAlt, icon: 'cloud-upload-outline' },
};

/**
 * One document with its status. Expiry is shown as text, not just a pill: an approved licence
 * that lapsed is invalid, and `status` alone cannot say that.
 */
export function DocumentRow({ type: docType, status, detail, onPress }: Props) {
  const tone = TONE[status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${docType}, ${tone.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: tone.surface }]}>
        <Ionicons name={tone.icon} size={18} color={tone.colour} />
      </View>

      <View style={styles.text}>
        <Text style={styles.title}>{docType}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>

      <View style={[styles.pill, { backgroundColor: tone.surface }]}>
        <Text style={[styles.pillLabel, { color: tone.colour }]}>{tone.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  detail: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pillLabel: {
    ...type.caption,
    fontSize: 11,
  },
});
