import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getPayoutAccount, type PayoutAccount } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { PayoutAccountForm } from '../components/PayoutAccountForm';
import { Screen, ScreenTitle } from '../components/Screen';
import { when } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'PayoutMethod'>;

export function PayoutMethodScreen({ navigation }: Props) {
  const { data } = useQuery(getPayoutAccount);
  // The save returns the stored account, so the card above updates without a second fetch.
  const [saved, setSaved] = useState<PayoutAccount | null>(null);
  const account = saved ?? data;

  return (
    <Screen onBack={() => navigation.goBack()} title="Payout method">
      {account?.set ? (
        <View style={styles.current}>
          <View style={styles.bank}>
            <Ionicons name="business" size={19} color={colors.primary} />
          </View>
          <View style={styles.currentText}>
            <Text style={styles.currentTitle}>
              {account.ifsc} {account.accountNumberMasked}
            </Text>
            <Text style={styles.currentNote}>
              {account.accountHolder}
              {account.updatedAt ? ` · updated ${when(account.updatedAt)}` : ''}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={19} color={colors.success} />
        </View>
      ) : (
        <Text style={styles.empty}>
          No account on file yet. Earnings stay in your balance until there is somewhere to send
          them.
        </Text>
      )}

      <ScreenTitle title="Update your account" subtitle="Changes apply from the next payout run." />

      <PayoutAccountForm current={account} submitLabel="Save changes" onSaved={setSaved} />

      <View style={styles.warning}>
        <Ionicons name="shield-checkmark" size={17} color={colors.warning} />
        <Text style={styles.warningText}>
          A payout already in transit keeps its original destination. Only future transfers move.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  bank: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentText: {
    flex: 1,
  },
  currentTitle: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
  },
  currentNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.amberSurface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warningText: {
    ...type.caption,
    flex: 1,
    color: colors.textMuted,
  },
});
