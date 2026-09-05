import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../auth/session';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const DOTS = 3;
const DOT_INTERVAL_MS = 500;

export function SplashScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const { ready, signedIn } = useSession();

  useEffect(() => {
    const timer = setInterval(() => setStep((prev) => prev + 1), DOT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Held until the stored tokens have been checked, or a signed-in rider is shown the
    // welcome screen for a moment on every launch and reads it as being signed out.
    if (step < DOTS || !ready) {
      return;
    }
    // replace, not navigate: the splash must not be reachable with the back gesture.
    if (signedIn) {
      navigation.replace('MainTabs', { screen: 'Home' });
    } else {
      navigation.replace('Welcome');
    }
  }, [step, ready, signedIn, navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.glow}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.mark} />
      </View>

      <Text style={styles.name}>RideX</Text>
      <Text style={styles.tagline}>Go anywhere, anytime</Text>

      <View style={styles.dots}>
        {Array.from({ length: DOTS }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index <= step && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 190,
    height: 190,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    // The app icon's RX mark, at its own 853:633 aspect.
    width: 108,
    height: 80,
    resizeMode: 'contain',
  },
  name: {
    ...type.hero,
    fontSize: 34,
    color: colors.text,
    marginTop: spacing.xl,
  },
  tagline: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  dot: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
});
