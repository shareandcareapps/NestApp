// core/screens/SettingsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Switch, Animated, Modal, Pressable, useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

let LocalAuthentication = null;
let SecureStore = null;
try { LocalAuthentication = require('expo-local-authentication'); } catch (_) {}
try { SecureStore = require('expo-secure-store'); } catch (_) {}

const BIOMETRIC_KEY = 'nest_biometric_session';
const BIOMETRIC_PROMPTED_KEY = '@nest_biometric_prompted';

const LANGUAGES = [
  { id: 'en',  label: 'English',  code: 'EN' },
  { id: 'hi',  label: 'हिंदी',    code: 'HI' },
  { id: 'ur',  label: 'اردو',     code: 'UR' },
  { id: 'ne',  label: 'नेपाली',   code: 'NE' },
  { id: 'ar',  label: 'العربية',  code: 'AR' },
];

const AVATAR_COLORS = ['#FF6B6B','#2D1B69','#00C48C','#0099FF','#9B59B6','#F4A833'];

function SectionHeader({ title, theme }) {
  return (
    <Text style={[secS.title, { color: theme.textLight }]}>{title}</Text>
  );
}

const secS = StyleSheet.create({
  title: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: spacing.md, paddingTop: 24, paddingBottom: 8 },
});

function SettingsRow({ icon, iconColor = '#F4A833', label, sublabel, right, onPress, last, theme }) {
  return (
    <TouchableOpacity
      style={[rowS.row, !last && { borderBottomColor: theme.border, borderBottomWidth: 0.5 }, { backgroundColor: theme.card }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[rowS.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowS.label, { color: theme.textPrimary }]}>{label}</Text>
        {sublabel && <Text style={[rowS.sublabel, { color: theme.textLight }]}>{sublabel}</Text>}
      </View>
      {right}
      {onPress && !right && <Ionicons name="chevron-forward" size={16} color={theme.textLight} />}
    </TouchableOpacity>
  );
}

const rowS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 15, gap: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: fonts.sizes.md, fontWeight: '500' },
  sublabel: { fontSize: 12, marginTop: 2 },
});

