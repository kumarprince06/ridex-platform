import { useEffect, useState } from 'react';

import { acceptOffer, liveOffers, rejectOffer, type Offer } from '../api/driver';
import { ApiError } from '../api/problem';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { OfferCard } from '../components/OfferCard';
import { OFFER } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = RootScreenProps<'RideOffer'>;

/** Dispatch owns the real expiry; this only counts what the offer payload says is left. */
const WINDOW_SECONDS = 20;

export function RideOfferScreen({ navigation, route }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECONDS);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Fetched rather than passed through params: the countdown must come from the server's
    // expiry, and a param could be minutes stale if the app was backgrounded.
    void liveOffers().then((offers) => {
      const found = offers.find((item) => item.offerId === route.params?.offerId) ?? offers[0] ?? null;
      setOffer(found);
      if (found) {
        const remaining = Math.round((new Date(found.expiresAt).getTime() - Date.now()) / 1000);
        setSecondsLeft(Math.max(0, remaining));
      }
    });
  }, [route.params?.offerId]);

  async function onAccept() {
    if (!offer) return;
    setBusy(true);
    try {
      await acceptOffer(offer.offerId);
      navigation.replace('NavigateToPickup', { rideId: offer.rideId });
    } catch (caught) {
      // "That ride has already been taken" is the 409 from the claim: somebody was faster.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not accept.');
      setTimeout(() => navigation.replace('OfferLost'), 1200);
    } finally {
      setBusy(false);
    }
  }

  async function onDecline() {
    if (offer) {
      await rejectOffer(offer.offerId).catch(() => undefined);
    }
    navigation.goBack();
  }

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
        {/* Falls back to the mock card only until the offer resolves, so the sheet does not jump. */}
        <OfferCard
          offer={
            offer
              ? {
                  ...OFFER,
                  fare: `${offer.currency} ${(offer.quotedFareMinor / 100).toFixed(2)}`,
                  tripDistance: `${(offer.tripDistanceMeters / 1000).toFixed(1)} km`,
                  pickup: offer.pickupAddress ?? OFFER.pickup,
                  dropoff: offer.destinationAddress ?? OFFER.dropoff,
                }
              : OFFER
          }
          secondsLeft={Math.max(0, secondsLeft)}
          totalSeconds={WINDOW_SECONDS}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button
            label="Decline"
            variant="secondary"
            style={styles.decline}
            onPress={() => void onDecline()}
          />
          <Button
            label="Accept"
            style={styles.accept}
            disabled={busy || !offer}
            onPress={() => void onAccept()}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
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
