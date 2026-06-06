// features/classifieds/screens/BrowseListingsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Dimensions, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getListings, searchListings } from '../services/listingsService';
import { useTheme } from '../../../core/theme/ThemeContext';
import SearchBar from '../../../core/components/SearchBar';
import EmptyState from '../../../core/components/EmptyState';
import { CardSkeleton, ListItemSkeleton } from '../../../core/components/SkeletonLoader';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';
import { formatDisplayName } from '../../../core/components/UserProfileModal';

const { width } = Dimensions.get('window');
const CARD_W = (width - spacing.md * 2 - 10) / 2;

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: null,            label: 'All',       icon: 'apps',          gradient: ['#F4A833','#FF6B6B'] },
  { id: 'accommodation', label: 'Housing',   icon: 'business',      gradient: ['#FF6B6B','#E84393'] },
  { id: 'jobs',          label: 'Jobs',      icon: 'briefcase',     gradient: ['#00C48C','#007A5E'] },
  { id: 'buysell',       label: 'Buy & Sell',icon: 'bag',           gradient: ['#0099FF','#0055CC'] },
  { id: 'food',          label: 'Food',      icon: 'restaurant',    gradient: ['#F4A833','#E68A00'] },
];

const CAT_META = {
  accommodation: { gradient: ['#FF6B6B','#E84393'], icon: 'business' },
  jobs:          { gradient: ['#00C48C','#007A5E'], icon: 'briefcase' },
  buysell:       { gradient: ['#0099FF','#0055CC'], icon: 'bag' },
  food:          { gradient: ['#F4A833','#E68A00'], icon: 'restaurant' },
};

// ─── Card components ──────────────────────────────────────────────────────────

function GridCard({ item, onPress, theme }) {
  const meta = CAT_META[item.category] || CAT_META.buysell;
  const hasImg = item.images?.length > 0;
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
      activeOpacity={1}
    >
      <Animated.View style={[gcStyles.card, { backgroundColor: theme.card, transform: [{ scale }], ...shadows.medium }]}>
        <View style={gcStyles.imgWrap}>
          {hasImg
            ? <Image source={{ uri: item.images[0] }} style={gcStyles.img} resizeMode="cover" />
            : <LinearGradient colors={meta.gradient} style={gcStyles.imgPlaceholder}><Ionicons name={meta.icon} size={28} color="rgba(255,255,255,0.7)" /></LinearGradient>
          }
          {item.is_boosted && (
            <LinearGradient colors={['#F4A833','#FF6B6B']} style={gcStyles.boostBadge}>
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={gcStyles.boostText}>Featured</Text>
            </LinearGradient>
          )}
          <TouchableOpacity style={gcStyles.heart}>
            <Ionicons name="heart-outline" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={gcStyles.body}>
          <Text style={[gcStyles.price, { color: '#F4A833' }]}>
            {item.price ? `$${item.price}` : 'Free'}
          </Text>
          <Text style={[gcStyles.title, { color: theme.textPrimary }]} numberOfLines={2}>{item.title}</Text>
          <View style={gcStyles.meta}>
            <Ionicons name="location-outline" size={10} color={theme.textLight} />
            <Text style={[gcStyles.loc, { color: theme.textLight }]} numberOfLines={1}>{item.city}</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
const gcStyles = StyleSheet.create({
  card: { width: CARD_W, borderRadius: borderRadius.lg, overflow: 'hidden' },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: CARD_W * 0.88, resizeMode: 'cover' },
  imgPlaceholder: { width: '100%', height: CARD_W * 0.88, alignItems: 'center', justifyContent: 'center' },
  boostBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  boostText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  heart: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 10, gap: 3 },
  price: { fontSize: fonts.sizes.md, fontWeight: '800' },
  title: { fontSize: fonts.sizes.sm, fontWeight: '600', lineHeight: 17 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  loc: { fontSize: 10 },
});

