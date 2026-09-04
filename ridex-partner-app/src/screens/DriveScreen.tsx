import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { reportLocation, setDuty } from '../api/driver';
import { ApiError } from '../api/problem';
import { useOffers } from '../api/useOffers';
import { currentPosition } from '../lib/location';
import { DutyPill, DutyToggle } from '../components/DutyToggle';
import { EarningsBar } from '../components/EarningsBar';
import { MapCanvas } from '../components/MapCanvas';
import { PulseRings } from '../components/PulseRings';
import { StatusBanner } from '../components/StatusBanner';
import { EARNINGS } from '../data/mock';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Drive'>;

// While on duty the app reports position, which is what puts the driver in the dispatch pool.
const LOCATION_PING_MS = 15000;

export function DriveScreen({ navigation }: Props) {
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = EARNINGS.Today;

  const { offer } = useOffers(online);

  useEffect(() => {
    if (offer) {
      navigation.navigate('RideOffer', { offerId: offer.offerId });
    }
  }, [offer, navigation]);

  useEffect(() => {
    if (!online) {
      return;
    }
    // A driver who stops reporting drops out of the pool after two minutes, so this has to keep
    // running for as long as they are on duty.
    const timer = setInterval(() => {
      void currentPosition().then((position) =>
        reportLocation(position.latitude, position.longitude).catch(() => undefined),
      );
    }, LOCATION_PING_MS);
    return () => clearInterval(timer);
  }, [online]);

  async function toggleDuty(next: boolean) {
    setError(null);
    try {
      const position = next ? await currentPosition() : null;
      await setDuty(next, position?.latitude, position?.longitude);
      setOnline(next);
    } catch (caught) {
      // "Your account is not approved to drive yet" arrives here, which is the message that
      // matters most to a driver who just installed the app.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not change duty status.');
    }
  }

  return (
    <View style={styles.root}>
      <MapCanvas showUserDot />

      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandChip}>
              <Image source={require('../../assets/logo-mark.png')} style={styles.brandMark} />
            </View>
            <DutyPill online={online} />
          </View>

          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <EarningsBar net={today.net} goal={today.goal} progress={today.goalProgress} />
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.grabber} />

        {online ? (
          <View style={styles.onlineBlock}>
            <View style={styles.searching}>
              <PulseRings size={34} spread={2.2} colour={colors.online} style={styles.rings}>
                <View style={styles.pulse} />
              </PulseRings>

              <View style={styles.searchingText}>
                <Text style={styles.searchingTitle}>Looking for rides nearby</Text>
                <Text style={styles.searchingNote}>Midtown · demand is high until 8 PM</Text>
              </View>
            </View>

            <View style={styles.shiftRow}>
              <Shift value={today.online} label="Online" />
              <Shift value={String(today.trips)} label="Trips" />
              <Shift value={today.perHour} label="Per hour" />
            </View>

            <DutyToggle online onToggle={() => void toggleDuty(false)} />
          </View>
        ) : (
          <View style={styles.offlineBlock}>
            <StatusBanner
              icon="alert-circle"
              title="Insurance expires in 12 days"
              body="Upload a renewed certificate before it lapses, or you will stop receiving offers."
              actionLabel="Update document"
              onPress={() => navigation.navigate('Documents')}
            />

            <View style={styles.shiftRow}>
              <Shift value={today.net} label="Earned today" />
              <Shift value={String(today.trips)} label="Trips" />
              <Shift value={today.online} label="Online" />
            </View>

            <DutyToggle online={false} onToggle={() => void toggleDuty(true)} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Shift({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.shift}>
      <Text style={styles.shiftValue}>{value}</Text>
      <Text style={styles.shiftLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // The map behind this is light, and the mark is white and mint - without a dark ground it
  // disappears into the tiles.
  brandChip: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  rings: {
    marginLeft: -spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
    paddingBottom: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  offlineBlock: {
    gap: spacing.lg,
  },
  onlineBlock: {
    gap: spacing.lg,
  },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.online,
  },
  searchingText: {
    flex: 1,
  },
  searchingTitle: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  searchingNote: {
    ...type.caption,
    color: colors.textMuted,
  },
  shiftRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shift: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  shiftValue: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  shiftLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
});
