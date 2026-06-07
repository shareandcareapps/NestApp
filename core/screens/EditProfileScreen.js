// core/screens/EditProfileScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';

const REPUTATION_TIERS = [
  { label: 'Bronze',   min: 0,   color: '#CD7F32', icon: 'ribbon-outline' },
  { label: 'Silver',   min: 5,   color: '#C0C0C0', icon: 'ribbon' },
  { label: 'Gold',     min: 15,  color: '#F4A833', icon: 'trophy-outline' },
  { label: 'Platinum', min: 30,  color: '#00C48C', icon: 'trophy' },
  { label: 'Diamond',  min: 50,  color: '#9B59B6', icon: 'diamond-outline' },
];

function getTier(score) {
  return [...REPUTATION_TIERS].reverse().find(t => score >= t.min) || REPUTATION_TIERS[0];
}

function StyledInput({ label, value, onChangeText, placeholder, multiline, maxLength, prefix, theme, hint, autoCapitalize = 'sentences' }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[inpS.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[inpS.wrap, { backgroundColor: theme.inputBackground, borderColor: focused ? '#F4A833' : theme.border }]}>
        {prefix && <Text style={[inpS.prefix, { color: theme.textLight }]}>{prefix}</Text>}
        <TextInput
          style={[inpS.input, multiline && inpS.area, { color: theme.textPrimary }]}
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={theme.textLight} multiline={multiline}
          maxLength={maxLength} textAlignVertical={multiline ? 'top' : 'auto'}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        {maxLength && <Text style={[inpS.charCount, { color: theme.textLight }]}>{value?.length || 0}/{maxLength}</Text>}
      </View>
      {hint && <Text style={[inpS.hint, { color: theme.textLight }]}>{hint}</Text>}
    </View>
  );
}

const inpS = StyleSheet.create({
  label: { fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: 8 },
  wrap: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1.5, paddingHorizontal: 14, minHeight: 50 },
  prefix: { fontSize: fonts.sizes.md, fontWeight: '600', marginRight: 4 },
  input: { flex: 1, fontSize: fonts.sizes.md, paddingVertical: 12 },
  area: { minHeight: 80, paddingVertical: 12 },
  charCount: { fontSize: 11 },
  hint: { fontSize: 11, marginTop: 4, lineHeight: 16 },
});

