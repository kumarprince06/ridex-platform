import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { routeEstimate } from '../api/maps';
import { useQuery } from '../api/useQuery';
import { useCurrentLocation } from '../lib/location';

import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { StatTiles } from '../components/StatTiles';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutePreview'>;

export function RoutePreviewScreen({ navigation, route }: Props) {
  const { destination, destinationCoord } = route.params;
  const { coord } = useCurrentLocation();

  // Asked of the backend, not measured on the device: this is the number the fare is built from.
  const { data: leg, loading } = useQuery(
    () =>
      coord && destinationCoord
        ? routeEstimate(coord, destinationCoord)
        : Promise.resolve(null),
    [coord?.[0], coord?.[1], destinationCoord?.[0], destinationCoord?.[1]],
  );

  return (
    <View style={styles.root}>
      <MapCanvas showRoute destinationCoord={destinationCoord} destinationLabel={destination} />

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backChip}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.stops}>
            <View style={styles.stopRow}>
              <View style={styles.dotMint} />
              <Text style={styles.stopText}>Current location</Text>
            </View>
            <View style={styles.stopRow}>
              <View style={styles.dotAmber} />
              <Text style={styles.stopText}>{destination}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <Sheet>
        {/* Two tiles, not three: nothing in the platform reports traffic, and a "Light" that is
            always Light is worse than no tile at all. */}
        {loading && !leg ? (
          <ActivityIndicator color={colors.primary} style={styles.stats} />
        ) : (
          <StatTiles
            stats={[
              {
                value: leg ? `${(leg.distanceMeters / 1000).toFixed(1)} km` : '—',
                label: 'Distance',
              },
              {
                value: leg ? `${Math.max(1, Math.round(leg.durationSeconds / 60))} min` : '—',
                label: 'ETA',
              },
            ]}
          />
        )}

        <Button
          label="Choose Ride Type"
          onPress={() => navigation.navigate('ChooseRide', { destination, destinationCoord })}
          style={styles.action}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stats: {
    paddingVertical: spacing.xl,
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
  backChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stops: {
    flex: 1,
    gap: 3,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotMint: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  dotAmber: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  stopText: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
  },
  action: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
