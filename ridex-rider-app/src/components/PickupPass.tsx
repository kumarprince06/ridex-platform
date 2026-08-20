import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  /** What the driver's scanner reads. Server-issued in production, never derived on the device. */
  payload: string;
  /** The spoken fallback, for a dead battery or a rider who never opened the app. */
  code: string;
};

/**
 * Shown at pickup so the driver can confirm they have the right passenger. Two paths, because one
 * always fails somewhere: the QR is instant, the four digits work with a black screen.
 */
export function PickupPass({ payload, code }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>SHOW THIS TO YOUR DRIVER</Text>

      <View style={styles.qrFrame}>
        {/* Light quiet zone: a QR inverted onto the dark surface will not scan on many readers. */}
        <QRCode value={payload} size={132} backgroundColor="#FFFFFF" color="#0B0F1A" />
      </View>

      <Text style={styles.codeLabel}>or read out this code</Text>
      <Text style={styles.code}>{code.split('').join(' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    ...type.eyebrow,
    color: colors.textFaint,
    marginBottom: spacing.md,
  },
  qrFrame: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  codeLabel: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  code: {
    ...type.title,
    fontSize: 26,
    letterSpacing: 4,
    color: colors.primary,
  },
});
