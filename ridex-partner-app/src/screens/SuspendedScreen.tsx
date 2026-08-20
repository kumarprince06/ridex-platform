import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Suspended'>;

/**
 * DriverOnboardingStatus.SUSPENDED. Blocks everything except the account tab and support: the
 * driver cannot drive, but must still be able to reach their money and their case.
 */
export function SuspendedScreen({ navigation }: Props) {
  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label="Contact support" onPress={() => navigation.navigate('HelpSupport')} />
          <Button label="View earnings" variant="secondary" onPress={() => navigation.navigate('MainTabs', { screen: 'Earnings' })} />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="hand-left" size={34} color={colors.danger} />
        </View>

        <Text style={styles.title}>Your account is suspended</Text>
        <Text style={styles.subtitle}>
          You cannot receive ride offers while a suspension is active. Your earnings and payouts are
          unaffected.
        </Text>
      </View>

      <View style={styles.card}>
        <Row label="Reason" value="Safety report under investigation" />
        <Row label="Effective" value="18 Aug 2026, 9:40 AM" />
        <Row label="Case" value="SUP-20418" last />
      </View>

      <Text style={styles.note}>
        A member of the safety team will contact you. If you believe this is a mistake, reply to the
        case above rather than opening a new one.
      </Text>
    </Screen>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  rowValue: {
    ...type.label,
    flexShrink: 1,
    color: colors.text,
    textAlign: 'right',
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
});
