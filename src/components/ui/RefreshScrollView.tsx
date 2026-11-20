import React from 'react';
import { StyleSheet, View, useColorScheme, type ScrollViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  withRepeat,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';

/** Pull distance that commits the refresh, and where the content rests while loading. */
const THRESHOLD = 45;
/** Asymptote of the rubber-band curve — the content never travels past this. */
const PULL_MAX = 100;
// The rubber band means the finger travels further than THRESHOLD to commit:
// -PULL_MAX * ln(1 - THRESHOLD / PULL_MAX) ≈ 60px, plus the 10px the pan needs
// to activate. Raising either constant lengthens the gesture faster than it looks.
const SPINNER = 24;

/** Rubber band: eases toward PULL_MAX so the pull stiffens as it grows. */
function resist(distance: number) {
  'worklet';
  return PULL_MAX * (1 - Math.exp(-distance / PULL_MAX));
}

function SpinnerArc({ color }: { color: string }) {
  const r = (SPINNER - 2.6) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Svg width={SPINNER} height={SPINNER} viewBox={`0 0 ${SPINNER} ${SPINNER}`}>
      <Circle
        cx={SPINNER / 2}
        cy={SPINNER / 2}
        r={r}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference * 0.3} ${circumference}`}
      />
    </Svg>
  );
}

interface Props extends ScrollViewProps {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
}

/**
 * ScrollView whose content slides down under the finger to refresh, instead of
 * overlaying a floating spinner the way RefreshControl does on Android.
 */
export function RefreshScrollView({ onRefresh, children, style, contentContainerStyle, ...rest }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const scrollY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const spin = useSharedValue(0);
  const busy = useSharedValue(false);
  const pulling = useSharedValue(false);
  const pullOrigin = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });

  // Plain functions, not useCallback: passing shared values as hook arguments
  // makes the compiler lint reject mutating them.
  function settle() {
    cancelAnimation(spin);
    spin.value = 0;
    busy.value = false;
    translateY.value = withSpring(0, { damping: 18, stiffness: 170 });
  }

  function trigger() {
    Promise.resolve(onRefresh()).then(settle, settle);
  }

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onBegin(() => {
      pulling.value = false;
    })
    .onUpdate(e => {
      if (busy.value) return;
      if (scrollY.value > 0.5) {
        if (pulling.value) {
          pulling.value = false;
          translateY.value = 0;
        }
        return;
      }
      // Anchor the pull where the finger was when the top was reached, so
      // carrying a scroll gesture into a pull doesn't jump.
      if (!pulling.value) {
        pulling.value = true;
        pullOrigin.value = e.translationY;
      }
      const d = e.translationY - pullOrigin.value;
      translateY.value = d > 0 ? resist(d) : 0;
    })
    .onEnd(() => {
      pulling.value = false;
      if (busy.value) return;
      if (translateY.value >= THRESHOLD) {
        busy.value = true;
        translateY.value = withSpring(THRESHOLD, { damping: 20, stiffness: 190 });
        spin.value = 0;
        spin.value = withRepeat(withTiming(360, { duration: 700, easing: Easing.linear }), -1, false);
        runOnJS(trigger)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 170 });
      }
    })
    .onFinalize(() => {
      pulling.value = false;
      if (!busy.value && translateY.value > 0) {
        translateY.value = withSpring(0, { damping: 18, stiffness: 170 });
      }
    });

  const gesture = Gesture.Simultaneous(pan, Gesture.Native());

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => {
    const progress = Math.min(translateY.value / THRESHOLD, 1);
    return {
      opacity: progress,
      transform: [
        { translateY: translateY.value / 2 - THRESHOLD / 2 },
        { scale: 0.6 + progress * 0.4 },
        { rotate: `${busy.value ? spin.value : progress * 200}deg` },
      ],
    };
  });

  return (
    <View style={[styles.root, style]}>
      <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none">
        <SpinnerArc color={colors.labelSecondary} />
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={contentContainerStyle}
          {...rest}
        >
          <Animated.View style={contentStyle}>{children}</Animated.View>
        </Animated.ScrollView>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: THRESHOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
