import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <ImageBackground
        // Driver's seat, not a skyline: the rider app sells the city, this one sells the shift.
        source={require('../../assets/welcome-drive.jpg')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        {/*
          Scrim over the photograph. The wet road throws bright reflections, so white headline text
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
          <Image source={require('../../assets/logo-mark.png')} style={styles.brandMark} />
          <Text style={styles.brandName}>
            RideX <Text style={styles.brandPartner}>Partner</Text>
          </Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>DRIVE ON YOUR TERMS</Text>
          <Text style={styles.hero}>Your car.{'\n'}Your hours.</Text>
          <Text style={styles.blurb}>
            Go online when it suits you, take the trips you want, and watch what you earn add up
            after every drop-off.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Sign In" onPress={() => navigation.navigate('SignIn')} />
          <Button
            label="Start Driving"
            variant="secondary"
            onPress={() => navigation.navigate('CreateAccount')}
          />

          <Text style={styles.legal}>
            By continuing, you agree to our <Text style={styles.legalLink}>Partner Terms</Text> &amp;{' '}
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
    resizeMode: 'contain',
  },
  brandName: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  brandPartner: {
    color: colors.primary,
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
