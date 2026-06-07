// core/navigation/transitions.js
import React, { useRef } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TransitionPresets } from '@react-navigation/stack';

// ── Stack transitions ─────────────────────────────────────────────────────────
// Exact native iOS push/pop — used in every stack navigator.
// gestureEnabled + full-screen swipe zone enables left-edge swipe-back.
export const premiumTransition = {
  ...TransitionPresets.SlideFromRightIOS,
  gestureEnabled: true,
  gestureResponseDistance: 50,
};

// ── Tab transitions ───────────────────────────────────────────────────────────
// No animation — instant cut, matching native iOS / Instagram tab behaviour.
export function withFadeOnFocus(Component) {
  return Component;
}
