import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

function ToastBase({ text1, text2, iconName, iconColor, accentColor }) {
  return (
    <View style={[styles.container, { borderLeftColor: accentColor }]}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.iconWrap, { backgroundColor: accentColor + '22' }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        {text1 ? <Text style={styles.title} numberOfLines={1}>{text1}</Text> : null}
        {text2 ? <Text style={styles.body} numberOfLines={2}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: ({ text1, text2 }) => (
    <ToastBase text1={text1} text2={text2} iconName="checkmark-circle" iconColor="#00C48C" accentColor="#00C48C" />
  ),
  error: ({ text1, text2 }) => (
    <ToastBase text1={text1} text2={text2} iconName="close-circle" iconColor="#FF6B6B" accentColor="#FF6B6B" />
  ),
  info: ({ text1, text2 }) => (
    <ToastBase text1={text1} text2={text2} iconName="information-circle" iconColor="#0099FF" accentColor="#0099FF" />
  ),
  warning: ({ text1, text2 }) => (
    <ToastBase text1={text1} text2={text2} iconName="warning" iconColor="#F4A833" accentColor="#F4A833" />
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(26,16,53,0.85)',
    minHeight: 56,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  title: { color: '#F5F0FF', fontSize: 14, fontWeight: '700', marginBottom: 1 },
  body: { color: '#B8ACCC', fontSize: 12, lineHeight: 17 },
});
