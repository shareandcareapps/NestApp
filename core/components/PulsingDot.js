import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function PulsingDot({ color = '#00C48C', size = 10, style }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.7, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
            transform: [{ scale: pulse }],
            opacity,
          },
        ]}
      />
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  dot: {},
});
