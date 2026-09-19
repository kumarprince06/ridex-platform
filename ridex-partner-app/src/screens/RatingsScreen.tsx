import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { listRatings, type DriverRating } from '../api/driver';
import { getProfile } from '../api/profile';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { Stars } from '../components/Stars';
import { when } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Ratings'>;

const STARS = [5, 4, 3, 2, 1];

/**
 * What riders have actually said.
 *
 * <p>ponytail: acceptance and cancellation rates are gone rather than invented. They are real
 * numbers the platform does not count yet, and three made-up percentages next to a real average
 * make the average look made up too.
 */
export function RatingsScreen({ navigation }: Props) {
  const { data: profile, refetch: refetchProfile } = useQuery(getProfile);
  const { data: ratings, loading, error, refetch: refetchRatings } = useQuery(listRatings);

  const rows = ratings ?? [];
  const breakdown = STARS.map((stars) => ({
    stars,
    count: rows.filter((rating) => rating.stars === stars).length,
  }));
  const average = profile?.rating ?? null;

  return (
    <Screen onRefresh={() => Promise.all([refetchProfile(), refetchRatings()])} onBack={() => navigation.goBack()} title="Ratings">
      <View style={styles.hero}>
        <Text style={styles.rating}>{average ?? '--'}</Text>
        <Stars value={Math.round(Number(average ?? 0))} size={20} />
        <Text style={styles.count}>{profile?.ratingCount ?? 0} rated trips</Text>
      </View>

      {loading ? <Text style={styles.count}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows.length ? (
        <>
          <SectionLabel>RATING BREAKDOWN</SectionLabel>

          {breakdown.map((row) => {
            const share = rows.length === 0 ? 0 : row.count / rows.length;

            return (
              <View key={row.stars} style={styles.barRow}>
                <Text style={styles.barStar}>{row.stars}</Text>
                <Ionicons name="star" size={12} color={colors.primary} />
                <View style={styles.track}>
                  <View style={[styles.fill, { flex: share }]} />
                  <View style={{ flex: 1 - share }} />
                </View>
                <Text style={styles.barCount}>{row.count}</Text>
              </View>
            );
          })}

          <SectionLabel>WHAT RIDERS SAID</SectionLabel>

          {rows.filter((rating) => rating.comment).map((rating) => (
            <Comment key={rating.rideId} rating={rating} />
          ))}
        </>
      ) : (
        <Text style={styles.count}>
          No ratings yet. They appear here as riders rate their trips.
        </Text>
      )}
    </Screen>
  );
}

function Comment({ rating }: { rating: DriverRating }) {
  return (
    <View style={styles.comment}>
      <View style={styles.commentHead}>
        <Stars value={rating.stars} size={13} />
        <Text style={styles.commentWhen}>{when(rating.createdAt)}</Text>
      </View>
      <Text style={styles.commentBody}>{rating.comment}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
  },
  comment: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentWhen: {
    ...type.caption,
    color: colors.textMuted,
  },
  commentBody: {
    ...type.body,
    color: colors.text,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  rating: {
    ...type.hero,
    fontSize: 52,
    color: colors.text,
  },
  count: {
    ...type.caption,
    color: colors.textMuted,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  rateText: {
    flex: 1,
  },
  rateLabel: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  rateNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  rateValue: {
    ...type.button,
    fontSize: 17,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
  },
  barStar: {
    ...type.caption,
    color: colors.textMuted,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.primary,
  },
  barCount: {
    ...type.caption,
    width: 44,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
