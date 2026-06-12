// core/components/AgeGateModal.js
// One-time 18+ attestation modal shown before a user can interact with Carpool.
// Usage:
//   <AgeGateModal visible={showAgeGate} onConfirm={handleAgeConfirmed} onDecline={() => navigation.goBack()} />
//
// The parent is responsible for:
//   1. Checking profile.rides_age_attested before showing this
//   2. Calling supabase to set rides_age_attested = true after onConfirm

import React, { useState, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Animated, Pressable, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts, borderRadius } from '../theme/index';
import { useTheme } from '../theme/ThemeContext';

export default function AgeGateModal({ visible, onConfirm, onDecline, loading = false }) {
  const theme  = useTheme();
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  function toggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked(p => !p);
  }

  function handleConfirm() {
    if (!checked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <Pressable style={styles.backdrop} onPress={onDecline} />
      <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 24 }]}>

        {/* Icon */}
        <LinearGradient colors={['#00C48C', '#007A5E']} style={styles.iconCircle}>
          <Ionicons name="car-sport" size={32} color="#fff" />
        </LinearGradient>

        <Text style={[styles.title, { color: theme.textPrimary }]}>Carpool is for Adults</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          For the safety of all community members, carpooling on NestApp is restricted to users who are{' '}
          <Text style={{ fontWeight: '800', color: theme.textPrimary }}>18 years or older.</Text>
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary, marginTop: 8 }]}>
          This is a one-time confirmation. You won't be asked again.
        </Text>

        {/* Checkbox attestation */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggle}
          style={[styles.checkRow, {
            backgroundColor: checked ? '#00C48C12' : theme.background,
            borderColor: checked ? '#00C48C' : theme.border,
          }]}
        >
          <View style={[styles.box, {
            backgroundColor: checked ? '#00C48C' : 'transparent',
            borderColor: checked ? '#00C48C' : theme.border,
          }]}>
            {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={[styles.checkTxt, { color: theme.textSecondary }]}>
            I confirm that I am 18 years of age or older.
          </Text>
        </TouchableOpacity>

        {/* Confirm */}
        <TouchableOpacity
          onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
          onPress={handleConfirm}
          disabled={!checked || loading}
          activeOpacity={1}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <LinearGradient
              colors={checked ? ['#00C48C', '#007A5E'] : [theme.border, theme.border]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.confirmBtn}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.confirmTxt, { color: checked ? '#fff' : theme.textLight }]}>
                    Continue to Carpool
                  </Text>
              }
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {/* Decline */}
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Text style={[styles.declineTxt, { color: theme.textLight }]}>Not right now</Text>
        </TouchableOpacity>

        <Text style={[styles.note, { color: theme.textLight }]}>
          This requirement exists to protect everyone in the community, especially for shared rides with strangers.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, alignItems: 'center',
  },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: fonts.sizes.xl, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  body: { fontSize: fonts.sizes.sm, lineHeight: 22, textAlign: 'center' },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1.5, borderRadius: borderRadius.md,
    padding: 14, marginTop: 20, width: '100%',
  },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkTxt: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 20 },
  confirmBtn: {
    borderRadius: borderRadius.full, height: 54,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 16, width: 280,
  },
  confirmTxt: { fontSize: fonts.sizes.md, fontWeight: '800' },
  declineBtn: { paddingVertical: 14 },
  declineTxt: { fontSize: fonts.sizes.sm },
  note: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 },
});
