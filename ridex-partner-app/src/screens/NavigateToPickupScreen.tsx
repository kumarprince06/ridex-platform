import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { MapCanvas } from '../components/MapCanvas';
import { RiderBar } from '../components/RiderBar';
import { SwipeAction } from '../components/SwipeAction';
import { OFFER } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'NavigateToPickup'>;

/** Ride request state DRIVER_ASSIGNED / DRIVER_ARRIVING. */
export function NavigateToPickupScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <MapCanvas showRoute driverAt={0.2} driverLabel="You" pickupLabel={OFFER.pickup} />

      <SafeAreaView style={styles.banner} edges={['top']} pointerEvents="box-none">
        <View style={styles.eta}>
          <Ionicons name="navigate" size={17} color={colors.onPrimary} />
          <Text style={styles.etaLabel}>{OFFER.pickupEta} to pickup · 1.2 km</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.grabber} />

        <Text style={styles.label}>PICKING UP</Text>
        <RiderBar name={OFFER.rider} rating={OFFER.riderRating} note={OFFER.pickup} />

        <View style={styles.addressCard}>
          <Ionicons name="location" size={17} color={colors.primary} />
          <Text style={styles.address}>{OFFER.pickup}</Text>
        </View>

        {/* Turn-by-turn is a handoff to the phone's map app, not a second navigation stack. */}
        <Button label="Open navigation" variant="secondary" />

        {/*
          Arriving is a claim the driver makes, and it is what tells the rider to come out - the
          app cannot infer it from a coordinate. Swipe, not tap: it starts the rider's waiting
          timer and the cancellation window, and it cannot be undone.
        */}
        <SwipeAction
          label="Swipe when you arrive"
          icon="flag"
          onComplete={() => navigation.replace('ArrivedAtPickup')}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CancelTrip')}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={styles.cancelLabel}>Cancel trip</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  eta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  etaLabel: {
    ...type.label,
    color: colors.onPrimary,
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  label: {
    ...type.eyebrow,
    color: colors.textFaint,
    marginBottom: -spacing.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  address: {
    ...type.body,
    flex: 1,
    color: colors.text,
  },
  cancel: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  cancelLabel: {
    ...type.label,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
