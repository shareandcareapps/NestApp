// core/components/AppModal.js
// Modern animated modal — replaces native Alert for success/error/confirm flows.
//
// Usage:
//   <AppModal
//     visible={modal.visible}
//     type="success"          // 'success' | 'error' | 'warn' | 'info' | 'confirm'
//     emoji="🚗"
//     title="Ride Shared!"
//     subtitle="Your ride is live. +10 points earned!"
//     primaryLabel="Awesome"
//     onPrimary={() => { setModal({visible:false}); navigation.goBack(); }}
//     secondaryLabel="View"   // optional
//     onSecondary={() => {}}  // optional
//   />

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');

const TYPE_META = {
  success: { bg: '#1ABC9C', light: '#E8FBF5', icon: 'checkmark-circle',    iconColor: '#1ABC9C' },
  error:   { bg: '#E74C3C', light: '#FFF0EF', icon: 'close-circle',        iconColor: '#E74C3C' },
  warn:    { bg: '#F39C12', light: '#FFF8EC', icon: 'warning',              iconColor: '#F39C12' },
  info:    { bg: '#3498DB', light: '#EBF5FB', icon: 'information-circle',  iconColor: '#3498DB' },
  confirm: { bg: '#E63946', light: '#FFF0F1', icon: 'help-circle',         iconColor: '#E63946' },
};

// Tiny confetti dots that scatter on mount
function Confetti({ color }) {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const anim = useRef(new Animated.Value(0)).current;
    const x = (Math.random() - 0.5) * W * 0.8;
    const y = -(30 + Math.random() * 80);
    const size = 5 + Math.random() * 6;
    const delay = i * 40;

    useEffect(() => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }, []);

    return (
      <Animated.View
        key={i}
        style={{
          position: 'absolute',
          width: size, height: size,
          borderRadius: size / 2,
          backgroundColor: [color, '#F39C12', '#E63946', '#9B59B6', '#3498DB'][i % 5],
          opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
          ],
        }}
      />
    );
  });
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">{dots}</View>;
}

export default function AppModal({
  visible,
  type = 'success',
  emoji,
  title,
  subtitle,
  primaryLabel = 'OK',
  onPrimary,
  secondaryLabel,
  onSecondary,
}) {
  const meta   = TYPE_META[type] || TYPE_META.info;
  const scaleA = useRef(new Animated.Value(0.8)).current;
  const opacA  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleA, {
          toValue: 1, tension: 160, friction: 10, useNativeDriver: true,
        }),
        Animated.timing(opacA, {
          toValue: 1, duration: 180, useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleA.setValue(0.8);
      opacA.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacA }]}>
        {/* Backdrop */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={type === 'confirm' ? undefined : onPrimary} />

        <Animated.View style={[styles.card, { transform: [{ scale: scaleA }] }]}>

          {/* Confetti on success */}
          {type === 'success' && <Confetti color={meta.bg} />}

          {/* Accent bar */}
          <View style={[styles.accentBar, { backgroundColor: meta.bg }]} />

          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: meta.light }]}>
            {emoji ? (
              <Text style={styles.emojiText}>{emoji}</Text>
            ) : (
              <Ionicons name={meta.icon} size={38} color={meta.iconColor} />
            )}
          </View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Buttons */}
          <View style={[styles.btnRow, secondaryLabel ? styles.btnRowDouble : null]}>
            {secondaryLabel && (
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={onSecondary}
                activeOpacity={0.75}
              >
                <Text style={[styles.btnText, styles.btnSecondaryText]}>{secondaryLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: meta.bg }, secondaryLabel ? { flex: 1.4 } : styles.btnFull]}
              onPress={onPrimary}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Convenience hook for cleaner usage
export function useAppModal() {
  const [state, setState] = React.useState({
    visible: false, type: 'success', emoji: null,
    title: '', subtitle: '', primaryLabel: 'OK',
    onPrimary: null, secondaryLabel: null, onSecondary: null,
  });

  function show(opts) {
    setState({ ...state, visible: true, ...opts });
  }

  function hide() {
    setState((s) => ({ ...s, visible: false }));
  }

  return { modalState: state, showModal: show, hideModal: hide };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 0,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 20,
  },
  accentBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emojiText: {
    fontSize: 44,
    lineHeight: 52,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },
  btnRow: {
    width: '100%',
    marginTop: 24,
  },
  btnRowDouble: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFull: { width: '100%' },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  btnPrimaryText: { color: '#fff' },
  btnSecondaryText: { color: '#444' },
});
