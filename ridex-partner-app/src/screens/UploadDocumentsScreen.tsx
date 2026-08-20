import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { DocumentRow } from '../components/DocumentRow';
import { Screen, ScreenTitle } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { DocumentStatus } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'UploadDocuments'>;

/** One row per DriverDocumentType in the backend. Produces DOCUMENTS_SUBMITTED once all are in. */
const REQUIRED = [
  { type: "Driver's licence", hint: 'Front and back, all corners visible' },
  { type: 'Vehicle registration', hint: 'Matching the plate you entered' },
  { type: 'Insurance certificate', hint: 'Must be valid for the next 30 days' },
  { type: 'Profile photo', hint: 'Clear face, no sunglasses' },
];

export function UploadDocumentsScreen({ navigation }: Props) {
  const [uploaded, setUploaded] = useState<string[]>([]);
  const complete = uploaded.length === REQUIRED.length;

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Documents"
      footer={
        <Button
          label={complete ? 'Submit for review' : `Upload ${REQUIRED.length - uploaded.length} more`}
          disabled={!complete}
          onPress={() => navigation.navigate('BankDetails')}
        />
      }
    >
      <StepProgress current="Documents" />

      <ScreenTitle
        title="Upload your documents"
        subtitle="Operations reviews these before you can take trips. Clear photos get approved faster."
      />

      {REQUIRED.map((doc) => {
        const done = uploaded.includes(doc.type);
        const status: DocumentStatus = done ? 'Under review' : 'Missing';

        return (
          <DocumentRow
            key={doc.type}
            type={doc.type}
            status={status}
            detail={done ? 'Uploaded just now' : doc.hint}
            onPress={() =>
              setUploaded((prev) => (done ? prev.filter((t) => t !== doc.type) : [...prev, doc.type]))
            }
          />
        );
      })}

      <Pressable accessibilityRole="button" style={styles.help}>
        <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
        <Text style={styles.helpText}>
          Documents are stored privately and shared only with operations for verification.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  helpText: {
    ...type.caption,
    flex: 1,
    color: colors.textMuted,
  },
});
