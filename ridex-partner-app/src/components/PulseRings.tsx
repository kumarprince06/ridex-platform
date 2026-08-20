import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme';

type Props = {
  /** Diameter of the core the rings spread from. */
  size?: number;
  /** How far the outermost ring travels, as a multiple of size. */
  spread?: number;
  colour?: string;
  /** Stops the animation - a matched search should settle rather than keep searching. */
  active?: boolean;
  children?: ReactNode;
  style?: ViewStyle;
};

const RINGS = 3;
const DURATION = 2400;

/**
 * Water-ripple rings spreading from a centre, for "looking for a driver" and "looking for rides".
 *
 * Three rings on one shared clock, offset by a third each: one Animated.Value, not three loops
 * fighting for the same frames. Transform and opacity only, so it runs on the native driver and
 * keeps animating while JS is busy laying out the sheet.
 */
export function PulseRings({
  size = 84,
  spread = 2.6,
  colour = colors.primary,
  active = true,
  children,
  style,
}: Props) {
  const clock = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      clock.stopAnimation();
      clock.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [active, clock]);

  return (
    <View style={[styles.wrap, { width: size * spread, height: size * spread }, style]}>
      {active
        ? Array.from({ length: RINGS }).map((_, index) => {
            // Each ring runs the same 0..1 sweep, a third of a cycle apart.
            const offset = index / RINGS;
            const progress = Animated.modulo(Animated.add(clock, offset), 1);

            return (
              <Animated.View
                key={index}
                style={[
                  styles.ring,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderColor: colour,
                    opacity: progress.interpolate({
                      inputRange: [0, 0.15, 1],
                      outputRange: [0, 0.45, 0],
                    }),
                    transform: [
                      {
                        scale: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, spread],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })
        : null}

      <View style={[styles.core, { width: size, height: size, borderRadius: size / 2 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
