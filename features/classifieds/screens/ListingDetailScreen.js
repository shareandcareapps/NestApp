// features/classifieds/screens/ListingDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image, FlatList, Dimensions,
} from 'react-native';
import { getProfile, deleteListing } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';

const { width } = Dimensions.get('window');

const categoryColors = { accommodation: '#E63946', jobs: '#2ECC71', buysell: '#3498DB', food: '#F39C12' };
const categoryEmojis = { accommodation: '🏠', jobs: '💼', buysell: '🛍️', food: '🍱' };
const categoryLabels = { accommodation: 'Accommodation', jobs: 'Jobs & Work', buysell: 'Buy & Sell', food: 'Food & Tiffin' };

export default function ListingDetailScreen({ route, navigation }) {
  const { listing } = route.params;
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const isOwner = user?.id === listing.user_id;
  const color = categoryColors[listing.category] || '#E63946';
  const meta = listing.metadata
    ? (typeof listing.metadata === 'string' ? JSON.parse(listing.metadata) : listing.metadata)
    : null;
  const displayLocation = meta?.location || `${listing.city}, ${listing.state}`;
  const [poster, setPoster] = useState(listing.poster || null);
  const [activeImage, setActiveImage] = useState(0);
  const images = listing.images || [];

  useEffect(() => { if (!poster) loadProfile(); }, []);

  async function loadProfile() {
    const profile = await getProfile(listing.user_id);
    if (profile) setPoster(profile);
  }

  async function handleMessage() {
    try {
      const { getOrCreateConversation } = require('../../../features/messages/services/messagesService');
      const conversation = await getOrCreateConversation(user.id, listing.user_id);
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: { conversation, otherProfile: poster || { full_name: 'Community Member' } },
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open chat. Please try again.');
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(listing.id);
              Alert.alert('Deleted', 'Your listing has been deleted.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Could not delete listing. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {images.length > 0 ? (
        <View style={styles.imageContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.listingImage} resizeMode="cover" />
            )}
          />
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.imageDot, activeImage === i && styles.imageDotActive]} />
              ))}
            </View>
          )}
          <View style={[styles.categoryBadge, { backgroundColor: color }]}>
            <Text style={styles.categoryBadgeText}>
              {categoryEmojis[listing.category]} {categoryLabels[listing.category]}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.banner, { backgroundColor: color + '20' }]}>
          <Text style={styles.bannerEmoji}>{categoryEmojis[listing.category]}</Text>
          {listing.is_boosted && (
            <View style={[styles.boostedBadge, { backgroundColor: colors.warningBackground }]}>
              <Text style={[styles.boostedText, { color: colors.warningText }]}>⭐ Featured Listing</Text>
            </View>
          )}
          <Text style={[styles.categoryLabel, { color }]}>{categoryLabels[listing.category]}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{listing.title}</Text>
          {listing.price && <Text style={[styles.price, { color }]}>${listing.price}</Text>}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>📍 {displayLocation}</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>🕐 {new Date(listing.created_at).toLocaleDateString()}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {listing.category === 'jobs' && meta && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Job Details</Text>
            <View style={styles.jobDetailsGrid}>
              {meta.company ? (
                <View style={[styles.jobDetailItem, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textLight }]}>Business / Store</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.textPrimary }]}>{meta.company}</Text>
                </View>
              ) : null}
              <View style={[styles.jobDetailItem, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={[styles.jobDetailLabel, { color: colors.textLight }]}>Job Type</Text>
                <Text style={[styles.jobDetailValue, { color: colors.textPrimary }]}>
                  {meta.job_type === 'full_time' ? '🕘 Full Time' : '⏰ Part Time'}
                </Text>
              </View>
              <View style={[styles.jobDetailItem, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={[styles.jobDetailLabel, { color: colors.textLight }]}>Pay</Text>
                <Text style={[styles.jobDetailValue, { color: '#27AE60' }]}>
                  {meta.salary_open ? 'Open to discuss' : listing.price ? `$${listing.price}/hr` : '—'}
                </Text>
              </View>
              {meta.hours_per_week ? (
                <View style={[styles.jobDetailItem, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textLight }]}>Hours / Week</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.textPrimary }]}>{meta.hours_per_week} hrs</Text>
                </View>
              ) : null}
              {meta.location ? (
                <View style={[styles.jobDetailItem, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textLight }]}>Work Location</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.textPrimary }]}>{meta.location}</Text>
                </View>
              ) : null}
              {meta.joining ? (
                <View style={[styles.jobDetailItem, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.jobDetailLabel, { color: colors.textLight }]}>Joining</Text>
                  <Text style={[styles.jobDetailValue, { color: colors.textPrimary }]}>
                    {meta.joining === 'immediate' ? '⚡ Immediate' : '📅 Flexible'}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        {listing.description && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{listing.description}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Posted By</Text>
        <View style={[styles.posterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.secondary }]}>
            <Text style={styles.avatarText}>{poster?.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.posterInfo}>
            <Text style={[styles.posterName, { color: colors.textPrimary }]}>
  {poster?.username ? `@${poster.username}` : poster?.full_name || 'Community Member'}
</Text>
            <Text style={[styles.posterCity, { color: colors.textSecondary }]}>St. Louis, Missouri</Text>
          </View>
        </View>

        {/* Contact Button — non owners */}
        {!isOwner && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact</Text>
            <TouchableOpacity
              style={[styles.messageButton, { backgroundColor: color }]}
              onPress={handleMessage}
            >
              <Text style={styles.messageButtonText}>💬 Send Message</Text>
            </TouchableOpacity>
            <View style={[styles.privacyNotice, {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            }]}>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                🔒 Messages are private — you can share contact details inside the chat
              </Text>
            </View>
          </>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Manage Listing</Text>
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={[styles.editButton, {
                  backgroundColor: colors.infoBackground,
                  borderColor: colors.info,
                }]}
                onPress={() => navigation.navigate('EditListing', { listing })}
              >
                <Text style={[styles.editButtonText, { color: colors.info }]}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, {
                  backgroundColor: colors.errorBackground,
                  borderColor: colors.error,
                }]}
                onPress={handleDelete}
              >
                <Text style={[styles.deleteButtonText, { color: colors.error }]}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={[styles.safetyBox, { backgroundColor: colors.warningBackground }]}>
          <Text style={[styles.safetyText, { color: colors.warningText }]}>
            🛡️ Safety tip: Always meet in public places. Never send money before seeing the item or property in person.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: { position: 'relative', height: 250 },
  listingImage: { width, height: 250 },
  imageDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  imageDotActive: { backgroundColor: '#fff', width: 18 },
  categoryBadge: { position: 'absolute', top: 12, left: 12, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  categoryBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  banner: { padding: 30, alignItems: 'center' },
  bannerEmoji: { fontSize: 48, marginBottom: 8 },
  boostedBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  boostedText: { fontSize: 12, fontWeight: '500' },
  categoryLabel: { fontSize: 13, fontWeight: '600' },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  price: { fontSize: 22, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaText: { fontSize: 13 },
  divider: { height: 0.5, marginVertical: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 22 },
  jobDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  jobDetailItem: { width: '47%', borderRadius: 10, padding: 12, borderWidth: 0.5 },
  jobDetailLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  jobDetailValue: { fontSize: 14, fontWeight: '600' },
  posterCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 0.5 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  posterInfo: { flex: 1 },
  posterName: { fontSize: 15, fontWeight: '600' },
  posterCity: { fontSize: 13, marginTop: 2 },
  messageButton: { borderRadius: 12, padding: 15, alignItems: 'center' },
  messageButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  privacyNotice: { borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 0.5 },
  privacyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  ownerActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  editButton: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 0.5 },
  editButtonText: { fontSize: 14, fontWeight: '600' },
  deleteButton: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 0.5 },
  deleteButtonText: { fontSize: 14, fontWeight: '600' },
  safetyBox: { borderRadius: 10, padding: 12, marginTop: 16 },
  safetyText: { fontSize: 12, lineHeight: 18 },
});