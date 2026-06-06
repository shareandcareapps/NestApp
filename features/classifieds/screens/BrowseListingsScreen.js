// features/classifieds/screens/BrowseListingsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, SafeAreaView,
  ScrollView, Dimensions, Image,
} from 'react-native';
import { getListings, searchListings } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDisplayName } from '../../../core/components/UserProfileModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

const CATEGORIES = [
  { id: null,            label: 'All',      icon: 'apps-outline',       color: '#E63946' },
  { id: 'accommodation', label: 'Housing',  icon: 'home-outline',       color: '#457B9D' },
  { id: 'jobs',          label: 'Jobs',     icon: 'briefcase-outline',  color: '#2ECC71' },
  { id: 'buysell',       label: 'Buy & Sell', icon: 'pricetag-outline', color: '#3498DB' },
  { id: 'food',          label: 'Food',     icon: 'restaurant-outline', color: '#F39C12' },
];

const CATEGORY_COLORS = {
  accommodation: '#457B9D',
  jobs: '#2ECC71',
  buysell: '#3498DB',
  food: '#F39C12',
};

const CATEGORY_GRADIENTS = {
  accommodation: ['#EBF4FA', '#D6EAF8'],
  jobs: ['#EAFAF1', '#D5F5E3'],
  buysell: ['#EBF5FB', '#D6EAF8'],
  food: ['#FEF9E7', '#FDEBD0'],
};

const CATEGORY_EMOJIS = {
  accommodation: '🏠',
  jobs: '💼',
  buysell: '🛍️',
  food: '🍱',
};

