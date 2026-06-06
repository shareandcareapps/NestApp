// features/rides/screens/BrowseRidesScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, SafeAreaView, TextInput,
  Image, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getRides } from '../services/ridesService';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDisplayName } from '../../../core/components/UserProfileModal';
import { decodeLongRideNotes } from '../utils/longRideUtils';

const AVATAR_COLORS = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];

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

const OFFER_ACCENT   = '#1ABC9C';
const REQUEST_ACCENT = '#9B59B6';
const LONGRIDE_ACCENT = '#E67E22';

function RideCard({ item, onPress, colors }) {
  const rideDate  = new Date(item.ride_date);
  const now       = new Date();
  const tomorrow  = new Date(now.getTime() + 86400000);
  const isToday   = now.toDateString()      === rideDate.toDateString();
  const isTomorrow = tomorrow.toDateString() === rideDate.toDateString();
  const isRequest   = item.ride_type === 'request';
  const isLongRide  = item.category === 'longride';
  const accent      = isRequest ? REQUEST_ACCENT : (isLongRide ? LONGRIDE_ACCENT : OFFER_ACCENT);
  const cardBg      = isRequest ? '#FAF5FF' : (isLongRide ? '#FFF8F0' : '#F0FFF9');
  const borderCol   = accent + '35';

  const dateLabel = isToday    ? 'Today'
    : isTomorrow  ? 'Tomorrow'
    : rideDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const categoryIcons = { airport: 'airplane-outline', temple: 'leaf-outline', general: 'car-outline', longride: 'map-outline' };
  const uniData    = item.category === 'university' ? UNIVERSITIES.find(u => u.id === item.university) : null;
  const posterName  = formatDisplayName(item.poster?.username);
  const posterColor = AVATAR_COLORS[posterName.charCodeAt(0) % AVATAR_COLORS.length];
  const showRating  = !isRequest && (item.poster?.driver_rating_count ?? 0) >= 5;

  // Long ride extras decoded from notes
  const longRideInfo = isLongRide ? decodeLongRideNotes(item.notes) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
      onPress={() => onPress(item)}
      activeOpacity={0.78}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.posterRow}>
          <View style={[styles.posterAvatar, { backgroundColor: posterColor }]}>
            <Text style={styles.posterAvatarText}>{posterName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.posterName, { color: colors.textPrimary }]} numberOfLines={1}>
              {posterName}
            </Text>
            <View style={styles.posterMeta}>
              {uniData ? (
                <Image source={uniData.logo} style={styles.uniLogo} resizeMode="contain" />
              ) : (
                <Ionicons name={categoryIcons[item.category] || 'car-outline'} size={12} color={colors.textLight} />
              )}
              {showRating && (
                <Text style={styles.ratingText}>⭐ {item.poster.driver_rating?.toFixed(1)}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: accent + '18', borderColor: accent + '35' }]}>
          <Ionicons
            name={isRequest ? 'hand-left-outline' : 'car-sport-outline'}
            size={11}
            color={accent}
          />
          <Text style={[styles.typeBadgeText, { color: accent }]}>
            {isRequest ? 'Need Seat' : 'Offering'}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeBlock}>
        <View style={styles.routeTrack}>
          <View style={[styles.dotFilled, { backgroundColor: accent }]} />
          <View style={[styles.routeLine, { backgroundColor: accent + '30' }]} />
          <View style={[styles.dotRing, { borderColor: accent }]} />
        </View>
        <View style={styles.routeLabels}>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.from_location}
          </Text>
          <View style={{ height: 12 }} />
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.to_location}
          </Text>
        </View>
      </View>

      {/* Long ride: stops row */}
      {isLongRide && longRideInfo?.stops && (
        <View style={styles.stopsRow}>
          <Ionicons name="ellipsis-horizontal" size={12} color={accent} style={{ marginTop: 1 }} />
          <Text style={[styles.stopsText, { color: accent }]} numberOfLines={1}>
            via {longRideInfo.stops}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.pillRow}>
        <Pill icon="calendar-outline" label={dateLabel} colors={colors} />
        <Pill icon="time-outline"     label={timeLabel} colors={colors} />
        {!isRequest && item.seats_available > 0 && (
          <Pill icon="people-outline" label={`${item.seats_available} seat${item.seats_available > 1 ? 's' : ''}`} colors={colors} />
        )}
        {isLongRide && longRideInfo?.returnDate && (
          <View style={[styles.pill, { backgroundColor: LONGRIDE_ACCENT + '15' }]}>
            <Ionicons name="refresh-outline" size={11} color={LONGRIDE_ACCENT} />
            <Text style={[styles.pillText, { color: LONGRIDE_ACCENT, fontWeight: '600' }]}>Return</Text>
          </View>
        )}
        <View style={[styles.pill, { backgroundColor: accent + '12' }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={11} color={accent} />
          <Text style={[styles.pillText, { color: accent, fontWeight: '600' }]}>Chat</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Pill({ icon, label, colors }) {
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceSecondary }]}>
      <Ionicons name={icon} size={11} color={colors.textLight} />
      <Text style={[styles.pillText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function BrowseRidesScreen({ navigation }) {
  const [rides,             setRides]             = useState([]);
  const [allRides,          setAllRides]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [selectedCategory,  setSelectedCategory]  = useState(null);
  const [selectedUniversity,setSelectedUniversity]= useState(null);
  const [airportDirection,  setAirportDirection]  = useState(null);
  const [activeTab,         setActiveTab]         = useState(null);
  const [sortBy,            setSortBy]            = useState('time');
  const [searchQuery,       setSearchQuery]       = useState('');
  const colors = useTheme();

  // Single fetch on focus; avoids double-fetch from useEffect + focus listener.
  useFocusEffect(
    useCallback(() => {
      fetchRides();
    }, [selectedCategory, selectedUniversity, airportDirection, activeTab])
  );

  async function fetchRides() {
    try {
      setLoading(true);
      let data = await getRides(selectedCategory, activeTab, selectedUniversity);
      if (airportDirection && selectedCategory === 'airport') {
        data = data.filter(r =>
          airportDirection === 'to'
            ? r.to_location?.toLowerCase().includes('airport') || r.to_location?.toLowerCase().includes('stl')
            : r.from_location?.toLowerCase().includes('airport') || r.from_location?.toLowerCase().includes('stl')
        );
      }
      setAllRides(data);
      applySearch(searchQuery, data);
    } catch (err) {
      console.error('fetchRides error:', err);
    } finally {
      setLoading(false);
    }
  }

  function applySearch(text, source = allRides) {
    const q = text.trim().toLowerCase();
    if (!q) { setRides(source); return; }
    setRides(source.filter(r =>
      r.from_location?.toLowerCase().includes(q) ||
      r.to_location?.toLowerCase().includes(q)
    ));
  }

  function handleSearch(text) {
    setSearchQuery(text);
    applySearch(text);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  }

  function getSortedRides() {
    return [...rides].sort((a, b) =>
      sortBy === 'time'
        ? new Date(a.ride_date)  - new Date(b.ride_date)
        : new Date(b.created_at) - new Date(a.created_at)
    );
  }

  function selectCategory(catId) {
    setSelectedCategory(catId);
    if (catId !== 'university') setSelectedUniversity(null);
    if (catId !== 'airport')    setAirportDirection(null);
  }

  const sorted = getSortedRides();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>Carpool</Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.cityPill}>
                <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cityPillText}>St. Louis, MO</Text>
              </View>
              {!loading && sorted.length > 0 && (
                <Text style={styles.headerSub}>
                  · {sorted.length} {sorted.length === 1 ? 'ride' : 'rides'}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.postFab}
            onPress={() => navigation.navigate('PostRide')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.postFabText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* ── Filters ── */}
      <View style={[styles.filterShell, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>

        {/* Row 1: Category icons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id ?? 'all'}
                style={[styles.catBtn, active && { backgroundColor: colors.secondary + '18' }]}
                onPress={() => selectCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={17}
                  color={active ? colors.secondary : colors.textLight}
                />
                <Text style={[styles.catLabel, { color: active ? colors.secondary : colors.textLight, fontWeight: active ? '700' : '500' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Row 2: Type + Sort chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {[
            { id: null,       label: 'All',      color: colors.secondary },
            { id: 'offers',   label: '🚗 Offering', color: OFFER_ACCENT },
            { id: 'requests', label: '🙋 Needed',   color: REQUEST_ACCENT },
          ].map((f) => {
            const active = activeTab === f.id;
            return (
              <TouchableOpacity
                key={f.id ?? 'all'}
                style={[styles.chip, {
                  backgroundColor: active ? f.color + '18' : 'transparent',
                  borderColor: active ? f.color : colors.border,
                }]}
                onPress={() => setActiveTab(f.id)}
              >
                <Text style={[styles.chipText, { color: active ? f.color : colors.textLight, fontWeight: active ? '700' : '500' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {[
            { id: 'time',   label: 'By Time',   icon: 'calendar-outline' },
            { id: 'recent', label: 'Newest',     icon: 'time-outline' },
          ].map((s) => {
            const active = sortBy === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, {
                  backgroundColor: active ? '#2ECC7118' : 'transparent',
                  borderColor: active ? '#2ECC71' : colors.border,
                }]}
                onPress={() => setSortBy(s.id)}
              >
                <Ionicons name={s.icon} size={12} color={active ? '#2ECC71' : colors.textLight} />
                <Text style={[styles.chipText, { color: active ? '#2ECC71' : colors.textLight, fontWeight: active ? '700' : '500' }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* University sub-filter */}
        {selectedCategory === 'university' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {UNIVERSITIES.map((uni) => {
              const active = selectedUniversity === uni.id;
              return (
                <TouchableOpacity
                  key={uni.id}
                  style={[styles.chip, {
                    backgroundColor: active ? uni.color + '18' : 'transparent',
                    borderColor: active ? uni.color : colors.border,
                    flexDirection: 'row', gap: 6, alignItems: 'center',
                  }]}
                  onPress={() => setSelectedUniversity(active ? null : uni.id)}
                >
                  <Image source={uni.logo} style={{ width: 16, height: 16, borderRadius: 3 }} resizeMode="contain" />
                  <Text style={[styles.chipText, { color: active ? uni.color : colors.textLight, fontWeight: active ? '700' : '500' }]}>
                    {uni.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Airport sub-filter */}
        {selectedCategory === 'airport' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {[
              { id: 'to',   label: '✈️ To Airport' },
              { id: 'from', label: '🏠 From Airport' },
            ].map((dir) => {
              const active = airportDirection === dir.id;
              return (
                <TouchableOpacity
                  key={dir.id}
                  style={[styles.chip, {
                    backgroundColor: active ? colors.secondary + '18' : 'transparent',
                    borderColor: active ? colors.secondary : colors.border,
                  }]}
                  onPress={() => setAirportDirection(active ? null : dir.id)}
                >
                  <Text style={[styles.chipText, { color: active ? colors.secondary : colors.textLight, fontWeight: active ? '700' : '500' }]}>
                    {dir.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={OFFER_ACCENT} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Finding rides…</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="car-outline" size={40} color={colors.textLight} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {searchQuery
              ? 'No rides match your search'
              : activeTab === 'requests'
                ? 'No seat requests in St. Louis yet'
                : 'No carpools in St. Louis yet'}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {searchQuery
              ? 'Try a different St. Louis location or neighborhood'
              : 'Be the first to share a ride with the St. Louis community!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={[styles.emptyAction, { backgroundColor: OFFER_ACCENT }]}
              onPress={() => navigation.navigate('PostRide')}
            >
              <Text style={styles.emptyActionText}>Share a Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RideCard
              item={item}
              colors={colors}
              onPress={(ride) => navigation.navigate('RideDetail', { ride })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={OFFER_ACCENT} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
  },
  headerTitle:   { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  headerSub:     { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  cityPill:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cityPillText:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  postFab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: OFFER_ACCENT, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  postFabText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.13)',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, padding: 0 },

  // Filters
  filterShell: { borderBottomWidth: 0.5 },
  catRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  catBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 3 },
  catLabel: { fontSize: 10 },
  chipRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
  },
  chipText: { fontSize: 12 },
  divider: { width: 1, height: 20, marginHorizontal: 2 },

  // List
  listContent: { padding: 12, paddingBottom: 90 },

  // Card
  card: {
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, marginRight: 8 },
  posterAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  posterAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  posterName: { fontSize: 14, fontWeight: '700' },
  posterMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  uniLogo: { width: 14, height: 14, borderRadius: 3 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#F39C12' },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  // Route
  routeBlock: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  routeTrack: { width: 14, alignItems: 'center', paddingTop: 4 },
  dotFilled: { width: 10, height: 10, borderRadius: 5 },
  dotRing: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: 'transparent' },
  routeLine: { width: 2, flex: 1, marginVertical: 3, borderRadius: 1 },
  routeLabels: { flex: 1, justifyContent: 'space-between' },
  locationText: { fontSize: 14, fontWeight: '600' },

  // Stops
  stopsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  stopsText: { fontSize: 12, fontWeight: '500', flex: 1 },

  // Pills
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '500' },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    marginTop: 20, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28,
  },
  emptyActionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
