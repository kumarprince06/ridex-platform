import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'Safety'>;

/**
 * Reached from the shield on every driving screen. Emergency sits alone at the top and is the
 * only destructive-coloured control on it: at the moment a driver opens this screen they should
 * not have to read a list to find the one action that matters.
 *
 * Only actions that work are offered: trip sharing, audio recording and a safety desk need a
 * backend that does not exist yet, and a safety button that does nothing is worse than none.
 */
export function SafetyScreen({ navigation, route }: Props) {
  return (
    <Screen onBack={() => navigation.goBack()} title="Safety">
      <View style={styles.emergency}>
        <View style={styles.emergencyIcon}>
          <Ionicons name="warning" size={26} color={colors.danger} />
        </View>

        <Text style={styles.emergencyTitle}>Emergency call</Text>
        <Text style={styles.emergencyBody}>
          Opens your phone's dialler on 112, India's emergency number.
        </Text>

        <Pressable
          onPress={() => void Linking.openURL('tel:112')}
          accessibilityRole="button"
          accessibilityLabel="Call 112"
          style={styles.emergencyButton}
        >
          <Ionicons name="call" size={19} color={colors.text} />
          <Text style={styles.emergencyLabel}>Call 112</Text>
        </Pressable>
      </View>

      <SectionLabel>DURING THIS TRIP</SectionLabel>
      <Row
        icon="flag"
        title={`Report ${route.params?.riderName ?? 'your rider'}`}
        subtitle="Behaviour, safety concern or incident"
        onPress={() => navigation.navigate('ReportIssue')}
      />

      <SectionLabel>GET HELP</SectionLabel>
      <Row
        icon="help-buoy"
        title="Help centre"
        onPress={() => navigation.navigate('HelpSupport')}
      />

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
