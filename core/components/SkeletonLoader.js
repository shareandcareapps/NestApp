import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { borderRadius } from '../theme/index';

function SkeletonBox({ width, height, style, radius }) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  const bg = theme.isDark ? '#2D1B69' : '#EDE6DA';

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius ?? borderRadius.md, backgroundColor: bg, opacity },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <SkeletonBox width="100%" height={160} radius={borderRadius.md} style={{ marginBottom: 12 }} />
      <SkeletonBox width="70%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonBox width="45%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonBox width="30%" height={18} />
    </View>
  );
}

export function ListItemSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.listItem, { backgroundColor: theme.card }]}>
      <SkeletonBox width={56} height={56} radius={borderRadius.full} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <SkeletonBox width="65%" height={13} style={{ marginBottom: 8 }} />
        <SkeletonBox width="45%" height={11} style={{ marginBottom: 6 }} />
        <SkeletonBox width="30%" height={11} />
      </View>
    </View>
  );
}

export function NewsSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <SkeletonBox width="100%" height={180} radius={borderRadius.md} style={{ marginBottom: 12 }} />
      <SkeletonBox width="40%" height={11} style={{ marginBottom: 8 }} />
      <SkeletonBox width="85%" height={16} style={{ marginBottom: 6 }} />
      <SkeletonBox width="60%" height={16} style={{ marginBottom: 12 }} />
      <SkeletonBox width="50%" height={11} />
    </View>
  );
}

export default SkeletonBox;

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: 14, marginBottom: 14 },
  listItem: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 14, marginBottom: 10 },
});
