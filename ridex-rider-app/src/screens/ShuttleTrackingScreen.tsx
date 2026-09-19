import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useShuttleLive } from '../api/shuttleLive';
import { BoardingPassModal } from '../components/BoardingPassModal';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ShuttleCrewCard } from '../components/ShuttleCrewCard';
import { ShuttleEtaCard } from '../components/ShuttleEtaCard';
import { ShuttleRouteMap } from '../components/ShuttleRouteMap';
import { ShuttleStopSlider } from '../components/ShuttleStopSlider';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleTracking'>;

/** Live tracking for one booked shuttle: the route, how long until it reaches you, and every stop. */
export function ShuttleTrackingScreen({ navigation, route }: Props) {
  const { booking } = route.params;
  const { live, connected } = useShuttleLive(booking.id, true);
  const [showingPass, setShowingPass] = useState(false);

  return (
    <Screen
      title={booking.routeName}
      onBack={() => navigation.goBack()}
      footer={booking.boardingCode ? <Button label="Show boarding pass" onPress={() => setShowingPass(true)} /> : undefined}
    >
      {live?.trip.status ? (
        <View style={styles.body}>
          <ShuttleRouteMap
            stops={live.trip.stops}
            vehicle={live.trip.vehicle}
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
          {booking.crew ? <ShuttleCrewCard crew={booking.crew} /> : null}
          <Text style={styles.label}>STOPS</Text>
          <ShuttleStopSlider
            stops={live.trip.stops}
            boardingSequence={live.boardingSequence}
            alightingSequence={live.alightingSequence}
          />
          <Text style={styles.hint}>Tap a stop on the map to see its name and time.</Text>
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
