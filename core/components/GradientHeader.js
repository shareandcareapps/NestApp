import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { fonts, borderRadius } from '../theme/index';

export default function GradientHeader({
  title,
  subtitle,
  gradient,
  onBack,
  rightElement,
  transparent = false,
  blur = false,
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = gradient || theme.gradientSecondary;

  const content = (
    <View style={[styles.inner, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {rightElement ? <View style={styles.rightWrap}>{rightElement}</View> : <View style={styles.rightWrap} />}
      </View>
    </View>
  );

  if (blur) {
    return (
      <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
        {content}
      </BlurView>
    );
  }

  if (transparent) {
    return <View style={[styles.container, styles.transparent]}>{content}</View>;
  }

  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },
  blurContainer: { paddingBottom: 16 },
  transparent: { backgroundColor: 'transparent' },
  inner: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleWrap: { flex: 1 },
  title: { color: '#fff', fontSize: fonts.sizes.lg, fontFamily: fonts.bold, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: fonts.sizes.sm, marginTop: 1 },
  rightWrap: { width: 44, alignItems: 'flex-end' },
});
