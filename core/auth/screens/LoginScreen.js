// core/auth/screens/LoginScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Dimensions, Modal, Pressable, Alert,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../database/index';
import useAppStore from '../../store/index';
import { fonts, spacing, borderRadius, shadows } from '../../theme/index';

// Native modules unavailable in Expo Go — lazy-loaded with fallbacks
let WebBrowser = null;
let AuthSession = null;
let LocalAuthentication = null;
try { WebBrowser = require('expo-web-browser'); WebBrowser.maybeCompleteAuthSession(); } catch (_) {}
try { AuthSession = require('expo-auth-session'); } catch (_) {}
try { LocalAuthentication = require('expo-local-authentication'); } catch (_) {}
import {
  biometricStoreAvailable, isBiometricSessionSaved,
  saveBiometricToken, readBiometricToken, clearBiometricToken,
} from '../biometricStore';

const { width, height } = Dimensions.get('window');
const BIOMETRIC_PROMPTED_KEY = '@nest_biometric_prompted';
const APP_VERSION = '1.0.0';

function FloatingOrb({ size, color, top, left, opacity }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top, left, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }}
    />
  );
}

function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, icon, rightIcon, onRightIconPress }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.15)', '#F4A833'] });

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

const inputStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.md, borderWidth: 1.5, paddingHorizontal: 14, height: 54 },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: fonts.sizes.md, fontFamily: fonts.body },
});

