import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  onFilterPress,
  filterCount = 0,
  style,
  autoFocus,
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  function handleFocus() {
    setFocused(true);
    Animated.spring(borderAnim, { toValue: 1, useNativeDriver: false }).start();
  }

  function handleBlur() {
    setFocused(false);
    Animated.spring(borderAnim, { toValue: 0, useNativeDriver: false }).start();
  }

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, '#F4A833'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.card, borderColor }, shadows.small, style]}>
      <Ionicons name="search" size={18} color={focused ? '#F4A833' : theme.textLight} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textLight}
        style={[styles.input, { color: theme.textPrimary, fontFamily: fonts.body }]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={theme.textLight} />
        </TouchableOpacity>
      ) : null}
      {onFilterPress && (
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onFilterPress(); }}
          style={[styles.filterBtn, filterCount > 0 && styles.filterBtnActive]}
          hitSlop={8}
        >
          <Ionicons name="options" size={18} color={filterCount > 0 ? '#fff' : '#F4A833'} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: fonts.sizes.md, height: '100%' },
  filterBtn: {
    marginLeft: 8,
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,168,51,0.12)',
  },
  filterBtnActive: { backgroundColor: '#F4A833' },
});
