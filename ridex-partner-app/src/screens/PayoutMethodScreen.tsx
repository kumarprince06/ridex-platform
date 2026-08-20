import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'PayoutMethod'>;

export function PayoutMethodScreen({ navigation }: Props) {
  const [holder, setHolder] = useState('Marcus Reid');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('HDFC0001234');

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Payout method"
      footer={<Button label="Save changes" onPress={() => navigation.goBack()} />}
    >
      <View style={styles.current}>
        <View style={styles.bank}>
          <Ionicons name="business" size={19} color={colors.primary} />
        </View>
        <View style={styles.currentText}>
          <Text style={styles.currentTitle}>HDFC Bank ••4412</Text>
          <Text style={styles.currentNote}>Active since March 2024</Text>
        </View>
        <Ionicons name="checkmark-circle" size={19} color={colors.success} />
      </View>

      <ScreenTitle title="Update your account" subtitle="Changes apply from the next payout run." />

      <TextField label="Account holder" value={holder} onChangeText={setHolder} autoCapitalize="words" />
      <TextField label="Account number" value={account} onChangeText={setAccount} placeholder="0000 0000 0000" keyboardType="number-pad" />
      <TextField label="IFSC / routing code" value={ifsc} onChangeText={setIfsc} autoCapitalize="none" />

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
