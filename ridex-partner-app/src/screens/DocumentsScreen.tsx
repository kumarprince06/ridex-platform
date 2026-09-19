import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';

import {
  DOCUMENT_LABELS,
  expiringSoon as findExpiringSoon,
  expiryTitle,
  listDocuments,
  uploadDocument,
  type DocumentType,
  type DriverDocument,
} from '../api/documents';
import { pickDocument } from '../api/pickDocument';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { DocumentRow, type RowStatus } from '../components/DocumentRow';
import { Screen, ScreenTitle } from '../components/Screen';
import { StatusBanner } from '../components/StatusBanner';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = RootScreenProps<'Documents'>;

/** Every type the driver can hold, so a missing one is a row rather than an absence. */
const ALL_TYPES: DocumentType[] = [
  'DRIVING_LICENCE',
  'IDENTITY_PROOF',
  'ADDRESS_PROOF',
  'VEHICLE_REGISTRATION',
  'VEHICLE_INSURANCE',
  'BACKGROUND_CHECK',
];

export function DocumentsScreen({ navigation }: Props) {
  const { data, loading, error, refetch } = useQuery(listDocuments, []);
  const documents = data ?? [];

  const expiringSoon = findExpiringSoon(documents);

  async function upload(documentType: DocumentType) {
    try {
      const file = await pickDocument();
      if (!file) {
        return;
      }
      await uploadDocument(documentType, file);
      refetch();
    } catch (caught) {
      Alert.alert(
        'Upload failed',
        caught instanceof ApiError
          ? caught.userMessage
          : caught instanceof Error
            ? caught.message
            : 'Could not upload that document.',
      );
    }
  }

  return (
    <Screen onBack={() => navigation.goBack()} title="Documents">
      <ScreenTitle
        title="Your documents"
        subtitle="Keep these current. An expired document stops offers the moment it lapses."
      />

      {expiringSoon ? (
        <StatusBanner
          icon="alert-circle"
          title={expiryTitle(expiringSoon)}
          body="Upload the renewed copy now so there is no gap in your driving."
          actionLabel="Upload renewal"
          onPress={() => upload(expiringSoon.doc.documentType)}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && data == null ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : null}

      <Text style={styles.spacer} />

      {ALL_TYPES.map((documentType) => {
        const held = documents.find((doc) => doc.documentType === documentType);
        return (
          <DocumentRow
            key={documentType}
            type={DOCUMENT_LABELS[documentType]}
            status={(held?.status ?? 'MISSING') as RowStatus}
            detail={detailFor(held)}
            onPress={() => upload(documentType)}
          />
        );
      })}

      <Text style={styles.note}>
        Documents are visible only to you and to operations during verification.
      </Text>
    </Screen>
  );
}

function detailFor(document: DriverDocument | undefined): string {
  if (!document) {
    return 'Tap to upload';
  }
  // A rejection's note is the only thing that tells the driver what to fix, so it outranks a date.
  if (document.status === 'REJECTED' && document.reviewNotes) {
    return document.reviewNotes;
  }
  if (document.expiresAt) {
    return `Expires ${new Date(document.expiresAt).toLocaleDateString()}`;
  }
  return `Submitted ${new Date(document.createdAt).toLocaleDateString()}`;
}

const styles = StyleSheet.create({
  spacer: {
    height: spacing.lg,
  },
  spinner: {
    marginTop: spacing.lg,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  note: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: spacing.md,
  },
});
