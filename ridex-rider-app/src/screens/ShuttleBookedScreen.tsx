import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '../api/rides';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttleBooked'>;

export function ShuttleBookedScreen({ navigation, route }: Props) {
  const { booking } = route.params;

  return (
    <Screen
      title="Booked"
      footer={<Button label="Done" onPress={() => navigation.popToTop()} />}
    >
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Ionicons name="checkmark" size={30} color={colors.onPrimary} />
        </View>
        <Text style={styles.title}>Seat {booking.seatLabel} is yours</Text>
        <Text style={styles.route}>{booking.routeName}</Text>
      </View>

      {/*
        The code the driver checks you in against. Shown large because it is read out loud at a
        door, in the dark, through a window - not tapped.
      */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>SHOW THIS TO THE DRIVER</Text>
        <Text style={styles.code}>{booking.boardingCode}</Text>
      </View>

      <View style={styles.card}>
          <Line label="Get on at" value={booking.boardingStopName} />
          <Line label="Get off at" value={booking.alightingStopName} />
          <Line
            label="Departs"
            value={new Date(booking.departsAt).toLocaleString([], {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          />
          <Line
            label="Fare"
            value={
              // A pass covered it, so nothing was charged - saying "0.00" would read as an error.
              booking.passId ? 'Covered by your pass' : formatMoney(booking.fareMinor, booking.currency)
            }
            last
          />
      </View>
    </Screen>
  );
}

function Line({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.line, !last && styles.lineBorder]}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  route: {
    ...type.body,
    color: colors.textMuted,
  },
  codeCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(46, 231, 199, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 231, 199, 0.35)',
    marginBottom: spacing.lg,
  },
  codeLabel: {
    ...type.eyebrow,
    color: colors.primary,
  },
  code: {
    ...type.title,
    fontSize: 40,
    letterSpacing: 8,
    color: colors.text,
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  lineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  lineValue: {
    ...type.body,
    color: colors.text,
  },
});
