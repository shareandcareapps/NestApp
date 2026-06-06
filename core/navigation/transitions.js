// core/navigation/transitions.js
import React, { useRef } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TransitionPresets } from '@react-navigation/stack';

// ── Stack transitions ─────────────────────────────────────────────────────────
// Exact native iOS push/pop — used in every stack navigator.
export const premiumTransition = TransitionPresets.SlideFromRightIOS;

// ── Tab transitions ───────────────────────────────────────────────────────────
// Wraps a tab's root navigator in a fast cross-fade that fires each time the
// tab gains focus. Native iOS tab controllers cross-dissolve, not slide.
export function withFadeOnFocus(Component) {
  return function FadedTab(props) {
    const opacity = useRef(new Animated.Value(1)).current;
    const isFirstFocus = useRef(true);

    useFocusEffect(
      React.useCallback(() => {
        if (isFirstFocus.current) {
          isFirstFocus.current = false;
          return;
        }
        opacity.setValue(0);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }, [])
    );

    return (
      <Animated.View style={{ flex: 1, opacity }}>
        <Component {...props} />
      </Animated.View>
    );
  };
}
