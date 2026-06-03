// features/classifieds/screens/BrowseListingsScreen.js
// CLASSIFIEDS FEATURE — Browse screen
// GOLDEN RULE 1: This screen never imports from other features
// GOLDEN RULE 3: All data calls go through listingsService only

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getListings, searchListings } from '../services/listingsService';
import useAppStore from '../../../core/store/index';

// ─── Category Config ───────────────────────────
const CATEGORIES = [
  { id: null, label: 'All', emoji: '🔍' },
  { id: 'accommodation', label: 'Homes', emoji: '🏠' },
  { id: 'jobs', label: 'Jobs', emoji: '💼' },
  { id: 'buysell', label: 'Buy & Sell', emoji: '🛍️' },
  { id: 'food', label: 'Food', emoji: '🍱' },
];

// ─── Colors ───────────────────────────────────
const colors = {
  primary: '#E63946',
  secondary: '#1D3557',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  success: '#2ECC71',
};

// ─── Listing Card Component ────────────────────
function ListingCard({ item, onPress }) {
  const categoryColors = {
    accommodation: '#E63946',
    jobs: '#2ECC71',
    buysell: '#3498DB',
    food: '#F39C12',
  };

  const categoryEmojis = {
    accommodation: '🏠',
    jobs: '💼',
    buysell: '🛍️',
    food: '🍱',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      {item.is_boosted && (
        <View style={styles.boostedBadge}>
          <Text style={styles.boostedText}>⭐ Featured</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryIcon,
          { backgroundColor: categoryColors[item.category] + '20' }]}>
          <Text style={styles.categoryEmoji}>
            {categoryEmojis[item.category]}
          </Text>
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.profiles?.full_name || 'Community Member'}
          </Text>
        </View>
        {item.price && (
          <Text style={styles.cardPrice}>
            ${item.price}
          </Text>
        )}
      </View>
      {item.description && (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.cardLocation}>
          📍 {item.city}, {item.state}
        </Text>
        <Text style={styles.cardTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────
export default function BrowseListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const currentCity = useAppStore((state) => state.currentCity);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory]);

  async function fetchListings() {
    try {
      setLoading(true);
      const data = await getListings(selectedCategory);
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(text) {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        const data = await searchListings(text, selectedCategory);
        setListings(data);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else if (text.length === 0) {
      fetchListings();
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search listings..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
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

      {/* Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to post in {currentCity}!
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onPress={(listing) =>
                navigation.navigate('ListingDetail', { listing })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Post Button */}
      <TouchableOpacity
        style={styles.postButton}
        onPress={() => navigation.navigate('PostListing')}
      >
        <Text style={styles.postButtonText}>+ Post Listing</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#1D3557',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#fff',
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
    backgroundColor: '#E6394615',
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
    color: '#E63946',
    fontWeight: '600',
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
  boostedBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  boostedText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E63946',
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  cardLocation: {
    fontSize: 11,
    color: '#999',
  },
  cardTime: {
    fontSize: 11,
    color: '#999',
  },
  postButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#E63946',
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