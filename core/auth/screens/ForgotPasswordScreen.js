// core/auth/screens/ForgotPasswordScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Dimensions, Alert,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../database/index';
import { fonts, spacing, borderRadius, shadows } from '../../theme/index';

const { width, height } = Dimensions.get('window');

// ─── Shared animated input ───────────────────────────────────────────────────
function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, icon, rightIcon, onRightIconPress }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.15)', '#F4A833'] });

  return (
    <View style={iS.wrap}>
      <Text style={iS.label}>{label}</Text>
      <Animated.View style={[iS.field, { borderColor }]}>
        <Ionicons name={icon} size={18} color={focused ? '#F4A833' : 'rgba(255,255,255,0.4)'} style={iS.icon} />
        <TextInput
          style={iS.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          onFocus={() => { setFocused(true); Animated.spring(borderAnim, { toValue: 1, useNativeDriver: false }).start(); }}
          onBlur={() => { setFocused(false); Animated.spring(borderAnim, { toValue: 0, useNativeDriver: false }).start(); }}
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
const iS = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.md, borderWidth: 1.5, paddingHorizontal: 14, height: 52 },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: fonts.sizes.md },
});

// ─── OTP digit boxes ──────────────────────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const inputRef = useRef(null);
  const digits = (value + '      ').slice(0, 6).split('');

  return (
    <View style={otpS.wrap}>
      <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={otpS.tapArea}>
        <View style={otpS.boxes}>
          {digits.map((d, i) => {
            const isFocused = i === Math.min(value.length, 5);
            return (
              <View key={i} style={[otpS.box, isFocused && otpS.boxFocused, d.trim() && otpS.boxFilled]}>
                <Text style={otpS.digit}>{d.trim()}</Text>
                {isFocused && <View style={otpS.cursor} />}
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          style={otpS.hidden}
          value={value}
          onChangeText={v => onChange(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
      </TouchableOpacity>
    </View>
  );
}
const otpS = StyleSheet.create({
  wrap: { marginBottom: 20 },
  tapArea: {},
  boxes: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: { width: 46, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  boxFocused: { borderColor: '#F4A833', backgroundColor: 'rgba(244,168,51,0.08)' },
  boxFilled: { borderColor: 'rgba(244,168,51,0.5)' },
  digit: { color: '#fff', fontSize: 22, fontWeight: '700' },
  cursor: { position: 'absolute', bottom: 10, width: 2, height: 18, backgroundColor: '#F4A833', borderRadius: 1 },
  hidden: { position: 'absolute', width: 0, height: 0, opacity: 0 },
});

// ─── Password strength bar ────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const s = password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3 : password.length >= 8 ? 2 : 1;
  const colors = ['#FF6B6B', '#F4A833', '#00C48C'];
  const labels = ['Weak', 'Good', 'Strong'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 16 }}>
      {[1, 2, 3].map(i => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= s ? colors[s - 1] : 'rgba(255,255,255,0.1)' }} />)}
      <Text style={{ color: colors[s - 1], fontSize: fonts.sizes.xs, fontWeight: '600', marginLeft: 4 }}>{labels[s - 1]}</Text>
    </View>
  );
}

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { icon: 'mail-outline', title: 'Forgot Password?', subtitle: "Enter your email and we'll send you a verification code." },
  { icon: 'shield-checkmark-outline', title: 'Enter OTP', subtitle: null },
  { icon: 'lock-closed-outline', title: 'New Password', subtitle: 'Choose a strong password for your account.' },
];

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0); // 0: email, 1: otp, 2: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function animateStep(newStep) {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    setStep(newStep);
  }

  function pressIn() { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start(); }

  async function handleSendOTP() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert('Invalid email', 'Enter a valid email address.');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Failed to send OTP', error.message);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Code sent!', `Check your inbox at ${email.trim()}`);;
    setResendCooldown(60);
    animateStep(1);
  }

  async function handleVerifyOTP() {
    if (otp.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert('Enter 6-digit code');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: 'email' });
    setLoading(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Invalid code', 'The code is wrong or expired. Try resending.');
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    animateStep(2);
  }

  async function handleResetPassword() {
    if (password.length < 8) {
      return Alert.alert('Password too short', 'Use at least 8 characters.');
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert("Passwords don't match", 'Please re-enter your new password.');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Failed to update password', error.message);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Password updated! 🎉');
    // Sign out so user goes to login screen cleanly
    await supabase.auth.signOut();
    navigation.navigate('Login');
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setOtp('');
    await handleSendOTP();
  }

  const currentMeta = STEPS[step];

  const primaryAction = [handleSendOTP, handleVerifyOTP, handleResetPassword][step];
  const primaryLabel = ['Send Code', 'Verify Code', 'Reset Password'][step];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0A1E', '#2D1B69', '#1A0F3D']} style={s.container}>
        {/* Decorative orbs */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[s.orb, { width: 240, height: 240, top: -60, left: -60, backgroundColor: '#F4A833', opacity: 0.07 }]} />
          <View style={[s.orb, { width: 180, height: 180, top: height * 0.5, right: -60, backgroundColor: '#9B59B6', opacity: 0.09 }]} />
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => (step > 0 ? animateStep(step - 1) : navigation.goBack())}
            style={s.backBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Progress dots */}
          <View style={s.progress}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i <= step && s.dotActive, i < step && s.dotDone]} />
            ))}
          </View>

          {/* Icon + heading */}
          <Animated.View style={[s.header, { transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={['#F4A833', '#FF6B6B']} style={s.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name={currentMeta.icon} size={28} color="#fff" />
            </LinearGradient>
            <Text style={s.title}>{currentMeta.title}</Text>
            {currentMeta.subtitle
              ? <Text style={s.subtitle}>{currentMeta.subtitle}</Text>
              : <Text style={s.subtitle}>We sent a 6-digit code to{'\n'}<Text style={s.emailHighlight}>{email}</Text></Text>
            }
          </Animated.View>

          {/* Card */}
          <BlurView intensity={20} tint="dark" style={s.card}>
            <Animated.View style={[s.cardInner, { transform: [{ translateY: slideAnim }] }]}>

              {/* Step 0 — Email */}
              {step === 0 && (
                <InputField
                  label="EMAIL ADDRESS"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  icon="mail-outline"
                />
              )}

              {/* Step 1 — OTP */}
              {step === 1 && (
                <>
                  <OTPInput value={otp} onChange={setOtp} />
                  <TouchableOpacity
                    onPress={handleResend}
                    style={s.resendRow}
                    disabled={resendCooldown > 0}
                  >
                    <Text style={[s.resendText, resendCooldown > 0 && s.resendDisabled]}>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get it? Resend code"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Step 2 — New Password */}
              {step === 2 && (
                <>
                  <InputField
                    label="NEW PASSWORD"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Min. 8 characters"
                    secureTextEntry={!showPw}
                    icon="lock-closed-outline"
                    rightIcon={showPw ? 'eye-off-outline' : 'eye-outline'}
                    onRightIconPress={() => setShowPw(!showPw)}
                  />
                  <PasswordStrength password={password} />
                  <InputField
                    label="CONFIRM PASSWORD"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    secureTextEntry={!showConfirm}
                    icon="shield-checkmark-outline"
                    rightIcon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    onRightIconPress={() => setShowConfirm(!showConfirm)}
                  />
                </>
              )}

              {/* CTA Button */}
              <TouchableOpacity
                onPressIn={pressIn}
                onPressOut={pressOut}
                onPress={primaryAction}
                disabled={loading}
                activeOpacity={1}
              >
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <LinearGradient
                    colors={loading ? ['#555', '#444'] : ['#F4A833', '#FF6B6B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.ctaBtn}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Text style={s.ctaText}>{primaryLabel}</Text>
                          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                    }
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>

            </Animated.View>
          </BlurView>

          <TouchableOpacity style={s.backToLogin} onPress={() => navigation.navigate('Login')}>
            <Text style={s.backToLoginText}>Back to <Text style={s.backToLoginBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  scroll: { paddingHorizontal: 24 },

  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },

  progress: { flexDirection: 'row', gap: 8, alignSelf: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: '#F4A833', width: 24 },
  dotDone: { backgroundColor: '#00C48C', width: 8 },

  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...shadows.glow },
  title: { color: '#fff', fontSize: fonts.sizes.xl, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.sm, textAlign: 'center', lineHeight: 20 },
  emailHighlight: { color: '#F4A833', fontWeight: '700' },

  card: { borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: 16 },
  cardInner: { padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl },

  resendRow: { alignItems: 'center', marginTop: 4, marginBottom: 20 },
  resendText: { color: '#F4A833', fontSize: fonts.sizes.sm, fontWeight: '600' },
  resendDisabled: { color: 'rgba(255,255,255,0.3)' },

  ctaBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.glow },
  ctaText: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },

  backToLogin: { alignItems: 'center', marginTop: 8 },
  backToLoginText: { color: 'rgba(255,255,255,0.45)', fontSize: fonts.sizes.sm },
  backToLoginBold: { color: '#F4A833', fontWeight: '700' },
});