function JobCard({ item, onPress, theme }) {
  const meta = item.metadata || {};
  const isFullTime = meta.job_type === 'full_time';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[jcStyles.card, { backgroundColor: theme.card, ...shadows.medium }]}>
      <LinearGradient colors={['#00C48C22','#00C48C06']} style={jcStyles.accentBar} start={{x:0,y:0}} end={{x:0,y:1}} />
      <View style={jcStyles.body}>
        <View style={jcStyles.top}>
          <LinearGradient colors={['#00C48C','#007A5E']} style={jcStyles.iconBox}>
            <Text style={{ fontSize: 18 }}>💼</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[jcStyles.title, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[jcStyles.company, { color: theme.textSecondary }]} numberOfLines={1}>
              {meta.company || formatDisplayName(item.poster?.username)}
            </Text>
          </View>
          <Text style={jcStyles.rate}>
            {meta.salary_open ? 'Open' : item.price ? `$${item.price}/hr` : '—'}
          </Text>
        </View>
        <View style={jcStyles.pills}>
          <View style={[jcStyles.pill, { backgroundColor: isFullTime ? '#00C48C18' : '#F4A83318', borderColor: isFullTime ? '#00C48C' : '#F4A833' }]}>
            <Text style={[jcStyles.pillTxt, { color: isFullTime ? '#00C48C' : '#F4A833' }]}>{isFullTime ? 'Full Time' : 'Part Time'}</Text>
          </View>
          {meta.hours_per_week ? (
            <View style={[jcStyles.pill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[jcStyles.pillTxt, { color: theme.textSecondary }]}>{meta.hours_per_week} hrs/wk</Text>
            </View>
          ) : null}
          {meta.joining && (
            <View style={[jcStyles.pill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[jcStyles.pillTxt, { color: theme.textSecondary }]}>{meta.joining === 'immediate' ? '⚡ Immediate' : '📅 Flexible'}</Text>
            </View>
          )}
        </View>
        <View style={jcStyles.footer}>
          <Ionicons name="location-outline" size={11} color={theme.textLight} />
          <Text style={[jcStyles.loc, { color: theme.textLight }]}>{meta.location || item.city}</Text>
          <Text style={[jcStyles.date, { color: theme.textLight }]}>
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const jcStyles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: 10, overflow: 'hidden' },
  accentBar: { width: 5 },
  body: { flex: 1, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fonts.sizes.md, fontWeight: '700' },
  company: { fontSize: fonts.sizes.sm, marginTop: 1 },
  rate: { fontSize: fonts.sizes.md, fontWeight: '800', color: '#00C48C' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, borderWidth: 1 },
  pillTxt: { fontSize: 11, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loc: { flex: 1, fontSize: 11 },
  date: { fontSize: 11 },
});

