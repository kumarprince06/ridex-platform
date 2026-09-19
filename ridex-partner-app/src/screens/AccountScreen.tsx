import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { StatTiles } from '../components/StatTiles';
import { useSession } from '../auth/session';
import { expiringSoon, listDocuments } from '../api/documents';
import { getPayoutAccount } from '../api/driver';
import { getProfile } from '../api/profile';
import { listVehicles } from '../api/vehicles';
import { useQuery } from '../api/useQuery';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Account'>;

export function AccountScreen({ navigation }: Props) {
  const { data: profile } = useQuery(getProfile);
  const { data: vehicles } = useQuery(listVehicles);
  const { data: documents } = useQuery(listDocuments);
  const { data: payoutAccount } = useQuery(getPayoutAccount);
  const { signOut } = useSession();
  const expiring = expiringSoon(documents ?? []);
  // The car they are approved to drive today, not whichever was added first.
  const vehicle = (vehicles ?? []).find((candidate) => candidate.status === 'ACTIVE')
    ?? (vehicles ?? [])[0];
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Your account';

  return (
    <Screen title="Account">
      <View style={styles.header}>
        <Avatar name={name} size={64} brand />
        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.since}>{profile?.email}</Text>
          <Text style={styles.vehicle}>
            {vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registrationNumber}` : 'No vehicle yet'}
          </Text>
        </View>
      </View>

      <StatTiles
        stats={[
          { value: profile?.rating == null ? '--' : String(profile.rating), label: 'Rating', tone: colors.primary },
          { value: String(profile?.ratingCount ?? 0), label: 'Rated trips' },
          { value: humanStatus(profile?.onboardingStatus), label: 'Status' },
        ]}
      />

      <SectionLabel>DRIVING</SectionLabel>
      <Row
        icon="car-sport"
        title="Vehicle"
        subtitle={vehicle ? `${vehicle.model} · ${vehicle.status}` : 'None added'}
        onPress={() => navigation.navigate('Vehicle')}
      />
      <Row icon="document-text" title="Documents" subtitle="1 expiring soon" badge="1" onPress={() => navigation.navigate('Documents')} />
      <Row icon="star" title="Ratings and stats" subtitle="Acceptance, cancellation, rating" onPress={() => navigation.navigate('Ratings')} />

      <SectionLabel>MONEY</SectionLabel>
      <Row icon="cash" title="Payouts" subtitle="Weekly · HDFC ••4412" onPress={() => navigation.navigate('Payouts')} />
      <Row icon="card" title="Payout method" subtitle="Change where earnings are sent" onPress={() => navigation.navigate('PayoutMethod')} />

      <SectionLabel>ACCOUNT</SectionLabel>
      <Row icon="person" title="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
      <Row icon="notifications" title="Notifications" onPress={() => navigation.navigate('Notifications')} />
      <Row icon="settings" title="Settings" onPress={() => navigation.navigate('Settings')} />
      <Row icon="shield-checkmark" title="Safety" subtitle="Emergency, trip sharing, incident reports" onPress={() => navigation.navigate('Safety')} />
      <Row icon="help-buoy" title="Help and support" onPress={() => navigation.navigate('HelpSupport')} />
      <Row
        icon="log-out"
        title="Sign out"
        danger
        // Tokens first, or the next launch signs straight back in; then clear the root stack.
        onPress={() => void signOut().then(() => navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Welcome' }] }))}
      />
    </Screen>
  );
}

/** APPROVED reads as shouting on a profile card. */
function humanStatus(status?: string) {
  return status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ') : '--';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  name: {
    ...type.button,
    fontSize: 18,
    color: colors.text,
  },
  since: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  vehicle: {
    ...type.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});
