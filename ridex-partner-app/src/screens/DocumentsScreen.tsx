import { StyleSheet, Text } from 'react-native';

import { DocumentRow } from '../components/DocumentRow';
import { Screen, ScreenTitle } from '../components/Screen';
import { StatusBanner } from '../components/StatusBanner';
import { DOCUMENTS } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = RootScreenProps<'Documents'>;

export function DocumentsScreen({ navigation }: Props) {
  return (
    <Screen onBack={() => navigation.goBack()} title="Documents">
      <ScreenTitle
        title="Your documents"
        subtitle="Keep these current. An expired document stops offers the moment it lapses."
      />

      <StatusBanner
        icon="alert-circle"
        title="Insurance expires in 12 days"
        body="Upload the renewed certificate now so there is no gap in your driving."
        actionLabel="Upload renewal"
      />

      <Text style={styles.spacer} />

      {DOCUMENTS.map((doc) => (
        <DocumentRow key={doc.type} type={doc.type} status={doc.status} detail={doc.detail} />
      ))}

      <Text style={styles.note}>
        Documents are visible only to you and to operations during verification.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spacer: {
    height: spacing.lg,
  },
  note: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: spacing.md,
  },
});
