import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, borderRadius } from '../theme/index';
import { useTheme } from '../theme/ThemeContext';

const AVATAR_GRADIENTS = [
  ['#F4A833', '#FF6B6B'],
  ['#2D1B69', '#4A2D9C'],
  ['#00C48C', '#007A5E'],
  ['#0099FF', '#0055CC'],
  ['#9B59B6', '#6C3483'],
];

function SingleAvatar({ name, size = 36, index = 0 }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

  return (
    <LinearGradient
      colors={gradient}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </LinearGradient>
  );
}

export default function AvatarStack({ names = [], max = 4, size = 36, overlap = 10 }) {
  const theme = useTheme();
  const visible = names.slice(0, max);
  const extra = names.length - max;

  return (
    <View style={styles.stack}>
      {visible.map((name, i) => (
        <View
          key={i}
          style={[
            styles.avatarWrap,
            {
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: visible.length - i,
              borderColor: theme.background,
            },
          ]}
        >
          <SingleAvatar name={name} size={size} index={i} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.avatarWrap,
            styles.extraWrap,
            {
              marginLeft: -overlap,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.extraText, { color: theme.textSecondary, fontSize: size * 0.28 }]}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderWidth: 2, borderRadius: 999 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontFamily: fonts.bold, fontWeight: '700' },
  extraWrap: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  extraText: { fontFamily: fonts.bold, fontWeight: '700' },
});
