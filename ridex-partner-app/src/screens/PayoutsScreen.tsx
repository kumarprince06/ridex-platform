import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { EARNINGS, PAYOUTS, Payout } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Payouts'>;

const TONE: Record<Payout['status'], string> = {
  Settled: colors.success,
  'In transit': colors.warning,
  Failed: colors.danger,
};

export function PayoutsScreen({ navigation }: Props) {
  return (
    <Screen onBack={() => navigation.goBack()} title="Payouts">
      <View style={styles.balance}>
        <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
        <Text style={styles.balanceValue}>{EARNINGS.Week.net}</Text>
        <Text style={styles.balanceNote}>Next transfer Monday to HDFC ••4412</Text>
      </View>

      <SectionLabel>HISTORY</SectionLabel>

      {PAYOUTS.map((payout) => (
        <View key={payout.id} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="arrow-up" size={17} color={TONE[payout.status]} />
          </View>

          <View style={styles.text}>
            <Text style={styles.amount}>{payout.amount}</Text>
            <Text style={styles.meta}>
              {payout.when} · {payout.destination}
            </Text>
          </View>

          <Text style={[styles.status, { color: TONE[payout.status] }]}>{payout.status}</Text>
        </View>
      ))}

      {/* Every payout ties back to its settlement records - the ledger is the source, not this list. */}
      <Text style={styles.note}>
        Each payout is reconcilable to the trips that produced it. Open a trip to see its share.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
