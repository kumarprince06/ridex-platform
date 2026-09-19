import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { getLegalDocument } from '../api/legal';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

/** Terms and privacy as operations wrote them in the console: '#' lines are headings. */
export function LegalScreen({ navigation, route }: Props) {
  const { data, loading, error } = useQuery(() => getLegalDocument(route.params.slug), [route.params.slug]);
  const blocks = (data?.body ?? '').split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

  return (
    <Screen onBack={() => navigation.goBack()} title={data?.title ?? ''}>
      {loading && !data ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {blocks.map((block, index) =>
        block.startsWith('#') ? (
          <Text key={index} style={styles.heading}>{block.replace(/^#+\s*/, '')}</Text>
        ) : (
          <Text key={index} style={styles.paragraph}>{block}</Text>
        ),
      )}
      {data ? (
        <Text style={styles.updated}>Last updated {new Date(data.updatedAt).toLocaleDateString()}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...type.button,
    fontSize: 18,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragraph: {
    ...type.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  updated: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: spacing.lg,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
});
