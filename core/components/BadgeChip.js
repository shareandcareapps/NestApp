import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts, borderRadius, spacing } from '../theme/index';

const VARIANTS = {
  primary: { gradient: ['#F4A833', '#FF6B6B'], text: '#fff' },
  secondary: { gradient: ['#2D1B69', '#4A2D9C'], text: '#fff' },
  success: { gradient: ['#00C48C', '#007A5E'], text: '#fff' },
  info: { gradient: ['#0099FF', '#0055CC'], text: '#fff' },
  danger: { gradient: ['#FF6B6B', '#E84393'], text: '#fff' },
  ghost: { gradient: null, text: '#F4A833' },
};

export default function BadgeChip({
  label,
  variant = 'primary',
  icon,
  onPress,
  size = 'md',
  active = true,
  style,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isSmall = size === 'sm';

  const inner = (
    <>
      {icon && <Ionicons name={icon} size={isSmall ? 12 : 14} color={v.text} style={{ marginRight: 4 }} />}
      <Text style={[styles.label, { color: v.text, fontSize: isSmall ? 11 : 13 }]}>{label}</Text>
    </>
  );

  const containerStyle = [
    styles.chip,
    isSmall && styles.small,
    !active && styles.inactive,
    style,
  ];

  if (!active) {
    return (
      <TouchableOpacity onPress={onPress} style={[containerStyle, styles.ghostChip]} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }

  if (v.gradient && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
        <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.chip, isSmall && styles.small]}>
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (v.gradient) {
    return (
      <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.chip, isSmall && styles.small, style]}>
        {inner}
      </LinearGradient>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={[containerStyle, styles.ghostChip]} activeOpacity={0.7}>
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  small: { paddingHorizontal: 8, paddingVertical: 4 },
  label: { fontFamily: fonts.medium, fontWeight: '600' },
  ghostChip: {
    borderWidth: 1.5,
    borderColor: '#F4A833',
    backgroundColor: 'transparent',
  },
  inactive: { opacity: 0.5 },
});
