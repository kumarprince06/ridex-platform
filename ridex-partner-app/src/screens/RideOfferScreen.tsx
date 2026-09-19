import { useEffect, useState } from 'react';

import { acceptOffer, liveOffers, rejectOffer, type Offer } from '../api/driver';
import { ApiError } from '../api/problem';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { OfferCard } from '../components/OfferCard';
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
      // The accept response carries the trip: every later action - arrive, start, complete - is
      // against that id, and without it the driver has a ride they cannot drive.
      const accepted = await acceptOffer(offer.offerId);
      navigation.replace('NavigateToPickup', {
        rideId: accepted.rideId,
        tripId: accepted.tripId ?? undefined,
      });
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
      <MapCanvas
        pickup={offer ? [offer.pickupLng, offer.pickupLat] : undefined}
        destination={offer ? [offer.destinationLng, offer.destinationLat] : undefined}
      />

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        {/* Nothing invented while it loads: an offer card showing somebody else's fare is how a
            driver accepts a ride they would have declined. */}
        {offer ? (
          <OfferCard
            offer={offer}
            secondsLeft={Math.max(0, secondsLeft)}
            totalSeconds={WINDOW_SECONDS}
          />
        ) : (
          <Text style={styles.loading}>Loading the offer...</Text>
        )}

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
  loading: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
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
