// core/screens/HomeScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image, Animated, Dimensions, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';
import { CardSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import AvatarStack from '../components/AvatarStack';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.62;

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'accommodation', label: 'Housing',  icon: 'business',   gradient: ['#FF6B6B', '#E84393'] },
  { key: 'jobs',          label: 'Jobs',      icon: 'briefcase',  gradient: ['#00C48C', '#007A5E'] },
  { key: 'buysell',       label: 'Buy/Sell',  icon: 'pricetag',   gradient: ['#0099FF', '#0055CC'] },
  { key: 'food',          label: 'Food',      icon: 'restaurant', gradient: ['#F4A833', '#E68A00'] },
];

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Post Listing', icon: 'bag-add',         gradient: ['#FF6B6B', '#E84393'], screen: 'PostListing' },
  { label: 'Share Ride',   icon: 'car',              gradient: ['#00C48C', '#007A5E'], screen: 'PostRide' },
  { label: 'Write Story',  icon: 'create',           gradient: ['#0099FF', '#0055CC'], screen: 'News' },
  { label: 'Message',      icon: 'chatbubble',       gradient: ['#9B59B6', '#6C3483'], screen: 'Messages' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Greeting({ name }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const iconName = hour < 12 ? 'sunny-outline' : hour < 17 ? 'partly-sunny-outline' : 'moon-outline';
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name={iconName} size={12} color="rgba(255,255,255,0.55)" />
        <Text style={headerStyles.greetSmall}>{greet}</Text>
      </View>
      <Text style={headerStyles.greetName} numberOfLines={1}>{name || 'Welcome!'}</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  greetSmall: { color: 'rgba(255,255,255,0.55)', fontSize: fonts.sizes.xs, fontWeight: '600', letterSpacing: 0.3 },
  greetName:  { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800', letterSpacing: -0.3 },
});

function AvatarButton({ name, onPress }) {
  const gradients = [['#F4A833','#FF6B6B'],['#00C48C','#007A5E'],['#9B59B6','#6C3483'],['#0099FF','#0055CC']];
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?';
  const g = gradients[(name?.charCodeAt(0) || 0) % gradients.length];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={g} style={avatarStyles.circle} start={{x:0,y:0}} end={{x:1,y:1}}>
        <Text style={avatarStyles.text}>{initials}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
const avatarStyles = StyleSheet.create({
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  text: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

function PointsPill({ points }) {
  return (
    <View style={pillStyles.wrap}>
      <LinearGradient colors={['#F4A833','#FF6B6B']} start={{x:0,y:0}} end={{x:1,y:0}} style={pillStyles.pill}>
        <Ionicons name="star" size={11} color="#fff" />
        <Text style={pillStyles.text}>{points > 0 ? `${points} pts` : 'Earn points!'}</Text>
      </LinearGradient>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap: { marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  text: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

function SectionHeader({ title, onSeeAll, theme }) {
  return (
    <View style={sectionStyles.row}>
      <Text style={[sectionStyles.title, { color: theme.textPrimary }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={sectionStyles.seeAll}>See all  →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: fonts.sizes.lg, fontWeight: '800' },
  seeAll: { color: '#F4A833', fontSize: fonts.sizes.sm, fontWeight: '700' },
});

function QuickActionBtn({ item, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={1}
      style={qStyles.wrap}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {/* Gradient border ring */}
        <LinearGradient colors={item.gradient} style={qStyles.ring} start={{x:0,y:0}} end={{x:1,y:1}}>
          <LinearGradient colors={item.gradient} style={qStyles.btn} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name={item.icon} size={22} color="#fff" />
          </LinearGradient>
        </LinearGradient>
        <Text style={qStyles.label}>{item.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
const qStyles = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  ring: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', padding: 2.5, ...shadows.medium },
  btn: { width: '100%', height: '100%', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#9B8FAD', fontSize: 10, fontWeight: '600', marginTop: 6, textAlign: 'center' },
});

function ListingCard({ item, onPress, theme }) {
  const cat = CATEGORIES.find(c => c.key === item.category) || CATEGORIES[0];
  const photo = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
  const meta = item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : {};
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[lcStyles.card, { width: CARD_W, backgroundColor: theme.card, ...shadows.medium }]}>
      <View style={lcStyles.imgWrap}>
        {photo
          ? <Image source={{ uri: photo }} style={lcStyles.img} />
          : <LinearGradient colors={cat.gradient} style={lcStyles.imgPlaceholder}><Ionicons name={cat.icon} size={32} color="rgba(255,255,255,0.6)" /></LinearGradient>
        }
        <LinearGradient colors={cat.gradient} style={lcStyles.catBadge}><Text style={lcStyles.catLabel}>{cat.label}</Text></LinearGradient>
        <TouchableOpacity style={lcStyles.heartBtn}><Ionicons name="heart-outline" size={18} color="#fff" /></TouchableOpacity>
      </View>
      <View style={lcStyles.body}>
        <Text style={[lcStyles.title, { color: theme.textPrimary }]} numberOfLines={2}>{item.title}</Text>
        {meta?.location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 }}>
            <Ionicons name="location-outline" size={11} color={theme.textLight} />
            <Text style={[lcStyles.location, { color: theme.textSecondary, marginBottom: 0 }]} numberOfLines={1}>{meta.location}</Text>
          </View>
        ) : null}
        <View style={lcStyles.priceRow}>
          <Text style={lcStyles.price}>{item.price ? `$${item.price}` : 'Free'}</Text>
          {meta?.negotiable && <Text style={[lcStyles.neg, { color: theme.textLight }]}>• Neg.</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}
const lcStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, marginRight: 14, overflow: 'hidden' },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 140, resizeMode: 'cover' },
  imgPlaceholder: { width: '100%', height: 140, alignItems: 'center', justifyContent: 'center' },
  catBadge: { position: 'absolute', top: 10, left: 10, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  catLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },
  heartBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 12 },
  title: { fontSize: fonts.sizes.sm, fontWeight: '700', lineHeight: 18, marginBottom: 4 },
  location: { fontSize: 11, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: fonts.sizes.md, fontWeight: '800', color: '#F4A833' },
  neg: { fontSize: 11 },
});

function RideCard({ item, theme, onPress }) {
  const isRequest = item.ride_type === 'request';
  const accent = isRequest ? '#F4A833' : '#0099FF';
  const dateLabel = item.ride_date
    ? new Date(item.ride_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'TBD';
  const bgGrad = isRequest
    ? ['#3D2200', '#261500']
    : ['#0A2540', '#001830'];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[rStyles.card, shadows.medium]}>
      <LinearGradient colors={bgGrad} style={rStyles.fill} start={{x:0,y:0}} end={{x:1,y:1}}>
        {/* Top accent stripe */}
        <LinearGradient colors={[accent, accent + 'AA']} style={rStyles.accentBar} start={{x:0,y:0}} end={{x:1,y:0}} />
        <View style={rStyles.body}>
          <View style={[rStyles.typePill, { backgroundColor: accent + '30' }]}>
            <Ionicons name={isRequest ? 'person' : 'car'} size={10} color="#fff" />
            <Text style={rStyles.typeText}>{isRequest ? 'Seat Request' : 'Offering'}</Text>
          </View>
          <View style={rStyles.routeWrap}>
            <View style={rStyles.routeTrack}>
              <View style={rStyles.dotGreen} />
              <View style={[rStyles.routeLineV, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
              <Ionicons name="location" size={12} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rStyles.place} numberOfLines={1}>
                {item.from_location || 'From'}
              </Text>
              <Text style={rStyles.placeSub} numberOfLines={1}>
                {item.to_location || 'To'}
              </Text>
            </View>
          </View>
          <View style={rStyles.meta}>
            <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.5)" />
            <Text style={rStyles.metaText}>{dateLabel}</Text>
            <View style={rStyles.metaDot} />
            <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.5)" />
            <Text style={rStyles.metaText}>{item.seats_available ?? '?'} seats</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
const rStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, marginRight: 14, width: width * 0.58, overflow: 'hidden' },
  fill: { flex: 1 },
  accentBar: { height: 3 },
  body: { padding: 12 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 10 },
  typeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  routeWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 10 },
  routeTrack: { alignItems: 'center', paddingTop: 3 },
  dotGreen: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#00C48C' },
  routeLineV: { width: 1.5, height: 14, borderRadius: 1, marginVertical: 2 },
  place: { fontSize: fonts.sizes.sm, fontWeight: '700', lineHeight: 18, marginBottom: 6, color: '#fff' },
  placeSub: { fontSize: fonts.sizes.sm, fontWeight: '600', lineHeight: 18, color: 'rgba(255,255,255,0.65)' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.2)', marginHorizontal: 2 },
});

