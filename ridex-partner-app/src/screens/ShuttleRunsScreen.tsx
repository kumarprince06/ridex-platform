import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Manifest, myDepartures } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { clockTime } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'ShuttleRuns'>;

/**
 * Today's shuttle departures for this driver, in the order they leave.
 *
 * Only today: a driver looking at this screen is about to drive one of these. Picking another
 * date is an ops question, and ops has the admin panel.
 */
export function ShuttleRunsScreen({ navigation }: Props) {
  const { data, loading, error, refetch } = useQuery(() => myDepartures());

  return (
    <Screen title="My runs" onBack={() => navigation.goBack()}>
      {loading ? <Text style={styles.note}>Loading today's runs...</Text> : null}

      {error ? (
        <View style={styles.errorBlock}>
          <Text style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={refetch}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {data && data.length === 0 ? (
        <Text style={styles.note}>You have no shuttle departures today.</Text>
      ) : null}

      {data?.map((run) => (
        <RunCard
          key={run.shuttleTripId}
          run={run}
          onPress={() =>
            navigation.navigate('ShuttleDeparture', { shuttleTripId: run.shuttleTripId })
          }
        />
      ))}
    </Screen>
  );
}

function RunCard({ run, onPress }: { run: Manifest; onPress: () => void }) {
  const boarded = run.stops.reduce(
    (count, stop) => count + stop.boarding.filter((passenger) => passenger.boarded).length,
    0,
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.timeTile}>
        <Text style={styles.time}>{clockTime(run.departsAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.route}>{run.routeName}</Text>
        <Text style={styles.meta}>
          {run.seatsSold} of {run.seatCapacity} seats · {boarded} boarded
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    ...type.body,
    color: colors.textMuted,
  },
  errorBlock: {
    gap: spacing.sm,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  retry: {
    ...type.body,
    color: colors.primary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  timeTile: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  time: {
    ...type.body,
    color: colors.primary,
  },
  cardBody: {
    flex: 1,
  },
  route: {
    ...type.body,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
