import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import {
  DOCUMENT_LABELS,
  REQUIRED_TYPES,
  listDocuments,
  uploadDocument,
  type DocumentType,
} from '../api/documents';
import { pickDocument } from '../api/pickDocument';
import { ApiError } from '../api/problem';
import { submitForReview } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { DocumentRow, type RowStatus } from '../components/DocumentRow';
import { Screen, ScreenTitle } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'UploadDocuments'>;

/**
 * Only the two the backend gates review on. Vehicle paperwork is checked against the vehicle,
 * which can be added or replaced after approval, so it is not a blocker here.
 */
const HINTS: Partial<Record<DocumentType, string>> = {
  DRIVING_LICENCE: 'Front and back, all corners visible',
  IDENTITY_PROOF: 'Aadhaar, passport or voter ID',
};

export function UploadDocumentsScreen({ navigation }: Props) {
  const { data, refetch } = useQuery(listDocuments, []);
  const documents = data ?? [];
  const [busy, setBusy] = useState(false);

  const missing = REQUIRED_TYPES.filter(
    (documentType) => !documents.some((doc) => doc.documentType === documentType),
  );

  async function upload(documentType: DocumentType) {
    try {
      const file = await pickDocument();
      if (!file) {
        return;
      }
      setBusy(true);
      await uploadDocument(documentType, file);
      refetch();
    } catch (caught) {
      Alert.alert('Upload failed', message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    try {
      await submitForReview();
      navigation.navigate('BankDetails');
    } catch (caught) {
      // The server checks the same list. If it disagrees with this screen, the server is right.
      Alert.alert('Not ready for review', message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Documents"
      footer={
        <Button
          label={
            missing.length === 0
              ? 'Submit for review'
              : `Upload ${missing.length} more`
          }
          disabled={missing.length > 0 || busy}
          onPress={submit}
        />
      }
    >
      <StepProgress current="Documents" />

      <ScreenTitle
        title="Upload your documents"
        subtitle="Operations reviews these before you can take trips. Clear photos get approved faster."
      />

      {REQUIRED_TYPES.map((documentType) => {
        const held = documents.find((doc) => doc.documentType === documentType);

        return (
          <DocumentRow
            key={documentType}
            type={DOCUMENT_LABELS[documentType]}
            status={(held?.status ?? 'MISSING') as RowStatus}
            detail={
              held
                ? `Uploaded ${new Date(held.createdAt).toLocaleDateString()}`
                : (HINTS[documentType] ?? 'Tap to upload')
            }
            onPress={() => upload(documentType)}
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

function message(caught: unknown): string {
  if (caught instanceof ApiError) return caught.userMessage;
  if (caught instanceof Error) return caught.message;
  return 'Something went wrong.';
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
