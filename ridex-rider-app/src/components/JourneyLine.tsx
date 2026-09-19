import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

const DOT = 18;

/** A dashed track between two stops with a little bus running along it, on a loop. */
export function JourneyLine() {
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View style={styles.track} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.dashes} />
      {width > 0 ? (
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: progress.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width - DOT] }) }],
            },
          ]}
        >
          <Ionicons name="bus" size={11} color={colors.onPrimary} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: DOT,
    justifyContent: 'center',
    minWidth: 40,
  },
  dashes: {
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primaryMuted,
  },
  dot: {
    position: 'absolute',
    left: 0,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
