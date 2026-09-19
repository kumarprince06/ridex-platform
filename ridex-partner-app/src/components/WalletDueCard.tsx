import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/problem';
import { payOffWallet, TOP_UP_PENDING, type Wallet } from '../api/wallet';
import { money } from '../lib/format';
import { colors, radius, spacing, type } from '../theme';
import { Button } from './Button';

/**
 * What the driver owes and the button that pays it. Shown only while the wallet is negative;
 * urgent once it is past the limit, because then no offers arrive until it is paid.
 */
export function WalletDueCard({ wallet, onPaid }: { wallet: Wallet | null; onPaid: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!wallet || !(wallet.balanceMinor < 0)) {
    return null;
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const paid = await payOffWallet();
      if (!paid) {
        return;
      }
      // Still owing what it did: the gateway has the payment as PROCESSING, not settled.
      if (paid.balanceMinor < 0 && paid.balanceMinor <= wallet!.balanceMinor) {
        setError(TOP_UP_PENDING);
        return;
      }
      onPaid();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : caught instanceof Error ? caught.message : 'Payment failed.');
    } finally {
      setBusy(false);
    }
  }

  const due = money(wallet.dueMinor, wallet.currency);
  return (
    <View style={[styles.card, wallet.blocked && styles.blocked]}>
      <View style={styles.row}>
        <Ionicons name="wallet" size={20} color={wallet.blocked ? colors.danger : colors.warning} />
        <View style={styles.text}>
          <Text style={styles.title}>You owe RideX {due}</Text>
          <Text style={styles.note}>
            {wallet.blocked
              ? 'Platform fees on cash rides. Pay to get offers again.'
              : `Platform fees on cash rides. Offers stop below -${money(-wallet.limitMinor, wallet.currency)}.`}
          </Text>
        </View>
      </View>
      <Button label={busy ? 'Opening payment...' : `Pay ${due}`} onPress={() => void pay()} loading={busy} disabled={busy} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.amberSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.lg,
  },
  blocked: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.danger,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
});
