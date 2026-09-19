import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, RefreshControl, StyleSheet } from 'react-native';

import { colors } from '../theme';

const SIZE = 52;
const MIN_VISIBLE_MS = 1000;
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

/**
 * Pull-to-refresh with the branded indicator: the platform gesture with its own spinner hidden,
 * plus the overlay to render next to the scroll view (inside a parent that fills the screen).
 */
export function useBrandRefresh(onRefresh: () => Promise<unknown> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const control = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        // Held for a beat even when the data is instant, or the mark vanishes before it lands.
        const shown = new Promise((resolve) => setTimeout(resolve, MIN_VISIBLE_MS));
        void Promise.all([Promise.resolve(onRefresh()).catch(() => undefined), shown]).finally(() =>
          setRefreshing(false),
        );
      }}
      tintColor="transparent"
      colors={['transparent']}
      progressBackgroundColor="transparent"
      progressViewOffset={-200}
    />
  );
  return { control, overlay: <BrandRefresh visible={refreshing} /> };
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
