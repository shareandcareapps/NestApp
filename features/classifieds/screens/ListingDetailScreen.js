// features/classifieds/screens/ListingDetailScreen.js
// CLASSIFIEDS FEATURE — Listing detail screen
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through listingsService only

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import useAppStore from '../../../core/store/index';

// ─── Category Config ───────────────────────────
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

const categoryLabels = {
  accommodation: 'Accommodation',
  jobs: 'Jobs & Work',
  buysell: 'Buy & Sell',
  food: 'Food & Tiffin',
};

export default function ListingDetailScreen({ route, navigation }) {
  const { listing } = route.params;
  const user = useAppStore((state) => state.user);

  const isOwner = user?.id === listing.user_id;
  const color = categoryColors[listing.category] || '#E63946';

  function handleCall() {
    const phone = listing.profiles?.phone;
    if (!phone) {
      Alert.alert('No phone number', 'This user has not added a phone number.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  }

  function handleWhatsApp() {
    const phone = listing.profiles?.phone;
    if (!phone) {
      Alert.alert('No phone number', 'This user has not added a phone number.');
      return;
    }
    Linking.openURL(`https://wa.me/${phone}`);
  }

  function handleMessage() {
    // Will connect to Messages feature in a later phase
    Alert.alert(
      'Coming Soon',
      'In-app messaging will be available soon!'
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Header Banner */}
      <View style={[styles.banner, { backgroundColor: color + '20' }]}>
        <Text style={styles.bannerEmoji}>
          {categoryEmojis[listing.category]}
        </Text>
        {listing.is_boosted && (
          <View style={styles.boostedBadge}>
            <Text style={styles.boostedText}>⭐ Featured Listing</Text>
          </View>
        )}
        <Text style={[styles.categoryLabel, { color }]}>
          {categoryLabels[listing.category]}
        </Text>
      </View>

      <View style={styles.content}>

        {/* Title and Price */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{listing.title}</Text>
          {listing.price && (
            <Text style={[styles.price, { color }]}>
              ${listing.price}
            </Text>
          )}
        </View>

        {/* Location and Date */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            📍 {listing.city}, {listing.state}
          </Text>
          <Text style={styles.metaText}>
            🕐 {new Date(listing.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Description */}
        {listing.description && (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
            <View style={styles.divider} />
          </>
        )}

        {/* Posted By */}
        <Text style={styles.sectionTitle}>Posted By</Text>
        <View style={styles.posterCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {listing.profiles?.full_name?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.posterInfo}>
            <Text style={styles.posterName}>
              {listing.profiles?.full_name || 'Community Member'}
            </Text>
            <Text style={styles.posterCity}>St. Louis, Missouri</Text>
          </View>
        </View>

        {/* Contact Buttons — only show if not owner */}
        {!isOwner && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: color }]}
                onPress={handleCall}
              >
                <Text style={styles.contactButtonText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                onPress={handleWhatsApp}
              >
                <Text style={styles.contactButtonText}>💬 WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#1D3557' }]}
                onPress={handleMessage}
              >
                <Text style={styles.contactButtonText}>✉️ Message</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <>
            <View style={styles.divider} />
            <View style={styles.ownerBox}>
              <Text style={styles.ownerBoxText}>
                ✅ This is your listing
              </Text>
            </View>
          </>
        )}

        {/* Safety Notice */}
        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>
            🛡️ Safety tip: Always meet in public places. Never send money before seeing the item or property in person.
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  banner: {
    padding: 30,
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  boostedBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  boostedText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 28,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  posterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D3557',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  posterInfo: {
    flex: 1,
  },
  posterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  posterCity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  ownerBox: {
    backgroundColor: '#E8F8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  ownerBoxText: {
    color: '#2ECC71',
    fontWeight: '600',
    fontSize: 14,
  },
  safetyBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  safetyText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});