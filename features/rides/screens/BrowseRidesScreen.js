// features/rides/screens/BrowseRidesScreen.js
// RIDES FEATURE — Browse rides screen
// Supports Driver Offers and Rider Requests
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through ridesService only

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getRides } from '../services/ridesService';

// ─── Category Config ───────────────────────────
const CATEGORIES = [
  { id: null, label: 'All', emoji: '🚗' },
  { id: 'airport', label: 'Airport', emoji: '✈️' },
  { id: 'university', label: 'University', emoji: '🎓' },
  { id: 'temple', label: 'Temple', emoji: '🛕' },
  { id: 'general', label: 'General', emoji: '🚗' },
];

// ─── Ride Card Component ───────────────────────
function RideCard({ item, onPress }) {
  const rideDate = new Date(item.ride_date);
  const isToday = new Date().toDateString() === rideDate.toDateString();
  const isRequest = item.ride_type === 'request';

  return (
    <TouchableOpacity
      style={[styles.card, isRequest && styles.requestCard]}
      onPress={() => onPress(item)}
    >
      {/* Type Badge */}
      <View style={[
        styles.typeBadge,
        { backgroundColor: isRequest ? '#9B59B620' : '#2ECC7120' }
      ]}>
        <Text style={[
          styles.typeBadgeText,
          { color: isRequest ? '#9B59B6' : '#27AE60' }
        ]}>
          {isRequest ? '🙋 Rider Request' : '🚗 Driver Offer'}
        </Text>
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.locationBox}>
          <Text style={styles.locationLabel}>FROM</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.from_location}
          </Text>
        </View>
        <Text style={[
          styles.arrow,
          { color: isRequest ? '#9B59B6' : '#2ECC71' }
        ]}>→</Text>
        <View style={styles.locationBox}>
          <Text style={styles.locationLabel}>TO</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.to_location}
          </Text>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            📅 {isToday ? 'Today' : rideDate.toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            🕐 {rideDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {!isRequest && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              👤 {item.seats_available} seat{item.seats_available > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        <View style={[styles.pill, styles.cashPill]}>
          <Text style={styles.cashPillText}>
            {item.cost_share
              ? `$${item.cost_share} cash`
              : isRequest
              ? 'Price open'
              : 'Free'}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {item.notes && (
        <Text style={styles.notes} numberOfLines={1}>
          💬 {item.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────
export default function BrowseRidesScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('offers');

  useEffect(() => {
    fetchRides();
  }, [selectedCategory, activeTab]);

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
    <View style={styles.container}>

      {/* Offer vs Request Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.tabActive]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'offers' && styles.tabTextActive,
          ]}>
            🚗 Driver Offers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'requests' && styles.tabActiveRequest,
          ]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'requests' && styles.tabTextActiveRequest,
          ]}>
            🙋 Ride Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[
              styles.categoryButton,
              selectedCategory === cat.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[
              styles.categoryLabel,
              selectedCategory === cat.id && styles.categoryLabelActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cash Notice */}
      <View style={styles.cashNotice}>
        <Text style={styles.cashNoticeText}>
          💵 All rides are cash-based — pay the driver directly
        </Text>
      </View>

      {/* Rides List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Finding rides...</Text>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>
            {activeTab === 'offers' ? '🚗' : '🙋'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'offers'
              ? 'No rides available'
              : 'No ride requests yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'offers'
              ? 'Be the first to post a ride in St. Louis!'
              : 'Need a ride? Post your request!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RideCard
              item={item}
              onPress={(ride) =>
                navigation.navigate('RideDetail', { ride })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2ECC71"
            />
          }
        />
      )}

      {/* Post Button */}
      <TouchableOpacity
        style={styles.postButton}
        onPress={() => navigation.navigate('PostRide')}
      >
        <Text style={styles.postButtonText}>+ Post</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2ECC71',
  },
  tabActiveRequest: {
    borderBottomColor: '#9B59B6',
  },
  tabText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#27AE60',
    fontWeight: '600',
  },
  tabTextActiveRequest: {
    color: '#9B59B6',
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#2ECC7115',
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  categoryLabelActive: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  cashNotice: {
    backgroundColor: '#E8F8F0',
    padding: 10,
    alignItems: 'center',
  },
  cashNoticeText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  requestCard: {
    borderColor: '#9B59B630',
    backgroundColor: '#FDFAFF',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  locationBox: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 9,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  pillText: {
    fontSize: 11,
    color: '#666',
  },
  cashPill: {
    backgroundColor: '#E8F8F0',
    borderColor: '#2ECC71',
  },
  cashPillText: {
    fontSize: 11,
    color: '#27AE60',
    fontWeight: '600',
  },
  notes: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  postButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2ECC71',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});