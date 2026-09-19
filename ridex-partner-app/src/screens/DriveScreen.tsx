import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { expiringSoon, expiryTitle, listDocuments } from '../api/documents';
import { reportLocation, setDuty } from '../api/driver';
import { useSession } from '../auth/session';
import { countLabel, unreadCount } from '../api/notifications';
import { getWallet } from '../api/wallet';
import { WalletDueCard } from '../components/WalletDueCard';
import { ApiError } from '../api/problem';
import { useOffers } from '../api/useOffers';
import { currentPosition } from '../lib/location';
import { DutyPill, DutyToggle } from '../components/DutyToggle';
import { EarningsBar } from '../components/EarningsBar';
import { MapCanvas } from '../components/MapCanvas';
import { PulseRings } from '../components/PulseRings';
import { StatusBanner } from '../components/StatusBanner';
import { getEarnings } from '../api/driver';
import { useQuery } from '../api/useQuery';
import { balance, money } from '../lib/format';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Drive'>;

// While on duty the app reports position, which is what puts the driver in the dispatch pool.
const LOCATION_PING_MS = 15000;

export function DriveScreen({ navigation }: Props) {
  // Start from the server's duty flag: a relaunch must not show offline while dispatch has them on.
  const { profile } = useSession();
  const [online, setOnline] = useState(profile?.onDuty ?? false);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  // What the ledger says is owed right now, and what has been earned in all. Nothing here is a
  // target the app invented.
  const { data: earnings, refetch: refetchEarnings } = useQuery(getEarnings);
  const { data: wallet, refetch: refetchWallet } = useQuery(getWallet);
  const { data: unreadData, refetch: refetchUnread } = useQuery(unreadCount);
  const unread = unreadData?.unread ?? 0;
  // This tab stays mounted under a trip, so a cash ride's fee would otherwise show up only on relaunch.
  useFocusEffect(
    useCallback(() => {
      refetchEarnings();
      refetchWallet();
      refetchUnread();
    }, [refetchEarnings, refetchWallet, refetchUnread]),
  );
  const currency = earnings?.currency ?? 'INR';
  const owed = earnings ? balance(earnings.ledgerBalanceMinor, currency) : null;
  const lifetime = earnings ? money(earnings.lifetimeNetMinor, currency) : '--';
  const trips = earnings?.recent.length ?? 0;
  const midnight = new Date().setHours(0, 0, 0, 0);
  const today = (earnings?.recent ?? []).filter((line) => Date.parse(line.earnedAt) >= midnight);
  const todayNet = earnings ? money(today.reduce((total, line) => total + line.netAmountMinor, 0), currency) : '--';
  const { data: documents } = useQuery(listDocuments);
  const expiring = expiringSoon(documents ?? []);

  const [locationLost, setLocationLost] = useState(false);
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
      // Permission revoked or no fix: skip this ping and say so, the next one may succeed.
      currentPosition()
        .then((position) => {
          setLocationLost(false);
          return reportLocation(position.latitude, position.longitude).catch(() => undefined);
        })
        .catch(() => setLocationLost(true));
    }, LOCATION_PING_MS);
    return () => {
      clearInterval(timer);
      setLocationLost(false);
    };
  }, [online]);

  async function toggleDuty(next: boolean) {
    setError(null);
    setSwitching(true);
    try {
      const position = next ? await currentPosition() : null;
      await setDuty(next, position?.latitude, position?.longitude);
      setOnline(next);
    } catch (caught) {
      // "Your account is not approved to drive yet" arrives here, which is the message that
      // matters most to a driver who just installed the app.
      setError(
        caught instanceof ApiError
          ? caught.userMessage
          : caught instanceof Error
            ? caught.message
            : 'Could not change duty status.',
      );
    } finally {
      setSwitching(false);
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

          <View style={styles.topActions}>
            <Pressable
              onPress={() => navigation.navigate('ShuttleRuns')}
              accessibilityRole="button"
              accessibilityLabel="My shuttle runs"
              style={styles.bell}
            >
              <Ionicons name="bus-outline" size={19} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
              style={styles.bell}
            >
              <Ionicons name="notifications-outline" size={19} color={colors.text} />
              {unread > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{countLabel(unread)}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <EarningsBar net={todayNet} detail={`${today.length} trip${today.length === 1 ? '' : 's'} today`} />
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
                <Text style={[styles.searchingNote, locationLost && styles.locationLost]}>
                  {locationLost
                    ? 'Location unavailable - turn on GPS to keep getting offers'
                    : 'Keep the app open - offers appear here'}
                </Text>
              </View>
            </View>

            <WalletDueCard wallet={wallet} onPaid={refetchWallet} />

            <View style={styles.shiftRow}>
              <Shift value={owed?.amount ?? '--'} label={owed?.label ?? 'Owed to you'} />
              <Shift value={String(trips)} label="Recent trips" />
              <Shift value={lifetime} label="Lifetime" />
            </View>

            <DutyToggle online busy={switching} onToggle={() => void toggleDuty(false)} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        ) : (
          <View style={styles.offlineBlock}>
            {expiring ? (
              <StatusBanner
                icon="alert-circle"
                title={expiryTitle(expiring)}
                body="Upload a renewed copy before it lapses, or you will stop receiving offers."
                actionLabel="Update document"
                onPress={() => navigation.navigate('Documents')}
              />
            ) : null}

            <WalletDueCard wallet={wallet} onPaid={refetchWallet} />

            <View style={styles.shiftRow}>
              <Shift value={owed?.amount ?? '--'} label={owed?.label ?? 'Owed to you'} />
              <Shift value={String(trips)} label="Recent trips" />
              <Shift value={lifetime} label="Lifetime" />
            </View>

            <DutyToggle
              online={false}
              busy={switching}
              blockedReason={wallet?.blocked ? 'Pay what you owe to go online.' : undefined}
              onToggle={() => void toggleDuty(true)}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.sm,
    textAlign: 'center',
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
  topActions: {
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
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    ...type.caption,
    fontSize: 10,
    lineHeight: 12,
    color: colors.text,
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
  locationLost: {
    color: colors.warning,
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