// ─── Biometric prompt sheet ────────────────────────────────────────────────────
function BiometricPromptSheet({ visible, biometricType, onEnable, onSkip }) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    }
  }, [visible]);

  const icon = biometricType === 'faceid' ? 'scan' : 'finger-print';
  const label = biometricType === 'faceid' ? 'Face ID' : 'Fingerprint';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={bpS.overlay}>
        <Animated.View style={[bpS.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={bpS.handle} />

          {/* Icon */}
          <LinearGradient colors={['#F4A833', '#FF6B6B']} style={bpS.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name={icon} size={36} color="#fff" />
          </LinearGradient>

          <Text style={bpS.title}>Enable {label}?</Text>
          <Text style={bpS.body}>
            Sign in faster next time using {label}. Your biometric data never leaves your device.
          </Text>

          {/* Checkmarks */}
          <View style={bpS.features}>
            {['Instant sign-in', 'Secure & private', 'Works even offline'].map(f => (
              <View key={f} style={bpS.featureRow}>
                <View style={bpS.checkCircle}>
                  <Ionicons name="checkmark" size={12} color="#00C48C" />
                </View>
                <Text style={bpS.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={bpS.enableBtn} onPress={onEnable} activeOpacity={0.85}>
            <LinearGradient colors={['#F4A833', '#FF6B6B']} style={bpS.enableBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name={icon} size={18} color="#fff" />
              <Text style={bpS.enableBtnText}>Enable {label}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={bpS.skipBtn} onPress={onSkip}>
            <Text style={bpS.skipText}>Not now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const bpS = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#1A0F3D', borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 28, paddingBottom: 44, alignItems: 'center', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...shadows.glow },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  body: { color: 'rgba(255,255,255,0.55)', fontSize: fonts.sizes.sm, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  features: { width: '100%', gap: 12, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,196,140,0.15)', alignItems: 'center', justifyContent: 'center' },
  featureText: { color: 'rgba(255,255,255,0.7)', fontSize: fonts.sizes.sm, fontWeight: '500' },
  enableBtn: { width: '100%', borderRadius: borderRadius.full, overflow: 'hidden', marginBottom: 12 },
  enableBtnInner: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  enableBtnText: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800' },
  skipBtn: { padding: 12 },
  skipText: { color: 'rgba(255,255,255,0.35)', fontSize: fonts.sizes.sm, fontWeight: '500' },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('fingerprint');
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const setUser = useAppStore((state) => state.setUser);
  const setSession = useAppStore((state) => state.setSession);
  const insets = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { checkBiometrics(); }, []);

  async function checkBiometrics() {
    if (!LocalAuthentication || !biometricStoreAvailable()) return;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isFaceID = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBiometricType(isFaceID ? 'faceid' : 'fingerprint');
      setBiometricAvailable(true);
      if (await isBiometricSessionSaved()) setHasSavedSession(true);
    } catch (_) {}
  }

  function pressIn() { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start(); }

  async function handleLogin() {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert('Missing fields', 'Please enter your email and password.');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Login failed', error.message);
        return;
      }
      await afterLogin(data.user, data.session, true);
    } catch (e) {
      setLoading(false);
      console.error('[Login] unexpected error:', e);
      Alert.alert('Something went wrong', e?.message || 'Please try again.');
    }
  }

  async function afterLogin(user, session, canOfferBiometric = false) {
    // Always log in immediately — biometric prompt is non-blocking
    setUser(user);
    setSession(session);

    // After login, offer biometric setup if available and not yet prompted
    if (canOfferBiometric && biometricAvailable && !hasSavedSession && biometricStoreAvailable()) {
      try {
        const alreadyPrompted = await AsyncStorage.getItem(BIOMETRIC_PROMPTED_KEY);
        if (!alreadyPrompted) {
          setPendingSession({ user, session });
          // Small delay so the main app navigation completes first
          setTimeout(() => setShowBiometricPrompt(true), 800);
        }
      } catch (_) {}
    }
  }

  async function handleEnableBiometric() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowBiometricPrompt(false);
    await AsyncStorage.setItem(BIOMETRIC_PROMPTED_KEY, 'true');
    if (pendingSession?.session?.refresh_token) {
      const ok = await saveBiometricToken(pendingSession.session.refresh_token);
      if (!ok) {
        return Alert.alert('Could not enable');
      }
      setHasSavedSession(true);
    }
    Alert.alert(`${biometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} enabled 🔐`, 'You can now sign in with biometrics.');
  }

  async function handleSkipBiometric() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBiometricPrompt(false);
    await AsyncStorage.setItem(BIOMETRIC_PROMPTED_KEY, 'true');
  }

  async function handleBiometricLogin() {
    if (!biometricAvailable || !hasSavedSession) return;
    setSocialLoading('biometric');
    try {
      // Reading the token IS the biometric prompt — enforced by the OS keychain
      const refreshToken = await readBiometricToken('Sign in to NestApp');
      if (!refreshToken) { setSocialLoading(null); return; }
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      setSocialLoading(null);
      if (error || !data?.session) {
        await clearBiometricToken();
        setHasSavedSession(false);
        return Alert.alert('Session expired', 'Please sign in with your password.');
      }
      // The refresh rotated the token — store the new one for next time
      if (data.session.refresh_token) await saveBiometricToken(data.session.refresh_token);
      setUser(data.user);
      setSession(data.session);
    } catch (err) {
      setSocialLoading(null);
      Alert.alert('Session expired', 'Please sign in with your password.');
    }
  }

  async function handleGoogleLogin() {
    if (!WebBrowser || !AuthSession) {
      return Alert.alert('Not available in Expo Go', 'Google sign-in requires a dev build.');
    }
    setSocialLoading('google');
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'nestapp' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error || !data?.url) throw error || new Error('No URL returned');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type !== 'success') { setSocialLoading(null); return; }
      const url = result.url;
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken) {
        const { data: sd, error: se } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        setSocialLoading(null);
        if (se) throw se;
        await afterLogin(sd.user, sd.session, true);
      } else {
        setSocialLoading(null);
      }
    } catch (err) {
      setSocialLoading(null);
      Alert.alert('Google sign-in failed', err?.message || 'Please try again.');
    }
  }

  async function handleAppleLogin() {
    let AppleAuthentication;
    try { AppleAuthentication = require('expo-apple-authentication'); } catch (_) {
      return Alert.alert('Not available');
    }
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) return Alert.alert('Not available', 'Apple Sign-In requires iOS 13+.')
    setSocialLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      setSocialLoading(null);
      if (error) throw error;
      await afterLogin(data.user, data.session, true);
    } catch (err) {
      setSocialLoading(null);
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign-in failed');
      }
    }
  }

  const biometricIcon = biometricType === 'faceid' ? 'scan-outline' : 'finger-print-outline';
  const biometricLabel = biometricType === 'faceid' ? 'Face ID' : 'Fingerprint';
  const isDisabled = loading || !!socialLoading;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0A1E', '#2D1B69', '#1A0F3D']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.container}>
        <FloatingOrb size={280} color="#F4A833" opacity={0.07} top={-80} left={-60} />
        <FloatingOrb size={200} color="#FF6B6B" opacity={0.08} top={height * 0.25} left={width * 0.6} />
        <FloatingOrb size={160} color="#9B59B6" opacity={0.1} top={height * 0.55} left={-40} />

        <ScrollView
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.inner, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            <LinearGradient colors={['#F4A833', '#FF6B6B']} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="leaf" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.appName}>NestApp</Text>
            <Text style={styles.tagline}>Where culture meets community</Text>
          </View>

          {/* ── Biometric quick-login pill ── */}
          {biometricAvailable && hasSavedSession && (
            <TouchableOpacity onPress={handleBiometricLogin} disabled={isDisabled} style={styles.biometricPill} activeOpacity={0.8}>
              <LinearGradient colors={['rgba(244,168,51,0.18)', 'rgba(244,168,51,0.06)']} style={styles.biometricPillInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {socialLoading === 'biometric' ? <ActivityIndicator color="#F4A833" size="small" /> : <Ionicons name={biometricIcon} size={20} color="#F4A833" />}
                <Text style={styles.biometricPillText}>Sign in with {biometricLabel}</Text>
                <Ionicons name="chevron-forward" size={15} color="rgba(244,168,51,0.5)" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── Card ── */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>Sign in to your community</Text>

              <InputField label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              <InputField label="PASSWORD" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry={!showPw} icon="lock-closed-outline" rightIcon={showPw ? 'eye-off-outline' : 'eye-outline'} onRightIconPress={() => setShowPw(!showPw)} />

              <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={handleLogin} disabled={isDisabled} activeOpacity={1}>
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <LinearGradient colors={isDisabled ? ['#888', '#666'] : ['#F4A833', '#FF6B6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.signInBtn}>
                    {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.signInText}>Sign In</Text><Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} /></>}
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin} disabled={isDisabled} activeOpacity={0.8}>
                  {socialLoading === 'google' ? <ActivityIndicator color="#fff" size="small" /> : <><View style={styles.googleG}><Text style={styles.googleText}>G</Text></View><Text style={styles.socialLabel}>Google</Text></>}
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.socialBtn} onPress={handleAppleLogin} disabled={isDisabled} activeOpacity={0.8}>
                    {socialLoading === 'apple' ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="logo-apple" size={18} color="#fff" /><Text style={styles.socialLabel}>Apple</Text></>}
                  </TouchableOpacity>
                )}
                {biometricAvailable && !hasSavedSession && (
                  <TouchableOpacity style={styles.socialBtn} onPress={handleBiometricLogin} disabled={isDisabled} activeOpacity={0.8}>
                    {socialLoading === 'biometric' ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name={biometricIcon} size={18} color="#fff" /><Text style={styles.socialLabel}>{biometricLabel}</Text></>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </BlurView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerText}>
                New here?{'  '}<Text style={styles.footerBold}>Create an account</Text>
              </Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>v{APP_VERSION}</Text>
          </View>

        </ScrollView>
      </LinearGradient>

      {/* ── Biometric enable prompt ── */}
      <BiometricPromptSheet
        visible={showBiometricPrompt}
        biometricType={biometricType}
        onEnable={handleEnableBiometric}
        onSkip={handleSkipBiometric}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'space-between' },

  logoSection: { alignItems: 'center' },
  logoCircle: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 14, ...shadows.glow, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  appName: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.3 },
  tagline: { color: 'rgba(255,255,255,0.45)', fontSize: fonts.sizes.xs, marginTop: 6, letterSpacing: 1.4, textTransform: 'uppercase' },

  biometricPill: { borderRadius: borderRadius.full, overflow: 'hidden' },
  biometricPillInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(244,168,51,0.22)', borderRadius: borderRadius.full },
  biometricPillText: { flex: 1, color: '#F4A833', fontSize: fonts.sizes.sm, fontWeight: '700' },

  card: { borderRadius: 32, overflow: 'hidden' },
  cardInner: { padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 32 },
  cardTitle: { color: '#fff', fontSize: fonts.sizes.xl, fontWeight: '800', marginBottom: 3 },
  cardSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: fonts.sizes.sm, marginBottom: 20 },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -6 },
  forgot: { color: '#F4A833', fontSize: fonts.sizes.sm, fontWeight: '600' },

  signInBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.glow },
  signInText: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.35)', fontSize: fonts.sizes.xs, marginHorizontal: 12, letterSpacing: 0.5 },

  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, borderRadius: borderRadius.md, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  googleG: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  googleText: { color: '#4285F4', fontSize: 12, fontWeight: '900' },
  socialLabel: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '600' },

  footer: { alignItems: 'center', gap: 10 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.sm, textAlign: 'center' },
  footerBold: { color: '#F4A833', fontWeight: '700' },
  versionText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
});
