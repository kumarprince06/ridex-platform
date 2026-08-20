import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { colors, IconName, radius, spacing, type } from '../theme';

type Props = {
  label: string;
  onComplete: () => void;
  icon?: IconName;
  /** Renders the destructive fill used by "Swipe to cancel". */
  danger?: boolean;
};

const KNOB = 56;
const PADDING = 4;

/**
 * Slide to confirm, for the trip transitions that cannot be undone: start trip, complete trip,
 * cancel. A driver holding a phone in traffic misfires taps, and these write to the trip state
 * machine - everything reversible stays a plain tap.
 *
 * Animated + PanResponder are both in React Native; a gesture library would be a dependency for
 * one control.
 */
export function SwipeAction({ label, onComplete, icon = 'arrow-forward', danger = false }: Props) {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const travel = Math.max(0, width - KNOB - PADDING * 2);

  // PanResponder is created once, so it reads the live travel distance off a ref rather than
  // closing over a stale value from first render.
  const travelRef = useRef(0);
  travelRef.current = travel;
  const doneRef = useRef(false);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
      onPanResponderMove: (_, gesture) => {
        x.setValue(Math.max(0, Math.min(travelRef.current, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        const limit = travelRef.current;
        if (gesture.dx >= limit * 0.9 && !doneRef.current) {
          doneRef.current = true;
          Animated.timing(x, { toValue: limit, duration: 90, useNativeDriver: false }).start(() => {
            onComplete();
            // Reset behind the navigation, so a screen that stays mounted is usable again.
            x.setValue(0);
            doneRef.current = false;
          });
          return;
        }
        Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
      },
    }),
  ).current;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const fillWidth = Animated.add(x, KNOB + PADDING);
  const labelOpacity = travel
    ? x.interpolate({ inputRange: [0, travel], outputRange: [1, 0.15], extrapolate: 'clamp' })
    : 1;

  return (
    <View
      onLayout={onLayout}
      style={[styles.track, danger ? styles.trackDanger : styles.trackPrimary]}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      // A swipe is not reachable with a screen reader, so assistive tech gets a plain activation.
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={onComplete}
    >
      <Animated.View
        style={[
          styles.fill,
          { width: fillWidth },
          danger ? styles.fillDanger : styles.fillPrimary,
        ]}
      />

      <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>{label}</Animated.Text>

      <Animated.View
        {...responder.panHandlers}
        style={[styles.knob, danger ? styles.knobDanger : styles.knobPrimary, { transform: [{ translateX: x }] }]}
      >
        <Ionicons name={icon} size={22} color={danger ? colors.text : colors.onPrimary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: KNOB + PADDING * 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackPrimary: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primaryMuted,
  },
  trackDanger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.danger,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
    borderRadius: radius.pill,
  },
  fillPrimary: {
    backgroundColor: colors.primarySurface,
  },
  fillDanger: {
    backgroundColor: 'rgba(255, 92, 122, 0.18)',
  },
  label: {
    ...type.button,
    color: colors.text,
    textAlign: 'center',
    paddingLeft: KNOB / 2,
  },
  knob: {
    position: 'absolute',
    left: PADDING,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobPrimary: {
    backgroundColor: colors.primary,
  },
  knobDanger: {
    backgroundColor: colors.danger,
  },
  paddingSpacer: {
    width: spacing.xs,
  },
});
