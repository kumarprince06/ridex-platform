import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { Sheet } from '../components/Sheet';
import { StatTiles } from '../components/StatTiles';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutePreview'>;

export function RoutePreviewScreen({ navigation, route }: Props) {
  const { destination, destinationCoord } = route.params;

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
        <StatTiles
          stats={[
            { value: '2.4 km', label: 'Distance' },
            { value: '~8 min', label: 'ETA' },
            { value: 'Light', label: 'Traffic', tone: '#5FD68A' },
          ]}
        />

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
