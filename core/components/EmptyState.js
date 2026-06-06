import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius } from '../theme/index';

const ILLUSTRATIONS = {
  messages: { icon: 'chatbubbles', gradient: ['#9B59B6', '#6C3483'] },
  listings: { icon: 'bag', gradient: ['#FF6B6B', '#E84393'] },
  rides: { icon: 'car', gradient: ['#00C48C', '#007A5E'] },
  news: { icon: 'newspaper', gradient: ['#0099FF', '#0055CC'] },
  search: { icon: 'search', gradient: ['#F4A833', '#E68A00'] },
  notifications: { icon: 'notifications', gradient: ['#F4A833', '#FF6B6B'] },
  default: { icon: 'apps', gradient: ['#2D1B69', '#4A2D9C'] },
};

export default function EmptyState({ type = 'default', title, body, ctaLabel, onCta }) {
  const theme = useTheme();
  const ill = ILLUSTRATIONS[type] || ILLUSTRATIONS.default;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={ill.gradient}
        style={styles.iconCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={ill.icon} size={40} color="#fff" />
      </LinearGradient>

      <Text style={[styles.title, { color: theme.textPrimary }]}>{title || 'Nothing here yet'}</Text>
      {body ? <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text> : null}

      {ctaLabel && onCta && (
        <TouchableOpacity onPress={onCta} activeOpacity={0.85}>
          <LinearGradient
            colors={ill.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fonts.sizes.xl, fontFamily: fonts.bold, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: fonts.sizes.md, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
  cta: { borderRadius: borderRadius.full, paddingHorizontal: 32, paddingVertical: 14 },
  ctaText: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '700' },
});
