// features/classifieds/screens/BrowseListingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { getListings, searchListings } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';

const CATEGORIES = [
  { id: null, label: 'All', emoji: '🔍' },
  { id: 'accommodation', label: 'Housing', emoji: '🏠' },
  { id: 'jobs', label: 'Jobs', emoji: '💼' },
  { id: 'buysell', label: 'Buy/Sell', emoji: '🛍️' },
  { id: 'food', label: 'Food', emoji: '🍱' },
];

function ListingCard({ item, onPress, colors }) {
  const categoryColors = {
    accommodation: '#E63946', jobs: '#2ECC71', buysell: '#3498DB', food: '#F39C12',
  };
  const categoryEmojis = {
    accommodation: '🏠', jobs: '💼', buysell: '🛍️', food: '🍱',
  };
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(item)}
    >
      {item.is_boosted && (
        <View style={[styles.boostedBadge, { backgroundColor: colors.warningBackground }]}>
          <Text style={[styles.boostedText, { color: colors.warningText }]}>⭐ Featured</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: categoryColors[item.category] + '20' }]}>
          <Text style={styles.categoryEmoji}>{categoryEmojis[item.category]}</Text>
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.poster?.full_name || item.profiles?.full_name || 'Community Member'}
          </Text>
        </View>
        {item.price && (
          <Text style={[styles.cardPrice, { color: colors.primary }]}>${item.price}</Text>
        )}
      </View>
      {item.description && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={[styles.cardFooter, { borderTopColor: colors.borderLight }]}>
        <Text style={[styles.cardLocation, { color: colors.textLight }]}>📍 {item.city}, {item.state}</Text>
        <Text style={[styles.cardTime, { color: colors.textLight }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BrowseListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const currentCity = useAppStore((state) => state.currentCity);
  const colors = useTheme();

  useEffect(() => { fetchListings(); }, [selectedCategory]);

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
      } catch (error) { console.error(error); }
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.secondary }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.textWhite }]}
          placeholder="Search listings..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      <View style={[styles.categoryContainer, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }]}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[
              styles.categoryButton,
              selectedCategory === cat.id && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[
              styles.categoryLabel,
              { color: selectedCategory === cat.id ? colors.primary : colors.textLight },
              selectedCategory === cat.id && { fontWeight: '600' },
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading listings...</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No listings yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
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
              colors={colors}
              onPress={(listing) => navigation.navigate('ListingDetail', { listing })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        />
      )}
      <TouchableOpacity
  style={[styles.postButton, { backgroundColor: colors.primary }]}
  onPress={() => navigation.navigate('PostListing', {
    preselectedCategory: selectedCategory
  })}
>
  <Text style={styles.postButtonText}>+ Post Listing</Text>
</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { padding: 12 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10, fontSize: 14 },
  categoryContainer: { flexDirection: 'row', padding: 10, borderBottomWidth: 0.5 },
  categoryButton: { flex: 1, alignItems: 'center', padding: 6, borderRadius: 8 },
  categoryEmoji: { fontSize: 18 },
  categoryLabel: { fontSize: 10, marginTop: 2, textAlign: 'center', numberOfLines: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  listContent: { padding: 12, paddingBottom: 80 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5 },
  boostedBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  boostedText: { fontSize: 11, fontWeight: '500' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitleArea: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  cardPrice: { fontSize: 16, fontWeight: '700' },
  cardDescription: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 0.5 },
  cardLocation: { fontSize: 11 },
  cardTime: { fontSize: 11 },
  postButton: { position: 'absolute', bottom: 20, right: 20, borderRadius: 25, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});