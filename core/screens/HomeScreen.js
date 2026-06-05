// core/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';

const categoryConfig = {
  accommodation: { icon: 'business', color: '#E63946', bg: '#FFF5F5', label: 'Housing' },
  jobs: { icon: 'briefcase', color: '#2ECC71', bg: '#F0FFF4', label: 'Jobs' },
  buysell: { icon: 'pricetag', color: '#3498DB', bg: '#EBF8FF', label: 'Buy/Sell' },
  food: { icon: 'restaurant', color: '#F39C12', bg: '#FFFBEB', label: 'Food' },
};

export default function HomeScreen({ navigation }) {
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [listingsRes, profileRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*')
          .eq('is_active', true)
          .neq('category', 'jobs')
          .order('is_boosted', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single(),
      ]);
      if (listingsRes.data) setListings(listingsRes.data);
      if (profileRes.data) {
        const raw = profileRes.data.username || profileRes.data.full_name || '';
        setProfileName(raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '');
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Greeting */}
      <View style={[styles.heroSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          {greeting()}{profileName ? `, ${profileName}` : ''} 👋
        </Text>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          What are you{'\n'}looking for today?
        </Text>
      </View>

      {/* Community Notice */}
      <View style={[styles.communityBox, {
        backgroundColor: colors.infoBackground,
        borderColor: colors.info + '30',
        marginHorizontal: 16,
        marginBottom: 4,
      }]}>
        <Ionicons name="people-outline" size={20} color={colors.info} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.communityTitle, { color: colors.secondary }]}>
            St. Louis Desi Community
          </Text>
          <Text style={[styles.communityText, { color: colors.textSecondary }]}>
            Connect with fellow desis in St. Louis for housing, jobs, car pooling and more.
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={[styles.quickActions, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#E63946' }]}
            onPress={() => navigation.navigate('Classifieds', { screen: 'PostListing' })}
          >
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text style={styles.actionLabel}>Post Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#1D3557' }]}
            onPress={() => navigation.navigate('Rides')}
          >
            <Ionicons name="car-outline" size={22} color="#fff" />
            <Text style={styles.actionLabel}>Find a Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#9B59B6' }]}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            <Text style={styles.actionLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#3498DB' }]}
            onPress={() => navigation.navigate('News')}
          >
            <Ionicons name="newspaper-outline" size={22} color="#fff" />
            <Text style={styles.actionLabel}>News</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Browse by Category */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Browse by Category</Text>
        <View style={styles.categoryGrid}>
          {Object.entries(categoryConfig).map(([key, cat]) => (
            <TouchableOpacity
              key={key}
              style={[styles.categoryCard, {
                backgroundColor: cat.bg,
                borderColor: cat.color + '30',
              }]}
              onPress={() => navigation.navigate('Classifieds')}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon + '-outline'} size={20} color={cat.color} />
              </View>
              <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Listings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Listings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Classifieds')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : listings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="grid-outline" size={32} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No listings yet
            </Text>
            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Classifieds', { screen: 'PostListing' })}
            >
              <Text style={styles.postBtnText}>Post the first listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listingGrid}>
            {listings.map((item) => {
              const cat = categoryConfig[item.category] || categoryConfig.accommodation;
              const photo = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
              const meta = item.metadata
                ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata)
                : null;
              const negotiable = meta?.negotiable;
              const location = meta?.location;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Classifieds', {
                    screen: 'ListingDetail',
                    params: { listing: item },
                  })}
                  activeOpacity={0.85}
                >
                  {/* Photo */}
                  <View style={[styles.listingPhoto, { backgroundColor: cat.bg }]}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.listingPhotoImg} />
                    ) : (
                      <Ionicons name={cat.icon + '-outline'} size={32} color={cat.color} />
                    )}
                  </View>

                  <View style={styles.listingBody}>
                    {/* Category badge */}
                    <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                      <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
                    </View>

                    {/* Title */}
                    <Text style={[styles.listingTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {/* Location */}
                    {location ? (
                      <Text style={[styles.listingLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                        📍 {location}
                      </Text>
                    ) : null}

                    {/* Price + negotiable */}
                    <View style={styles.listingPriceRow}>
                      {item.price ? (
                        <Text style={[styles.listingPrice, { color: cat.color }]}>
                          ${item.price}
                        </Text>
                      ) : (
                        <Text style={[styles.listingPrice, { color: colors.textLight }]}>Free</Text>
                      )}
                      {negotiable && (
                        <View style={[styles.negotiableBadge, { backgroundColor: colors.surfaceSecondary }]}>
                          <Text style={[styles.negotiableText, { color: colors.textSecondary }]}>Neg.</Text>
                        </View>
                      )}
                    </View>

                    {/* Date */}
                    <Text style={[styles.listingTime, { color: colors.textLight }]}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: {
    padding: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  quickActions: {
    padding: 16,
    borderBottomWidth: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 0.5,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
  },
  emptyText: {
    fontSize: 14,
  },
  postBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  postBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  listingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  listingCard: {
    width: '47.5%',
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  listingPhoto: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingPhotoImg: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
  },
  listingBody: {
    padding: 10,
    gap: 4,
  },
  catBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  listingLocation: {
    fontSize: 11,
  },
  listingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listingPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  negotiableBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  negotiableText: {
    fontSize: 9,
    fontWeight: '500',
  },
  listingTime: {
    fontSize: 10,
  },
  communityBox: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 0.5,
  },
  communityTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  communityText: {
    fontSize: 12,
    lineHeight: 17,
  },
});