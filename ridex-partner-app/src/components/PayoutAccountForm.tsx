import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { setPayoutAccount, type PayoutAccount } from '../api/driver';
import { ApiError } from '../api/problem';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors, radius, spacing, type } from '../theme';

/** The RBI's format: four letters, a zero, then the branch code. The server checks it too. */
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT = /^\d{9,18}$/;

type Props = {
  /** What is already on file, so the form opens on the account it is about to replace. */
  current?: PayoutAccount | null;
  submitLabel: string;
  onSaved: (account: PayoutAccount) => void;
};

/**
 * Where earnings are sent.
 *
 * <p>Validated before it is sent, not at payout time: a typo found on the day the money moves is a
 * returned transfer and a week's wait, and the driver is not in the room to fix it.
 */
export function PayoutAccountForm({ current, submitLabel, onSaved }: Props) {
  const [accountHolder, setAccountHolder] = useState(current?.accountHolder ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState(current?.ifsc ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = ifsc.trim().toUpperCase();
  const ready =
    accountHolder.trim().length > 0 && ACCOUNT.test(accountNumber.trim()) && IFSC.test(code);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onSaved(
        await setPayoutAccount({
          accountHolder: accountHolder.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: code,
        }),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not save those details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <TextField
        label="Account holder"
        value={accountHolder}
        onChangeText={setAccountHolder}
        placeholder="As printed on the account"
        autoCapitalize="words"
      />
      <TextField
        label="Account number"
        value={accountNumber}
        onChangeText={setAccountNumber}
        // Never prefilled from the masked value: asterisks cannot be paid into.
        placeholder={current?.accountNumberMasked ?? '0000 0000 0000'}
        keyboardType="number-pad"
      />
      <TextField
        label="IFSC / routing code"
        value={ifsc}
        onChangeText={setIfsc}
        placeholder="HDFC0001234"
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.note}>
        The name on this account must match your profile name. Mismatches are the most common reason
        a payout is returned.
      </Text>

      <Button
        label={busy ? 'Saving...' : submitLabel}
        disabled={!ready || busy}
        onPress={() => void save()}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  action: {
    marginTop: spacing.lg,
  },
});
