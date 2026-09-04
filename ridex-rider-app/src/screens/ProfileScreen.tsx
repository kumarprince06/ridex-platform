import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { Row } from '../components/Row';
import { SectionLabel } from '../components/SectionLabel';
import { TabScreenProps } from '../navigation/types';
import { useSession } from '../auth/session';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Profile'>;

const STATS = [
  { icon: 'car' as const, tone: '#E0785A', value: '47', label: 'Total Trips' },
  { icon: 'wallet' as const, tone: '#E0B252', value: '$24.50', label: 'Saved' },
  { icon: 'star' as const, tone: '#E0B252', value: '8 mo', label: 'Member' },
];

export function ProfileScreen({ navigation }: Props) {
  const { profile } = useSession();
  // Falls back to the placeholder until the profile has loaded, or the header jumps on first paint.
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Your account';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={11} color={colors.amber} />
                <Text style={styles.ratingText}>4.87</Text>
              </View>
              <Text style={styles.trips}>· 47 trips</Text>
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
          {STATS.map((stat) => (
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
          subtitle="Name, photo, contact"
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
          icon="card"
          title="Payment Methods"
          subtitle="Cards, wallet, UPI"
          tone="#E0B252"
          badge="Default"
          onPress={() => navigation.navigate('Wallet')}
        />

        <SectionLabel>PREFERENCES</SectionLabel>
        <Row
          icon="notifications-outline"
          title="Notifications"
          subtitle="Ride updates, offers"
          tone="#E0B252"
          count={3}
          onPress={() => navigation.navigate('Notifications')}
        />
        <Row
          icon="settings-outline"
          title="App Settings"
          subtitle="Language, theme, units"
          tone="#8FA0BF"
          onPress={() => navigation.navigate('Settings')}
        />
        <Row
          icon="lock-closed"
          title="Privacy & Security"
          subtitle="Data, password, 2FA"
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

        <Pressable accessibilityRole="button" style={styles.signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>RideX v0.1.0 · © RideX Technologies</Text>
      </ScrollView>
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