function HousingCard({ item, onPress, theme }) {
  const hasImg = item.images?.length > 0;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[hcStyles.card, { backgroundColor: theme.card, ...shadows.medium }]}>
      <View style={hcStyles.imgWrap}>
        {hasImg
          ? <Image source={{ uri: item.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <LinearGradient colors={['#FF6B6B','#E84393']} style={StyleSheet.absoluteFill}><View style={hcStyles.placeholder}><Text style={{ fontSize: 40 }}>🏠</Text></View></LinearGradient>
        }
        <LinearGradient colors={['transparent','rgba(15,10,30,0.7)']} style={hcStyles.imgGradient} />
        {item.is_boosted && (
          <LinearGradient colors={['#F4A833','#FF6B6B']} style={hcStyles.boostBadge}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={hcStyles.boostText}>Featured</Text>
          </LinearGradient>
        )}
        {item.price && (
          <View style={hcStyles.priceBadge}>
            <Text style={hcStyles.priceText}>${item.price}</Text>
            <Text style={hcStyles.priceUnit}>/mo</Text>
          </View>
        )}
      </View>
      <View style={hcStyles.body}>
        <Text style={[hcStyles.title, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
        {item.description ? <Text style={[hcStyles.desc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
        <View style={hcStyles.meta}>
          <Ionicons name="location-outline" size={12} color={theme.textLight} />
          <Text style={[hcStyles.loc, { color: theme.textLight }]}>{item.city}, {item.state}</Text>
          <Text style={[hcStyles.dot, { color: theme.textLight }]}>·</Text>
          <Text style={[hcStyles.date, { color: theme.textLight }]}>
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const hcStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, marginBottom: 10, overflow: 'hidden' },
  imgWrap: { height: 170, position: 'relative' },
  imgGradient: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boostBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  boostText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  priceBadge: { position: 'absolute', bottom: 10, left: 12, flexDirection: 'row', alignItems: 'baseline', gap: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 4 },
  priceText: { color: '#fff', fontWeight: '800', fontSize: fonts.sizes.lg },
  priceUnit: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  body: { padding: 14 },
  title: { fontSize: fonts.sizes.lg, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: fonts.sizes.sm, lineHeight: 19, marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loc: { flex: 1, fontSize: 12 },
  dot: { fontSize: 12 },
  date: { fontSize: 12 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BrowseListingsScreen({ navigation, route }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(route.params?.category ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const appliedParamCategory = useRef(route.params?.category ?? null);

  useFocusEffect(
    React.useCallback(() => {
      const incoming = route.params?.category ?? null;
      if (incoming !== appliedParamCategory.current) {
        appliedParamCategory.current = incoming;
        setSelectedCategory(incoming);
      } else {
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
    } catch {
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
      } catch {}
    } else if (text.length === 0) {
      fetchListings();
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }

  function handleCategorySelect(id) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(id);
  }

  function buildRenderData(data) {
    const result = [];
    let pendingGrid = null;
    for (const item of data) {
      const isGrid = item.category === 'buysell' || item.category === 'food' || !item.category;
      if (isGrid) {
        if (pendingGrid) { result.push({ __type: 'grid_pair', left: pendingGrid, right: item }); pendingGrid = null; }
        else { pendingGrid = item; }
      } else {
        if (pendingGrid) { result.push({ __type: 'grid_pair', left: pendingGrid, right: null }); pendingGrid = null; }
        result.push(item);
      }
    }
    if (pendingGrid) result.push({ __type: 'grid_pair', left: pendingGrid, right: null });
    return result;
  }

  function renderItem({ item }) {
    if (item.__type === 'grid_pair') {
      return (
        <View style={styles.gridRow}>
          <GridCard item={item.left} onPress={() => navigation.navigate('ListingDetail', { listing: item.left })} theme={theme} />
          {item.right
            ? <GridCard item={item.right} onPress={() => navigation.navigate('ListingDetail', { listing: item.right })} theme={theme} />
            : <View style={{ width: CARD_W }} />
          }
        </View>
      );
    }
    if (item.category === 'jobs') return <JobCard item={item} onPress={() => navigation.navigate('ListingDetail', { listing: item })} theme={theme} />;
    if (item.category === 'accommodation') return <HousingCard item={item} onPress={() => navigation.navigate('ListingDetail', { listing: item })} theme={theme} />;
    return null;
  }

  const activeCat = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];
  const renderData = buildRenderData(listings);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Marketplace</Text>
            <View style={styles.cityRow}>
              <Ionicons name="location" size={11} color="#F4A833" />
              <Text style={styles.cityText}>St. Louis, MO</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('PostListing', { preselectedCategory: selectedCategory }); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#F4A833','#FF6B6B']} style={styles.postBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.postBtnTxt}>Post</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search listings..."
          style={styles.searchBar}
        />
      </LinearGradient>

      {/* Category chips */}
      <View style={[styles.chipsWrapper, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity key={cat.label} onPress={() => handleCategorySelect(cat.id)} style={styles.chipWrap} activeOpacity={0.8}>
                {isActive
                  ? <LinearGradient colors={cat.gradient} style={styles.chip} start={{x:0,y:0}} end={{x:1,y:0}}>
                      <Ionicons name={cat.icon} size={13} color="#fff" />
                      <Text style={[styles.chipTxt, styles.chipTxtActive]}>{cat.label}</Text>
                    </LinearGradient>
                  : <View style={[styles.chip, styles.chipInactive, { borderColor: theme.border, backgroundColor: theme.card }]}>
                      <Ionicons name={`${cat.icon}-outline`} size={13} color={theme.textSecondary} />
                      <Text style={[styles.chipTxt, { color: theme.textSecondary }]}>{cat.label}</Text>
                    </View>
                }
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Food banner */}
      {selectedCategory === 'food' && (
        <TouchableOpacity
          style={[styles.foodBanner, { backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('PostListing', { preselectedCategory: 'food' })}
          activeOpacity={0.85}
        >
          <Text style={styles.foodEmoji}>🍱</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.foodTitle, { color: theme.textPrimary }]}>Got a tiffin or food business?</Text>
            <Text style={[styles.foodSub, { color: theme.textSecondary }]}>List your home kitchen or catering — reach your community in minutes.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#F4A833" />
        </TouchableOpacity>
      )}

      {/* Content */}
      {loading ? (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {[0,1,2].map(i => <ListItemSkeleton key={i} />)}
        </ScrollView>
      ) : fetchError ? (
        <EmptyState type="search" title="Couldn't load listings" body="Check your connection and try again." ctaLabel="Retry" onCta={fetchListings} />
      ) : listings.length === 0 ? (
        <EmptyState type="listings" title="No listings yet" body="Be the first to post in your community!" ctaLabel="Post a Listing" onCta={() => navigation.navigate('PostListing')} />
      ) : (
        <FlatList
          data={renderData}
          keyExtractor={(item, i) => item.__type === 'grid_pair' ? `pair-${i}` : item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F4A833" colors={['#F4A833']} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cityText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: borderRadius.full, ...shadows.glow },
  postBtnTxt: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '700' },
  searchBar: { marginTop: 2 },

  chipsWrapper: { borderBottomWidth: 1 },
  chipsRow: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  chipWrap: {},
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: borderRadius.full },
  chipInactive: { borderWidth: 1.5 },
  chipTxt: { fontSize: fonts.sizes.sm, fontWeight: '600' },
  chipTxtActive: { color: '#fff' },

  foodBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, marginBottom: 0, padding: 14, borderRadius: borderRadius.lg, ...shadows.small },
  foodEmoji: { fontSize: 28 },
  foodTitle: { fontSize: fonts.sizes.sm, fontWeight: '700', marginBottom: 2 },
  foodSub: { fontSize: 11, lineHeight: 16 },

  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  listContent: { padding: spacing.md, paddingBottom: 120 },
});
