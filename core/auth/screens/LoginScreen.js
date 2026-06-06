// core/auth/screens/LoginScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { supabase } from '../../database/index';
import useAppStore from '../../store/index';
import { fonts, spacing, borderRadius, shadows } from '../../theme/index';

const { width, height } = Dimensions.get('window');

function FloatingOrb({ size, color, top, left, opacity }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', top, left,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity,
      }}
    />
  );
}

function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, icon, rightIcon, onRightIconPress }) {
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
    outputRange: ['rgba(255,255,255,0.15)', '#F4A833'],
  });

  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <Animated.View style={[inputStyles.field, { borderColor }]}>
        <Ionicons name={icon} size={18} color={focused ? '#F4A833' : 'rgba(255,255,255,0.4)'} style={inputStyles.icon} />
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={8}>
            <Ionicons name={rightIcon} size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md, borderWidth: 1.5,
    paddingHorizontal: 14, height: 52,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: fonts.sizes.md, fontFamily: fonts.body },
});

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const setUser = useAppStore((state) => state.setUser);
  const setSession = useAppStore((state) => state.setSession);
  const insets = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  function pressIn() { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start(); }

  async function handleLogin() {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({ type: 'warning', text1: 'Missing fields', text2: 'Please enter your email and password.' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Login failed', text2: error.message });
      return;
    }
    setUser(data.user);
    setSession(data.session);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={['#0F0A1E', '#2D1B69', '#1A0F3D']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.container}
      >
        {/* Decorative orbs */}
        <FloatingOrb size={280} color="#F4A833" opacity={0.07} top={-80} left={-60} />
        <FloatingOrb size={200} color="#FF6B6B" opacity={0.08} top={height * 0.25} left={width * 0.6} />
        <FloatingOrb size={160} color="#9B59B6" opacity={0.1} top={height * 0.55} left={-40} />
        <FloatingOrb size={120} color="#F4A833" opacity={0.06} top={height * 0.75} left={width * 0.7} />

        {/* Geometric ring decorations */}
        <View pointerEvents="none" style={[styles.ring, { width: 300, height: 300, top: -100, left: -100, borderColor: 'rgba(244,168,51,0.08)' }]} />
        <View pointerEvents="none" style={[styles.ring, { width: 200, height: 200, top: height * 0.4, right: -70, borderColor: 'rgba(255,107,107,0.07)' }]} />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <LinearGradient colors={['#F4A833', '#FF6B6B']} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.logoLetter}>N</Text>
            </LinearGradient>
            <Text style={styles.appName}>NestApp</Text>
            <Text style={styles.tagline}>Where culture meets community</Text>
            <View style={styles.communityRow}>
              {['🇮🇳', '🇵🇰', '🇳🇵', '🇸🇦'].map((flag, i) => (
                <Text key={i} style={styles.flag}>{flag}</Text>
              ))}
            </View>
          </View>

          {/* Glass card */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={[styles.cardInner, styles.cardBorder]}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>Sign in to your community</Text>

              <InputField
                label="EMAIL"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />
              <InputField
                label="PASSWORD"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry={!showPw}
                icon="lock-closed-outline"
                rightIcon={showPw ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPw(!showPw)}
              />

              <TouchableOpacity style={styles.forgotWrap}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In CTA */}
              <TouchableOpacity
                onPressIn={pressIn}
                onPressOut={pressOut}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={1}
              >
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <LinearGradient
                    colors={loading ? ['#888', '#666'] : ['#F4A833', '#FF6B6B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signInBtn}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Text style={styles.signInText}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                    }
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => Toast.show({ type: 'info', text1: 'Coming soon', text2: 'Google sign-in launching soon!' })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.socialIcon}>G</Text>
                  <Text style={styles.socialLabel}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => Toast.show({ type: 'info', text1: 'Coming soon', text2: 'Apple sign-in launching soon!' })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-apple" size={18} color="#fff" />
                  <Text style={styles.socialLabel}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>

          {/* Footer links */}
          <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerText}>
              New here?{'  '}
              <Text style={styles.footerBold}>Create an account</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.footerLink, styles.guestBtn]}>
            <Text style={styles.guestText}>Continue as guest</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, alignItems: 'stretch' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1 },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    ...shadows.glow,
  },
  logoLetter: { color: '#fff', fontSize: 38, fontWeight: '800' },
  appName: { color: '#fff', fontSize: fonts.sizes.xxxl, fontWeight: '800', letterSpacing: 0.5 },
  tagline: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.sm, marginTop: 6, letterSpacing: 1.5, textTransform: 'uppercase' },
  communityRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  flag: { fontSize: 22 },

  // Card
  card: { borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: 20 },
  cardInner: { padding: 24 },
  cardBorder: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl },
  cardTitle: { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800', marginBottom: 4 },
  cardSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.sm, marginBottom: 24 },

  // Forgot
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgot: { color: '#F4A833', fontSize: fonts.sizes.sm, fontWeight: '600' },

  // Sign In
  signInBtn: {
    borderRadius: borderRadius.full, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    ...shadows.glow,
  },
  signInText: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.35)', fontSize: fonts.sizes.xs, marginHorizontal: 12, letterSpacing: 0.5 },

  // Social
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  socialIcon: { color: '#fff', fontSize: 16, fontWeight: '800' },
  socialLabel: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '600' },

  // Footer
  footerLink: { alignItems: 'center', marginBottom: 12 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.sm },
  footerBold: { color: '#F4A833', fontWeight: '700' },
  guestBtn: { marginTop: 4 },
  guestText: { color: 'rgba(255,255,255,0.3)', fontSize: fonts.sizes.sm, textDecorationLine: 'underline' },
});
