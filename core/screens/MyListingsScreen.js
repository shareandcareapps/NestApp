// core/screens/MyListingsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import { getMyListings, setListingStatus, deleteListing, renewListing } from '../../features/classifieds/services/listingsService';
import MarkSoldModal from '../components/MarkSoldModal';

const categoryColors = { accommodation: '#E63946', jobs: '#2ECC71', buysell: '#3498DB', food: '#F39C12' };
const categoryEmojis = { accommodation: '🏠', jobs: '💼', buysell: '🛍️', food: '🍱' };

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'archived', label: 'Archived' },
];

export default function MyListingsScreen({ navigation }) {
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('active');
  const [soldModal, setSoldModal] = useState({ visible: false, listing: null });

  const fetchMyListings = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const data = await getMyListings(user.id);
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Refetch whenever the screen regains focus so status changes reflect everywhere
  useFocusEffect(
    useCallback(() => { fetchMyListings(); }, [fetchMyListings])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchMyListings();
    setRefreshing(false);
  }

  function handleDelete(id) {
    Alert.alert('Delete Listing', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteListing(id);
            setListings((prev) => prev.filter((l) => l.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Could not delete listing.');
          }
        },
      },
    ]);
  }

  async function handleRelist(listing) {
    try {
      const updated = await setListingStatus(listing.id, 'active');
      setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
      Alert.alert('Relisted', 'Your listing is live again.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not relist.');
    }
  }

  async function handleArchive(listing) {
    try {
      const updated = await setListingStatus(listing.id, 'archived');
      setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not archive.');
    }
  }

  function onSold(updated) {
    setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleRenew(listing) {
    try {
      const updated = await renewListing(listing.id);
      setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
      Alert.alert('Renewed', 'Your listing is live for another 60 days.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not renew.');
    }
  }

  const statusOf = (l) => l.status || (l.is_active === false ? 'archived' : 'active');

  function expiryInfo(listing) {
    if (!listing.expires_at) return null;
    const now = new Date();
    const exp = new Date(listing.expires_at);
    const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return { daysLeft, isExpired: daysLeft <= 0 };
  }

  const visible = listings.filter((l) => {
    const st = statusOf(l);
    if (tab === 'active') return st === 'active';
    return st !== 'active';
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  function renderCard({ item }) {
    const st = statusOf(item);
    const isSellable = item.category === 'buysell' || item.category === 'food';
    const expiry = expiryInfo(item);
    const isExpired = expiry?.isExpired;
    const expiringSoon = expiry && !isExpired && expiry.daysLeft <= 7;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: isExpired ? '#E63946' : expiringSoon ? '#F39C12' : colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColors[item.category] + '20' }]}>
            <Text style={styles.categoryEmoji}>{categoryEmojis[item.category]}</Text>
            <Text style={[styles.categoryText, { color: categoryColors[item.category] }]}>{item.category}</Text>
          </View>
          {item.price ? (
            <Text style={[styles.price, { color: categoryColors[item.category] }]}>${item.price}</Text>
          ) : null}
        </View>

        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
        {item.description ? (
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.cardMeta}>
          <Text style={[styles.cardDate, { color: colors.textLight }]}>
            Posted {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {isExpired && (
            <View style={[styles.statusBadge, { backgroundColor: '#E6394620' }]}>
              <Text style={{ color: '#E63946', fontSize: 11, fontWeight: '700' }}>⏰ EXPIRED</Text>
            </View>
          )}
          {expiringSoon && (
            <View style={[styles.statusBadge, { backgroundColor: '#F39C1220' }]}>
              <Text style={{ color: '#F39C12', fontSize: 11, fontWeight: '700' }}>⚠️ {expiry.daysLeft}d left</Text>
            </View>
          )}
          {st === 'sold' && !isExpired && (
            <View style={[styles.statusBadge, { backgroundColor: '#2ECC7120' }]}>
              <Text style={{ color: '#2ECC71', fontSize: 11, fontWeight: '700' }}>✓ SOLD</Text>
            </View>
          )}
          {st === 'archived' && !isExpired && (
            <View style={[styles.statusBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>📦 ARCHIVED</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.borderLight }]}>
          {isExpired ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2ECC7115', borderColor: '#2ECC71', flex: 1 }]}
                onPress={() => handleRenew(item)}
              >
                <Text style={{ color: '#1a7a45', fontSize: 12, fontWeight: '700' }}>🔄 Renew for 60 days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={[styles.actionText, { color: colors.error }]}>🗑️</Text>
              </TouchableOpacity>
            </>
          ) : st === 'active' ? (
            <>
              {expiringSoon && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#F39C1215', borderColor: '#F39C12' }]}
                  onPress={() => handleRenew(item)}
                >
                  <Text style={{ color: '#F39C12', fontSize: 12, fontWeight: '600' }}>🔄 Renew</Text>
                </TouchableOpacity>
              )}
              {isSellable && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#2ECC7115', borderColor: '#2ECC71' }]}
                  onPress={() => setSoldModal({ visible: true, listing: item })}
                >
                  <Text style={{ color: '#2ECC71', fontSize: 12, fontWeight: '600' }}>✓ Sold</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.infoBackground, borderColor: colors.info }]}
                onPress={() => navigation.navigate('Classifieds', { screen: 'EditListing', params: { listing: item } })}
              >
                <Text style={[styles.actionText, { color: colors.info }]}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => handleArchive(item)}
              >
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>📦</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2ECC7115', borderColor: '#2ECC71' }]}
                onPress={() => handleRelist(item)}
              >
                <Text style={{ color: '#1a7a45', fontSize: 12, fontWeight: '600' }}>♻️ Relist</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={[styles.actionText, { color: colors.error }]}>🗑️ Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.borderLight }]}>
        {TABS.map((t) => {
          const active = tab === t.id;
          const count = listings.filter((l) =>
            t.id === 'active' ? statusOf(l) === 'active' : statusOf(l) !== 'active'
          ).length;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
                {t.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {visible.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{tab === 'active' ? '📭' : '📦'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {tab === 'active' ? 'No active listings' : 'Nothing archived'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {tab === 'active' ? 'Your live listings will appear here' : 'Sold and archived items live here'}
          </Text>
          {tab === 'active' && (
            <TouchableOpacity
              style={[styles.postButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Classifieds')}
            >
              <Text style={styles.postButtonText}>+ Post a Listing</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          renderItem={renderCard}
        />
      )}

      <MarkSoldModal
        visible={soldModal.visible}
        listing={soldModal.listing}
        sellerId={user.id}
        onClose={() => setSoldModal({ visible: false, listing: null })}
        onSold={onSold}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  postButton: { borderRadius: 12, padding: 14, paddingHorizontal: 24, marginTop: 20 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  categoryEmoji: { fontSize: 14 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  price: { fontSize: 16, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardDescription: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardDate: { fontSize: 11 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  cardActions: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 0.5 },
  actionBtn: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5 },
  actionText: { fontSize: 13, fontWeight: '600' },
});
