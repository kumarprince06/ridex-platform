import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/welcome-city.jpg')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        {/*
          Scrim over the photograph. The skyline is bright at the horizon, so white headline text
          sitting directly on it fails contrast - this fades to near-solid behind the copy and
          buttons while leaving the top of the image visible.
        */}
        <LinearGradient
          colors={['rgba(11,15,26,0.35)', 'rgba(11,15,26,0.75)', 'rgba(11,15,26,0.97)']}
          locations={[0, 0.45, 0.78]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="navigate" size={17} color={colors.onPrimary} />
          </View>
          <Text style={styles.brandName}>RideX</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>URBAN MOBILITY REDEFINED</Text>
          <Text style={styles.hero}>Go anywhere,{'\n'}anytime.</Text>
          <Text style={styles.blurb}>
            Premium rides at your fingertips. Elegant, fast, and trusted by millions across the
            city.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get Started" onPress={() => navigation.navigate('SignIn')} />
          <Button
            label="Create Account"
            variant="secondary"
            onPress={() => navigation.navigate('CreateAccount')}
          />

          <Text style={styles.legal}>
            By continuing, you agree to our <Text style={styles.legalLink}>Terms</Text> &amp;{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  spacer: {
    flex: 1,
  },
  copy: {
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  hero: {
    ...type.hero,
    color: colors.text,
  },
  blurb: {
    ...type.subtitle,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  legal: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  legalLink: {
    color: colors.primary,
  },
});
