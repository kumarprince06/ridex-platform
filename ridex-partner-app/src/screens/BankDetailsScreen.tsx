import { StyleSheet, View } from 'react-native';

import { Button } from '../components/Button';
import { PayoutAccountForm } from '../components/PayoutAccountForm';
import { Screen, ScreenTitle } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { RootScreenProps } from '../navigation/types';
import { spacing } from '../theme';

type Props = RootScreenProps<'BankDetails'>;

/**
 * Blocks payout, not dispatch. A driver can be approved and start earning before this exists -
 * the money simply sits in the balance until there is somewhere to send it, which is why "add this
 * later" is a real choice rather than a way out of a form that does nothing.
 */
export function BankDetailsScreen({ navigation }: Props) {
  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Payout"
      footer={
        <View style={styles.actions}>
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

      <PayoutAccountForm
        submitLabel="Save and continue"
        onSaved={() => navigation.replace('UnderReview')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
});
