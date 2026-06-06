// features/rides/screens/BrowseRidesScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Image,
  ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { getRides } from '../services/ridesService';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatDisplayName } from '../../../core/components/UserProfileModal';
import { decodeLongRideNotes } from '../utils/longRideUtils';
import EmptyState from '../../../core/components/EmptyState';
import SkeletonLoader from '../../../core/components/SkeletonLoader';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const OFFER_COLOR    = '#00C48C';
const REQUEST_COLOR  = '#9B59B6';
const LONGRIDE_COLOR = '#F4A833';
const AVATAR_COLORS  = ['#FF6B6B','#2D1B69','#00C48C','#0099FF','#9B59B6','#F4A833'];

const CATEGORIES = [
  { id: null,         label: 'All',        icon: 'apps-outline' },
  { id: 'airport',    label: 'Airport',    icon: 'airplane-outline' },
  { id: 'university', label: 'University', icon: 'school-outline' },
  { id: 'temple',     label: 'Religious',  icon: 'leaf-outline' },
  { id: 'general',    label: 'General',    icon: 'car-outline' },
  { id: 'longride',   label: 'Long Ride',  icon: 'map-outline' },
];

const UNIVERSITIES = [
  { id: 'webster', label: 'Webster', color: '#8E44AD', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://webster.edu&size=128' } },
  { id: 'slu',     label: 'SLU',     color: '#C0392B', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slu.edu&size=128' } },
  { id: 'umsl',    label: 'UMSL',    color: '#C8102E', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://umsl.edu&size=128' } },
  { id: 'washu',   label: 'Wash U',  color: '#117A65', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wustl.edu&size=128' } },
];

// ─── Ride Card ────────────────────────────────────────────────────────────────
function RideCard({ item, onPress, theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const rideDate   = new Date(item.ride_date);
  const now        = new Date();
  const isToday    = now.toDateString() === rideDate.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === rideDate.toDateString();
  const isRequest  = item.ride_type === 'request';
  const isLongRide = item.category === 'longride';
  const accent     = isRequest ? REQUEST_COLOR : (isLongRide ? LONGRIDE_COLOR : OFFER_COLOR);

  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
    : rideDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = item.any_time ? 'Anytime' : rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const catIcons = { airport: 'airplane-outline', temple: 'leaf-outline', general: 'car-outline', longride: 'map-outline' };
  const uniData  = item.category === 'university' ? UNIVERSITIES.find(u => u.id === item.university) : null;
  const posterName  = formatDisplayName(item.poster?.username);
  const posterColor = AVATAR_COLORS[posterName.charCodeAt(0) % AVATAR_COLORS.length];
  const showRating  = !isRequest && (item.poster?.driver_rating_count ?? 0) >= 5;
  const longInfo    = isLongRide ? decodeLongRideNotes(item.notes) : null;

  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(item); }}
      activeOpacity={1}
    >
      <Animated.View style={[cStyles.card, { backgroundColor: theme.card, transform: [{ scale }] }, shadows.small]}>
        {/* Accent bar */}
        <LinearGradient colors={isRequest ? [REQUEST_COLOR, '#7B2FBE'] : isLongRide ? [LONGRIDE_COLOR,'#E68A00'] : [OFFER_COLOR,'#007A5E']} style={cStyles.accentBar} start={{x:0,y:0}} end={{x:1,y:0}} />

        {/* Header row */}
        <View style={cStyles.headerRow}>
          <View style={cStyles.posterRow}>
            <LinearGradient colors={[posterColor, posterColor + 'BB']} style={cStyles.avatar}>
              <Text style={cStyles.avatarTxt}>{posterName.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[cStyles.posterName, { color: theme.textPrimary }]} numberOfLines={1}>{posterName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {uniData
                  ? <Image source={uniData.logo} style={cStyles.uniLogo} resizeMode="contain" />
                  : <Ionicons name={catIcons[item.category] || 'car-outline'} size={11} color={theme.textLight} />
                }
                {showRating && <Text style={[cStyles.ratingTxt, { color: theme.textLight }]}>⭐ {item.poster.driver_rating?.toFixed(1)}</Text>}
              </View>
            </View>
          </View>
          <View style={[cStyles.typeBadge, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
            <Ionicons name={isRequest ? 'hand-left-outline' : 'car-sport-outline'} size={11} color={accent} />
            <Text style={[cStyles.typeBadgeTxt, { color: accent }]}>{isRequest ? 'Need Seat' : 'Offering'}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={cStyles.routeBlock}>
          <View style={cStyles.routeTrack}>
            <View style={[cStyles.dotFilled, { backgroundColor: accent }]} />
            {[0,1,2,3].map(i => <View key={i} style={[cStyles.dashSeg, { backgroundColor: accent + '40' }]} />)}
            <View style={[cStyles.dotRing, { borderColor: accent }]} />
          </View>
          <View style={cStyles.routeLabels}>
            <Text style={[cStyles.locTxt, { color: theme.textPrimary }]} numberOfLines={1}>{item.from_location}</Text>
            <View style={{ height: 10 }} />
            <Text style={[cStyles.locTxt, { color: theme.textPrimary }]} numberOfLines={1}>{item.to_location}</Text>
          </View>
        </View>

        {/* Long ride stops */}
        {longInfo?.stops ? (
          <View style={[cStyles.stopsBadge, { backgroundColor: LONGRIDE_COLOR + '12', borderColor: LONGRIDE_COLOR + '30' }]}>
            <Ionicons name="location-outline" size={12} color={LONGRIDE_COLOR} />
            <Text style={[cStyles.stopsTxt, { color: LONGRIDE_COLOR }]} numberOfLines={1}>via {longInfo.stops}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={cStyles.footer}>
          <View style={[cStyles.metaPill, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name="calendar-outline" size={12} color={accent} />
            <Text style={[cStyles.metaTxt, { color: theme.textSecondary }]}>{dateLabel}</Text>
          </View>
          {!item.any_time && (
            <View style={[cStyles.metaPill, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="time-outline" size={12} color={accent} />
              <Text style={[cStyles.metaTxt, { color: theme.textSecondary }]}>{timeLabel}</Text>
            </View>
          )}
          {item.any_time && (
            <View style={[cStyles.metaPill, { backgroundColor: accent + '15' }]}>
              <Ionicons name="shuffle-outline" size={12} color={accent} />
              <Text style={[cStyles.metaTxt, { color: accent }]}>Flexible Time</Text>
            </View>
          )}
          <View style={[cStyles.metaPill, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name={isRequest ? 'people-outline' : 'car-sport-outline'} size={12} color={accent} />
            <Text style={[cStyles.metaTxt, { color: theme.textSecondary }]}>
              {item.seats_available} {isRequest ? 'need' : 'seat'}{item.seats_available !== 1 ? 's' : ''}
            </Text>
          </View>
          {longInfo?.returnDate && (
            <View style={[cStyles.metaPill, { backgroundColor: LONGRIDE_COLOR + '15' }]}>
              <Ionicons name="repeat-outline" size={12} color={LONGRIDE_COLOR} />
              <Text style={[cStyles.metaTxt, { color: LONGRIDE_COLOR }]}>Round trip</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const cStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, marginHorizontal: spacing.md, marginBottom: 12, overflow: 'hidden' },
  accentBar: { height: 3 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10 },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800' },
  posterName: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  uniLogo: { width: 14, height: 14 },
  ratingTxt: { fontSize: 11 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  typeBadgeTxt: { fontSize: 11, fontWeight: '700' },

  routeBlock: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  routeTrack: { alignItems: 'center', gap: 3 },
  dotFilled: { width: 10, height: 10, borderRadius: 5 },
  dashSeg: { width: 2, height: 4, borderRadius: 1 },
  dotRing: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: 'transparent' },
  routeLabels: { flex: 1, gap: 0 },
  locTxt: { fontSize: fonts.sizes.md, fontWeight: '600' },

  stopsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 14, marginBottom: 8, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  stopsTxt: { fontSize: 11, fontWeight: '600', flex: 1 },

  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 14 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 4 },
  metaTxt: { fontSize: 11, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BrowseRidesScreen({ navigation }) {
  const theme  = useTheme();
  const insets = useSafeAreaInsets();
  const [rides, setRides]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState(null);
  const [search, setSearch]         = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  async function loadRides() {
    try {
      const data = await getRides({ category: filter });
      setRides(data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); setRefreshing(false); }
  }

  useFocusEffect(useCallback(() => { setLoading(true); loadRides(); }, [filter]));

  function onRefresh() { setRefreshing(true); loadRides(); }

  const displayed = search.trim()
    ? rides.filter(r =>
        r.from_location?.toLowerCase().includes(search.toLowerCase()) ||
        r.to_location?.toLowerCase().includes(search.toLowerCase())
      )
    : rides;

  const offers   = displayed.filter(r => r.ride_type === 'offer');
  const requests = displayed.filter(r => r.ride_type === 'request');

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>St. Louis, MO</Text>
            <Text style={styles.headerTitle}>Carpool 🚗</Text>
          </View>
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('PostRide'); }}
          >
            <LinearGradient colors={['#00C48C','#007A5E']} style={styles.postBtnInner} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.postBtnTxt}>Share Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { borderColor: searchFocused ? '#00C48C' : 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Ionicons name="search" size={16} color={searchFocused ? '#00C48C' : 'rgba(255,255,255,0.5)'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city or location..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}>
          {CATEGORIES.map(cat => {
            const isActive = filter === cat.id;
            return (
              <TouchableOpacity
                key={String(cat.id)}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(cat.id); }}
                style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              >
                <Ionicons name={cat.icon} size={14} color={isActive ? '#fff' : 'rgba(255,255,255,0.6)'} />
                <Text style={[styles.chipTxt, { color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Body */}
      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[0,1,2].map(i => <SkeletonLoader key={i} type="card" style={{ marginBottom: 12 }} />)}
        </View>
      ) : (
        <FlatList
          data={[...offers, ...requests]}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <RideCard item={item} theme={theme} onPress={r => navigation.navigate('RideDetail', { ride: r })} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C48C" />}
          ListHeaderComponent={
            displayed.length > 0 ? (
              <View style={styles.statsRow}>
                {offers.length > 0 && (
                  <View style={[styles.statPill, { backgroundColor: OFFER_COLOR + '18' }]}>
                    <Ionicons name="car-sport-outline" size={12} color={OFFER_COLOR} />
                    <Text style={[styles.statTxt, { color: OFFER_COLOR }]}>{offers.length} offering</Text>
                  </View>
                )}
                {requests.length > 0 && (
                  <View style={[styles.statPill, { backgroundColor: REQUEST_COLOR + '18' }]}>
                    <Ionicons name="hand-left-outline" size={12} color={REQUEST_COLOR} />
                    <Text style={[styles.statTxt, { color: REQUEST_COLOR }]}>{requests.length} requesting</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              type="rides"
              title="No rides yet"
              body={search ? 'No rides match your search.' : 'Be the first to share a ride in St. Louis!'}
              ctaLabel="Share a Ride"
              onCta={() => navigation.navigate('PostRide')}
            />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: fonts.sizes.xs, fontWeight: '600', letterSpacing: 0.5 },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800' },
  postBtn: { borderRadius: borderRadius.full, overflow: 'hidden', ...shadows.small },
  postBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  postBtnTxt: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '800' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: borderRadius.full, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: fonts.sizes.sm },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  chipInactive: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingBottom: 4 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  statTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
});