// Grid card for buy/sell, food, housing
function GridCard({ item, onPress, colors }) {
  const color = CATEGORY_COLORS[item.category] || '#E63946';
  const bgColor = CATEGORY_GRADIENTS[item.category]?.[0] || '#F5F5F5';
  const hasImages = item.images && item.images.length > 0;

  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: colors.surface }]}
      onPress={() => onPress(item)}
      activeOpacity={0.92}
    >
      {/* Image / Placeholder */}
      <View style={[styles.gridImageBox, { backgroundColor: bgColor }]}>
        {hasImages ? (
          <Image source={{ uri: item.images[0] }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <Text style={styles.gridEmoji}>{CATEGORY_EMOJIS[item.category] || '📦'}</Text>
        )}
        {item.is_boosted && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.gridInfo}>
        <Text style={[styles.gridPrice, { color: color }]} numberOfLines={1}>
          {item.price ? `$${item.price}` : 'Free'}
        </Text>
        <Text style={[styles.gridTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.gridMeta}>
          <Ionicons name="location-outline" size={10} color={colors.textLight} />
          <Text style={[styles.gridLocation, { color: colors.textLight }]} numberOfLines={1}>
            {item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Full-width card for jobs
function JobCard({ item, onPress, colors }) {
  const meta = item.metadata || null;

  const isFullTime = meta?.job_type === 'full_time';

  return (
    <TouchableOpacity
      style={[styles.jobCard, { backgroundColor: colors.surface }]}
      onPress={() => onPress(item)}
      activeOpacity={0.92}
    >
      {/* Left accent bar */}
      <View style={[styles.jobAccent, { backgroundColor: '#2ECC71' }]} />

      <View style={styles.jobContent}>
        <View style={styles.jobTop}>
          <View style={[styles.jobIconBox, { backgroundColor: '#EAFAF1' }]}>
            <Text style={{ fontSize: 22 }}>💼</Text>
          </View>
          <View style={styles.jobText}>
            <Text style={[styles.jobTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.jobCompany, { color: colors.textSecondary }]} numberOfLines={1}>
              {meta?.company || formatDisplayName(item.poster?.username)}
            </Text>
          </View>
          <View style={styles.jobPriceBox}>
            <Text style={[styles.jobRate, { color: '#27AE60' }]}>
              {meta?.salary_open ? 'Open' : item.price ? `$${item.price}/hr` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.jobPills}>
          <View style={[styles.pill, { backgroundColor: isFullTime ? '#EAFAF1' : '#FEF9E7', borderColor: isFullTime ? '#A9DFBF' : '#FAD7A0' }]}>
            <Ionicons name="time-outline" size={11} color={isFullTime ? '#27AE60' : '#E67E22'} />
            <Text style={[styles.pillText, { color: isFullTime ? '#27AE60' : '#E67E22' }]}>
              {isFullTime ? 'Full Time' : 'Part Time'}
            </Text>
          </View>
          {meta?.hours_per_week ? (
            <View style={[styles.pill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Ionicons name="hourglass-outline" size={11} color={colors.textSecondary} />
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{meta.hours_per_week} hrs/wk</Text>
            </View>
          ) : null}
          {meta?.joining ? (
            <View style={[styles.pill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>
                {meta.joining === 'immediate' ? 'Immediate' : 'Flexible'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.jobFooterLeft}>
            <Ionicons name="location-outline" size={11} color={colors.textLight} />
            <Text style={[styles.jobLocation, { color: colors.textLight }]}>
              {meta?.location || item.city}
            </Text>
          </View>
          <Text style={[styles.jobDate, { color: colors.textLight }]}>
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Full-width card for housing
function HousingCard({ item, onPress, colors }) {
  const hasImages = item.images && item.images.length > 0;
  return (
    <TouchableOpacity
      style={[styles.housingCard, { backgroundColor: colors.surface }]}
      onPress={() => onPress(item)}
      activeOpacity={0.92}
    >
      <View style={[styles.housingImage, { backgroundColor: '#EBF4FA' }]}>
        {hasImages ? (
          <Image source={{ uri: item.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 40 }}>🏠</Text>
        )}
        {item.is_boosted && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        {item.price ? (
          <View style={styles.housingPriceBadge}>
            <Text style={styles.housingPriceText}>${item.price}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.housingInfo}>
        <Text style={[styles.housingTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={[styles.housingDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.housingMeta}>
          <Ionicons name="location-outline" size={12} color={colors.textLight} />
          <Text style={[styles.housingLocation, { color: colors.textLight }]}>
            {item.city}, {item.state}
          </Text>
          <Text style={[styles.housingDot, { color: colors.textLight }]}>·</Text>
          <Text style={[styles.housingDate, { color: colors.textLight }]}>
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BrowseListingsScreen({ navigation, route }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(route.params?.category ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const colors = useTheme();
  const appliedParamCategory = useRef(route.params?.category ?? null);

  useFocusEffect(
    React.useCallback(() => {
      const incoming = route.params?.category ?? null;
      if (incoming !== appliedParamCategory.current) {
        appliedParamCategory.current = incoming;
        setSelectedCategory(incoming);
      } else {
        // Same category — refetch so sold/archived items drop off the grid
        fetchListings();
      }
    }, [route.params?.category])
  );

  useEffect(() => { fetchListings(); }, [selectedCategory]);

  async function fetchListings() {
    try {
      setLoading(true);
      setFetchError(false);
      const data = await getListings(selectedCategory);
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setFetchError(true);
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

  function renderItem({ item, index }) {
    if (item.__type === 'grid_pair') {
      return (
        <View style={styles.gridRow}>
          <GridCard item={item.left} onPress={(l) => navigation.navigate('ListingDetail', { listing: l })} colors={colors} />
          {item.right ? (
            <GridCard item={item.right} onPress={(l) => navigation.navigate('ListingDetail', { listing: l })} colors={colors} />
          ) : (
            <View style={{ width: CARD_WIDTH }} />
          )}
        </View>
      );
    }
    if (item.category === 'jobs') {
      return <JobCard item={item} onPress={(l) => navigation.navigate('ListingDetail', { listing: l })} colors={colors} />;
    }
    if (item.category === 'accommodation') {
      return <HousingCard item={item} onPress={(l) => navigation.navigate('ListingDetail', { listing: l })} colors={colors} />;
    }
    return null;
  }

  // Build render data — group consecutive buysell/food into grid pairs, keep jobs/housing as rows
  function buildRenderData(data) {
    const result = [];
    let pendingGrid = null;

    for (const item of data) {
      const isGrid = item.category === 'buysell' || item.category === 'food' || !item.category;
      if (isGrid) {
        if (pendingGrid) {
          result.push({ __type: 'grid_pair', left: pendingGrid, right: item });
          pendingGrid = null;
        } else {
          pendingGrid = item;
        }
      } else {
        if (pendingGrid) {
          result.push({ __type: 'grid_pair', left: pendingGrid, right: null });
          pendingGrid = null;
        }
        result.push(item);
      }
    }
    if (pendingGrid) result.push({ __type: 'grid_pair', left: pendingGrid, right: null });

    return result;
  }

  const renderData = buildRenderData(listings);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.secondary }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: '#fff' }]}>Marketplace</Text>
              <View style={styles.cityPill}>
                <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.8)" />
                <Text style={styles.cityPillText}>St. Louis, MO</Text>
              </View>
            </View>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, {
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderColor: searchFocused ? '#fff' : 'transparent',
            borderWidth: searchFocused ? 1 : 1,
          }]}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={[styles.searchInput, { color: '#fff' }]}
              placeholder="Search St. Louis listings..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); fetchListings(); }} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryScroll, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[
                  styles.categoryChip,
                  active
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={active ? '#fff' : colors.textSecondary}
                />
                <Text style={[
                  styles.categoryChipText,
                  { color: active ? '#fff' : colors.textSecondary },
                  active && { fontWeight: '700' },
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Food banner — always visible when food category is selected */}
      {selectedCategory === 'food' && (
        <TouchableOpacity
          style={styles.foodBanner}
          onPress={() => navigation.navigate('PostListing', { preselectedCategory: 'food' })}
          activeOpacity={0.85}
        >
          <Text style={styles.foodBannerEmoji}>🍱</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.foodBannerTitle}>Got a food business or tiffin service?</Text>
            <Text style={styles.foodBannerSub}>List your home kitchen, catering, or local food business — reach your community in minutes.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#F39C12" />
        </TouchableOpacity>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading listings...</Text>
        </View>
      ) : fetchError ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={{ fontSize: 40 }}>📡</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Couldn't load listings</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchListings}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={{ fontSize: 40 }}>📭</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No listings yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Be the first to post in St. Louis!
          </Text>
        </View>
      ) : (
        <FlatList
          data={renderData}
          keyExtractor={(item, i) => item.__type === 'grid_pair' ? `pair-${i}` : item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Floating post button */}
      <TouchableOpacity
        style={[styles.postButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('PostListing', { preselectedCategory: selectedCategory })}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.postButtonText}>Post Listing</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  cityPillText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationText: { fontSize: 12 },

  postButton: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, gap: 6 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  // Categories
  categoryScroll: { borderBottomWidth: 1 },
  categoryContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 13, fontWeight: '500' },

  // Loading / Empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 22 },
  retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  emptyPostBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 22 },
  emptyPostText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  listContent: { padding: 12, paddingBottom: 40 },
  foodBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF8EC', borderColor: '#F39C1240', borderWidth: 1, borderRadius: 14, padding: 14, margin: 12, marginBottom: 0 },
  foodBannerEmoji: { fontSize: 28 },
  foodBannerTitle: { fontSize: 13, fontWeight: '700', color: '#B7770D', marginBottom: 3 },
  foodBannerSub: { fontSize: 12, color: '#8a6200', lineHeight: 17 },

  // Grid cards (buy/sell, food)
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  gridImageBox: { width: '100%', height: CARD_WIDTH * 0.85, alignItems: 'center', justifyContent: 'center' },
  gridImage: { width: '100%', height: '100%' },
  gridEmoji: { fontSize: 44 },
  featuredBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F39C12', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  featuredText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  gridInfo: { padding: 10 },
  gridPrice: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  gridTitle: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginBottom: 5 },
  gridMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridLocation: { fontSize: 11 },

  // Job cards
  jobCard: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  jobAccent: { width: 4 },
  jobContent: { flex: 1, padding: 14 },
  jobTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  jobIconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  jobText: { flex: 1 },
  jobTitle: { fontSize: 15, fontWeight: '700' },
  jobCompany: { fontSize: 12, marginTop: 2 },
  jobPriceBox: { alignItems: 'flex-end' },
  jobRate: { fontSize: 15, fontWeight: '800' },
  jobPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '600' },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  jobLocation: { fontSize: 11 },
  jobDate: { fontSize: 11 },

  // Housing cards
  housingCard: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  housingImage: { height: 160, alignItems: 'center', justifyContent: 'center' },
  housingPriceBadge: { position: 'absolute', bottom: 10, left: 12, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  housingPriceText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  housingInfo: { padding: 14 },
  housingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  housingDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  housingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  housingLocation: { fontSize: 12 },
  housingDot: { fontSize: 12 },
  housingDate: { fontSize: 12 },
});
