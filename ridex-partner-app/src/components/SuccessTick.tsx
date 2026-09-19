import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

const SIZE = 80;

/** The badge springs in, the tick pops a beat later, and one ring ripples out - done, not loading. */
export function SuccessTick() {
  const badge = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(badge, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(tick, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
  }, [badge, tick, ring]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
          },
        ]}
      />
      <Animated.View style={[styles.badge, { transform: [{ scale: badge }] }]}>
        <Animated.View
          style={{
            opacity: tick,
            transform: [
              { scale: tick },
              { rotate: tick.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) },
            ],
          }}
        >
          <Ionicons name="checkmark" size={40} color={colors.onPrimary} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.success,
  },
  badge: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
