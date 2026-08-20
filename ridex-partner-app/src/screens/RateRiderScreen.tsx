import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { OFFER, RIDER_RATING_TAGS } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = RootScreenProps<'RateRider'>;

export function RateRiderScreen({ navigation }: Props) {
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);

  const finish = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label="Submit rating" onPress={finish} />
          {/* Skippable: a rating the driver is forced through is a rating nobody reads. */}
          <Button label="Skip" variant="secondary" onPress={finish} />
        </View>
      }
    >
      <View style={styles.hero}>
        <Avatar name={OFFER.rider} size={80} />
        <Text style={styles.name}>{OFFER.rider}</Text>
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
