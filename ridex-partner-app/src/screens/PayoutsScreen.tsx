import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatMoney, getEarnings, listPayouts, type PayoutStatus } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { RootScreenProps } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Payouts'>;

const TONE: Record<PayoutStatus, { label: string; colour: string; icon: IconName }> = {
  PAID: { label: 'Settled', colour: colors.success, icon: 'arrow-up' },
  PROCESSING: { label: 'In transit', colour: colors.warning, icon: 'swap-horizontal' },
  PENDING: { label: 'Queued', colour: colors.textMuted, icon: 'hourglass' },
  FAILED: { label: 'Failed', colour: colors.danger, icon: 'close-circle' },
};

export function PayoutsScreen({ navigation }: Props) {
  const { data: payouts, loading, error } = useQuery(listPayouts, []);
  const { data: earnings } = useQuery(getEarnings, []);

  return (
    <Screen onBack={() => navigation.goBack()} title="Payouts">
      <View style={styles.balance}>
        <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
        {/* The ledger balance, not lifetime earnings: this is what is still owed after every
            payout that has actually settled. */}
        <Text style={styles.balanceValue}>
          {earnings ? formatMoney(earnings.ledgerBalanceMinor, earnings.currency) : '—'}
        </Text>
        <Text style={styles.balanceNote}>Transfers are made once operations settles the batch.</Text>
      </View>

      <SectionLabel>HISTORY</SectionLabel>

      {loading && payouts == null ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && payouts?.length === 0 ? (
        <Text style={styles.empty}>No payouts yet.</Text>
      ) : null}

      {(payouts ?? []).map((payout) => {
        const tone = TONE[payout.status];

        return (
          <View key={payout.id} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name={tone.icon} size={17} color={tone.colour} />
            </View>

            <View style={styles.text}>
              <Text style={styles.amount}>
                {formatMoney(payout.amountMinor, payout.currency)}
              </Text>
              <Text style={styles.meta}>
                {new Date(payout.settledAt ?? payout.createdAt).toLocaleDateString()}
                {/* The bank reference is the only thing a driver can take to their bank when the
                    money has not shown up. */}
                {payout.reference ? ` · ${payout.reference}` : ''}
                {payout.failureReason ? ` · ${payout.failureReason}` : ''}
              </Text>
            </View>

            <Text style={[styles.status, { color: tone.colour }]}>{tone.label}</Text>
          </View>
        );
      })}

      {/* Every payout ties back to its settlement records - the ledger is the source, not this list. */}
      <Text style={styles.note}>
        Each payout is reconcilable to the trips that produced it. Open a trip to see its share.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginVertical: spacing.lg,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  balance: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
  },
  balanceValue: {
    ...type.hero,
    color: colors.text,
    marginTop: spacing.xs,
  },
  balanceNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  amount: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
  },
  status: {
    ...type.caption,
  },
  note: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: spacing.lg,
  },
});
