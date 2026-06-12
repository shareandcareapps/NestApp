// core/screens/HomeScreen.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image, Animated, Dimensions, FlatList, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { chromeAnim, hideChrome, showChrome } from '../utils/chromeAnim';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.62;

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'accommodation', label: 'Housing',  icon: 'business-outline',    color: '#FF6B6B', gradient: ['#FF6B6B', '#E84393'] },
  { key: 'jobs',          label: 'Jobs',      icon: 'briefcase-outline',   color: '#00C48C', gradient: ['#00C48C', '#007A5E'] },
  { key: 'buysell',       label: 'Buy/Sell',  icon: 'pricetag-outline',    color: '#4DA6FF', gradient: ['#0099FF', '#0055CC'] },
  { key: 'food',          label: 'Food',      icon: 'restaurant-outline',  color: '#F4A833', gradient: ['#F4A833', '#E68A00'] },
  { key: 'events',        label: 'Events',    icon: 'calendar-outline',    color: '#9B59B6', gradient: ['#9B59B6', '#6C3483'] },
];

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Post Listing', icon: 'storefront-outline',  color: '#FF6B6B', screen: 'PostListing' },
  { label: 'Share Ride',   icon: 'car-outline',          color: '#00C48C', screen: 'PostRide' },
  { label: 'My Rides',     icon: 'calendar-outline',     color: '#4DA6FF', screen: '__MyRides' },
  { label: 'Message',      icon: 'chatbubble-outline',   color: '#C084FC', screen: 'Messages' },
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

const qStyles = StyleSheet.create({
  wrap: { flex: 1 },
  card: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 20,
    gap: 10,
  },
  iconBubble: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  label: { fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.1 },
});

