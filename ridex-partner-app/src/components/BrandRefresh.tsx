import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet } from 'react-native';

import { colors } from '../theme';

const SIZE = 52;
const RING = 3;

/**
 * The pull-to-refresh indicator: the RideX mark with a flash of light running round its border.
 *
 * A gradient spins behind a disc that covers all but a thin ring, so only the ring shows the light
 * moving - a conic-border sweep without an SVG dependency.
 */
export function BrandRefresh({ visible }: { visible: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const presence = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    Animated.spring(presence, { toValue: visible ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [visible, presence]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: presence,
          transform: [
            { translateY: presence.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
            { scale: presence.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'transparent', colors.primary, '#FFFFFF']}
          locations={[0, 0.45, 0.85, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={styles.disc}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.mark} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    // Below the header, where the pull happens, not tucked under the status bar.
    top: 110,
    alignSelf: 'center',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 6,
  },
  disc: {
    width: SIZE - RING * 2,
    height: SIZE - RING * 2,
    borderRadius: (SIZE - RING * 2) / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});
