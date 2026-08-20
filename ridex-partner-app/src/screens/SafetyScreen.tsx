import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { OFFER } from '../data/mock';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Safety'>;

/**
 * Reached from the shield on every driving screen. Emergency sits alone at the top and is the
 * only destructive-coloured control on it: at the moment a driver opens this screen they should
 * not have to read a list to find the one action that matters.
 *
 * Safety actions are auditable per docs/04, so each one records who triggered it and when.
 */
export function SafetyScreen({ navigation }: Props) {
  return (
    <Screen onBack={() => navigation.goBack()} title="Safety">
      <View style={styles.emergency}>
        <View style={styles.emergencyIcon}>
          <Ionicons name="warning" size={26} color={colors.danger} />
        </View>

        <Text style={styles.emergencyTitle}>Emergency call</Text>
        <Text style={styles.emergencyBody}>
          Calls local emergency services and shares your live location, trip ID and vehicle details
          with the RideX safety team.
        </Text>

        <View style={styles.emergencyButton}>
          <Ionicons name="call" size={19} color={colors.text} />
          <Text style={styles.emergencyLabel}>Call 112</Text>
        </View>
      </View>

      <SectionLabel>DURING THIS TRIP</SectionLabel>
      <Row
        icon="share-social"
        title="Share trip status"
        subtitle="Send a live link to someone you trust"
      />
      <Row
        icon="recording"
        title="Record audio"
        subtitle="Stored encrypted, released only to support on a case"
      />
      <Row
        icon="flag"
        title={`Report ${OFFER.rider}`}
        subtitle="Behaviour, safety concern or incident"
      />

      <SectionLabel>GET HELP</SectionLabel>
      <Row
        icon="headset"
        title="Call safety support"
        subtitle="24/7, answers within a minute"
      />
      <Row
        icon="help-buoy"
        title="Help centre"
        onPress={() => navigation.navigate('HelpSupport')}
      />

      <Text style={styles.note}>
        Every action here is logged with a timestamp. Trip details are shared with support only when
        you trigger one.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emergency: {
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  emergencyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 92, 122, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emergencyTitle: {
    ...type.button,
    fontSize: 18,
    color: colors.text,
  },
  emergencyBody: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.danger,
    marginTop: spacing.lg,
  },
  emergencyLabel: {
    ...type.button,
    fontSize: 17,
    color: colors.text,
  },
  note: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: spacing.lg,
  },
});
