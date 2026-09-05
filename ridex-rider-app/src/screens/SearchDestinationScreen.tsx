import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCurrentAddress } from '../api/maps';
import { listRides } from '../api/rides';
import { useQuery } from '../api/useQuery';
import { LngLat, useCurrentLocation } from '../lib/location';
import { Place, searchPlaces } from '../lib/places';
import { RootStackParamList } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchDestination'>;

/** Long enough that a fast typist does not fire a request per keystroke, short enough to feel live. */
const DEBOUNCE_MS = 350;

type Chosen = { name: string; coord: LngLat };

export function SearchDestinationScreen({ navigation, route }: Props) {
  // Which of the two boxes the typing and the results belong to.
  const [field, setField] = useState<'pickup' | 'destination'>('destination');
  const [query, setQuery] = useState('');
  const [pickupText, setPickupText] = useState('');
  // Null pickup means the device's position, which is what most riders want and none have to type.
  const [pickup, setPickup] = useState<Chosen | null>(null);
  // The address the phone is standing at, so the pickup box names a place rather than a phrase.
  const here = useCurrentAddress();
  const { coord } = useCurrentLocation();
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  // One in-flight request at a time: an older, slower response must not overwrite a newer one.
  const inFlight = useRef<AbortController | null>(null);

  // A point pinned on the map comes back as a route param rather than a callback, so the picker
  // stays a plain screen that can be opened from anywhere.
  const picked = route.params?.picked;
  useEffect(() => {
    if (!picked) {
      return;
    }
    if (picked.field === 'pickup') {
      setPickup({ name: picked.name, coord: picked.coord });
      setPickupText(picked.name);
      setField('destination');
    } else {
      go({ name: picked.name, coord: picked.coord });
    }
    navigation.setParams({ picked: undefined });
  }, [picked]);

  // Past destinations, each with the coordinates it was actually ridden to. A shortcut that
  // carries only a name is a shortcut that cannot be priced.
  const { data: rides } = useQuery(listRides, []);
  const recent = (rides ?? [])
    .filter((ride) => ride.destinationAddress)
    .filter(
      (ride, index, all) =>
        all.findIndex((other) => other.destinationAddress === ride.destinationAddress) === index,
    )
    .slice(0, 6);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearching(false);
      setFailed(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      searchPlaces(trimmed, controller.signal)
        .then((found) => {
          setResults(found);
          setFailed(false);
        })
        .catch((error: unknown) => {
          if ((error as Error)?.name !== 'AbortError') {
            setFailed(true);
          }
        })
        .finally(() => {
          if (inFlight.current === controller) {
            setSearching(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => () => inFlight.current?.abort(), []);

  /** Sets whichever box is active. Only a chosen destination moves the rider on. */
  function choose(name: string, coordinate?: LngLat) {
    if (field === 'pickup') {
      if (coordinate) {
        setPickup({ name, coord: coordinate });
        setPickupText(name);
      }
      setQuery('');
      setField('destination');
      return;
    }
    go(coordinate ? { name, coord: coordinate } : { name, coord: [0, 0] });
  }

  function go(destination: Chosen) {
    navigation.navigate('RoutePreview', {
      destination: destination.name,
      destinationCoord: destination.coord,
      // The resolved address travels with the trip: the screens after this one have no reason
      // to ask the geocoder the same question again.
      pickup: pickup ?? (here && coord ? { name: here, coord } : undefined),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backChip}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.fields}>
          {/* Editable, because the rider is not always at the pickup: booking for somebody else,
              or standing at a gate the phone puts on the wrong side of the road. */}
          <Pressable
            onPress={() => {
              setField('pickup');
              setQuery(pickupText);
            }}
            style={[styles.field, field === 'pickup' && styles.fieldActive]}
          >
            <View style={styles.dotMint} />
            {field === 'pickup' ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Pickup point"
                placeholderTextColor={colors.textFaint}
                autoFocus
                returnKeyType="search"
                style={styles.input}
              />
            ) : (
              <Text style={styles.fieldValue} numberOfLines={1}>
                {pickup?.name ?? here ?? 'Current location'}
              </Text>
            )}
            {pickup && field !== 'pickup' ? (
              <Pressable
                onPress={() => {
                  setPickup(null);
                  setPickupText('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Use current location"
                hitSlop={spacing.md}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => {
              setField('destination');
              setQuery('');
            }}
            style={[styles.field, field === 'destination' && styles.fieldActive]}
          >
            <View style={styles.dotAmber} />
            {field === 'destination' ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Where to?"
                placeholderTextColor={colors.textFaint}
                autoFocus
                onSubmitEditing={() => {
                  const first = results[0];
                  if (first) {
                    choose(first.name, first.coord);
                  }
                }}
                returnKeyType="search"
                style={styles.input}
              />
            ) : (
              <Text style={styles.fieldValue} numberOfLines={1}>
                Where to?
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Always offered: no search can name an unmarked gate, a building site or a field. */}
        <PlaceRow
          icon="map"
          tone={colors.primary}
          name={`Set ${field} on the map`}
          address="Drop a pin where the search cannot reach"
          onPress={() =>
            navigation.navigate('PickOnMap', {
              mode: field,
              initial: field === 'pickup' ? pickup?.coord : undefined,
            })
          }
        />

        {query.trim().length >= 3 ? (
          <>
            <SectionHeader title="RESULTS" action={searching ? '' : `${results.length}`} />

            {searching && results.length === 0 ? (
              <View style={styles.status}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.statusText}>Searching…</Text>
              </View>
            ) : null}

            {failed ? (
              <Text style={styles.statusText}>
                Could not reach the place search. Check your connection and try again.
              </Text>
            ) : null}

            {!searching && !failed && results.length === 0 ? (
              <Text style={styles.statusText}>Nothing found for “{query.trim()}”.</Text>
            ) : null}

            {results.map((place) => (
              <PlaceRow
                key={place.id}
                icon="location"
                tone={colors.primary}
                name={place.name}
                address={place.detail}
                chevron
                onPress={() => choose(place.name, place.coord)}
              />
            ))}
          </>
        ) : null}

        {recent.length > 0 ? (
          <>
            <SectionHeader title="RECENT" action="" />
            {recent.map((ride) => (
              <PlaceRow
                key={ride.id}
                icon="time-outline"
                tone={colors.textMuted}
                name={ride.destinationAddress!}
                address="Previous trip"
                chevron
                onPress={() =>
                  choose(ride.destinationAddress!, [ride.destinationLng, ride.destinationLat])
                }
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, action }: { title: string; action: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionAction}>{action}</Text>
    </View>
  );
}

function PlaceRow({
  icon,
  tone,
  name,
  address,
  chevron = false,
  onPress,
}: {
  icon: IconName;
  tone: string;
  name: string;
  address: string;
  chevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.placeRow, pressed && styles.pressed]}
    >
      <View style={[styles.placeIcon, { backgroundColor: `${tone}2E` }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.placeName}>{name}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          {address}
        </Text>
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  statusText: {
    ...type.caption,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: {
    flex: 1,
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldActive: {
    borderColor: colors.primary,
  },
  dotMint: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  dotAmber: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  fieldValue: {
    ...type.body,
    color: colors.text,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.text,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...type.eyebrow,
    color: colors.text,
  },
  sectionAction: {
    ...type.label,
    color: colors.primary,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  placeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  placeAddress: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
});
