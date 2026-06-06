import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius } from '../theme/index';

export default function CategoryChips({ categories, selected, onSelect, style }) {
  const theme = useTheme();

  function handlePress(cat) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(cat.key ?? cat.label);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
    >
      {categories.map((cat) => {
        const isActive = selected === (cat.key ?? cat.label);
        return (
          <TouchableOpacity
            key={cat.key ?? cat.label}
            onPress={() => handlePress(cat)}
            activeOpacity={0.75}
            style={styles.chipWrap}
          >
            {isActive ? (
              <LinearGradient
                colors={theme.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chip}
              >
                {cat.icon && <Ionicons name={cat.icon} size={14} color="#fff" style={styles.icon} />}
                <Text style={[styles.label, styles.labelActive]}>{cat.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.chip, styles.chipInactive, { borderColor: theme.border, backgroundColor: theme.card }]}>
                {cat.icon && <Ionicons name={cat.icon} size={14} color={theme.textSecondary} style={styles.icon} />}
                <Text style={[styles.label, { color: theme.textSecondary }]}>{cat.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, gap: 8 },
  chipWrap: {},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  chipInactive: { borderWidth: 1.5 },
  icon: { marginRight: 5 },
  label: { fontSize: fonts.sizes.sm, fontFamily: fonts.medium, fontWeight: '600' },
  labelActive: { color: '#fff' },
});
