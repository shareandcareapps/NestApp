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
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';
  return (
    <View>
      <Text style={headerStyles.greetSmall}>{emoji}  {greet}</Text>
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
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  text: { color: '#fff', fontSize: 14, fontWeight: '800' },
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
        <LinearGradient colors={item.gradient} style={qStyles.btn} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Ionicons name={item.icon} size={22} color="#fff" />
        </LinearGradient>
        <Text style={qStyles.label}>{item.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
const qStyles = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  btn: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...shadows.medium },
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
        {meta?.location ? <Text style={[lcStyles.location, { color: theme.textSecondary }]} numberOfLines={1}>📍 {meta.location}</Text> : null}
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
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[rStyles.card, { backgroundColor: theme.card, ...shadows.medium }]}>
      <LinearGradient colors={['#00C48C22','#00C48C08']} style={rStyles.gradient}>
        <View style={rStyles.routeRow}>
          <View style={rStyles.routePoint}>
            <View style={[rStyles.dot, { backgroundColor: '#00C48C' }]} />
            <Text style={[rStyles.place, { color: theme.textPrimary }]} numberOfLines={1}>{item.from_city || 'From'}</Text>
          </View>
          <View style={rStyles.routeLine}>
            {[0,1,2,3,4].map(i => <View key={i} style={rStyles.dash} />)}
            <Ionicons name="car" size={16} color="#00C48C" />
          </View>
          <View style={rStyles.routePoint}>
            <View style={[rStyles.dot, { backgroundColor: '#F4A833' }]} />
            <Text style={[rStyles.place, { color: theme.textPrimary }]} numberOfLines={1}>{item.to_city || 'To'}</Text>
          </View>
        </View>
        <View style={rStyles.meta}>
          <View style={rStyles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
            <Text style={[rStyles.metaText, { color: theme.textSecondary }]}>
              {item.departure_time ? new Date(item.departure_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
            </Text>
          </View>
          <View style={rStyles.metaItem}>
            <Ionicons name="people-outline" size={13} color={theme.textSecondary} />
            <Text style={[rStyles.metaText, { color: theme.textSecondary }]}>{item.seats_available ?? '?'} seats</Text>
          </View>
          {item.price_per_seat && (
            <View style={rStyles.priceBadge}>
              <Text style={rStyles.priceText}>${item.price_per_seat}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
const rStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, marginRight: 14, width: width * 0.72, overflow: 'hidden', ...shadows.medium },
  gradient: { padding: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  routePoint: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  place: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  routeLine: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dash: { width: 4, height: 2, backgroundColor: '#00C48C', borderRadius: 1, opacity: 0.5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11 },
  priceBadge: { marginLeft: 'auto', backgroundColor: '#00C48C22', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  priceText: { color: '#00C48C', fontSize: 12, fontWeight: '800' },
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

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Greeting name={profileName} />
            <PointsPill points={profilePoints} />
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <AvatarButton name={profileName} onPress={() => navigation.navigate('Settings')} />
          </View>
        </View>

        {/* City badge */}
        <TouchableOpacity style={styles.cityBadge}>
          <Ionicons name="location" size={13} color="#F4A833" />
          <Text style={styles.cityText}>St. Louis, MO</Text>
          <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
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
              <SectionHeader title="Nearby Rides" theme={theme} onSeeAll={() => navigation.navigate('Carpool')} />
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
            <Text style={styles.bannerEmoji}>🤝</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B', borderWidth: 1.5, borderColor: '#2D1B69' },
  cityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(244,168,51,0.12)', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(244,168,51,0.2)' },
  cityText: { color: '#fff', fontSize: fonts.sizes.xs, fontWeight: '700', letterSpacing: 0.3 },

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
  bannerEmoji: { fontSize: 32, marginBottom: 8 },
  bannerTitle: { color: '#fff', fontSize: fonts.sizes.xl, fontWeight: '800', marginBottom: 6 },
  bannerBody: { color: 'rgba(255,255,255,0.55)', fontSize: fonts.sizes.sm, textAlign: 'center', lineHeight: 20 },
});
