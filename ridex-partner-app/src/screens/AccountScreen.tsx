import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { StatTiles } from '../components/StatTiles';
import { DRIVER, VEHICLE } from '../data/mock';
import { TabScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = TabScreenProps<'Account'>;

export function AccountScreen({ navigation }: Props) {
  return (
    <Screen title="Account">
      <View style={styles.header}>
        <Avatar name={DRIVER.name} size={64} brand />
        <View style={styles.headerText}>
          <Text style={styles.name}>{DRIVER.name}</Text>
          <Text style={styles.since}>Partner since {DRIVER.since}</Text>
          <Text style={styles.vehicle}>
            {VEHICLE.make} {VEHICLE.model} · {VEHICLE.plate}
          </Text>
        </View>
      </View>

      <StatTiles
        stats={[
          { value: String(DRIVER.rating), label: 'Rating', tone: colors.primary },
          { value: String(DRIVER.trips), label: 'Trips' },
          { value: DRIVER.acceptance, label: 'Acceptance' },
        ]}
      />

      <SectionLabel>DRIVING</SectionLabel>
      <Row icon="car-sport" title="Vehicle" subtitle={`${VEHICLE.model} · ${VEHICLE.status}`} onPress={() => navigation.navigate('Vehicle')} />
      <Row icon="document-text" title="Documents" subtitle="1 expiring soon" badge="1" onPress={() => navigation.navigate('Documents')} />
      <Row icon="star" title="Ratings and stats" subtitle="Acceptance, cancellation, rating" onPress={() => navigation.navigate('Ratings')} />

      <SectionLabel>MONEY</SectionLabel>
      <Row icon="cash" title="Payouts" subtitle="Weekly · HDFC ••4412" onPress={() => navigation.navigate('Payouts')} />
      <Row icon="card" title="Payout method" subtitle="Change where earnings are sent" onPress={() => navigation.navigate('PayoutMethod')} />

      <SectionLabel>ACCOUNT</SectionLabel>
      <Row icon="person" title="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
      <Row icon="notifications" title="Notifications" onPress={() => navigation.navigate('Notifications')} />
      <Row icon="settings" title="Settings" onPress={() => navigation.navigate('Settings')} />
      <Row icon="help-buoy" title="Help and support" onPress={() => navigation.navigate('HelpSupport')} />
      <Row
        icon="log-out"
        title="Sign out"
        danger
        // Sign-out has to clear the root stack, not the tab navigator this screen lives in.
        onPress={() => navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Welcome' }] })}
      />
    </Screen>
  );
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
