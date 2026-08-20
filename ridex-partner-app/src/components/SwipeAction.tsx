import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { colors, IconName, radius, type } from '../theme';

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
  const track = useRef<View>(null);
  const travel = Math.max(0, width - KNOB - PADDING * 2);

  // PanResponder is created once, so it reads live values off refs rather than closing over the
  // ones from first render.
  const travelRef = useRef(0);
  travelRef.current = travel;
  const originRef = useRef(0);
  const positionRef = useRef(0);
  const doneRef = useRef(false);

  const settle = () => {
    Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
    positionRef.current = 0;
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        // Track the finger's absolute position, not its delta: the swipe has to work when it
        // starts anywhere along the track, not only on the knob.
        const limit = travelRef.current;
        const next = Math.max(0, Math.min(limit, gesture.moveX - originRef.current - KNOB / 2));
        positionRef.current = next;
        x.setValue(next);
      },
      onPanResponderRelease: () => {
        const limit = travelRef.current;
        if (limit > 0 && positionRef.current >= limit * 0.85 && !doneRef.current) {
          doneRef.current = true;
          Animated.timing(x, { toValue: limit, duration: 90, useNativeDriver: false }).start(() => {
            onCompleteRef.current();
            // Reset behind the navigation, so a screen that stays mounted is usable again.
            x.setValue(0);
            positionRef.current = 0;
            doneRef.current = false;
          });
          return;
        }
        settle();
      },
      onPanResponderTerminate: settle,
    }),
  ).current;

  // The handler can change between renders; the responder must call the current one.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
    // Where the track sits on screen, so an absolute touch can be turned into a knob position.
    track.current?.measureInWindow((pageX) => {
      originRef.current = pageX + PADDING;
    });
  };

  const fillWidth = Animated.add(x, KNOB + PADDING);
  const labelOpacity = travel
    ? x.interpolate({ inputRange: [0, travel], outputRange: [1, 0.15], extrapolate: 'clamp' })
    : 1;

  return (
    <View
      ref={track}
      onLayout={onLayout}
      {...responder.panHandlers}
      style={[styles.track, danger ? styles.trackDanger : styles.trackPrimary]}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      // A swipe is not reachable with a screen reader, so assistive tech gets a plain activation.
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={onComplete}
    >
      <Animated.View
        style={[styles.fill, { width: fillWidth }, danger ? styles.fillDanger : styles.fillPrimary]}
      />

      <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>{label}</Animated.Text>

      <Animated.View
        style={[
          styles.knob,
          danger ? styles.knobDanger : styles.knobPrimary,
          { transform: [{ translateX: x }] },
        ]}
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
});
