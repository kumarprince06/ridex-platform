import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Rejected'>;

/**
 * DriverOnboardingStatus.REJECTED. Every rejection names the document and the reason: a generic
 * "your application was rejected" gives the driver nothing to fix and sends them to support.
 */
const PROBLEMS = [
  { document: "Driver's licence", reason: 'The expiry date is not readable in the photo.' },
  { document: 'Insurance certificate', reason: 'Policy expired on 02 Jun 2026.' },
];

export function RejectedScreen({ navigation }: Props) {
  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label="Re-upload documents" onPress={() => navigation.navigate('UploadDocuments')} />
          <Button label="Contact support" variant="secondary" onPress={() => navigation.navigate('HelpSupport')} />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="close" size={38} color={colors.danger} />
        </View>

        <Text style={styles.title}>We could not approve you yet</Text>
        <Text style={styles.subtitle}>
          Two documents need another look. Fix these and resubmit - most drivers are approved on the
          second try.
        </Text>
      </View>

      {PROBLEMS.map((problem) => (
        <View key={problem.document} style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="alert-circle" size={17} color={colors.danger} />
            <Text style={styles.document}>{problem.document}</Text>
          </View>
          <Text style={styles.reason}>{problem.reason}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  document: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  reason: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
});
