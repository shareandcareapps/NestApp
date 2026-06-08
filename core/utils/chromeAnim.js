// Shared animated value that drives header + tab bar show/hide.
// 1 = fully visible, 0 = hidden. Module-level so all importers share the same instance.
import { Animated } from 'react-native';

export const chromeAnim = new Animated.Value(1);

const SPRING = { tension: 280, friction: 28, useNativeDriver: true };

export function hideChrome() {
  Animated.spring(chromeAnim, { toValue: 0, ...SPRING }).start();
}

export function showChrome() {
  Animated.spring(chromeAnim, { toValue: 1, ...SPRING }).start();
}
