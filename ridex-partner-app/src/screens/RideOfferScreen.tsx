import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { OfferCard } from '../components/OfferCard';
import { OFFER } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = RootScreenProps<'RideOffer'>;

/** Dispatch owns the real expiry; this only counts what the offer payload says is left. */
const WINDOW_SECONDS = 15;

export function RideOfferScreen({ navigation }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) {
      return;
    }
    // A missed offer is not an error state - it goes back the same way a lost race does.
    navigation.replace('OfferLost');
  }, [secondsLeft, navigation]);

  return (
    <View style={styles.root}>
      <MapCanvas showRoute pickupLabel={OFFER.pickup} destinationLabel={OFFER.dropoff} />

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <OfferCard offer={OFFER} secondsLeft={Math.max(0, secondsLeft)} totalSeconds={WINDOW_SECONDS} />

        <View style={styles.actions}>
          <Button
            label="Decline"
            variant="secondary"
            style={styles.decline}
            onPress={() => navigation.goBack()}
          />
          <Button
            label="Accept"
            style={styles.accept}
            onPress={() => navigation.replace('NavigateToPickup')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  decline: {
    flex: 1,
  },
  // Accept is the larger target: it is the action the driver wants, and the one taken in a hurry.
  accept: {
    flex: 2,
  },
});
