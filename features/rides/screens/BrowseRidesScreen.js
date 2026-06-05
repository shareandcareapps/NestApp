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
  { id: 'temple', label: 'Temple', icon: 'business-outline' },
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
  const isRequest = item.ride_type === 'request';
  const accent = isRequest ? REQUEST_ACCENT : OFFER_ACCENT;
  const dateLabel = isToday ? 'Today' : rideDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeLabel = rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Price display states
  let priceMain, priceSub, priceColor;
  if (item.cost_share) {
    priceMain = `$${item.cost_share}`;
    priceSub = 'per person';
    priceColor = colors.textPrimary;
  } else if (isRequest) {
    priceMain = 'Negotiable';
    priceSub = null;
    priceColor = REQUEST_ACCENT;
  } else {
    priceMain = 'Free';
    priceSub = 'ride';
    priceColor = OFFER_ACCENT;
  }

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderLeftWidth: 5,
        borderLeftColor: accent,
      }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* Header: type badge + price */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: accent + '18' }]}>
          <Ionicons name={isRequest ? 'hand-left' : 'car-sport'} size={11} color={accent} style={{ marginRight: 4 }} />
          <Text style={[styles.typeBadgeText, { color: accent }]}>
            {isRequest ? 'Ride Request' : 'Driver Offer'}
          </Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={[styles.priceValue, { color: priceColor }]}>{priceMain}</Text>
          {priceSub ? <Text style={[styles.priceUnit, { color: colors.textLight }]}>{priceSub}</Text> : null}
        </View>
      </View>

      {/* Route with vertical connector */}
      <View style={styles.routeRow}>
        <View style={styles.routeIndicator}>
          <View style={[styles.dotOrigin, { borderColor: accent }]} />
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <Ionicons name="location" size={13} color={accent} style={{ marginTop: -1 }} />
        </View>
        <View style={styles.routeText}>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.from_location}</Text>
          <View style={styles.routeSpacer} />
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.to_location}</Text>
        </View>
      </View>

      {/* Footer meta row */}
      <View style={[styles.metaRow, { borderTopColor: colors.borderLight }]}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textLight} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{dateLabel}</Text>
        </View>
        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={colors.textLight} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{timeLabel}</Text>
        </View>
        {!isRequest && (
          <>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={colors.textLight} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.seats_available} seat{item.seats_available > 1 ? 's' : ''}
              </Text>
            </View>
          </>
        )}
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.headerBar, { backgroundColor: colors.secondary }]}>
          <Text style={styles.headerTitle}>Rides</Text>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: colors.secondary }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </SafeAreaView>

      {/* Category Filter Row (ride type icons) */}
      <View style={[styles.categoryContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id ?? 'all'}
            style={[styles.categoryButton, selectedCategory === cat.id && { backgroundColor: '#2ECC7115' }]}
            onPress={() => { setSelectedCategory(cat.id); if (cat.id !== 'university') setSelectedUniversity(null); if (cat.id !== 'airport') setAirportDirection(null); }}
          >
            <Ionicons
              name={cat.icon}
              size={18}
              color={selectedCategory === cat.id ? '#2ECC71' : colors.textLight}
            />
            <Text style={[styles.categoryLabel, { color: selectedCategory === cat.id ? '#2ECC71' : colors.textLight }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type Filter Chips — All / Driver Offers / Ride Requests */}
      <View style={[styles.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { id: null, label: 'All Rides', color: '#1D3557' },
          { id: 'offers', label: '🚗 Driver Offers', color: '#2ECC71' },
          { id: 'requests', label: '🙋 Ride Requests', color: '#9B59B6' },
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

      {/* Cash Notice */}
      <View style={[styles.cashNotice, { backgroundColor: colors.successBackground }]}>
        <Text style={[styles.cashNoticeText, { color: colors.successText }]}>
          💵 All rides are cash-based — pay the driver directly
        </Text>
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
            {activeTab === 'requests' ? 'No ride requests yet' : 'No rides available'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {activeTab === 'requests' ? 'Need a ride? Post your request!' : 'Be the first to post a ride in St. Louis!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rides}
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
        <Text style={styles.postButtonText}>+ Post</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '500' },
  searchContainer: { padding: 12 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10, fontSize: 14, color: '#fff' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderBottomWidth: 0.5 },
  filterChip: { flex: 1, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5 },
  filterChipText: { fontSize: 11 },
  categoryContainer: { flexDirection: 'row', padding: 10, borderBottomWidth: 0.5 },
  categoryButton: { flex: 1, alignItems: 'center', padding: 6, borderRadius: 8 },
  categoryLabel: { fontSize: 10, marginTop: 2 },
  universityRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderBottomWidth: 0.5 },
  airportChip: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5, gap: 2 },
  airportChipLabel: { fontSize: 12 },
  airportChipSub: { fontSize: 10 },
  universityChip: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1.5, gap: 4 },
  universityChipLogo: { width: 32, height: 32 },
  universityChipText: { fontSize: 10 },
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
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  priceWrap: { alignItems: 'flex-end' },
  priceValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  priceUnit: { fontSize: 9, marginTop: -1 },
  routeRow: { flexDirection: 'row', marginBottom: 8 },
  routeIndicator: { width: 14, alignItems: 'center', paddingTop: 3 },
  dotOrigin: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  routeLine: { width: 2, flex: 1, marginVertical: 2 },
  routeText: { flex: 1, marginLeft: 7 },
  routeSpacer: { height: 8 },
  locationText: { fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 0.5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontWeight: '500' },
  metaDivider: { width: 1, height: 10, marginHorizontal: 8 },
  postButton: { position: 'absolute', bottom: 20, right: 20, borderRadius: 25, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});