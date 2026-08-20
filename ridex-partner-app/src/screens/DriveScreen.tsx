import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DutyPill, DutyToggle } from '../components/DutyToggle';
import { EarningsBar } from '../components/EarningsBar';
import { MapCanvas } from '../components/MapCanvas';
import { StatusBanner } from '../components/StatusBanner';
import { EARNINGS } from '../data/mock';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Drive'>;

/** How long the driver waits before dispatch "finds" a ride. Stand-in for the offer socket. */
const OFFER_DELAY_MS = 6000;

export function DriveScreen({ navigation }: Props) {
  const [online, setOnline] = useState(false);
  const today = EARNINGS.Today;

  useEffect(() => {
    if (!online) {
      return;
    }
    // Stand-in for T10 dispatch: an offer arrives over a WebSocket, it does not fire on a timer.
    const timer = setTimeout(() => navigation.navigate('RideOffer'), OFFER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [online, navigation]);

  return (
    <View style={styles.root}>
      <MapCanvas showUserDot />

      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow}>
          <DutyPill online={online} />

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
              <View style={styles.pulse} />
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

            <DutyToggle online onToggle={() => setOnline(false)} />
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

            <DutyToggle online={false} onToggle={() => setOnline(true)} />
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
