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
  { id: 'umsl',    label: 'UMSL',    color: '#C8102E', logo: { uri: 'https://www.umsl.edu/branding/logos/images/university-logo-horizontal_triton-red-blk.png' } },
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
  const cardBg = isRequest ? REQUEST_BG : OFFER_BG;

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: cardBg,
        borderColor: accent + '60',
        borderLeftWidth: 4,
        borderLeftColor: accent,
      }]}
      onPress={() => onPress(item)}
    >
      {/* Type Badge — icon + text in a proper flex row pill */}
      <View style={[styles.typeBadge, { backgroundColor: accent + '20' }]}>
        <Ionicons
          name={isRequest ? 'hand-left-outline' : 'car-outline'}
          size={11}
          color={accent}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.typeBadgeText, { color: accent }]}>
          {isRequest ? 'Rider Request' : 'Driver Offer'}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.locationBox}>
          <Text style={[styles.locationLabel, { color: colors.textLight }]}>FROM</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.from_location}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={accent} />
        <View style={styles.locationBox}>
          <Text style={[styles.locationLabel, { color: colors.textLight }]}>TO</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.to_location}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={[styles.pill, { backgroundColor: accent + '15', borderColor: accent + '40' }]}>
          <Text style={[styles.pillText, { color: accent }]}>
            📅 {isToday ? 'Today' : rideDate.toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: accent + '15', borderColor: accent + '40' }]}>
          <Text style={[styles.pillText, { color: accent }]}>
            🕐 {rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {!isRequest && (
          <View style={[styles.pill, { backgroundColor: accent + '15', borderColor: accent + '40' }]}>
            <Text style={[styles.pillText, { color: accent }]}>
              👤 {item.seats_available} seat{item.seats_available > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        <View style={[styles.pill, { backgroundColor: accent + '25', borderColor: accent }]}>
          <Text style={[styles.cashPillText, { color: accent }]}>
            {item.cost_share ? `$${item.cost_share} / person` : isRequest ? 'Price open' : 'Free'}
          </Text>
        </View>
      </View>

      {item.notes && (
        <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={1}>
          💬 {item.notes}
        </Text>
      )}
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
  const [activeTab, setActiveTab] = useState('offers');
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

      {/* Offers / Requests Tab Row */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && { borderBottomColor: '#2ECC71' }]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'offers' ? '#27AE60' : colors.textLight }, activeTab === 'offers' && { fontWeight: '600' }]}>
            🚗 Driver Offers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && { borderBottomColor: '#9B59B6' }]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? '#9B59B6' : colors.textLight }, activeTab === 'requests' && { fontWeight: '600' }]}>
            🙋 Ride Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Row */}
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
          <Text style={styles.emptyEmoji}>{activeTab === 'offers' ? '🚗' : '🙋'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {activeTab === 'offers' ? 'No rides available' : 'No ride requests yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {activeTab === 'offers' ? 'Be the first to post a ride in St. Louis!' : 'Need a ride? Post your request!'}
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
  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '500' },
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
  listContent: { padding: 12, paddingBottom: 80 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  locationBox: { flex: 1 },
  locationLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  locationText: { fontSize: 15, fontWeight: '600' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 0.5 },
  pillText: { fontSize: 11 },
  cashPillText: { fontSize: 11, fontWeight: '600' },
  notes: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  postButton: { position: 'absolute', bottom: 20, right: 20, borderRadius: 25, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});