function NewsCard({ item, theme, onPress }) {
  const COMMUNITY_COLORS = {
    India: ['#FF6B6B','#E84393'],
    Pakistan: ['#00C48C','#007A5E'],
    Nepal: ['#0099FF','#0055CC'],
    Arab: ['#F4A833','#E68A00'],
    Local: ['#9B59B6','#6C3483'],
  };
  const cat = item.category || 'Local';
  const g = COMMUNITY_COLORS[cat] || COMMUNITY_COLORS.Local;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[nStyles.card, { backgroundColor: theme.card, ...shadows.small }]}>
      <View style={nStyles.catRow}>
        <LinearGradient colors={g} style={nStyles.catChip}><Text style={nStyles.catText}>{cat}</Text></LinearGradient>
        <Text style={[nStyles.time, { color: theme.textLight }]}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
        </Text>
      </View>
      <Text style={[nStyles.title, { color: theme.textPrimary }]} numberOfLines={2}>{item.title}</Text>
      {item.excerpt || item.content ? (
        <Text style={[nStyles.excerpt, { color: theme.textSecondary }]} numberOfLines={2}>{item.excerpt || item.content}</Text>
      ) : null}
    </TouchableOpacity>
  );
}
const nStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: 14, marginBottom: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  catChip: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  catText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  time: { fontSize: 11 },
  title: { fontSize: fonts.sizes.md, fontWeight: '700', lineHeight: 21, marginBottom: 4 },
  excerpt: { fontSize: fonts.sizes.sm, lineHeight: 19 },
});

