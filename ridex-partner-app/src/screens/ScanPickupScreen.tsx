import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'ScanPickup'>;

/**
 * Scans the QR the rider's app shows at pickup. The QR is the fast path and the code is the
 * fallback: a cracked screen, a dead battery or a rider who never opened the app all end with the
 * driver typing four digits instead.
 *
 * The payload is only echoed back to the previous screen here. Verification is the server's job
 * (T11) - a client that decides for itself that the code matched has verified nothing.
 */
export function ScanPickupScreen({ navigation, route }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<string | null>(null);
  // The camera fires repeatedly for one code; without this the screen pops several times.
  const handled = useRef(false);

  const onScan = ({ data }: { data: string }) => {
    if (handled.current) {
      return;
    }
    handled.current = true;
    setScanned(data);
    route.params?.onScanned?.(data);
    setTimeout(() => navigation.goBack(), 600);
  };

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.denied} edges={['top', 'bottom']}>
          <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
          <Text style={styles.deniedTitle}>Camera access needed</Text>
          <Text style={styles.deniedBody}>
            Scanning the rider's QR is the fastest way to confirm you have the right passenger. You
            can still type the 4-digit code instead.
          </Text>

          <View style={styles.deniedActions}>
            <Button label="Allow camera" onPress={requestPermission} />
            <Button label="Type the code instead" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScan}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            onPress={() => navigation.goBack()}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.frame, scanned ? styles.frameDone : null]}>
          {scanned ? <Ionicons name="checkmark" size={54} color={colors.success} /> : null}
        </View>

        <Text style={styles.hint}>
          {scanned ? 'Rider confirmed' : "Point at the QR on the rider's screen"}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Black, not the app background: a camera screen with a navy surround looks like a bug.
    backgroundColor: '#000',
  },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  deniedTitle: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
  deniedBody: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
  },
  deniedActions: {
    alignSelf: 'stretch',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  topRow: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 250,
    height: 250,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.primary,
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameDone: {
    borderColor: colors.success,
    backgroundColor: 'rgba(61, 220, 151, 0.15)',
  },
  hint: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: 'auto',
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
});
