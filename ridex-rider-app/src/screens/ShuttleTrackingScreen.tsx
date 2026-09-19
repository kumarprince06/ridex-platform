import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useShuttleLive } from '../api/shuttleLive';
import { BoardingPassModal } from '../components/BoardingPassModal';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { DriverCard } from '../components/DriverCard';
import { hasArrived, ShuttleEtaCard } from '../components/ShuttleEtaCard';
import { ShuttleRouteMap } from '../components/ShuttleRouteMap';
import { ShuttleStopSlider } from '../components/ShuttleStopSlider';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleTracking'>;

/** Live tracking for one booked shuttle: the route, how long until it reaches you, and every stop. */
export function ShuttleTrackingScreen({ navigation, route }: Props) {
  const { booking } = route.params;
  const [arrived, setArrived] = useState(false);
  // Once the rider is there the socket closes: nothing left to watch.
  const { live, connected } = useShuttleLive(booking.id, !arrived);
  const [showingPass, setShowingPass] = useState(false);

  useEffect(() => {
    if (live && hasArrived(live.trip, live.alightingSequence)) setArrived(true);
  }, [live]);

  // After the drop-off the map shows just the part the rider rode.
  const mapStops = live && arrived
    ? live.trip.stops.filter((stop) => stop.sequence >= live.boardingSequence && stop.sequence <= live.alightingSequence)
    : live?.trip.stops ?? [];

  return (
    <Screen
      title={booking.routeName}
      onBack={() => navigation.goBack()}
      footer={
        arrived ? (
          <Button label="Done" onPress={() => navigation.goBack()} />
        ) : booking.boardingCode && booking.paymentStatus === 'PAID' ? (
          <Button label="Show boarding pass" onPress={() => setShowingPass(true)} />
        ) : undefined
      }
    >
      {live?.trip.status ? (
        <View style={styles.body}>
          <ShuttleRouteMap
            stops={mapStops}
            vehicle={arrived ? null : live.trip.vehicle}
            boardingSequence={live.boardingSequence}
            alightingSequence={live.alightingSequence}
            seatCapacity={booking.crew?.seatCapacity}
            style={styles.map}
          />
          <ShuttleEtaCard
            trip={live.trip}
            boardingSequence={live.boardingSequence}
            alightingSequence={live.alightingSequence}
            connected={connected}
          />
          {booking.crew ? <DriverCard
            name={booking.crew.driverName}
            phone={booking.crew.driverPhone}
            rating={booking.crew.driverRating}
            vehicle={booking.crew.vehicle}
            plate={booking.crew.registrationNumber}
          /> : null}
          {arrived ? null : (
            <>
              <Text style={styles.label}>STOPS</Text>
              <ShuttleStopSlider
                stops={live.trip.stops}
                boardingSequence={live.boardingSequence}
                alightingSequence={live.alightingSequence}
              />
              <Text style={styles.hint}>Tap a stop on the map to see its name and time.</Text>
            </>
          )}
        </View>
      ) : (
        <Text style={styles.hint}>Loading the route...</Text>
      )}

      {booking.boardingCode ? (
        <BoardingPassModal
          visible={showingPass}
          onClose={() => setShowingPass(false)}
          code={booking.boardingCode}
          seat={booking.seatLabel}
          route={booking.routeName}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  map: {
    height: 360,
  },
  label: {
    ...type.caption,
    letterSpacing: 1.2,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },
  hint: {
    ...type.caption,
    color: colors.textFaint,
  },
});
