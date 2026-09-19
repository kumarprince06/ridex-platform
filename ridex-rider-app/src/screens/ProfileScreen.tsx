import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { unreadCount } from '../api/notifications';
import { getPoints } from '../api/points';
import { listRides } from '../api/rides';
import { listBookings, shuttleOutcome } from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Avatar } from '../components/Avatar';
import { useBrandRefresh } from '../components/BrandRefresh';
import { Row } from '../components/Row';
import { SectionLabel } from '../components/SectionLabel';
import { TabScreenProps } from '../navigation/types';
import { useSession } from '../auth/session';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { profile, signOut } = useSession();
  // Falls back to the placeholder until the profile has loaded, or the header jumps on first paint.
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Your account';

  // Counted from the rider's own rides, so every figure here is one the server actually sent.
  const { data: rides, refetch: refetchRides } = useQuery(listRides, []);
  const { data: unread, refetch: refetchUnread } = useQuery(unreadCount, []);
  const { data: seats, refetch: refetchSeats } = useQuery(listBookings, []);
  const { data: points, refetch: refetchPoints } = useQuery(getPoints, []);
  const pull = useBrandRefresh(() => Promise.all([refetchRides(), refetchUnread(), refetchSeats(), refetchPoints()]));
  const completed = (rides ?? []).filter((ride) => ride.status === 'COMPLETED');
  // Shuttle trips the rider actually took count as trips too.
  const trips = completed.length + (seats ?? []).filter((seat) => shuttleOutcome(seat) === 'COMPLETED').length;
  const stats = [
    { icon: 'car' as const, tone: '#E0785A', value: String(trips), label: 'Total Trips' },
    { icon: 'sparkles' as const, tone: '#E0B252', value: points ? String(points.balance) : '–', label: 'Points' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={pull.control}
      >
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.identity}>
          <View>
            <Avatar name={fullName} size={62} brand />
            {/* Online pip, as in the mockup. */}
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.identityText}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.email}>{profile?.email ?? ""}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.trips}>{trips} trips</Text>
            </View>
          </View>

          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={styles.editChip}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Ionicons name={stat.icon} size={18} color={stat.tone} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <SectionLabel>ACCOUNT</SectionLabel>
        <Row
          icon="person-outline"
          title="Edit Profile"
          subtitle="Name, phone, email"
          tone="#5FB8D6"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Row
          icon="location"
          title="Saved Places"
          subtitle="Home, work & favorites"
          tone="#E05A6F"
          onPress={() => navigation.navigate('SavedPlaces')}
        />
        <Row
          icon="sparkles"
          title="Rewards & Referrals"
          subtitle="Points, invite code"
          tone="#E0B252"
          onPress={() => navigation.navigate('Rewards')}
        />

        <SectionLabel>PREFERENCES</SectionLabel>
        <Row
          icon="notifications-outline"
          title="Notifications"
          subtitle="Ride updates, offers"
          tone="#E0B252"
          count={unread?.unread}
          onPress={() => navigation.navigate('Notifications')}
        />
        <Row
          icon="settings-outline"
          title="App Settings"
          subtitle="Notifications, terms, privacy"
          tone="#8FA0BF"
          onPress={() => navigation.navigate('Settings')}
        />
        <Row
          icon="lock-closed"
          title="Privacy & Security"
          subtitle="Password, signed-in devices"
          tone="#5FD68A"
          onPress={() => navigation.navigate('PrivacySecurity')}
        />

        <SectionLabel>SUPPORT</SectionLabel>
        <Row
          icon="help-circle"
          title="Help & Support"
          subtitle="FAQs and contact us"
          tone="#E05A6F"
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <Row
          icon="flag"
          title="Report an Issue"
          subtitle="Feedback and complaints"
          tone="#E05A6F"
          onPress={() => navigation.navigate('ReportIssue')}
        />

        {/* RootNavigator sees signedIn drop and resets to Welcome. */}
        <Pressable onPress={() => void signOut()} accessibilityRole="button" style={styles.signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>RideX v0.1.0 · © RideX Technologies</Text>
      </ScrollView>
      {pull.overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heading: {
    ...type.title,
    color: colors.text,
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: '#5FD68A',
    borderWidth: 2.5,
    borderColor: colors.bg,
  },
  identityText: {
    flex: 1,
  },
  name: {
    ...type.title,
    fontSize: 21,
    color: colors.text,
  },
  email: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.amberSurface,
  },
  ratingText: {
    ...type.caption,
    fontSize: 11,
    color: colors.amber,
  },
  trips: {
    ...type.caption,
    color: colors.textMuted,
  },
  editChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...type.button,
    fontSize: 17,
    color: colors.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  signOut: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  signOutText: {
    ...type.button,
    color: colors.text,
  },
  version: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
