import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { StatTiles } from '../components/StatTiles';
import { DRIVER } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TripInProgress'>;

/** Stands in for the driver completing the trip (T11). The rider never ends their own trip. */
const COMPLETE_MS = 12000;

export function TripInProgressScreen({ navigation, route }: Props) {
  const { destination } = route.params;

  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('RideCompleted', { destination }), COMPLETE_MS);
    return () => clearTimeout(timer);
  }, [navigation, destination]);
  const [seconds, setSeconds] = useState(7 * 60 + 23);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;

  return (
    <View style={styles.root}>
      <MapCanvas showRoute driverAt={0.62} driverLabel="3 min" />

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Trip in Progress</Text>
            <Text style={styles.timer}>{elapsed}</Text>
          </View>

          <View style={styles.chip}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.text} />
          </View>
        </View>
      </SafeAreaView>

      <Sheet>
        <StatTiles
          stats={[
            { value: '4 min', label: 'ETA' },
            { value: '38 km/h', label: 'Speed', tone: colors.amber },
            { value: '~$10.88', label: 'Fare', tone: colors.primary },
          ]}
        />

        <View style={styles.destination}>
          <View style={styles.dotAmber} />
          <View style={styles.flex}>
            <Text style={styles.destName}>{destination}</Text>
            <Text style={styles.destDetail}>89 E 42nd St, New York</Text>
          </View>
        </View>

        <View style={styles.driverRow}>
          <Avatar name={DRIVER.name} size={44} />
          <View style={styles.flex}>
            <Text style={styles.driverName}>{DRIVER.name}</Text>
            <Text style={styles.driverMeta}>RX · 4821</Text>
          </View>

          <View style={styles.actionChip}>
            <Ionicons name="call" size={16} color={colors.text} />
          </View>
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
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
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
    backgroundColor: colors.primary,
  },
  statusText: {
    ...type.button,
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  timer: {
    ...type.button,
    fontSize: 14,
    color: colors.primary,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  dotAmber: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  destName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  destDetail: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  driverName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  driverMeta: {
    ...type.caption,
    color: colors.textMuted,
  },
  actionChip: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