function QuickActionBtn({ item, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const fillColor   = item.color + '18'; // ~9% opacity fill
  const borderColor = item.color + '40'; // ~25% opacity border
  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={1}
      style={qStyles.wrap}
    >
      <Animated.View style={[qStyles.card, { transform: [{ scale }] }]}>
        {/* Coloured icon bubble */}
        <View style={[qStyles.iconBubble, { backgroundColor: fillColor, borderColor }]}>
          <Ionicons name={item.icon} size={26} color={item.color} />
        </View>
        <Text style={[qStyles.label, { color: item.color }]}>{item.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

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

function EventCard({ item, theme, onPress }) {
  const meta = item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : {};
  const rawDate = meta.event_date || '';
  const photo = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
  const isFree = meta.is_free || item.price === 0 || !item.price;

  // Parse date for the badge
  let month = '', day = '';
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      day   = d.getDate().toString();
    } else {
      // Try to extract from strings like "December 25, 2025"
      const parts = rawDate.split(/[\s,]+/);
      if (parts.length >= 2) { month = parts[0].slice(0,3).toUpperCase(); day = parts[1]; }
    }
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[evStyles.card, { backgroundColor: theme.card, ...shadows.medium }]}>
      {/* Top image / gradient banner */}
      <View style={evStyles.banner}>
        {photo
          ? <Image source={{ uri: photo }} style={evStyles.bannerImg} />
          : <LinearGradient colors={['#9B59B6','#6C3483']} style={evStyles.bannerGrad}>
              <Ionicons name="calendar" size={28} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
        }
        <LinearGradient colors={['transparent','rgba(0,0,0,0.55)']} style={evStyles.bannerOverlay} />
        {/* Date badge */}
        {(month || day) && (
          <View style={evStyles.dateBadge}>
            <LinearGradient colors={['#9B59B6','#6C3483']} style={evStyles.dateBadgeInner} start={{x:0,y:0}} end={{x:0,y:1}}>
              <Text style={evStyles.dateMonth}>{month}</Text>
              <Text style={evStyles.dateDay}>{day}</Text>
            </LinearGradient>
          </View>
        )}
        {/* Ticket badge */}
        <View style={[evStyles.ticketBadge, { backgroundColor: isFree ? '#00C48C' : '#F4A833' }]}>
          <Text style={evStyles.ticketTxt}>{isFree ? 'FREE' : `$${item.price}`}</Text>
        </View>
      </View>
      {/* Body */}
      <View style={evStyles.body}>
        <Text style={[evStyles.title, { color: theme.textPrimary }]} numberOfLines={2}>{item.title}</Text>
        {meta.venue ? (
          <View style={evStyles.venueRow}>
            <Ionicons name="location-outline" size={12} color={theme.textLight} />
            <Text style={[evStyles.venue, { color: theme.textSecondary }]} numberOfLines={1}>{meta.venue}</Text>
          </View>
        ) : null}
        {meta.event_time ? (
          <View style={evStyles.venueRow}>
            <Ionicons name="time-outline" size={12} color={theme.textLight} />
            <Text style={[evStyles.venue, { color: theme.textSecondary }]}>{meta.event_time}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
const evStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, overflow: 'hidden', marginRight: 14, width: width * 0.64 },
  banner: { position: 'relative', height: 130 },
  bannerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  dateBadge: { position: 'absolute', top: 10, left: 10, borderRadius: 10, overflow: 'hidden' },
  dateBadgeInner: { paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 42 },
  dateMonth: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  dateDay:   { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  ticketBadge: { position: 'absolute', top: 10, right: 10, borderRadius: borderRadius.full, paddingHorizontal: 9, paddingVertical: 4 },
  ticketTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  body: { padding: 12 },
  title: { fontSize: fonts.sizes.sm, fontWeight: '700', lineHeight: 18, marginBottom: 6 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  venue: { fontSize: 11, flex: 1 },
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
  const [myRides, setMyRides] = useState([]);
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const myRidesRef = useRef(null);
  const scrollRef  = useRef(null);

  // ── Scroll-driven chrome (header + tab bar) hide/show ──────────────────────
  const lastScrollY   = useRef(0);
  const chromeVisible = useRef(true);
  const headerAnim    = useRef(new Animated.Value(1)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const HEADER_SPRING = { tension: 300, friction: 32, useNativeDriver: true };

  const onScroll = useCallback((e) => {
    const y    = e.nativeEvent.contentOffset.y;
    const diff = y - lastScrollY.current;
    lastScrollY.current = y;

    // Hide: scrolling down more than 8px and past 80px from top
    if (diff > 8 && y > 80 && chromeVisible.current) {
      chromeVisible.current = false;
      Animated.spring(headerAnim, { toValue: 0, ...HEADER_SPRING }).start();
      hideChrome();
    // Show: scrolling up more than 8px, or back near top
    } else if ((diff < -8 || y < 40) && !chromeVisible.current) {
      chromeVisible.current = true;
      Animated.spring(headerAnim, { toValue: 1, ...HEADER_SPRING }).start();
      showChrome();
    }
  }, []);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchData();
    const restoreChrome = () => {
      chromeVisible.current = true;
      lastScrollY.current   = 0;
      Animated.spring(headerAnim, { toValue: 1, tension: 300, friction: 32, useNativeDriver: true }).start();
      showChrome();
    };

    const unsubscribe  = navigation.addListener('focus', () => { fetchData(); restoreChrome(); });
    const unsubscribe2 = navigation.addListener('blur',  restoreChrome);
    const channel = supabase
      .channel(`points-${user?.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'point_transactions', filter: `user_id=eq.${user?.id}` },
        (payload) => {
          const earned = payload.new?.points || 0;
          setProfilePoints((useAppStore.getState().profilePoints ?? 0) + earned);
        }
      ).subscribe();
    return () => { unsubscribe(); unsubscribe2(); supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [listingsRes, ridesRes, eventsRes, profileRes, membersRes, myRidesRes, myBookingsRes] = await Promise.all([
        supabase.from('listings').select('*').eq('status', 'active').neq('category', 'jobs').neq('category', 'events')
          .order('is_boosted', { ascending: false }).order('created_at', { ascending: false }).limit(6),
        supabase.from('rides').select('*').eq('status', 'active')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('listings').select('*').eq('status', 'active').eq('category', 'events')
          .order('created_at', { ascending: false }).limit(6),
        supabase.from('profiles').select('username, points').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('full_name').order('created_at', { ascending: false }).limit(8),
        // Rides posted by the user
        supabase.from('rides').select('*')
          .or(`driver_id.eq.${user.id},requester_id.eq.${user.id}`)
          .order('ride_date', { ascending: true }).limit(10),
        // Rides the user booked (as a rider)
        supabase.from('ride_bookings').select('ride_id, status')
          .eq('rider_id', user.id).neq('status', 'cancelled').limit(10),
      ]);

      if (listingsRes.data) setListings(listingsRes.data);
      if (ridesRes.data) setRides(ridesRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);

      // Merge posted rides + booked rides (deduped)
      const postedRides = myRidesRes.data || [];
      const bookedRideIds = (myBookingsRes.data || []).map(b => b.ride_id);
      let bookedRides = [];
      if (bookedRideIds.length > 0) {
        const { data: br } = await supabase.from('rides').select('*').in('id', bookedRideIds);
        bookedRides = br || [];
      }
      const postedIds = new Set(postedRides.map(r => r.id));
      const allMyRides = [...postedRides, ...bookedRides.filter(r => !postedIds.has(r.id))];
      allMyRides.sort((a, b) => new Date(a.ride_date) - new Date(b.ride_date));
      setMyRides(allMyRides);
      // if (newsRes.data) setNews(newsRes.data); // News removed
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

  // Header translateY: slides fully off-screen upward by its own measured height
  const headerTranslateY = headerAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [-headerHeight || -120, 0],
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* ── Content — fills full screen, padded under header ────────── */}
      <ScrollView
        ref={scrollRef}
        style={StyleSheet.absoluteFill}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 120 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F4A833"
            colors={['#F4A833']}
            progressViewOffset={headerHeight}
          />
        }
      >

        {/* Quick Actions */}
        <View style={[styles.section, { paddingTop: 20 }]}>
          <SectionHeader title="Quick Actions" theme={theme} />
          <View style={[styles.quickRow, { backgroundColor: theme.card, borderRadius: 26, padding: 8, ...shadows.small, borderWidth: 1, borderColor: theme.borderLight }]}>
            {QUICK_ACTIONS.map((qa) => (
              <QuickActionBtn
                key={qa.screen}
                item={qa}
                onPress={() => {
                  if (qa.screen === '__MyRides') {
                    myRidesRef.current?.measure((x, y, w, h, px, py) => {
                      scrollRef.current?.scrollTo({ y: py - headerHeight, animated: true });
                    });
                  } else {
                    navigation.navigate(qa.screen);
                  }
                }}
              />
            ))}
          </View>
        </View>

        {/* My Rides */}
        {myRides.length > 0 && (
          <View ref={myRidesRef} style={[styles.section, { paddingHorizontal: 0 }]}>
            <View style={{ paddingHorizontal: spacing.md }}>
              <SectionHeader title="My Rides" theme={theme} onSeeAll={() => navigation.navigate('Carpool')} />
            </View>
            <FlatList
              horizontal
              data={myRides}
              keyExtractor={i => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
              renderItem={({ item }) => (
                <RideCard
                  item={item}
                  theme={theme}
                  onPress={() => navigation.navigate('Carpool', { screen: 'RideDetail', params: { ride: item } })}
                />
              )}
            />
          </View>
        )}

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
                <View style={[styles.catIcon, { backgroundColor: cat.color + '18', borderColor: cat.color + '40' }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text style={[styles.catLabel, { color: theme.textPrimary }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Events */}
        {(events.length > 0 || loading) && (
          <View style={[styles.section, { paddingHorizontal: 0 }]}>
            <View style={{ paddingHorizontal: spacing.md }}>
              <SectionHeader
                title="Upcoming Events"
                theme={theme}
                onSeeAll={() => navigation.navigate('BrowseListingsByCategory', { category: 'events' })}
              />
            </View>
            {loading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
                {[0,1,2].map(i => <View key={i} style={{ width: width * 0.64, marginRight: 14 }}><CardSkeleton /></View>)}
              </ScrollView>
            ) : (
              <FlatList
                horizontal
                data={events}
                keyExtractor={i => i.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.md }}
                renderItem={({ item }) => (
                  <EventCard
                    item={item}
                    theme={theme}
                    onPress={() => navigation.navigate('ListingDetail', { listing: item })}
                  />
                )}
                ListEmptyComponent={
                  <View style={{ paddingHorizontal: spacing.md }}>
                    <EmptyState type="listings" title="No events yet" body="Be the first to post a community event!" ctaLabel="Post Event" onCta={() => navigation.navigate('PostListing', { preselectedCategory: 'events' })} />
                  </View>
                }
              />
            )}
          </View>
        )}

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

        {/* Community Pulse / News — temporarily removed */}
        {/* {news.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Community Pulse" theme={theme} onSeeAll={() => navigation.navigate('News')} />
            {news.map(item => (
              <NewsCard key={item.id} item={item} theme={theme}
                onPress={() => navigation.navigate('News', { screen: 'NewsDetail', params: { article: item } })} />
            ))}
          </View>
        )} */}

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

      {/* ── Header — absolutely overlaid so hiding it leaves no gap ─── */}
      <Animated.View
        style={[styles.headerAbsolute, { opacity: headerAnim, transform: [{ translateY: headerTranslateY }] }]}
        onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
        pointerEvents={chromeVisible.current ? 'box-none' : 'none'}
      >
        <LinearGradient
          colors={['#2D1B69', '#1A0F3D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <View pointerEvents="none" style={styles.headerOrb} />
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.headerSpecular}
            pointerEvents="none"
          />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Greeting name={profileName} />
              <PointsPill points={profilePoints} />
            </View>
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
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header — absolute so hiding it never leaves a layout gap
  headerAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 18 },
  headerOrb: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#F4A833', opacity: 0.06 },
  headerSpecular: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoWrap: { alignItems: 'center', gap: 3 },
  logoBubble: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  // Sections
  section: { paddingHorizontal: spacing.md, marginBottom: 8, paddingTop: 16 },

  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },

  // Categories
  catGrid: { flexDirection: 'row', gap: 10 },
  catCard: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  catIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
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
