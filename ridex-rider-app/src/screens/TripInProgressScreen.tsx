import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { StatTiles } from '../components/StatTiles';
import { money } from '../lib/format';
import { dial, driverCoordOf, useJourney } from '../lib/journey';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TripInProgress'>;

export function TripInProgressScreen({ navigation, route }: Props) {
  const { destination, rideId } = route.params;

  // The rider never ends their own trip: the driver swipes to complete and the server prices it.
  const { ride } = useJourney(rideId, 'TripInProgress', navigation, destination);
  const driver = ride?.driver;
  const driverAt = driverCoordOf(ride);
  const phone = driver?.phone;
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
      <MapCanvas showRoute driverCoord={driverAt} driverLabel="You are here" />

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Trip in Progress</Text>
            <Text style={styles.timer}>{elapsed}</Text>
          </View>

        </View>
      </SafeAreaView>

      <Sheet>
        {/* Only what the server knows: the quoted fare. The final one is priced when the trip ends. */}
        {ride ? (
          <StatTiles
            stats={[{ value: money(ride.quotedFareMinor, ride.currency), label: 'Quoted fare', tone: colors.primary }]}
          />
        ) : null}

        <View style={styles.destination}>
          <View style={styles.dotAmber} />
          <View style={styles.flex}>
            <Text style={styles.destName}>{destination}</Text>
            <Text style={styles.destDetail}>{ride?.destinationAddress ?? ''}</Text>
          </View>
        </View>

        <View style={styles.driverRow}>
          <Avatar name={driver?.name ?? 'Your driver'} size={44} />
          <View style={styles.flex}>
            <Text style={styles.driverName}>{driver?.name ?? 'Your driver'}</Text>
            <Text style={styles.driverMeta}>{driver?.registrationNumber ?? ''}</Text>
          </View>

          {phone ? (
            <Pressable
              onPress={() => dial(phone)}
              accessibilityRole="button"
              accessibilityLabel="Call driver"
              style={styles.actionChip}
            >
              <Ionicons name="call" size={16} color={colors.text} />
            </Pressable>
          ) : null}
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
