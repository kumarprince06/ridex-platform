import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const DOTS = 3;
const DOT_INTERVAL_MS = 500;

export function SplashScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((prev) => prev + 1), DOT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step < DOTS) {
      return;
    }
    // replace, not navigate: the splash must not be reachable with the back gesture.
    navigation.replace('Welcome');
  }, [step, navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.glow}>
        <View style={styles.mark}>
          <Ionicons name="navigate" size={34} color={colors.onPrimary} />
        </View>
      </View>

      <Text style={styles.name}>RideX</Text>
      <Text style={styles.tagline}>URBAN MOTION</Text>

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
    width: 84,
    height: 84,
    // Squircle rather than a circle, matching the app-icon shape in the mockup.
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '10deg' }],
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
