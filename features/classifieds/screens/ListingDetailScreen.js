// features/classifieds/screens/ListingDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, FlatList, Dimensions, Modal, StatusBar, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { getProfile, deleteListing, setListingStatus, setListingStock } from '../services/listingsService';
import { getOrCreateConversation, isUserActive } from '../../messages/services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import UserProfileModal, { formatDisplayName } from '../../../core/components/UserProfileModal';
import MarkSoldModal from '../../../core/components/MarkSoldModal';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const { width, height } = Dimensions.get('window');

const CAT_META = {
  accommodation: { gradient: ['#FF6B6B','#E84393'], label: 'Housing',    icon: 'business',   color: '#FF6B6B' },
  jobs:          { gradient: ['#00C48C','#007A5E'], label: 'Jobs & Work', icon: 'briefcase',  color: '#00C48C' },
  buysell:       { gradient: ['#0099FF','#0055CC'], label: 'Buy & Sell',  icon: 'bag',        color: '#0099FF' },
  food:          { gradient: ['#F4A833','#E68A00'], label: 'Food & Tiffin',icon: 'restaurant',color: '#F4A833' },
};

function DetailChip({ label, value, icon }) {
  const theme = useTheme();
  return (
    <View style={[chipStyles.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {icon && <Ionicons name={icon} size={14} color="#F4A833" style={{ marginBottom: 4 }} />}
      <Text style={[chipStyles.label, { color: theme.textLight }]}>{label}</Text>
      <Text style={[chipStyles.value, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}
const chipStyles = StyleSheet.create({
  wrap: { width: '47%', borderRadius: borderRadius.md, padding: 12, borderWidth: 1 },
  label: { fontSize: 10, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { fontSize: fonts.sizes.sm, fontWeight: '700' },
});

export default function ListingDetailScreen({ route, navigation }) {
  const { listing } = route.params;
  const user = useAppStore((state) => state.user);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isOwner = user?.id === listing.user_id;
  const catMeta = CAT_META[listing.category] || CAT_META.buysell;
  const meta = listing.metadata ? (typeof listing.metadata === 'string' ? JSON.parse(listing.metadata) : listing.metadata) : {};
  const displayLocation = meta?.location || `${listing.city}, ${listing.state}`;

  const [poster, setPoster] = useState(listing.poster || null);
  const [activeImage, setActiveImage] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [soldModalVisible, setSoldModalVisible] = useState(false);
  const [status, setStatus] = useState(listing.status || (listing.is_active === false ? 'archived' : 'active'));
  const images = listing.images || [];
  const isFood = listing.category === 'food';
  const isSellable = listing.category === 'buysell';
  const [vendorActive, setVendorActive] = useState(false);

  useEffect(() => { if (!poster) loadProfile(); }, []);
  useEffect(() => {
    let cancelled = false;
    isUserActive(listing.user_id).then(active => { if (!cancelled) setVendorActive(active); });
    return () => { cancelled = true; };
  }, [listing.user_id]);
  useEffect(() => {
    if (!navigation.canGoBack()) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.navigate('BrowseListings')} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation]);

  async function loadProfile() {
    const profile = await getProfile(listing.user_id);
    if (profile) setPoster(profile);
  }

  async function handleMessage() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const conversation = await getOrCreateConversation(user.id, listing.user_id, listing.id, listing.title);
      navigation.navigate('Chat', {
        conversation,
        otherProfile: poster || { id: listing.user_id, username: 'Community Member' },
        listingTitle: listing.title,
        contextType: 'listing',
      });
    } catch (error) {
      Alert.alert('Could not open chat', error?.message || 'Please try again.');
    }
  }

  async function handleArchive() {
    try {
      await setListingStatus(listing.id, 'archived');
      setStatus('archived');
      Toast.show({ type: 'success', text1: 'Archived', text2: 'Listing moved to your archive.' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message || 'Could not archive.' });
    }
  }

  async function handleRelist() {
    try {
      await setListingStatus(listing.id, 'active');
      setStatus('active');
      Toast.show({ type: 'success', text1: 'Relisted!', text2: 'Your listing is live again.' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message || 'Could not relist.' });
    }
  }

  async function handleToggleStock() {
    const goingOut = status !== 'out_of_stock';
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setListingStock(listing.id, goingOut);
      setStatus(goingOut ? 'out_of_stock' : 'active');
      Toast.show({
        type: 'success',
        text1: goingOut ? 'Marked out of stock' : 'Back in stock!',
        text2: goingOut
          ? 'Hidden from the top of search. Auto-removed after 30 days if not restocked.'
          : 'Your listing is live again for another 60 days.',
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message || 'Could not update stock status.' });
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Listing', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteListing(listing.id);
          Toast.show({ type: 'success', text1: 'Deleted', text2: 'Your listing has been removed.' });
          navigation.goBack();
        } catch {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Could not delete. Try again.' });
        }
      }},
    ]);
  }

  function handleReport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Report this listing',
      'Tell us what\'s wrong with this listing. Our team will review it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: async () => {
          const subject = encodeURIComponent(`Report listing: ${listing.title} (#${listing.id})`);
          const body = encodeURIComponent(
            `I want to report this listing.\n\nListing: ${listing.title}\nCategory: ${listing.category}\nListing ID: ${listing.id}\n\nReason:\n`
          );
          const url = `mailto:support@shareandcareapps.com?subject=${subject}&body=${body}`;
          const ok = await Linking.canOpenURL(url);
          if (ok) Linking.openURL(url);
          else Toast.show({ type: 'info', text1: 'Email us to report', text2: 'support@shareandcareapps.com' });
        }},
      ],
    );
  }

  const posterInitials = poster?.username ? poster.username.charAt(0).toUpperCase() : '?';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Image carousel / hero */}
        {images.length > 0 ? (
          <View style={styles.heroWrap}>
            <FlatList
              data={images}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index }) => (
                <TouchableOpacity activeOpacity={0.95} onPress={() => { setViewerIndex(index); setViewerVisible(true); }}>
                  <Image source={{ uri: item }} style={styles.heroImg} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
            {/* Gradient overlay */}
            <LinearGradient colors={['transparent','rgba(15,10,30,0.5)']} style={styles.heroGradient} />
            {/* Expand hint */}
            <TouchableOpacity style={styles.expandHint} onPress={() => { setViewerIndex(activeImage); setViewerVisible(true); }}>
              <BlurView intensity={40} tint="dark" style={styles.expandBlur}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            {/* Category badge */}
            <LinearGradient colors={catMeta.gradient} style={styles.catBadge}>
              <Ionicons name={catMeta.icon} size={11} color="#fff" />
              <Text style={styles.catBadgeText}>{catMeta.label}</Text>
            </LinearGradient>
            {/* Dots */}
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: activeImage === i ? '#fff' : 'rgba(255,255,255,0.4)', width: activeImage === i ? 18 : 6 }]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <LinearGradient colors={catMeta.gradient} style={[styles.heroBanner, { paddingTop: insets.top + 16 }]}>
            <Ionicons name={catMeta.icon} size={52} color="rgba(255,255,255,0.5)" />
            <Text style={styles.heroBannerLabel}>{catMeta.label}</Text>
            {listing.is_boosted && <Text style={styles.heroBoosted}>⭐ Featured Listing</Text>}
          </LinearGradient>
        )}

        {/* Content */}
        <View style={styles.content}>

          {/* Title + Price */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{listing.title}</Text>
            {listing.price && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>${listing.price}</Text>
              </View>
            )}
          </View>

          {/* Active vendor badge */}
          {vendorActive && (
            <View style={styles.metaRow}>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active vendor · recently replying to messages</Text>
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Job details grid */}
          {listing.category === 'jobs' && meta && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Job Details</Text>
              <View style={styles.chipsGrid}>
                {meta.company ? <DetailChip label="Company" value={meta.company} icon="business-outline" /> : null}
                <DetailChip label="Job Type" value={meta.job_type === 'full_time' ? 'Full Time' : 'Part Time'} icon="time-outline" />
                <DetailChip label="Pay" value={meta.salary_open ? 'Open to discuss' : listing.price ? `$${listing.price}/hr` : '—'} icon="cash-outline" />
                {meta.hours_per_week ? <DetailChip label="Hours/Week" value={`${meta.hours_per_week} hrs`} icon="hourglass-outline" /> : null}
                {meta.location ? <DetailChip label="Location" value={meta.location} icon="location-outline" /> : null}
                {meta.joining ? <DetailChip label="Joining" value={meta.joining === 'immediate' ? '⚡ Immediate' : '📅 Flexible'} icon="calendar-outline" /> : null}
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}

          {/* Description */}
          {listing.description && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Description</Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>{listing.description}</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}

          {/* Buy/Sell detail chips */}
          {listing.category === 'buysell' && meta && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Item Details</Text>
              <View style={styles.chipsGrid}>
                {meta.condition && <DetailChip label="Condition" value={meta.condition === 'new' ? 'Brand New' : meta.condition === 'like_new' ? 'Like New' : meta.condition === 'good' ? 'Good' : 'Fair'} icon="sparkles-outline" />}
                {meta.product_category && <DetailChip label="Category" value={meta.product_category} icon="grid-outline" />}
                {meta.negotiable !== undefined && <DetailChip label="Price" value={meta.negotiable ? 'Negotiable' : 'Fixed Price'} icon="cash-outline" />}
                {meta.pickup_location && <DetailChip label="Pickup" value={meta.pickup_location} icon="location-outline" />}
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}

          {/* Food detail chips */}
          {listing.category === 'food' && meta && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Order Details</Text>
              <View style={styles.chipsGrid}>
                {meta.business_name ? <DetailChip label="Business" value={meta.business_name} icon="storefront-outline" /> : null}
                {meta.negotiable !== undefined && <DetailChip label="Price" value={meta.negotiable ? 'Negotiable' : 'Fixed'} icon="cash-outline" />}
                {meta.pickup !== undefined && <DetailChip label="Pickup" value={meta.pickup ? 'Available' : 'Not available'} icon="bag-outline" />}
                {meta.delivery !== undefined && <DetailChip label="Delivery" value={meta.delivery ? 'Available' : 'Not available'} icon="bicycle-outline" />}
              </View>
              {meta.allergens ? (
                <View style={[styles.allergenBox, { backgroundColor: '#FF6B6B12', borderColor: '#FF6B6B30' }]}>
                  <Ionicons name="alert-circle-outline" size={15} color="#FF6B6B" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.allergenLabel, { color: '#FF6B6B' }]}>Allergen & Ingredient Info</Text>
                    <Text style={[styles.allergenText, { color: theme.textSecondary }]}>{meta.allergens}</Text>
                  </View>
                </View>
              ) : null}
              <View style={[styles.foodDisclaimer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="restaurant-outline" size={15} color="#F4A833" />
                <Text style={[styles.foodDisclaimerText, { color: theme.textSecondary }]}>
                  Food is prepared and sold by the poster, not NestApp. We do not inspect, license, or guarantee food safety. Ask about ingredients, allergens, and food handling before ordering, and order at your own discretion.
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}

          {/* Accommodation detail chips */}
          {listing.category === 'accommodation' && meta && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Property Details</Text>
              <View style={styles.chipsGrid}>
                {meta.location && <DetailChip label="Area" value={meta.location} icon="location-outline" />}
                {listing.price && <DetailChip label="Rent" value={`$${listing.price}/mo`} icon="home-outline" />}
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}

          {/* Poster card */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Posted By</Text>
          <TouchableOpacity
            style={[styles.posterCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={catMeta.gradient} style={styles.posterAvatar}>
              <Text style={styles.posterInitials}>{posterInitials}</Text>
            </LinearGradient>
            <View style={styles.posterInfo}>
              <Text style={[styles.posterName, { color: theme.textPrimary }]}>{formatDisplayName(poster?.username)}</Text>
              {poster?.seller_rating_count >= 5 && (
                <Text style={styles.posterRating}>{'★'.repeat(Math.round(poster.seller_rating))} {poster.seller_rating?.toFixed(1)} ({poster.seller_rating_count})</Text>
              )}
              <Text style={[styles.posterCity, { color: catMeta.color }]}>
                View profile →
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
          </TouchableOpacity>

          <UserProfileModal visible={profileModalVisible} userId={listing.user_id} onClose={() => setProfileModalVisible(false)} onMessage={!isOwner ? handleMessage : null} />

          {/* Contact (non-owner) */}
          {!isOwner && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <TouchableOpacity onPress={handleMessage} activeOpacity={0.88}>
                <LinearGradient colors={catMeta.gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.contactBtn}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  <Text style={styles.contactBtnText}>{listing.category === 'food' ? 'Message to Order' : 'Send Message'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={[styles.privacyNote, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="shield-checkmark" size={14} color="#00C48C" />
                <Text style={[styles.privacyText, { color: theme.textSecondary }]}>Messages are private — share contact info inside the chat</Text>
              </View>
            </>
          )}

          {/* Owner actions */}
          {isOwner && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Manage Listing</Text>
              {status !== 'active' && (
                <View style={[styles.statusBanner, { backgroundColor: '#00C48C15', borderColor: '#00C48C' }]}>
                  <Ionicons name={status === 'sold' ? 'checkmark-circle' : status === 'out_of_stock' ? 'close-circle' : 'archive'} size={16} color="#00C48C" />
                  <Text style={[styles.statusText, { color: '#00C48C' }]}>
                    {status === 'sold' ? 'This item is marked as sold' : status === 'out_of_stock' ? 'This listing is out of stock' : 'This listing is archived'}
                  </Text>
                </View>
              )}
              {isFood ? (
                <>
                  <TouchableOpacity onPress={handleToggleStock} activeOpacity={0.88} style={{ marginBottom: 10 }}>
                    <LinearGradient colors={status === 'out_of_stock' ? ['#00C48C','#007A5E'] : ['#F4A833','#E68A00']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.ownerBtn}>
                      <Ionicons name={status === 'out_of_stock' ? 'refresh' : 'remove-circle-outline'} size={18} color="#fff" />
                      <Text style={styles.ownerBtnText}>{status === 'out_of_stock' ? 'Back in Stock' : 'Currently Out of Stock'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <View style={styles.ownerRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('EditListing', { listing })} style={[styles.ownerSecBtn, { backgroundColor: '#0099FF15', borderColor: '#0099FF' }]}>
                      <Ionicons name="create-outline" size={16} color="#0099FF" />
                      <Text style={[styles.ownerSecBtnText, { color: '#0099FF' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={[styles.ownerSecBtn, { backgroundColor: '#FF6B6B15', borderColor: '#FF6B6B' }]}>
                      <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                      <Text style={[styles.ownerSecBtnText, { color: '#FF6B6B' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : status === 'active' ? (
                <>
                  {isSellable && (
                    <TouchableOpacity onPress={() => setSoldModalVisible(true)} activeOpacity={0.88} style={{ marginBottom: 10 }}>
                      <LinearGradient colors={['#00C48C','#007A5E']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.ownerBtn}>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.ownerBtnText}>Mark as Sold</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  <View style={styles.ownerRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('EditListing', { listing })} style={[styles.ownerSecBtn, { backgroundColor: '#0099FF15', borderColor: '#0099FF' }]}>
                      <Ionicons name="create-outline" size={16} color="#0099FF" />
                      <Text style={[styles.ownerSecBtnText, { color: '#0099FF' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleArchive} style={[styles.ownerSecBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Ionicons name="archive-outline" size={16} color={theme.textSecondary} />
                      <Text style={[styles.ownerSecBtnText, { color: theme.textSecondary }]}>Archive</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: '#FF6B6B15', borderColor: '#FF6B6B' }]}>
                    <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                    <Text style={[styles.deleteBtnText, { color: '#FF6B6B' }]}>Delete Listing</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.ownerRow}>
                  <TouchableOpacity onPress={handleRelist} style={[styles.ownerSecBtn, { backgroundColor: '#00C48C15', borderColor: '#00C48C' }]}>
                    <Ionicons name="refresh" size={16} color="#00C48C" />
                    <Text style={[styles.ownerSecBtnText, { color: '#00C48C' }]}>Relist</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={[styles.ownerSecBtn, { backgroundColor: '#FF6B6B15', borderColor: '#FF6B6B' }]}>
                    <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                    <Text style={[styles.ownerSecBtnText, { color: '#FF6B6B' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
              <MarkSoldModal visible={soldModalVisible} listing={listing} sellerId={user.id} onClose={() => setSoldModalVisible(false)} onSold={() => setStatus('sold')} />
            </>
          )}

          {/* Safety tip */}
          <View style={[styles.safetyBox, { backgroundColor: '#F4A83312', borderColor: '#F4A83330' }]}>
            <Ionicons name="shield-outline" size={15} color="#F4A833" />
            <Text style={[styles.safetyText, { color: theme.textSecondary }]}>
              Safety tip: Always meet in public. Never send money before seeing the item in person.
            </Text>
          </View>

          {/* Report (non-owner) */}
          {!isOwner && (
            <TouchableOpacity onPress={handleReport} style={styles.reportBtn} activeOpacity={0.7}>
              <Ionicons name="flag-outline" size={14} color={theme.textLight} />
              <Text style={[styles.reportText, { color: theme.textLight }]}>Report this listing</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen viewer */}
      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewer}>
          <StatusBar hidden />
          <FlatList
            data={images} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(item, i) => `${item}-${i}`}
            onMomentumScrollEnd={(e) => setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={styles.viewerImgWrap}>
                <Image source={{ uri: item }} style={styles.viewerImg} resizeMode="contain" />
              </View>
            )}
          />
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <BlurView intensity={40} tint="dark" style={styles.viewerCloseBlur}>
              <Ionicons name="close" size={22} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          {images.length > 1 && (
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>{viewerIndex + 1} / {images.length}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { position: 'relative', height: 280 },
  heroImg: { width, height: 280 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroBack: { position: 'absolute', left: 16, top: 0 },
  heroBackBlur: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  expandHint: { position: 'absolute', top: 12, right: 16 },
  expandBlur: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  catBadge: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 5 },
  catBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  dots: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 4 },
  dot: { height: 6, borderRadius: 3, backgroundColor: '#fff' },

  heroBanner: { height: 200, alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBannerBack: { position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroBannerLabel: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '700' },
  heroBoosted: { color: 'rgba(255,255,255,0.8)', fontSize: fonts.sizes.sm },

  content: { padding: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { flex: 1, fontSize: fonts.sizes.xxl, fontWeight: '800', lineHeight: 30 },
  priceBadge: { backgroundColor: '#F4A83320', borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#F4A833' },
  priceText: { color: '#F4A833', fontSize: fonts.sizes.xl, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: fonts.sizes.sm },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#00C48C18', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C48C' },
  activeText: { fontSize: 12, fontWeight: '700', color: '#00C48C' },
  divider: { height: 1, marginVertical: 16, opacity: 0.5 },
  sectionTitle: { fontSize: fonts.sizes.md, fontWeight: '800', marginBottom: 12 },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  description: { fontSize: fonts.sizes.md, lineHeight: 24 },

  posterCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: borderRadius.lg, padding: 14, borderWidth: 1, marginBottom: 4 },
  posterAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  posterInitials: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  posterInfo: { flex: 1 },
  posterName: { fontSize: fonts.sizes.md, fontWeight: '700' },
  posterRating: { fontSize: fonts.sizes.sm, color: '#F4A833', marginTop: 2 },
  posterCity: { fontSize: fonts.sizes.sm, marginTop: 2 },

  contactBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.medium },
  contactBtnText: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: borderRadius.md, padding: 12, marginTop: 10, borderWidth: 1 },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 17 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: borderRadius.md, padding: 12, marginBottom: 12, borderWidth: 1 },
  statusText: { fontSize: fonts.sizes.sm, fontWeight: '600' },
  ownerBtn: { borderRadius: borderRadius.full, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ownerBtnText: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '700' },
  ownerRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ownerSecBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: borderRadius.md, padding: 13, borderWidth: 1 },
  ownerSecBtnText: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: borderRadius.md, padding: 13, borderWidth: 1, marginBottom: 16 },
  deleteBtnText: { fontSize: fonts.sizes.sm, fontWeight: '700' },

  safetyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 12, marginTop: 8, borderWidth: 1 },
  safetyText: { flex: 1, fontSize: 11, lineHeight: 17 },

  allergenBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 12, marginTop: 12, borderWidth: 1 },
  allergenLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  allergenText: { fontSize: fonts.sizes.sm, lineHeight: 20 },
  foodDisclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 12, marginTop: 10, borderWidth: 1 },
  foodDisclaimerText: { flex: 1, fontSize: 11, lineHeight: 17 },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  reportText: { fontSize: 12, fontWeight: '600' },

  floatingCTA: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.md, paddingTop: 12, overflow: 'hidden' },
  floatingInner: {},
  floatingBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.glow },
  floatingBtnText: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },

  viewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerImgWrap: { width, height, alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width, height: height * 0.8 },
  viewerClose: { position: 'absolute', top: 52, right: 20 },
  viewerCloseBlur: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  viewerCounter: { position: 'absolute', bottom: 52, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  viewerCounterText: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '600' },
});
