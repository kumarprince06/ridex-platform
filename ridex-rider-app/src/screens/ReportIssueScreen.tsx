import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../api/problem';
import { listCategories, raiseTicket } from '../api/support';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportIssue'>;

/** The server refuses anything shorter; saying so here beats a red box after the tap. */
const MIN_DESCRIPTION = 10;

/**
 * Raises a real support ticket.
 *
 * <p>The categories come from the server, filtered to what a rider can actually raise - a list
 * written into the app drifts from the queues the people answering them work.
 */
export function ReportIssueScreen({ navigation, route }: Props) {
  const { data: categories } = useQuery(listCategories);
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = category !== null && description.trim().length >= MIN_DESCRIPTION;

  async function submit() {
    if (!category) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const label = categories?.find((item) => item.code === category)?.label ?? 'Issue';
      const ticket = await raiseTicket({
        category,
        // The subject is what the queue is scanned by; the description is the ticket itself.
        subject: `${label}: ${description.trim().slice(0, 60)}`,
        message: description.trim(),
        rideId: route.params?.rideId,
      });
      // Replaced, not pushed: going "back" to a form that has already been submitted is how the
      // same problem gets raised twice.
      navigation.replace('SupportTicket', { ticketId: ticket.id });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not send that report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Report Issue"
      footer={
        <Button
          label={busy ? 'Sending...' : 'Submit report'}
          disabled={!ready || busy}
          onPress={() => void submit()}
        />
      }
    >
      <Text style={styles.intro}>Tell us what happened and we&apos;ll look into it right away.</Text>

      <Text style={styles.sectionLabel}>CATEGORY</Text>
      <View style={styles.grid}>
        {categories?.map((item) => {
          const selected = category === item.code;

          return (
            <Pressable
              key={item.code}
              onPress={() => setCategory(item.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.category, selected && styles.categorySelected]}
            >
              <Text style={styles.categoryLabel}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>DESCRIPTION</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue in detail..."
        placeholderTextColor={colors.textFaint}
        multiline
        style={styles.description}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...type.body,
    color: colors.textMuted,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  category: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categorySelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  categoryLabel: {
    ...type.body,
    color: colors.text,
  },
  description: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 130,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
});
