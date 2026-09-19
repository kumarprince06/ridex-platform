import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors, radius, spacing, type } from '../theme';

type Props = { visible: boolean; onClose: () => void; code: string; seat: string; route: string };

/** The QR, big and on white, for the driver to scan at the door. */
export function BoardingPassModal({ visible, onClose, code, seat, route }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Boarding pass</Text>
          <Text style={styles.meta}>
            Seat {seat} · {route}
          </Text>
          <View style={styles.qr}>
            {/* A white quiet zone: dark-mode QR codes don't scan on many readers. */}
            <QRCode value={code} size={220} backgroundColor="#FFFFFF" color="#0B0F1A" />
          </View>
          <Text style={styles.hint}>Show this to the driver, or read out the code</Text>
          <Text style={styles.code}>{code}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  close: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.button,
    fontSize: 20,
    color: colors.text,
  },
  meta: {
    ...type.body,
    color: colors.textMuted,
  },
  qr: {
    marginVertical: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
  },
  hint: {
    ...type.caption,
    color: colors.textMuted,
  },
  code: {
    ...type.button,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 6,
    color: colors.primary,
  },
});
