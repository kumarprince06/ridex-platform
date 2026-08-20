import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { DRIVER } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverApproaching'>;

/** How long the mock driver takes to cover the last minute. Replaced by the trip status socket (T11). */
const ARRIVAL_MS = 6000;

export function DriverApproachingScreen({ navigation, route }: Props) {
  const { destination } = route.params;

  // The rider does not decide that the driver has arrived - the driver does, and the server says
  // so. This timer stands in for that message until the socket exists.
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('DriverArrived', { destination }), ARRIVAL_MS);
    return () => clearTimeout(timer);
  }, [navigation, destination]);

  return (
    <View style={styles.root}>
      <MapCanvas showRoute driverAt={0.48} driverLabel="3 min" />

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Safety"
            style={styles.chip}
          >
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.text} />
          </Pressable>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Approaching</Text>
          </View>

          <View style={styles.chip}>
            <Ionicons name="call" size={18} color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>

      <Sheet>
        <View style={styles.row}>
          <Avatar name={DRIVER.name} size={48} />

          <View style={styles.flex}>
            <Text style={styles.title}>{DRIVER.name} is almost here</Text>
            <Text style={styles.meta}>RX · 4821 · Pearl White</Text>
          </View>

          <View style={styles.etaBlock}>
            <Text style={styles.eta}>1 min</Text>
            <Text style={styles.etaLabel}>away</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={styles.call}>
            <Ionicons name="call" size={15} color={colors.primary} />
            <Text style={styles.callText}>Call</Text>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  statusText: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  etaBlock: {
    alignItems: 'flex-end',
  },
  eta: {
    ...type.hero,
    fontSize: 24,
    color: colors.primary,
  },
  etaLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  call: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  callText: {
    ...type.button,
    fontSize: 15,
    color: colors.primary,
  },
});
