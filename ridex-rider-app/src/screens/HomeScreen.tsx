import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapCanvas } from '../components/MapCanvas';
import { TabScreenProps } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Home'>;

const SAVED: { icon: IconName; name: string; detail: string }[] = [
  { icon: 'home', name: 'Home', detail: '742 Evergreen Terrace' },
  { icon: 'business', name: 'Work', detail: 'Midtown Tower' },
];

const RECENT: { icon: IconName; name: string; detail: string }[] = [
  { icon: 'wine', name: 'The Alchemist Bar', detail: '45 Bleecker St, New York' },
  { icon: 'leaf', name: 'Union Square', detail: 'Union Square Park, Manhattan' },
];

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <MapCanvas showUserDot />

      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.locationRow}>
          <Image source={require('../../assets/logo-mark.png')} style={styles.brandMark} />
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>Current Location</Text>
            <Text style={styles.locationValue}>Midtown, New York</Text>
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

        <View style={styles.savedRow}>
          {SAVED.map((place) => (
            <Pressable
              key={place.name}
              onPress={() => navigation.navigate('RoutePreview', { destination: place.name })}
              accessibilityRole="button"
              style={styles.savedChip}
            >
              <Ionicons name={place.icon} size={17} color={colors.primary} />
              <View style={styles.flexShrink}>
                <Text style={styles.savedName}>{place.name}</Text>
                <Text style={styles.savedDetail} numberOfLines={1}>
                  {place.detail}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {RECENT.map((place) => (
          <Pressable
            key={place.name}
            onPress={() => navigation.navigate('RoutePreview', { destination: place.name })}
            accessibilityRole="button"
            style={styles.recentRow}
          >
            <View style={styles.recentIcon}>
              <Ionicons name={place.icon} size={18} color={colors.textMuted} />
            </View>
            <View style={styles.flexShrink}>
              <Text style={styles.recentName}>{place.name}</Text>
              <Text style={styles.recentDetail}>{place.detail}</Text>
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
  brandMark: {
    width: 38,
    height: 38,
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
  savedRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  savedChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flexShrink: {
    flex: 1,
  },
  savedName: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  savedDetail: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
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
