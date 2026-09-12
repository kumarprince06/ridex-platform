import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { rateRider } from '../api/driver';
import { ApiError } from '../api/problem';
import { RIDER_RATING_TAGS } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = RootScreenProps<'RateRider'>;

export function RateRiderScreen({ navigation, route }: Props) {
  const riderName = route.params?.riderName ?? 'Your rider';
  const rideId = route.params?.rideId;
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const home = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  // The tags are the comment: they are what a driver actually taps, and the server stores words.
  async function submit() {
    if (!rideId) {
      home();
      return;
    }
    setBusy(true);
    try {
      await rateRider(rideId, rating, tags.join(', ') || undefined);
    } catch (caught) {
      // A rating is not worth trapping a driver on a screen: the trip is over either way, and
      // "already rated" is the most likely reason anyway.
      if (!(caught instanceof ApiError)) {
        // Nothing else to do with it - the next screen is home regardless.
      }
    } finally {
      setBusy(false);
      home();
    }
  }

  const finish = () => void submit();

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label={busy ? 'Sending...' : 'Submit rating'} disabled={busy} onPress={finish} />
          {/* Skippable: a rating the driver is forced through is a rating nobody reads. */}
          <Button label="Skip" variant="secondary" onPress={home} />
        </View>
      }
    >
      <View style={styles.hero}>
        <Avatar name={riderName} size={80} />
        <Text style={styles.name}>{riderName}</Text>
        <Text style={styles.subtitle}>How was the trip?</Text>

        <Stars value={rating} onChange={setRating} size={34} />
      </View>

      <Text style={styles.label}>What stood out?</Text>
      <View style={styles.tags}>
        {RIDER_RATING_TAGS.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            selected={tags.includes(tag)}
            onPress={() =>
              setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
            }
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  name: {
    ...type.title,
    fontSize: 24,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  label: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});
