// features/rides/screens/BrowseRidesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, SafeAreaView, TextInput, Image,
} from 'react-native';
import { getRides } from '../services/ridesService';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { id: null, label: 'All', icon: 'apps-outline' },
  { id: 'airport', label: 'Airport', icon: 'airplane-outline' },
  { id: 'university', label: 'University', icon: 'school-outline' },
  { id: 'temple', label: "Religious Centers", icon: 'partly-sunny-outline' },
  { id: 'general', label: 'General', icon: 'car-outline' },
];

const UNIVERSITIES = [
  { id: 'webster', label: 'Webster', color: '#8E44AD', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://webster.edu&size=128' } },
  { id: 'slu',     label: 'SLU',     color: '#C0392B', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slu.edu&size=128' } },
  { id: 'umsl',    label: 'UMSL',    color: '#C8102E', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://umsl.edu&size=128' } },
  { id: 'washu',   label: 'Wash U',  color: '#117A65', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wustl.edu&size=128' } },
];

// Driver offers: elegant teal accent  |  Rider requests: elegant warm amber
const OFFER_BG   = '#E8F8F5';
const OFFER_ACCENT = '#1ABC9C';
const REQUEST_BG   = '#FEF9E7';
const REQUEST_ACCENT = '#F39C12';


function RideCard({ item, onPress, colors }) {
  const rideDate = new Date(item.ride_date);
  const isToday = new Date().toDateString() === rideDate.toDateString();
  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === rideDate.toDateString();
  const isRequest = item.ride_type === 'request';
  const accent = isRequest ? REQUEST_ACCENT : OFFER_ACCENT;
  const cardBg = isRequest ? '#FFFBF2' : '#F0FFF8';
  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : rideDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const categoryEmojis = { airport: '✈️', temple: '🌤️', general: '🚗' };
  const uniData = item.category === 'university' ? UNIVERSITIES.find(u => u.id === item.university) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: accent + '40' }]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Top row: badge + category icon */}
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: accent + '20' }]}>
          <Ionicons name={isRequest ? 'hand-left-outline' : 'car-sport-outline'} size={12} color={accent} style={{ marginRight: 4 }} />
          <Text style={[styles.typeBadgeText, { color: accent }]}>
            {isRequest ? 'Need a Seat' : 'Offering Seat'}
          </Text>
        </View>
        {uniData ? (
          <Image source={uniData.logo} style={styles.uniLogo} resizeMode="contain" />
        ) : (
          <Text style={styles.categoryEmoji}>{categoryEmojis[item.category] || '🚗'}</Text>
        )}
      </View>

      {/* Route */}
      <View style={styles.routeBlock}>
        <View style={styles.routeIndicator}>
          <View style={[styles.dotOrigin, { backgroundColor: accent }]} />
          <View style={[styles.routeLine, { backgroundColor: accent + '40' }]} />
          <View style={[styles.dotDest, { borderColor: accent }]} />
        </View>
        <View style={styles.routeText}>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.from_location}</Text>
          <View style={{ height: 10 }} />
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.to_location}</Text>
        </View>
      </View>

      {/* Footer pills */}
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Ionicons name="calendar-outline" size={11} color={colors.textLight} />
          <Text style={[styles.pillText, { color: colors.textSecondary }]}>{dateLabel}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Ionicons name="time-outline" size={11} color={colors.textLight} />
          <Text style={[styles.pillText, { color: colors.textSecondary }]}>{timeLabel}</Text>
        </View>
        {!isRequest && (
          <View style={[styles.pill, { backgroundColor: colors.surface }]}>
            <Ionicons name="people-outline" size={11} color={colors.textLight} />
            <Text style={[styles.pillText, { color: colors.textSecondary }]}>
              {item.seats_available} seat{item.seats_available > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        <View style={[styles.pill, { backgroundColor: accent + '15' }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={11} color={accent} />
          <Text style={[styles.pillText, { color: accent, fontWeight: '600' }]}>Chat to arrange</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BrowseRidesScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [allRides, setAllRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [airportDirection, setAirportDirection] = useState(null); // 'to' | 'from'
  const [activeTab, setActiveTab] = useState(null); // null = all, 'offers', 'requests'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'time'
  const [searchQuery, setSearchQuery] = useState('');
  const colors = useTheme();


  useEffect(() => { fetchRides(); }, [selectedCategory, selectedUniversity, airportDirection, activeTab]);

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
      setRides(data);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(text) {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setRides(allRides);
    } else {
      const q = text.toLowerCase();
      setRides(allRides.filter(r =>
        r.from_location?.toLowerCase().includes(q) ||
        r.to_location?.toLowerCase().includes(q)
      ));
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  }

  function getSortedRides() {
    const sorted = [...rides];
    if (sortBy === 'recent') {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'time') {
      sorted.sort((a, b) => new Date(a.ride_date) - new Date(b.ride_date));
    }
    return sorted;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Fixed header */}
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.headerBar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Carpool</Text>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'transparent', borderWidth: 1, borderRadius: 10, marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7 }]}>
          <Ionicons name="search-outline" size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: '#fff', flex: 1 }]}
            placeholder="Search by location..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </SafeAreaView>

      {/* Sticky filter menu */}
      <View>
        {/* Category Filter Row (ride type icons) */}
        <View style={[styles.categoryContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id ?? 'all'}
              style={[styles.categoryButton, selectedCategory === cat.id && { backgroundColor: '#2ECC7115' }]}
              onPress={() => { setSelectedCategory(cat.id); if (cat.id !== 'university') setSelectedUniversity(null); if (cat.id !== 'airport') setAirportDirection(null); }}
            >
              <Ionicons name={cat.icon} size={18} color={selectedCategory === cat.id ? '#2ECC71' : colors.textLight} />
              <Text style={[styles.categoryLabel, { color: selectedCategory === cat.id ? '#2ECC71' : colors.textLight }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filter Chips */}
        <View style={[styles.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {[
            { id: null, label: '🗺️ All', color: '#1D3557' },
            { id: 'offers', label: '🚗 Offering Seat', color: '#2ECC71' },
            { id: 'requests', label: '🙋 Need a Seat', color: '#9B59B6' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id ?? 'all'}
              style={[styles.filterChip, {
                backgroundColor: activeTab === f.id ? f.color + '18' : 'transparent',
                borderColor: activeTab === f.id ? f.color : colors.border,
              }]}
              onPress={() => setActiveTab(f.id)}
            >
              <Text style={[styles.filterChipText, {
                color: activeTab === f.id ? f.color : colors.textLight,
                fontWeight: activeTab === f.id ? '700' : '500',
              }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sort Row */}
        <View style={[styles.sortRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="swap-vertical-outline" size={14} color={colors.textLight} style={{ marginRight: 6 }} />
          <Text style={[styles.sortLabel, { color: colors.textLight }]}>Sort:</Text>
          {[
            { id: 'recent', label: 'Recently Added', icon: 'time-outline' },
            { id: 'time',   label: 'Ride Time',      icon: 'calendar-outline' },
          ].map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sortChip, {
                backgroundColor: sortBy === s.id ? '#2ECC7118' : 'transparent',
                borderColor: sortBy === s.id ? '#2ECC71' : colors.border,
              }]}
              onPress={() => setSortBy(s.id)}
            >
              <Ionicons name={s.icon} size={12} color={sortBy === s.id ? '#2ECC71' : colors.textLight} />
              <Text style={[styles.sortChipText, { color: sortBy === s.id ? '#2ECC71' : colors.textLight, fontWeight: sortBy === s.id ? '700' : '500' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* University Sub-filter */}
        {selectedCategory === 'university' && (
          <View style={[styles.universityRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {UNIVERSITIES.map((uni) => (
              <TouchableOpacity
                key={uni.id}
                style={[styles.universityChip, {
                  backgroundColor: selectedUniversity === uni.id ? uni.color + '18' : colors.surface,
                  borderColor: selectedUniversity === uni.id ? uni.color : colors.border,
                }]}
                onPress={() => setSelectedUniversity(selectedUniversity === uni.id ? null : uni.id)}
              >
                <Image source={uni.logo} style={styles.universityChipLogo} resizeMode="contain" />
                <Text style={[styles.universityChipText, {
                  color: selectedUniversity === uni.id ? uni.color : colors.textSecondary,
                  fontWeight: selectedUniversity === uni.id ? '700' : '500',
                }]}>
                  {uni.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Airport Direction Sub-filter */}
        {selectedCategory === 'airport' && (
          <View style={[styles.universityRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {[
              { id: 'to',   label: '✈️ To Airport' },
              { id: 'from', label: '🏠 From Airport' },
            ].map((dir) => (
              <TouchableOpacity
                key={dir.id}
                style={[styles.airportChip, {
                  backgroundColor: airportDirection === dir.id ? '#1D355720' : colors.surface,
                  borderColor: airportDirection === dir.id ? colors.secondary : colors.border,
                }]}
                onPress={() => setAirportDirection(airportDirection === dir.id ? null : dir.id)}
              >
                <Text style={[styles.airportChipLabel, { color: airportDirection === dir.id ? colors.secondary : colors.textSecondary, fontWeight: airportDirection === dir.id ? '700' : '500' }]}>
                  {dir.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Finding rides...</Text>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{activeTab === 'requests' ? '🙋' : '🚗'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {activeTab === 'requests' ? 'No seat requests yet' : 'No carpools yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {activeTab === 'requests' ? 'Need a seat? Post your request!' : 'Be the first to share a ride in St. Louis!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={getSortedRides()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RideCard
              item={item}
              colors={colors}
              onPress={(ride) => navigation.navigate('RideDetail', { ride })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2ECC71" />}
        />
      )}

      {/* Post Button */}
      <TouchableOpacity
        style={[styles.postButton, { backgroundColor: '#2ECC71' }]}
        onPress={() => navigation.navigate('PostRide')}
      >
        <Text style={styles.postButtonText}>+ Share Ride</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  searchContainer: { paddingVertical: 10 },
  searchInput: { fontSize: 14, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderBottomWidth: 0.5 },
  filterChip: { flex: 1, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5 },
  filterChipText: { fontSize: 11 },
  categoryContainer: { flexDirection: 'row', padding: 10, borderBottomWidth: 0.5 },
  categoryButton: { flex: 1, alignItems: 'center', padding: 6, borderRadius: 8 },
  categoryLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  universityRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderBottomWidth: 0.5 },
  airportChip: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5, gap: 2 },
  airportChipLabel: { fontSize: 12 },
  airportChipSub: { fontSize: 10 },
  universityChip: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1.5, gap: 4 },
  universityChipLogo: { width: 32, height: 32 },
  universityChipText: { fontSize: 10 },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5 },
  sortLabel: { fontSize: 11, fontWeight: '600', marginRight: 8 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5, marginRight: 6 },
  sortChipText: { fontSize: 11 },
  cashNotice: { padding: 10, alignItems: 'center' },
  cashNoticeText: { fontSize: 12, fontWeight: '500' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  listContent: { padding: 10, paddingBottom: 80 },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  categoryEmoji: { fontSize: 20 },
  uniLogo: { width: 28, height: 28, borderRadius: 6 },
  routeBlock: { flexDirection: 'row', marginBottom: 12 },
  routeIndicator: { width: 16, alignItems: 'center', paddingTop: 4 },
  dotOrigin: { width: 10, height: 10, borderRadius: 5 },
  dotDest: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: 'transparent' },
  routeLine: { width: 2, flex: 1, marginVertical: 3 },
  routeText: { flex: 1, marginLeft: 10 },
  locationText: { fontSize: 14, fontWeight: '600' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '500' },
  postButton: { position: 'absolute', bottom: 20, right: 20, borderRadius: 25, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});