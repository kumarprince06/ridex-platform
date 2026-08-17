import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ISSUE_CATEGORIES } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportIssue'>;

export function ReportIssueScreen({ navigation }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Report Issue"
      footer={
        <Button
          label="Submit Report"
          // Nothing to act on without a category, so the button stays muted until one is picked.
          disabled={!category}
          onPress={() => navigation.goBack()}
        />
      }
    >
      <Text style={styles.intro}>Tell us what happened and we&apos;ll look into it right away.</Text>

      <Text style={styles.sectionLabel}>CATEGORY</Text>
      <View style={styles.grid}>
        {ISSUE_CATEGORIES.map((item) => {
          const selected = category === item.label;

          return (
            <Pressable
              key={item.label}
              onPress={() => setCategory(item.label)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.category, selected && styles.categorySelected]}
            >
              <Ionicons name={item.icon} size={22} color={item.tone} />
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

      <View style={styles.attach}>
        <View style={styles.attachIcon}>
          <Ionicons name="image-outline" size={19} color={colors.textMuted} />
        </View>
        <View>
          <Text style={styles.attachTitle}>Add screenshot</Text>
          <Text style={styles.attachHint}>Optional · helps us resolve faster</Text>
        </View>
      </View>
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
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  category: {
    // Three per row: a third of the width minus the two 12pt gutters shared between them.
    width: '31%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categorySelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(46, 231, 199, 0.07)',
  },
  categoryLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...type.body,
    minHeight: 118,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    textAlignVertical: 'top',
  },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachTitle: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  attachHint: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
});
