import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '../api/problem';
import { rateRide } from '../api/rides';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Stars } from '../components/Stars';
import { RATING_TAGS } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RateDriver'>;

export function RateDriverScreen({ navigation, route }: Props) {
  const rideId = route.params?.rideId ?? null;
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));

  async function submit() {
    if (!rideId) {
      navigation.popToTop();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Tags and the free note go to the server as one comment - there is one comment column,
      // and a tag taxonomy nobody queries is not worth a table.
      const comment = [tags.join(', '), note.trim()].filter(Boolean).join(' — ');
      await rateRide(rideId, rating, comment || undefined);
      navigation.popToTop();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not submit your rating.');
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        {/* No driver name or avatar: the ride endpoint carries neither, and a fixture name on a
            screen that rates a real person is the wrong place to guess. */}
        <Text style={styles.prompt}>How was your ride?</Text>

        <Stars value={rating} onChange={setRating} size={34} />

        {/*
          Tags and the note only appear once a rating exists - there is nothing to qualify before
          then, and the empty-state mockup shows the screen bare.
        */}
        {rating > 0 ? (
          <>
            <Text style={styles.tagsLabel}>WHAT WENT GREAT?</Text>
            <View style={styles.tags}>
              {RATING_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={tags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                />
              ))}
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note for your driver... (optional)"
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.note}
            />
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={
            submitting
              ? 'Submitting...'
              : rating > 0
                ? `Submit ${rating}-Star Rating`
                : 'Select a Rating'
          }
          disabled={rating === 0 || submitting}
          onPress={submit}
        />
        <Pressable
          onPress={() => navigation.popToTop()}
          accessibilityRole="button"
          style={styles.skip}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  name: {
    ...type.button,
    fontSize: 18,
    color: colors.text,
  },
  prompt: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xl,
  },
  tagsLabel: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  note: {
    ...type.body,
    alignSelf: 'stretch',
    minHeight: 92,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: spacing.xl,
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: spacing.lg,
  },
  skipText: {
    ...type.button,
    fontSize: 15,
    color: colors.textMuted,
  },
});
