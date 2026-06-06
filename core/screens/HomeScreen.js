// core/screens/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Image,
  Animated, Dimensions, TouchableWithoutFeedback, SafeAreaView,
} from 'react-native';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;
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
  const profileName = useAppStore((state) => state.profileName);
  const profileEmail = useAppStore((state) => state.profileEmail);
  const profilePoints = useAppStore((state) => state.profilePoints);
  const setProfileName = useAppStore((state) => state.setProfileName);
  const setProfileEmail = useAppStore((state) => state.setProfileEmail);
  const setProfilePoints = useAppStore((state) => state.setProfilePoints);
  const colors = useTheme();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const drawerOpenRef = useRef(false);

  function openDrawer() {
    drawerOpenRef.current = true;
    setDrawerOpen(true);
    Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  function closeDrawer() {
    drawerOpenRef.current = false;
    Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }).start(() => setDrawerOpen(false));
  }

  function toggleDrawer() {
    if (drawerOpenRef.current) closeDrawer(); else openDrawer();
  }

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchData();

    // Refetch listings each time Home regains focus (so sold/archived items drop off)
    const unsubscribe = navigation.addListener('focus', () => { fetchData(); });

    // Realtime: update points pill whenever this user earns points
    const channel = supabase
      .channel(`points-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'point_transactions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const earned = payload.new?.points || 0;
          setProfilePoints((useAppStore.getState().profilePoints ?? 0) + earned);
        }
      )
      .subscribe();

    return () => { unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [listingsRes, profileRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'active')
          .neq('category', 'jobs')
          .order('is_boosted', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('profiles')
          .select('username, points')
          .eq('id', user.id)
          .maybeSingle(),
      ]);
      if (listingsRes.data) setListings(listingsRes.data);
      if (profileRes.data) {
        const raw = profileRes.data.username || '';
        const display = raw.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        setProfileName(display);
        setProfileEmail(user?.email || '');
        setProfilePoints(profileRes.data.points ?? 0);
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

  const initials = profileName ? profileName.slice(0, 2).toUpperCase() : '?';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Light header */}
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.topBar, { backgroundColor: colors.secondary }]}>
          <View>
            <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.6)' }]}>{greeting()}</Text>
            <Text style={[styles.headerTitle, { color: '#fff' }]}>
              {profileName || 'NestApp'}
            </Text>
            <View style={styles.pointsPill}>
              <Text style={styles.pointsPillText}>
                {profilePoints > 0 ? `🏅 ${profilePoints} pts` : '🌱 Start earning points!'}
              </Text>
            </View>
          </View>
          <View style={styles.logoWrap}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>N</Text>
            </View>
          </View>
          <TouchableOpacity onPress={toggleDrawer} accessibilityLabel="Open menu" style={[styles.menuBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Community tag */}
        <View style={[styles.communityTag, { backgroundColor: colors.secondary + '10', borderColor: colors.secondary + '20' }]}>
          <View style={[styles.communityTagIcon, { backgroundColor: colors.secondary + '18' }]}>
            <Ionicons name="people" size={16} color={colors.secondary} />
          </View>
          <Text style={[styles.communityTagText, { color: colors.secondary }]}>
            St. Louis Indian community — find housing, share rides, and connect with neighbors.{' '}
            <Text style={{ fontWeight: '700' }}>Every post helps someone in St. Louis.</Text>{' '}
            The more we share, the stronger we grow. 🤝
          </Text>
        </View>

        {/* Browse by Category */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Browse by Category</Text>
          <View style={styles.categoryGrid}>
            {Object.entries(categoryConfig).map(([key, cat]) => (
              <TouchableOpacity
                key={key}
                style={[styles.categoryCard, { backgroundColor: cat.bg, borderColor: cat.color + '25' }]}
                onPress={() => navigation.navigate('BrowseListingsByCategory', { category: key })}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + '18' }]}>
                  <Ionicons name={cat.icon + '-outline'} size={22} color={cat.color} />
                </View>
                <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#FFF0F1', borderColor: '#E6394620' }]}
              onPress={() => navigation.navigate('PostListing')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E63946' }]}>
                <Ionicons name="pricetag-outline" size={20} color="#fff" />
              </View>
              <Text style={[styles.actionLabel, { color: '#E63946' }]}>Post Listing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#F0FFF4', borderColor: '#2ECC7120' }]}
              onPress={() => navigation.navigate('PostRide')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#2ECC71' }]}>
                <Ionicons name="car-sport-outline" size={20} color="#fff" />
              </View>
              <Text style={[styles.actionLabel, { color: '#2ECC71' }]}>Post Carpool</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Listings */}
        <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 8, marginBottom: 24 }]}>
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
            <View style={[styles.emptyCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Ionicons name="grid-outline" size={32} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No listings in St. Louis yet</Text>
              <TouchableOpacity
                style={[styles.postBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('PostListing')}
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
                    onPress={() => navigation.navigate('ListingDetail', { listing: item })}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.listingPhoto, { backgroundColor: cat.bg }]}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.listingPhotoImg} />
                      ) : (
                        <Ionicons name={cat.icon + '-outline'} size={32} color={cat.color} />
                      )}
                    </View>
                    <View style={styles.listingBody}>
                      <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                        <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
                      </View>
                      <Text style={[styles.listingTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {location ? (
                        <Text style={[styles.listingLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                          📍 {location}
                        </Text>
                      ) : null}
                      <View style={styles.listingPriceRow}>
                        {item.price ? (
                          <Text style={[styles.listingPrice, { color: cat.color }]}>${item.price}</Text>
                        ) : (
                          <Text style={[styles.listingPrice, { color: colors.textLight }]}>Free</Text>
                        )}
                        {negotiable && (
                          <View style={[styles.negotiableBadge, { backgroundColor: colors.surfaceSecondary }]}>
                            <Text style={[styles.negotiableText, { color: colors.textSecondary }]}>Neg.</Text>
                          </View>
                        )}
                      </View>
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

      {/* Drawer backdrop */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View style={[styles.drawerBackdrop, {
            opacity: drawerAnim.interpolate({ inputRange: [-DRAWER_WIDTH, 0], outputRange: [0, 1] }),
          }]} />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer panel */}
      <Animated.View style={[styles.drawer, { backgroundColor: colors.surface, transform: [{ translateX: drawerAnim }] }]}>
        <View style={[styles.drawerHeader, { backgroundColor: colors.secondary }]}>
          <View style={[styles.drawerAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.drawerAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.drawerName}>{profileName || 'Community Member'}</Text>
          <Text style={styles.drawerEmail}>{profileEmail}</Text>
        </View>
        {[
          { emoji: '👤', label: 'Edit Profile', sub: 'Name, phone number', screen: 'EditProfile' },
          { emoji: '🏠', label: 'My Listings', sub: 'View and manage your posts', screen: 'MyListings' },
          { emoji: '🚗', label: 'My Carpools', sub: 'View and manage your carpools', screen: 'MyRides' },
          { emoji: '⚙️', label: 'Settings', sub: 'Theme, preferences', screen: 'Settings' },
        ].map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.drawerItem, { borderBottomColor: colors.border }]}
            onPress={() => { closeDrawer(); navigation.navigate(item.screen); }}
          >
            <Text style={styles.drawerItemEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.drawerItemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.drawerItemSub, { color: colors.textLight }]}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, position: 'relative' },
  logoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  logo: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  greeting: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  pointsPill: { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pointsPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  menuBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  // Community tag
  communityTag: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 14, borderRadius: 14, borderWidth: 1 },
  communityTagIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  communityTagText: { fontSize: 13, lineHeight: 19, flex: 1 },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '500' },

  // Quick actions (4-up grid)
  actionRow: { flexDirection: 'row', gap: 8 },
  actionCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Category grid
  categoryGrid: { flexDirection: 'row', gap: 8 },
  categoryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1 },
  categoryIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 11, fontWeight: '600' },

  // Listings
  loadingContainer: { padding: 20, alignItems: 'center' },
  emptyCard: { borderRadius: 12, padding: 24, alignItems: 'center', gap: 10, borderWidth: 0.5 },
  emptyText: { fontSize: 14 },
  postBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  postBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  listingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  listingCard: { width: '47.5%', borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  listingPhoto: { width: '100%', height: 110, alignItems: 'center', justifyContent: 'center' },
  listingPhotoImg: { width: '100%', height: 110, resizeMode: 'cover' },
  listingBody: { padding: 10, gap: 4 },
  catBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  catBadgeText: { fontSize: 9, fontWeight: '700' },
  listingTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  listingLocation: { fontSize: 11 },
  listingPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listingPrice: { fontSize: 14, fontWeight: '700' },
  negotiableBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  negotiableText: { fontSize: 9, fontWeight: '500' },
  listingTime: { fontSize: 10 },

  // Drawer
  drawerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  drawerHeader: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  drawerAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  drawerAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  drawerName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  drawerEmail: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, gap: 12 },
  drawerItemEmoji: { fontSize: 20 },
  drawerItemLabel: { fontSize: 15, fontWeight: '600' },
  drawerItemSub: { fontSize: 12, marginTop: 1 },
});