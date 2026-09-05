import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors, spacing, type } from '../theme';

type Props = {
  /** Outer diameter of the ring. The mark sits at 56% of it. */
  size?: number;
  /** Shown under the ring. Say what is happening, not "Loading". */
  label?: string;
  style?: ViewStyle;
};

const SPIN_MS = 1100;
const BREATH_MS = 1600;
/** How much of the circle the lit arc covers. A fifth reads as motion; a half reads as a border. */
const ARC_FRACTION = 0.22;

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * The brand loader: a lit arc travelling around the RideX mark, which breathes underneath it.
 *
 * <p>Two animations on separate clocks on purpose. The arc spins at a constant speed - a spinner
 * that eases in and out reads as stuttering, not as thinking - while the mark's glow breathes on a
 * slower sine-ish cycle, so the whole thing feels alive rather than mechanical.
 *
 * <p>Rotation and opacity only, so both run on the native driver: a loader that freezes whenever
 * JS is busy is showing the exact moment it was needed most.
 */
export function BrandLoader({ size = 92, label, style }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: BREATH_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: BREATH_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    spinLoop.start();
    breathLoop.start();
    return () => {
      spinLoop.stop();
      breathLoop.stop();
    };
  }, [spin, breath]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const stroke = Math.max(3, size * 0.045);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const markSize = size * 0.56;

  return (
    <View style={[styles.wrap, style]}>
      <View style={{ width: size, height: size }}>
        {/* The faint full ring the lit arc travels along, so the gap does not read as a broken circle. */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={colors.primary}
              strokeOpacity={0.14}
              strokeWidth={stroke}
              fill="none"
            />
          </Svg>
        </View>

        <AnimatedView style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <Svg width={size} height={size}>
            <Defs>
              {/* Fading tail rather than a solid arc: the head reads as the leading edge, which is
                  what makes a rotating segment look like it is moving rather than just present. */}
              <LinearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="url(#arc)"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference * ARC_FRACTION} ${circumference}`}
              // Starts at twelve o'clock instead of three, where a circle's zero angle is.
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </AnimatedView>

        <View style={styles.centre}>
          {/* The glow behind the mark, breathing. Scaled rather than resized so it stays on the
              native driver - animating width would hand every frame back to JS. */}
          <AnimatedView
            style={[
              styles.glow,
              {
                width: markSize * 1.35,
                height: markSize * 1.35,
                borderRadius: markSize,
                opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] }),
                transform: [
                  { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.08] }) },
                ],
              },
            ]}
          />
          <Image
            source={require('../../assets/logo-mark.png')}
            style={{ width: markSize, height: markSize }}
            resizeMode="contain"
          />
        </View>
      </View>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

/**
 * The same loader filling the screen.
 *
 * <p>For a screen that has nothing to show yet. A spinner in the corner of an empty screen tells
 * somebody that something is happening somewhere; this tells them the app is working on it.
 */
export function BrandLoaderScreen({ label }: { label?: string }) {
  return (
    <View style={styles.full}>
      <BrandLoader label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  centre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
  label: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
