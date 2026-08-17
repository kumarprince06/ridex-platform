import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Stars } from '../components/Stars';
import { DRIVER, RATING_TAGS } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RateDriver'>;

export function RateDriverScreen({ navigation }: Props) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Avatar name={DRIVER.name} size={72} style={styles.avatar} />
        <Text style={styles.name}>{DRIVER.name}</Text>
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
              placeholder={`Add a note for ${DRIVER.name.split(' ')[0]}... (optional)`}
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.note}
            />
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          label={rating > 0 ? `Submit ${rating}-Star Rating` : 'Select a Rating'}
          disabled={rating === 0}
          onPress={() => navigation.popToTop()}
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
