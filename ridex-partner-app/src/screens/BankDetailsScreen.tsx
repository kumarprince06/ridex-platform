import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { TextField } from '../components/TextField';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'BankDetails'>;

/**
 * Blocks payout, not dispatch. A driver can be approved and start earning before this exists -
 * the money simply sits in the balance until there is somewhere to send it.
 */
export function BankDetailsScreen({ navigation }: Props) {
  const [holder, setHolder] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Payout"
      footer={
        <View style={styles.actions}>
          <Button label="Save and continue" onPress={() => navigation.replace('UnderReview')} />
          <Button
            label="Add this later"
            variant="secondary"
            onPress={() => navigation.replace('UnderReview')}
          />
        </View>
      }
    >
      <StepProgress current="Payout" />

      <ScreenTitle
        title="Where should we send your earnings?"
        subtitle="Payouts run weekly. You can start driving before this is set up."
      />

      <TextField label="Account holder" value={holder} onChangeText={setHolder} placeholder="As printed on the account" autoCapitalize="words" />
      <TextField label="Account number" value={account} onChangeText={setAccount} placeholder="0000 0000 0000" keyboardType="number-pad" />
      <TextField label="IFSC / routing code" value={ifsc} onChangeText={setIfsc} placeholder="HDFC0001234" autoCapitalize="none" />

      <Text style={styles.note}>
        The name on this account must match your profile name. Mismatches are the most common reason
        a payout is returned.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
});