export default function SettingsScreen({ navigation }) {
  const user             = useAppStore(s => s.user);
  const themeMode        = useAppStore(s => s.themeMode);
  const setThemeMode     = useAppStore(s => s.setThemeMode);
  const storedProfileName = useAppStore(s => s.profileName);
  const theme            = useTheme();
  const insets           = useSafeAreaInsets();
  const systemTheme      = useColorScheme();

  const [profile,      setProfile]      = useState(null);
  const [language,     setLanguage]     = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [notifs, setNotifs] = useState({ listings: true, rides: true, messages: true, news: false });
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('fingerprint');
  const themeAnim = useRef(new Animated.Value(themeMode === 'dark' ? 1 : 0)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    loadProfile();
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    if (!LocalAuthentication || !SecureStore) return;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isFaceID = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBiometricType(isFaceID ? 'faceid' : 'fingerprint');
      setBiometricAvailable(true);
      const saved = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(!!saved);
    } catch (_) {}
  }

  async function toggleBiometric(value) {
    if (!LocalAuthentication || !SecureStore) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      // Authenticate before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} for NestApp`,
        fallbackLabel: 'Use passcode',
      });
      if (!result.success) return;
      // Get current session refresh token from supabase
      const { data } = await supabase.auth.getSession();
      const refreshToken = data?.session?.refresh_token;
      if (!refreshToken) {
        return Toast.show({ type: 'error', text1: 'Could not enable', text2: 'Please sign out and sign in again.' });
      }
      await SecureStore.setItemAsync(BIOMETRIC_KEY, refreshToken);
      await AsyncStorage.setItem(BIOMETRIC_PROMPTED_KEY, 'true');
      setBiometricEnabled(true);
      Toast.show({ type: 'success', text1: `${biometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} enabled 🔐`, text2: 'You can now sign in with biometrics.' });
    } else {
      try { await SecureStore.deleteItemAsync(BIOMETRIC_KEY); } catch (_) {}
      setBiometricEnabled(false);
      Toast.show({ type: 'info', text1: 'Biometric sign-in disabled', text2: 'Use your password to sign in.' });
    }
  }

  useEffect(() => {
    Animated.spring(themeAnim, { toValue: themeMode === 'dark' ? 1 : 0, useNativeDriver: true, speed: 20 }).start();
  }, [themeMode]);

  async function loadProfile() {
    if (!user?.id) { setLoading(false); return; }
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) setProfile(data);
    } catch (e) { console.error('loadProfile:', e); }
  }

  function toggleTheme() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  }

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutSheet(false);
    await supabase.auth.signOut();
  }

  const name = profile?.full_name || storedProfileName || user?.email?.split('@')[0] || 'User';
  const username = profile?.username;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const currentLang = LANGUAGES.find(l => l.id === language);

  const moonX = themeAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 26] });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Profile hero card */}
        <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.profileHero, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <LinearGradient colors={[avatarColor, avatarColor + 'BB']} style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{name}</Text>
            {username && <Text style={styles.heroUsername}>@{username}</Text>}
            <Text style={styles.heroEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="pencil" size={16} color="#F4A833" />
          </TouchableOpacity>
        </LinearGradient>

        {/* My content shortcuts */}
        <View style={styles.quickRow}>
          {[
            { icon: 'pricetag', label: 'My Listings', color: '#FF6B6B', route: 'MyListings' },
            { icon: 'car',      label: 'My Rides',    color: '#00C48C', route: 'MyRides' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={[styles.quickBtn, { backgroundColor: theme.card }, shadows.small]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(item.route); }}>
              <View style={[styles.quickIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.quickLabel, { color: theme.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Appearance */}
        <SectionHeader title="Appearance" theme={theme} />
        <View style={[styles.section, { borderColor: theme.border }]}>
          <SettingsRow
            icon="contrast-outline" iconColor="#9B59B6" label="Dark Mode"
            sublabel={themeMode === 'auto' ? `Following system (${systemTheme})` : undefined}
            theme={theme} last
            right={
              <TouchableOpacity onPress={toggleTheme} style={[styles.toggleTrack, { backgroundColor: themeMode === 'dark' ? '#9B59B6' : theme.border }]}>
                <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: moonX }] }]}>
                  <Ionicons name={themeMode === 'dark' ? 'moon' : 'sunny'} size={12} color={themeMode === 'dark' ? '#9B59B6' : '#F4A833'} />
                </Animated.View>
              </TouchableOpacity>
            }
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" theme={theme} />
        <View style={[styles.section, { borderColor: theme.border }]}>
          {[
            { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', color: '#9B59B6' },
            { key: 'listings', label: 'New Listings', icon: 'pricetag-outline', color: '#FF6B6B' },
            { key: 'rides',    label: 'Carpool Updates', icon: 'car-outline',  color: '#00C48C' },
            { key: 'news',     label: 'Community News', icon: 'newspaper-outline', color: '#F4A833' },
          ].map((n, i, arr) => (
            <SettingsRow
              key={n.key}
              icon={n.icon} iconColor={n.color} label={n.label}
              theme={theme}
              last={i === arr.length - 1}
              right={
                <Switch
                  value={notifs[n.key]}
                  onValueChange={v => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotifs(p => ({ ...p, [n.key]: v })); }}
                  trackColor={{ false: theme.border, true: n.color + '88' }}
                  thumbColor={notifs[n.key] ? n.color : theme.textLight}
                />
              }
            />
          ))}
        </View>

        {/* Security */}
        {biometricAvailable && (
          <>
            <SectionHeader title="Security" theme={theme} />
            <View style={[styles.section, { borderColor: theme.border }]}>
              <SettingsRow
                icon={biometricType === 'faceid' ? 'scan-outline' : 'finger-print-outline'}
                iconColor="#00C48C"
                label={biometricType === 'faceid' ? 'Face ID' : 'Fingerprint Login'}
                sublabel={biometricEnabled ? 'Tap to disable quick sign-in' : 'Enable quick sign-in with biometrics'}
                theme={theme}
                last
                right={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={toggleBiometric}
                    trackColor={{ false: theme.border, true: '#00C48C88' }}
                    thumbColor={biometricEnabled ? '#00C48C' : theme.textLight}
                  />
                }
              />
            </View>
          </>
        )}

        {/* App info */}
        <SectionHeader title="App" theme={theme} />
        <View style={[styles.section, { borderColor: theme.border }]}>
          <SettingsRow icon="document-text-outline" iconColor="#0099FF" label="Privacy Policy"     onPress={() => navigation.navigate('PrivacyPolicy')} theme={theme} />
          <SettingsRow icon="newspaper-outline"    iconColor="#00C48C" label="Terms & Conditions" onPress={() => navigation.navigate('Terms')}         theme={theme} />
          <SettingsRow icon="warning-outline"      iconColor="#F4A833" label="Disclaimer"         onPress={() => navigation.navigate('Disclaimer')}    theme={theme} last />
        </View>

        {/* Version card */}
        <View style={[styles.versionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <LinearGradient colors={['#F4A833','#FF6B6B']} style={styles.versionBubble} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.versionName, { color: theme.textPrimary }]}>NestApp</Text>
            <Text style={[styles.versionMeta, { color: theme.textLight }]}>v1.0.0 Beta · Taru Labs</Text>
          </View>
          <View style={[styles.betaBadge, { backgroundColor: '#F4A83320', borderColor: '#F4A83340' }]}>
            <Text style={styles.betaTxt}>BETA</Text>
          </View>
        </View>

        {/* Logout */}
        <SectionHeader title="Account" theme={theme} />
        <View style={[styles.section, { borderColor: theme.border }]}>
          <SettingsRow icon="log-out-outline" iconColor="#FF6B6B" label="Logout" onPress={() => setShowLogoutSheet(true)} theme={theme} last />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerTxt, { color: theme.textLight }]}>Made for South Asian & Arab communities in St. Louis</Text>
          <Text style={[styles.footerSub, { color: theme.textLight }]}>NestApp · v1.0.0 (Beta) · Taru Labs</Text>
        </View>
      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} transparent animationType="slide" onRequestClose={() => setShowLangPicker(false)}>
        <View style={styles.modalContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLangPicker(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
          <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Select Language</Text>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.id}
              style={[styles.langRow, { borderBottomColor: theme.border }, lang.id === language && { backgroundColor: '#F4A83310' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLanguage(lang.id); setShowLangPicker(false); }}
            >
              <Text style={styles.langFlag}>{lang.code}</Text>
              <Text style={[styles.langLabel, { color: theme.textPrimary }]}>{lang.label}</Text>
              {lang.id === language && <Ionicons name="checkmark-circle" size={20} color="#F4A833" />}
            </TouchableOpacity>
          ))}
        </View>
        </View>
      </Modal>

      {/* Logout confirmation sheet */}
      <Modal visible={showLogoutSheet} transparent animationType="slide" onRequestClose={() => setShowLogoutSheet(false)}>
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLogoutSheet(false)} />
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out" size={32} color="#FF6B6B" />
            </View>
            <Text style={[styles.logoutTitle, { color: theme.textPrimary }]}>Logout?</Text>
            <Text style={[styles.logoutBody, { color: theme.textSecondary }]}>You'll need to sign in again to access your account.</Text>
            <TouchableOpacity style={styles.logoutConfirmBtn} onPress={handleLogout}>
              <Text style={styles.logoutConfirmTxt}>Yes, Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logoutCancelBtn, { borderColor: theme.border }]} onPress={() => setShowLogoutSheet(false)}>
              <Text style={[styles.logoutCancelTxt, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileHero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: spacing.md, paddingBottom: 18 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTxt: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroName: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  heroUsername: { color: 'rgba(255,255,255,0.65)', fontSize: fonts.sizes.sm, fontWeight: '600', marginTop: 2 },
  heroEmail: { color: 'rgba(255,255,255,0.45)', fontSize: fonts.sizes.xs, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  quickRow: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.md, paddingTop: 16 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: borderRadius.lg, padding: 14 },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { flex: 1, fontSize: fonts.sizes.sm, fontWeight: '700' },

  section: { borderTopWidth: 0.5, borderBottomWidth: 0.5, marginHorizontal: 0 },

  toggleTrack: { width: 52, height: 28, borderRadius: 14, justifyContent: 'center', padding: 2 },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  lockedTxt: { fontSize: 11, fontWeight: '600' },

  versionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: spacing.md, marginTop: 16, borderRadius: borderRadius.lg, padding: 14, borderWidth: 1 },
  versionBubble: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  versionName: { fontSize: fonts.sizes.md, fontWeight: '800' },
  versionMeta: { fontSize: fonts.sizes.xs, marginTop: 2 },
  betaBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  betaTxt: { fontSize: 10, fontWeight: '800', color: '#F4A833', letterSpacing: 0.5 },

  footer: { padding: 28, alignItems: 'center', gap: 6 },
  footerTxt: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footerSub: { fontSize: 11, fontWeight: '600' },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 22, paddingBottom: 38 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', textAlign: 'center', marginBottom: 16 },

  langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderRadius: 8, paddingHorizontal: 4 },
  langFlag: { fontSize: 24 },
  langLabel: { flex: 1, fontSize: fonts.sizes.md, fontWeight: '500' },

  logoutIcon: { alignItems: 'center', marginBottom: 12 },
  logoutTitle: { fontSize: fonts.sizes.xl, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  logoutBody: { fontSize: fonts.sizes.sm, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  logoutConfirmBtn: { backgroundColor: '#FF6B6B', borderRadius: borderRadius.full, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoutConfirmTxt: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800' },
  logoutCancelBtn: { borderRadius: borderRadius.full, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  logoutCancelTxt: { fontSize: fonts.sizes.md, fontWeight: '600' },
});
