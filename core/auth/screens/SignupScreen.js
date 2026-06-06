// core/auth/screens/SignupScreen.js
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

function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, icon, rightIcon, onRightIconPress, optional }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.15)', '#F4A833'],
  });

  return (
    <View style={iStyles.wrap}>
      <View style={iStyles.labelRow}>
        <Text style={iStyles.label}>{label}</Text>
        {optional && <Text style={iStyles.optional}>optional</Text>}
      </View>
      <Animated.View style={[iStyles.field, { borderColor }]}>
        <Ionicons name={icon} size={18} color={focused ? '#F4A833' : 'rgba(255,255,255,0.4)'} style={iStyles.icon} />
        <TextInput
          style={iStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
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

const iStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: fonts.sizes.xs, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  optional: { color: 'rgba(255,255,255,0.25)', fontSize: fonts.sizes.xs, fontStyle: 'italic' },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md, borderWidth: 1.5,
    paddingHorizontal: 14, height: 52,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: fonts.sizes.md, fontFamily: fonts.body },
});

// Password strength indicator
function PasswordStrength({ password }) {
  if (!password) return null;
  const strength = password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3
    : password.length >= 8 ? 2 : 1;
  const colors = ['#FF6B6B', '#F4A833', '#00C48C'];
  const labels = ['Weak', 'Good', 'Strong'];
  return (
    <View style={pwStyles.row}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[pwStyles.bar, { backgroundColor: i <= strength ? colors[strength - 1] : 'rgba(255,255,255,0.1)' }]} />
      ))}
      <Text style={[pwStyles.label, { color: colors[strength - 1] }]}>{labels[strength - 1]}</Text>
    </View>
  );
}
const pwStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 14 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: fonts.sizes.xs, fontWeight: '600', marginLeft: 4 },
});

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const setUser = useAppStore((state) => state.setUser);
  const setSession = useAppStore((state) => state.setSession);
  const insets = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  function pressIn() { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start(); }

  async function handleSignup() {
    if (!fullName.trim()) {
      return Toast.show({ type: 'warning', text1: 'Name required', text2: 'Please enter your full name.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return Toast.show({ type: 'error', text1: 'Invalid email', text2: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return Toast.show({ type: 'warning', text1: 'Password too short', text2: 'Use at least 8 characters.' });
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Toast.show({ type: 'error', text1: 'Passwords don\'t match', text2: 'Please re-enter your password.' });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Toast.show({ type: 'error', text1: 'Signup failed', text2: error.message });
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, full_name: fullName.trim(), phone, city: 'St. Louis', state: 'Missouri', is_verified: false });
    setLoading(false);
    if (profileError) {
      Toast.show({ type: 'warning', text1: 'Almost there!', text2: 'Account created but profile setup failed.' });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: 'Welcome to NestApp! 🎉', text2: 'Your community awaits.' });
    setUser(data.user);
    setSession(data.session);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={['#1A0F3D', '#2D1B69', '#0F0A1E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Orbs */}
        <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden' }}>
          <View style={[styles.orb, { width: 260, height: 260, top: -80, right: -80, backgroundColor: '#FF6B6B', opacity: 0.07 }]} />
          <View style={[styles.orb, { width: 180, height: 180, top: height * 0.45, left: -60, backgroundColor: '#F4A833', opacity: 0.08 }]} />
          <View style={[styles.orb, { width: 140, height: 140, bottom: 80, right: -30, backgroundColor: '#9B59B6', opacity: 0.09 }]} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back + Header */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoMini}>
              <LinearGradient colors={['#F4A833', '#FF6B6B']} style={styles.logoCircle}>
                <Text style={styles.logoLetter}>N</Text>
              </LinearGradient>
              <Text style={styles.appName}>NestApp</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.headerSection}>
            <Text style={styles.headline}>Join the community</Text>
            <Text style={styles.subheadline}>Connect with Indians, Pakistanis,{'\n'}Nepalese & Arabs across the USA</Text>
            <View style={styles.flagRow}>
              {['🇮🇳', '🇵🇰', '🇳🇵', '🇸🇦'].map((flag, i) => (
                <Text key={i} style={styles.flag}>{flag}</Text>
              ))}
            </View>
          </View>

          {/* Form card */}
          <BlurView intensity={18} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <InputField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your full name" icon="person-outline" />
              <InputField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" icon="call-outline" optional />
              <InputField
                label="Password"
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
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry={!showConfirm}
                icon="shield-checkmark-outline"
                rightIcon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowConfirm(!showConfirm)}
              />

              {/* Terms note */}
              <Text style={styles.termsNote}>
                By creating an account you agree to our{' '}
                <Text style={styles.termsLink}>Terms</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>

              {/* CTA */}
              <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={handleSignup} disabled={loading} activeOpacity={1}>
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <LinearGradient
                    colors={loading ? ['#888', '#666'] : ['#F4A833', '#FF6B6B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createBtn}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Text style={styles.createBtnText}>Create Account</Text>
                          <Ionicons name="sparkles" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                    }
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </BlurView>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>
              Already have an account?{'  '}
              <Text style={styles.loginLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  scroll: { paddingHorizontal: 24 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  logoMini: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontSize: 16, fontWeight: '800' },
  appName: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },

  headerSection: { marginBottom: 28, alignItems: 'center' },
  headline: { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subheadline: { color: 'rgba(255,255,255,0.45)', fontSize: fonts.sizes.sm, textAlign: 'center', lineHeight: 20 },
  flagRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flag: { fontSize: 22 },

  card: { borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: 20 },
  cardInner: { padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl },

  termsNote: { color: 'rgba(255,255,255,0.35)', fontSize: fonts.sizes.xs, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  termsLink: { color: '#F4A833', fontWeight: '600' },

  createBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.glow },
  createBtnText: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },

  loginLink: { alignItems: 'center', paddingBottom: 16 },
  loginLinkText: { color: 'rgba(255,255,255,0.45)', fontSize: fonts.sizes.sm },
  loginLinkBold: { color: '#F4A833', fontWeight: '700' },
});
