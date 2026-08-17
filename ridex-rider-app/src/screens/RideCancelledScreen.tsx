import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RideCancelled'>;

export function RideCancelledScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.glow}>
          <View style={styles.mark}>
            <Ionicons name="close" size={32} color={colors.text} />
          </View>
        </View>

        <Text style={styles.title}>Ride Cancelled</Text>
        <Text style={styles.body}>
          Your ride has been cancelled. No charge has been applied.
        </Text>
        <Text style={styles.reference}>Reference: RX-CANCEL-2026-3847</Text>

        <Button
          label="Find a New Ride"
          onPress={() => navigation.navigate('SearchDestination')}
          style={styles.action}
        />

        <Pressable
          onPress={() => navigation.navigate('MainTabs', { screen: 'MyRides' })}
          accessibilityRole="button"
          style={styles.link}
        >
          <Text style={styles.linkText}>View Trip History</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glow: {
    alignSelf: 'center',
    width: 108,
    height: 108,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.hero,
    fontSize: 28,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  body: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  reference: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: spacing.lg,
  },
  linkText: {
    ...type.button,
    fontSize: 15,
    color: colors.textMuted,
  },
});
