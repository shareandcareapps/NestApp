// features/rides/screens/BrowseRidesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
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

function RideCard({ item, onPress, colors }) {
  const rideDate = new Date(item.ride_date);
  const isToday = new Date().toDateString() === rideDate.toDateString();
  const isRequest = item.ride_type === 'request';

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: isRequest ? colors.surface : colors.card,
        borderColor: isRequest ? '#9B59B630' : colors.border,
      }]}
      onPress={() => onPress(item)}
    >
      {/* Type Badge — icon + text in a proper flex row pill */}
      <View style={[
        styles.typeBadge,
        { backgroundColor: isRequest ? '#9B59B620' : '#2ECC7120' }
      ]}>
        <Ionicons
          name={isRequest ? 'hand-left-outline' : 'car-outline'}
          size={11}
          color={isRequest ? '#9B59B6' : '#27AE60'}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.typeBadgeText, { color: isRequest ? '#9B59B6' : '#27AE60' }]}>
          {isRequest ? 'Rider Request' : 'Driver Offer'}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.locationBox}>
          <Text style={[styles.locationLabel, { color: colors.textLight }]}>FROM</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.from_location}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={isRequest ? '#9B59B6' : '#2ECC71'} />
        <View style={styles.locationBox}>
          <Text style={[styles.locationLabel, { color: colors.textLight }]}>TO</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>{item.to_location}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={[styles.pill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Text style={[styles.pillText, { color: colors.textSecondary }]}>
            📅 {isToday ? 'Today' : rideDate.toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Text style={[styles.pillText, { color: colors.textSecondary }]}>
            🕐 {rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {!isRequest && (
          <View style={[styles.pill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.pillText, { color: colors.textSecondary }]}>
              👤 {item.seats_available} seat{item.seats_available > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        <View style={[styles.pill, { backgroundColor: colors.successBackground, borderColor: '#2ECC71' }]}>
          <Text style={[styles.cashPillText, { color: colors.successText }]}>
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('offers');
  const colors = useTheme();

  useEffect(() => { fetchRides(); }, [selectedCategory, activeTab]);

  async function fetchRides() {
    try {
      setLoading(true);
      const data = await getRides(selectedCategory, activeTab);
      setRides(data);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

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
            onPress={() => setSelectedCategory(cat.id)}
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
  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '500' },
  categoryContainer: { flexDirection: 'row', padding: 10, borderBottomWidth: 0.5 },
  categoryButton: { flex: 1, alignItems: 'center', padding: 6, borderRadius: 8 },
  categoryLabel: { fontSize: 10, marginTop: 2 },
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