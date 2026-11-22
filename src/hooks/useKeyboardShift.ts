import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Keyboard, Platform, TextInput } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const EXTRA_PADDING = 24;

export function useKeyboardShift(enabled: boolean): {
  shift: Animated.Value;
  onFocus: () => void;
} {
  const shift = useMemo(() => new Animated.Value(0), []);
  const kbState = useRef({ visible: false, height: 0, duration: 250 });
  const shiftValue = useRef(0);

  const recalculate = useCallback((kbHeight: number, dur: number) => {
    const keyboardTop = SCREEN_HEIGHT - kbHeight;
    const focused = TextInput.State.currentlyFocusedInput();
    if (!focused) return;

    // Stop any in-progress animation to read the ACTUAL current shift value.
    // If we used shiftValue.current (the target) while the animation is mid-way,
    // the natural-position recovery would be wrong and the modal would snap to the
    // wrong offset when switching back to a previously-visited input.
    shift.stopAnimation((currentShift) => {
      // Guard: keyboard may have hidden before the native bridge responded
      if (!kbState.current.visible) return;
      shiftValue.current = currentShift;
      focused.measureInWindow((_x, y, _w, h) => {
        // Guard: keyboard may have hidden while waiting for measurement
        if (!kbState.current.visible) return;
        // y is current screen position (with currentShift already applied).
        // Add currentShift to recover the natural (unshifted) position.
        const naturalBottom = y + h + currentShift;
        const needed = Math.max(0, naturalBottom + EXTRA_PADDING - keyboardTop);
        shiftValue.current = needed;
        Animated.timing(shift, { toValue: needed, duration: dur, useNativeDriver: true }).start();
      });
    });
  }, [shift]);

  const onFocus = useCallback(() => {
    if (kbState.current.visible) {
      recalculate(kbState.current.height, 150);
    }
  }, [recalculate]);

  useEffect(() => {
    if (!enabled) {
      shiftValue.current = 0;
      shift.stopAnimation();
      shift.setValue(0);
      kbState.current.visible = false;
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      const dur = Platform.OS === 'ios' ? (e.duration ?? 250) : 250;
      kbState.current = { visible: true, height: e.endCoordinates.height, duration: dur };
      recalculate(e.endCoordinates.height, dur);
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      kbState.current.visible = false;
      shiftValue.current = 0;
      Animated.timing(shift, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [enabled, shift, recalculate]);

  return { shift, onFocus };
}