function PointsCard({ points, name, theme }) {
  const level = points >= 1000 ? 'Diamond' : points >= 500 ? 'Gold' : points >= 200 ? 'Silver' : 'Bronze';
  const nextLevel = points >= 1000 ? 1000 : points >= 500 ? 1000 : points >= 200 ? 500 : 200;
  const progress = Math.min((points / nextLevel) * 100, 100);
  const levelGradient = { Diamond: ['#00C48C','#0099FF'], Gold: ['#F4A833','#FF6B6B'], Silver: ['#9B59B6','#6C3483'], Bronze: ['#FF6B6B','#E84393'] };
  const g = levelGradient[level];
  return (
    <LinearGradient colors={['#2D1B69','#4A2D9C']} style={pcStyles.card} start={{x:0,y:0}} end={{x:1,y:1}}>
      <View style={pcStyles.top}>
        <View>
          <Text style={pcStyles.label}>Your Reputation</Text>
          <LinearGradient colors={g} style={pcStyles.badge}><Text style={pcStyles.badgeText}>{level} Member</Text></LinearGradient>
        </View>
        <View style={pcStyles.pointsWrap}>
          <Text style={pcStyles.pointsNum}>{points}</Text>
          <Text style={pcStyles.pointsUnit}>pts</Text>
        </View>
      </View>
      <View style={pcStyles.barBg}>
        <Animated.View style={[pcStyles.barFill, { width: `${progress}%` }]}>
          <LinearGradient colors={g} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:0}} />
        </Animated.View>
      </View>
      <Text style={pcStyles.progressLabel}>{nextLevel - points} pts to {level === 'Bronze' ? 'Silver' : level === 'Silver' ? 'Gold' : level === 'Gold' ? 'Diamond' : 'Max'}</Text>
    </LinearGradient>
  );
}
const pcStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, padding: 20, marginHorizontal: spacing.md, marginBottom: 8, ...shadows.large },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: fonts.sizes.xs, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pointsWrap: { alignItems: 'flex-end' },
  pointsNum: { color: '#F4A833', fontSize: fonts.sizes.xxxl, fontWeight: '800', lineHeight: 36 },
  pointsUnit: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.sm },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.4)', fontSize: fonts.sizes.xs },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const user = useAppStore((state) => state.user);
  const profileName = useAppStore((state) => state.profileName);
  const profilePoints = useAppStore((state) => state.profilePoints);
  const setProfileName = useAppStore((state) => state.setProfileName);
  const setProfileEmail = useAppStore((state) => state.setProfileEmail);
  const setProfilePoints = useAppStore((state) => state.setProfilePoints);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState([]);
  const [rides, setRides] = useState([]);
  const [news, setNews] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchData();
    const unsubscribe = navigation.addListener('focus', fetchData);
    const channel = supabase
      .channel(`points-${user?.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'point_transactions', filter: `user_id=eq.${user?.id}` },
        (payload) => {
          const earned = payload.new?.points || 0;
          setProfilePoints((useAppStore.getState().profilePoints ?? 0) + earned);
        }
      ).subscribe();
    return () => { unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [listingsRes, ridesRes, newsRes, profileRes, membersRes] = await Promise.all([
        supabase.from('listings').select('*').eq('status', 'active').neq('category', 'jobs')
          .order('is_boosted', { ascending: false }).order('created_at', { ascending: false }).limit(6),
        supabase.from('rides').select('*').eq('status', 'active')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('news').select('*')
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('profiles').select('username, points').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('full_name').order('created_at', { ascending: false }).limit(8),
      ]);

      if (listingsRes.data) setListings(listingsRes.data);
      if (ridesRes.data) setRides(ridesRes.data);
      if (newsRes.data) setNews(newsRes.data);
      if (membersRes.data) {
        const names = membersRes.data.map(m => m.full_name).filter(Boolean);
        setMembers(names);
      }
      if (profileRes.data) {
        const raw = profileRes.data.username || '';
        const display = raw.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        setProfileName(display);
        setProfileEmail(user?.email || '');
        setProfilePoints(profileRes.data.points ?? 0);
      }
    } catch (err) {
      console.error('HomeScreen fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* ── Sticky Header ───────────────────────────────────────────── */}
      <LinearGradient
        colors={['#2D1B69', '#1A0F3D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Decorative orb */}
        <View pointerEvents="none" style={styles.headerOrb} />

        {/* Top bar: greeting left, logo center, avatar right */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Greeting name={profileName} />
            <PointsPill points={profilePoints} />
          </View>

          {/* Center logo */}
          <View style={styles.logoWrap} pointerEvents="none">
            <LinearGradient colors={['#F4A833','#FF6B6B']} style={styles.logoBubble} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Ionicons name="leaf" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.logoText}>nest</Text>
          </View>

          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <AvatarButton name={profileName} onPress={() => navigation.navigate('Settings')} />
          </View>
        </View>

      </LinearGradient>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F4A833" colors={['#F4A833']} />
        }
      >

        {/* Quick Actions */}
        <View style={[styles.section, { paddingTop: 20 }]}>
          <SectionHeader title="Quick Actions" theme={theme} />
          <View style={styles.quickRow}>
            {QUICK_ACTIONS.map((qa) => (
              <QuickActionBtn
                key={qa.screen}
                item={qa}
                onPress={() => navigation.navigate(qa.screen)}
              />
            ))}
          </View>
        </View>

        {/* Browse by Category */}
        <View style={styles.section}>
          <SectionHeader title="Browse Categories" theme={theme} onSeeAll={() => navigation.navigate('Classifieds')} />
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catCard, { backgroundColor: theme.card, ...shadows.small }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('BrowseListingsByCategory', { category: cat.key }); }}
                activeOpacity={0.82}
              >
                <LinearGradient colors={cat.gradient} style={styles.catIcon}>
                  <Ionicons name={cat.icon} size={22} color="#fff" />
                </LinearGradient>
                <Text style={[styles.catLabel, { color: theme.textPrimary }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Listings */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <SectionHeader title="Featured Listings" theme={theme} onSeeAll={() => navigation.navigate('Classifieds')} />
          </View>
          {loading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
              {[0,1,2].map(i => <View key={i} style={{ width: CARD_W, marginRight: 14 }}><CardSkeleton /></View>)}
            </ScrollView>
          ) : listings.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              <EmptyState type="listings" title="No listings yet" body="Be the first to post something!" ctaLabel="Post a Listing" onCta={() => navigation.navigate('PostListing')} />
            </View>
          ) : (
            <FlatList
              horizontal
              data={listings}
              keyExtractor={i => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
              renderItem={({ item }) => (
                <ListingCard item={item} theme={theme} onPress={() => navigation.navigate('ListingDetail', { listing: item })} />
              )}
            />
          )}
        </View>

        {/* Nearby Rides */}
        {rides.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: 0 }]}>
            <View style={{ paddingHorizontal: spacing.md }}>
              <SectionHeader title="Hot Rides" theme={theme} onSeeAll={() => navigation.navigate('Carpool')} />
            </View>
            <FlatList
              horizontal
              data={rides}
              keyExtractor={i => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
              renderItem={({ item }) => (
                <RideCard item={item} theme={theme} onPress={() => navigation.navigate('Carpool', { screen: 'RideDetail', params: { ride: item } })} />
              )}
            />
          </View>
        )}

        {/* Points / Reputation */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
          <View style={{ paddingHorizontal: spacing.md, marginBottom: 14 }}>
            <Text style={[sectionStyles.title, { color: theme.textPrimary }]}>Your Reputation</Text>
          </View>
          <PointsCard points={profilePoints} name={profileName} theme={theme} />
        </View>

        {/* Community Members */}
        {members.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Community Members" theme={theme} />
            <View style={[styles.membersCard, { backgroundColor: theme.card, ...shadows.small }]}>
              <AvatarStack names={members} max={6} size={40} overlap={12} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.membersCount, { color: theme.textPrimary }]}>
                  {members.length}+ neighbors
                </Text>
                <Text style={[styles.membersSub, { color: theme.textSecondary }]}>
                  Indians · Pakistanis · Nepalese · Arabs
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Community Pulse / News */}
        {news.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Community Pulse" theme={theme} onSeeAll={() => navigation.navigate('News')} />
            {news.map(item => (
              <NewsCard
                key={item.id}
                item={item}
                theme={theme}
                onPress={() => navigation.navigate('News', { screen: 'NewsDetail', params: { article: item } })}
              />
            ))}
          </View>
        )}

        {/* Community banner */}
        <View style={{ paddingHorizontal: spacing.md, marginTop: 4 }}>
          <LinearGradient colors={['#2D1B69', '#4A2D9C']} style={styles.banner} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={styles.bannerOrb} />
            <View style={styles.bannerIconWrap}><Ionicons name="people" size={28} color="rgba(255,255,255,0.9)" /></View>
            <Text style={styles.bannerTitle}>Stronger Together</Text>
            <Text style={styles.bannerBody}>
              Every post, every ride shared, every connection made builds a stronger community.
            </Text>
          </LinearGradient>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: spacing.md, paddingBottom: 16 },
  headerOrb: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#F4A833', opacity: 0.06 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoWrap: { alignItems: 'center', gap: 3 },
  logoBubble: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  // Sections
  section: { paddingHorizontal: spacing.md, marginBottom: 8, paddingTop: 16 },

  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },

  // Categories
  catGrid: { flexDirection: 'row', gap: 10 },
  catCard: { flex: 1, borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', gap: 10 },
  catIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Members
  membersCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 16 },
  membersCount: { fontSize: fonts.sizes.md, fontWeight: '800' },
  membersSub: { fontSize: fonts.sizes.xs, marginTop: 2 },

  // Banner
  banner: { borderRadius: borderRadius.xl, padding: 24, marginBottom: 8, overflow: 'hidden', alignItems: 'center' },
  bannerOrb: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: '#F4A833', opacity: 0.08 },
  bannerIconWrap: { marginBottom: 8 },
  bannerTitle: { color: '#fff', fontSize: fonts.sizes.xl, fontWeight: '800', marginBottom: 6 },
  bannerBody: { color: 'rgba(255,255,255,0.55)', fontSize: fonts.sizes.sm, textAlign: 'center', lineHeight: 20 },
});
