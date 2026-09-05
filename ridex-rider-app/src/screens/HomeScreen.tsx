import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listRides } from '../api/rides';
import { useQuery } from '../api/useQuery';
import { MapCanvas } from '../components/MapCanvas';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Home'>;

export function HomeScreen({ navigation }: Props) {
  // Where this rider has actually been, newest first. One address appears once however many
  // times it was ridden to - a list of the same trip four times is not a shortcut.
  const { data: rides } = useQuery(listRides, []);
  const recent = (rides ?? [])
    .filter((ride) => ride.destinationAddress)
    .filter(
      (ride, index, all) =>
        all.findIndex((other) => other.destinationAddress === ride.destinationAddress) === index,
    )
    .slice(0, 4);

  return (
    <View style={styles.root}>
      <MapCanvas showUserDot />

      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.locationRow}>
          <View style={styles.brandChip}>
            <Image source={require('../../assets/logo-mark.png')} style={styles.brandMark} />
          </View>
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationValue}>Current location</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.grabber} />

        <Text style={styles.sheetLabel}>WHERE TO?</Text>

        <Pressable
          onPress={() => navigation.navigate('SearchDestination')}
          accessibilityRole="search"
          style={styles.search}
        >
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search destination...</Text>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
        </Pressable>

        {/* Shuttle is not a destination search: the route is fixed and the question is which seat
            on which departure, so it gets its own way in rather than a tier on the ride list. */}
        <Pressable
          onPress={() => navigation.navigate('ShuttleRoutes')}
          accessibilityRole="button"
          style={styles.shuttle}
        >
          <View style={styles.shuttleIcon}>
            <Ionicons name="bus" size={18} color={colors.primary} />
          </View>
          <View style={styles.shuttleText}>
            <Text style={styles.shuttleTitle}>Book a shuttle seat</Text>
            <Text style={styles.shuttleNote}>Fixed routes, chosen seat, fare that never surges</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        {recent.map((ride) => (
          <Pressable
            key={ride.id}
            onPress={() =>
              navigation.navigate('RoutePreview', {
                destination: ride.destinationAddress!,
                // The ride's own coordinates, so a repeat trip prices against the same point
                // rather than whatever a name search happens to match.
                destinationCoord: [ride.destinationLng, ride.destinationLat],
              })
            }
            accessibilityRole="button"
            style={styles.recentRow}
          >
            <View style={styles.recentIcon}>
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            </View>
            <View style={styles.flexShrink}>
              <Text style={styles.recentName} numberOfLines={1}>
                {ride.destinationAddress}
              </Text>
              <Text style={styles.recentDetail}>Previous trip</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  // The map behind this is light, and the mark is white and mint - without a dark ground it
  // disappears into the tiles.
  brandChip: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  locationValue: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  sheetLabel: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 54,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    ...type.body,
    flex: 1,
    color: colors.textFaint,
  },
  shuttle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shuttleIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
  },
  shuttleText: {
    flex: 1,
  },
  shuttleTitle: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  shuttleNote: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  flexShrink: {
    flex: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  recentDetail: {
    ...type.caption,
    color: colors.textMuted,
  },
});
