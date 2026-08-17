import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Verified'>;

export function VerifiedScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        {/* Two nested rings fake the glow around the tick without a shadow library. */}
        <View style={styles.glowOuter}>
          <View style={styles.glowInner}>
            <Ionicons name="checkmark" size={44} color={colors.onPrimary} />
          </View>
        </View>

        <Text style={styles.title}>Verified!</Text>
        <Text style={styles.body}>
          Your account has been successfully verified.{'\n'}Let&apos;s set up your profile.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue to Setup"
          onPress={() => navigation.navigate('ProfileSetup', { fullName: 'Alex Johnson' })}
        />
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glowOuter: {
    width: 132,
    height: 132,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowInner: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.title,
    color: colors.text,
    marginTop: spacing.xl,
  },
  body: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
