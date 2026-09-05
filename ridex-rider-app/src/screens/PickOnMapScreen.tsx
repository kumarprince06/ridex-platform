import { Ionicons } from '@expo/vector-icons';
import { Camera, Map } from '@maplibre/maplibre-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { reverseGeocode } from '../api/maps';
import { Button } from '../components/Button';
import { FALLBACK_CENTER, LngLat, useCurrentLocation } from '../lib/location';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PickOnMap'>;

const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

/** Long enough to let a pan settle, short enough that the address is there before the thumb is. */
const SETTLE_MS = 500;

/**
 * Pick a point by moving the map under a fixed pin.
 *
 * A pin the map moves under, rather than a marker the finger drags: the finger covers the exact
 * spot it is trying to place, which is the one part of the screen that matters here.
 */
export function PickOnMapScreen({ navigation, route }: Props) {
  const { mode, initial } = route.params;
  const { coord } = useCurrentLocation();
  const start = initial ?? coord ?? FALLBACK_CENTER;

  const [centre, setCentre] = useState<LngLat>(start);
  const [address, setAddress] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    setLooking(true);
    const timer = setTimeout(() => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      reverseGeocode(centre, controller.signal)
        .then((place) => setAddress(place.formattedAddress))
        // An address is a convenience; the coordinates are the answer. A failed lookup must not
        // stop somebody confirming a pin they can see is right.
        .catch(() => setAddress(null))
        .finally(() => {
          if (inFlight.current === controller) {
            setLooking(false);
          }
        });
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [centre[0], centre[1]]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const confirm = () =>
    navigation.navigate({
      name: 'SearchDestination',
      params: {
        picked: {
          field: mode,
          name: address ?? 'Pinned location',
          coord: centre,
        },
      },
      merge: true,
    });

  return (
    <View style={styles.root}>
      <Map
        style={StyleSheet.absoluteFillObject}
        mapStyle={STYLE_URL}
        attribution
        logo={false}
        compass={false}
        touchRotate={false}
        touchPitch={false}
        onRegionDidChange={(event) => setCentre(event.nativeEvent.center as LngLat)}
      >
        <Camera initialViewState={{ center: start, zoom: 16 }} />
      </Map>

      {/* Sits at the map's centre and never moves, so the address below always describes it. */}
      <View style={styles.pinBox} pointerEvents="none">
        <Ionicons
          name="location"
          size={38}
          color={mode === 'pickup' ? colors.primary : colors.amber}
        />
        <View style={styles.pinShadow} />
      </View>

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backChip}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Move the map to set your {mode === 'pickup' ? 'pickup' : 'destination'}
          </Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.addressRow}>
          <Ionicons
            name={mode === 'pickup' ? 'ellipse' : 'location'}
            size={13}
            color={mode === 'pickup' ? colors.primary : colors.amber}
          />
          <View style={styles.flex}>
            {looking && !address ? (
              <ActivityIndicator color={colors.primary} style={styles.spinner} />
            ) : (
              <Text style={styles.address} numberOfLines={2}>
                {address ?? 'Address not known for this point'}
              </Text>
            )}
            <Text style={styles.coords}>
              {centre[1].toFixed(5)}, {centre[0].toFixed(5)}
            </Text>
          </View>
        </View>

        <Button label="Confirm this location" onPress={confirm} style={styles.confirm} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  pinBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    width: 8,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginTop: -2,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.overlay,
  },
  hintText: {
    ...type.caption,
    color: colors.text,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.bg,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  address: {
    ...type.body,
    color: colors.text,
  },
  coords: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: 1,
  },
  spinner: {
    alignSelf: 'flex-start',
  },
  confirm: {
    marginTop: spacing.md,
  },
});