export default function EditProfileScreen({ navigation }) {
  const user            = useAppStore((state) => state.user);
  const setProfileName  = useAppStore((state) => state.setProfileName);
  const theme           = useTheme();
  const insets          = useSafeAreaInsets();

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [username,  setUsername]  = useState('');
  const [fullName,  setFullName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [bio,       setBio]       = useState('');
  const [stats,     setStats]     = useState({ listings: 0, rides: 0, rating: null, ratingCount: 0 });

  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!user?.id) { setLoading(false); return; }
    try {
      const [profileRes, listingsRes, ridesRes, ratingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('rides').select('id', { count: 'exact', head: true }).or(`driver_id.eq.${user.id},requester_id.eq.${user.id}`),
        supabase.from('ratings').select('rating').eq('to_user_id', user.id),
      ]);
      if (profileRes.data) {
        setUsername(profileRes.data.username || '');
        setFullName(profileRes.data.full_name || '');
        setPhone(profileRes.data.phone || '');
        setBio(profileRes.data.bio || '');
      }
      const ratings = ratingsRes.data || [];
      const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) : null;
      setStats({ listings: listingsRes.count || 0, rides: ridesRes.count || 0, rating: avg, ratingCount: ratings.length });
    } catch (e) { console.error('loadProfile:', e); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!username) { Alert.alert('Error', 'Username is required'); return; }
    if (username.length < 3) { Alert.alert('Error', 'Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { Alert.alert('Error', 'Username can only contain letters, numbers and underscores'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        username: username.toLowerCase(), full_name: fullName, phone, bio,
      }).eq('id', user.id);
      if (error) {
        if (error.code === '23505') Alert.alert('Username taken', 'This username is already in use. Please choose another.');
        else throw error;
        return;
      }
      const display = username.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      setProfileName(display);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Your profile has been updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save profile. Please try again.');
    } finally { setSaving(false); }
  }

  const reputationScore = stats.listings + stats.rides + (stats.ratingCount > 0 ? Math.round(stats.ratingCount * 1.5) : 0);
  const tier = getTier(reputationScore);
  const nextTier = REPUTATION_TIERS[REPUTATION_TIERS.indexOf(tier) + 1];
  const progressPct = nextTier ? Math.min(1, (reputationScore - tier.min) / (nextTier.min - tier.min)) : 1;

  const avatarColor = '#2D1B69';
  const initials = (username || fullName || 'U').split(/[\s_]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color="#F4A833" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        {/* Gradient hero */}
        <LinearGradient colors={['#2D1B69','#4A2D9C','#1A0F3D']} style={[styles.hero, { paddingTop: insets.top + 44 }]}>
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.heroBack, { top: insets.top + 12 }]}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.heroTitle}>Edit Profile</Text>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <LinearGradient colors={[avatarColor, '#9B59B6']} style={styles.avatar}>
              <Text style={styles.avatarTxt}>{initials}</Text>
            </LinearGradient>
            <TouchableOpacity style={styles.avatarEdit}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroUsername}>@{username || 'yourname'}</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Stats row */}
          <View style={[styles.statsCard, { backgroundColor: theme.card }, shadows.small]}>
            {[
              { label: 'Listings', value: stats.listings, icon: 'pricetag-outline', color: '#FF6B6B' },
              { label: 'Rides', value: stats.rides, icon: 'car-outline', color: '#00C48C' },
              { label: 'Rating', value: stats.rating ? stats.rating.toFixed(1) : '—', icon: 'star-outline', color: '#F4A833' },
            ].map((s, i) => (
              <View key={s.label} style={[styles.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: theme.border }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textLight }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Reputation badge */}
          <View style={[styles.repCard, { backgroundColor: theme.card }, shadows.small]}>
            <View style={styles.repLeft}>
              <Ionicons name={tier.icon} size={28} color={tier.color} />
              <View>
                <Text style={[styles.repTier, { color: tier.color }]}>{tier.label} Member</Text>
                <Text style={[styles.repSub, { color: theme.textLight }]}>
                  {nextTier ? `${nextTier.min - reputationScore} pts to ${nextTier.label}` : 'Max tier reached!'}
                </Text>
              </View>
            </View>
            <Text style={[styles.repScore, { color: tier.color }]}>{reputationScore} pts</Text>
          </View>
          {nextTier && (
            <View style={[styles.repBar, { backgroundColor: theme.border }]}>
              <Animated.View style={[styles.repFill, { backgroundColor: tier.color, width: `${progressPct * 100}%` }]} />
            </View>
          )}

          {/* Privacy notice */}
          <View style={[styles.privacyCard, { backgroundColor: '#F4A83312', borderColor: '#F4A83330' }]}>
            <Ionicons name="shield-checkmark" size={16} color="#F4A833" />
            <Text style={[styles.privacyTxt, { color: theme.textSecondary }]}>
              Your username is shown publicly on listings and rides. Your real name is kept private.
            </Text>
          </View>

          {/* Form */}
          <StyledInput
            label="Username * (public)"
            prefix="@"
            value={username}
            onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="e.g. stl_student"
            maxLength={30}
            autoCapitalize="none"
            theme={theme}
            hint="Shown publicly on your listings and rides."
          />
          <StyledInput
            label="Full Name (private)"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your real name"
            theme={theme}
            hint="Never shown to other users."
          />
          <StyledInput
            label="Phone Number (private, optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +1 314 555 0000"
            autoCapitalize="none"
            theme={theme}
            hint="Never shown publicly."
          />
          <StyledInput
            label="Bio (optional)"
            value={bio}
            onChangeText={setBio}
            placeholder="A short intro about yourself…"
            multiline
            maxLength={150}
            theme={theme}
          />

          {/* Save button */}
          <TouchableOpacity
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <LinearGradient colors={saving ? ['#888','#666'] : ['#2D1B69','#4A2D9C']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.saveBtnTxt}>Save Profile</Text></>}
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelTxt, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: spacing.md, paddingBottom: 20, alignItems: 'center' },
  heroBack: { position: 'absolute', top: 0, left: spacing.md, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  heroTitle: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800', marginBottom: 14 },
  avatarWrap: { alignItems: 'center', position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTxt: { color: '#fff', fontSize: 26, fontWeight: '800' },
  avatarEdit: { position: 'absolute', bottom: 0, right: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: '#F4A833', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A0F3D' },
  heroUsername: { color: 'rgba(255,255,255,0.65)', fontSize: fonts.sizes.sm, fontWeight: '600', marginTop: 6 },

  inner: { padding: spacing.md, paddingTop: 20, marginTop: 0 },

  statsCard: { flexDirection: 'row', borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  statValue: { fontSize: fonts.sizes.xl, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  repCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: borderRadius.lg, padding: 14, marginBottom: 6 },
  repLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  repIcon: { fontSize: 28 },
  repTier: { fontSize: fonts.sizes.md, fontWeight: '800' },
  repSub: { fontSize: 11, marginTop: 2 },
  repScore: { fontSize: fonts.sizes.lg, fontWeight: '800' },
  repBar: { height: 6, borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  repFill: { height: '100%', borderRadius: 3 },

  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: borderRadius.lg, borderWidth: 1, padding: 12, marginBottom: 20 },
  privacyTxt: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 18 },

  saveBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveBtnTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelTxt: { fontSize: fonts.sizes.md },
});
