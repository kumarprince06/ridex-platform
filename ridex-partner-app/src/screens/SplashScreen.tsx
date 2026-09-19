import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../auth/session';
import { homeRoute } from '../navigation/homeRoute';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const DOTS = 3;
const DOT_INTERVAL_MS = 500;

export function SplashScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const { ready, profile } = useSession();
  // The dot timer keeps ticking; route once, not once per tick while the trip lookup is in flight.
  const routed = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setStep((prev) => prev + 1), DOT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Held until the stored session has been checked, so a signed-in driver is not sent to Welcome.
    if (step < DOTS || !ready || routed.current) {
      return;
    }
    routed.current = true;
    // reset, not navigate: the splash must not be reachable with the back gesture.
    if (!profile) {
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return;
    }
    void homeRoute(profile.onboardingStatus).then((route) => navigation.reset(route));
  }, [step, ready, profile, navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.glow}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.mark} />
      </View>

      <Text style={styles.name}>RideX Partner</Text>
      <Text style={styles.tagline}>Your shift starts here</Text>

      <View style={styles.dots}>
        {Array.from({ length: DOTS }).map((_, index) => (
          <View key={index} style={[styles.dot, index <= step && styles.dotActive]} />
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
    // The partner icon's RX-and-wheel mark, square, unlike the rider app's wordless RX.
    width: 116,
    height: 116,
    resizeMode: 'contain',
  },
  name: {
    ...type.hero,
    fontSize: 32,
    color: colors.text,
    marginTop: spacing.lg,
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
