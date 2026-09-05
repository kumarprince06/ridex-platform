import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listRoutes, type ShuttleRoute } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { BrandLoader } from '../components/BrandLoader';
import { Screen, ScreenTitle } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleRoutes'>;

export function ShuttleRoutesScreen({ navigation }: Props) {
  const { data, loading, error } = useQuery(listRoutes, []);
  const routes = data ?? [];

  return (
    <Screen onBack={() => navigation.goBack()} title="Shuttle">
      <ScreenTitle
        title="Commuter routes"
        subtitle="A fixed route, a booked seat and a fare that never surges."
      />

      {loading && data == null ? (
        <BrandLoader size={72} label="Finding routes" style={styles.spinner} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && routes.length === 0 ? (
        <Text style={styles.empty}>No shuttle routes are running yet.</Text>
      ) : null}

      {routes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          onPress={() => navigation.navigate('ShuttleDepartures', { routeId: route.id })}
        />
      ))}
    </Screen>
  );
}

function RouteCard({ route, onPress }: { route: ShuttleRoute; onPress: () => void }) {
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  // The end-to-end time is the offset of the last stop: offsets are minutes after departure, so
  // the last one is the journey.
  const minutes = last?.offsetMinutes ?? 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{route.code}</Text>
        </View>
        <Text style={styles.name}>{route.name}</Text>
      </View>

      {first && last ? (
        <Text style={styles.ends}>
          {first.name} → {last.name}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {route.stops.length} {route.stops.length === 1 ? 'stop' : 'stops'}
          </Text>
        </View>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{minutes} min</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: spacing.xl,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
  },
  badgeText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
  name: {
    ...type.label,
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  ends: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...type.caption,
    flex: 0,
    color: colors.textMuted,
  },
});
