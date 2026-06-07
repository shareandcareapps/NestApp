// core/screens/MyListingsScreen.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import { getMyListings, setListingStatus, deleteListing, renewListing } from '../../features/classifieds/services/listingsService';
import MarkSoldModal from '../components/MarkSoldModal';
import EmptyState from '../components/EmptyState';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';

const CAT_META = {
  accommodation: { emoji: '🏠', gradient: ['#FF6B6B','#E84393'],  color: '#FF6B6B' },
  jobs:          { emoji: '💼', gradient: ['#00C48C','#007A5E'],  color: '#00C48C' },
  buysell:       { emoji: '🛍️', gradient: ['#0099FF','#0055CC'],  color: '#0099FF' },
  food:          { emoji: '🍱', gradient: ['#F4A833','#E68A00'],  color: '#F4A833' },
};

const TABS = [
  { id: 'active',   label: 'Active',   icon: 'flash-outline' },
  { id: 'archived', label: 'Archived', icon: 'archive-outline' },
];

function StatusChip({ label, color, bgColor }) {
  return (
    <View style={[chipS.wrap, { backgroundColor: bgColor }]}>
      <Text style={[chipS.txt, { color }]}>{label}</Text>
    </View>
  );
}
const chipS = StyleSheet.create({
  wrap: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  txt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});

function ListingCard({ item, onEdit, onArchive, onDelete, onRelist, onRenew, onMarkSold, theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const meta    = CAT_META[item.category] || { emoji: '📦', gradient: ['#2D1B69','#4A2D9C'], color: '#2D1B69' };
  const status  = item.status || (item.is_active === false ? 'archived' : 'active');
  const isSellable = item.category === 'buysell' || item.category === 'food';

  const expiry = (() => {
    if (!item.expires_at) return null;
    const daysLeft = Math.ceil((new Date(item.expires_at) - new Date()) / 86400000);
    return { daysLeft, isExpired: daysLeft <= 0 };
  })();
  const isExpired    = expiry?.isExpired;
  const expiringSoon = expiry && !isExpired && expiry.daysLeft <= 7;

  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      activeOpacity={1}
    >
      <Animated.View style={[cardS.card, { backgroundColor: theme.card, transform: [{ scale }], borderColor: isExpired ? '#FF6B6B40' : expiringSoon ? '#F4A83340' : theme.border }, shadows.small]}>
        {/* Banner */}
        <LinearGradient colors={meta.gradient} style={cardS.banner} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={cardS.bannerEmoji}>{meta.emoji}</Text>
          <View style={cardS.bannerRight}>
            <View style={cardS.catBadge}><Text style={cardS.catBadgeTxt}>{item.category?.toUpperCase()}</Text></View>
            {item.price ? <Text style={cardS.price}>${item.price}</Text> : null}
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={cardS.body}>
          <View style={cardS.titleRow}>
            <Text style={[cardS.title, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            {/* Status chips */}
            {status === 'sold'     && <StatusChip label="✓ SOLD"     color="#00C48C" bgColor="#00C48C18" />}
            {status === 'archived' && !isExpired && <StatusChip label="📦 ARCHIVED" color={theme.textSecondary} bgColor={theme.border} />}
            {isExpired             && <StatusChip label="⏰ EXPIRED"  color="#FF6B6B" bgColor="#FF6B6B18" />}
            {expiringSoon          && <StatusChip label={`⚡ ${expiry.daysLeft}d left`} color="#F4A833" bgColor="#F4A83318" />}
          </View>
          {item.description && <Text style={[cardS.desc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>}
          <Text style={[cardS.date, { color: theme.textLight }]}>Posted {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>

        {/* Actions */}
        <View style={[cardS.actions, { borderTopColor: theme.border }]}>
          {isExpired ? (
            <>
              <TouchableOpacity style={[cardS.btn, { backgroundColor: '#00C48C18', borderColor: '#00C48C' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRenew(item); }}>
                <Ionicons name="refresh" size={14} color="#00C48C" />
                <Text style={[cardS.btnTxt, { color: '#00C48C' }]}>Renew 60d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cardS.btnIcon, { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(item.id); }}>
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </>
          ) : status === 'active' ? (
            <>
              {expiringSoon && (
                <TouchableOpacity style={[cardS.btn, { backgroundColor: '#F4A83318', borderColor: '#F4A833' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRenew(item); }}>
                  <Ionicons name="refresh" size={14} color="#F4A833" />
                  <Text style={[cardS.btnTxt, { color: '#F4A833' }]}>Renew</Text>
                </TouchableOpacity>
              )}
              {isSellable && (
                <TouchableOpacity style={[cardS.btn, { backgroundColor: '#00C48C18', borderColor: '#00C48C' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onMarkSold(item); }}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#00C48C" />
                  <Text style={[cardS.btnTxt, { color: '#00C48C' }]}>Sold</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[cardS.btn, { backgroundColor: '#0099FF18', borderColor: '#0099FF', flex: 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(item); }}>
                <Ionicons name="pencil-outline" size={14} color="#0099FF" />
                <Text style={[cardS.btnTxt, { color: '#0099FF' }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cardS.btnIcon, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onArchive(item); }}>
                <Ionicons name="archive-outline" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[cardS.btn, { backgroundColor: '#00C48C18', borderColor: '#00C48C', flex: 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRelist(item); }}>
                <Ionicons name="arrow-redo-outline" size={14} color="#00C48C" />
                <Text style={[cardS.btnTxt, { color: '#00C48C' }]}>Relist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cardS.btnIcon, { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(item.id); }}>
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const cardS = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, marginHorizontal: spacing.md, marginBottom: 14, overflow: 'hidden', borderWidth: 1 },
  banner: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  bannerEmoji: { fontSize: 32 },
  bannerRight: { alignItems: 'flex-end', gap: 4 },
  catBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  catBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  price: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  body: { padding: 14, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: fonts.sizes.md, fontWeight: '800', flex: 1 },
  desc: { fontSize: fonts.sizes.sm, lineHeight: 18 },
  date: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10, borderTopWidth: 0.5 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  btnTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  btnIcon: { width: 38, height: 38, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

export default function MyListingsScreen({ navigation }) {
  const user   = useAppStore(s => s.user);
  const theme  = useTheme();
  const insets = useSafeAreaInsets();

  const [listings,    setListings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [tab,         setTab]         = useState('active');
  const [soldModal,   setSoldModal]   = useState({ visible: false, listing: null });

  const fetchMyListings = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const data = await getMyListings(user.id);
      setListings(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchMyListings(); }, [fetchMyListings]));

  async function handleRefresh() { setRefreshing(true); await fetchMyListings(); setRefreshing(false); }

  function handleDelete(id) {
    Alert.alert('Delete Listing', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteListing(id); setListings(p => p.filter(l => l.id !== id)); }
          catch { Alert.alert('Error', 'Could not delete listing.'); }
        }
      },
    ]);
  }

  async function handleRelist(listing) {
    try { const u = await setListingStatus(listing.id, 'active'); setListings(p => p.map(l => l.id === listing.id ? u : l)); Alert.alert('Relisted!', 'Your listing is live again.'); }
    catch (e) { Alert.alert('Error', e?.message || 'Could not relist.'); }
  }

  async function handleArchive(listing) {
    try { const u = await setListingStatus(listing.id, 'archived'); setListings(p => p.map(l => l.id === listing.id ? u : l)); }
    catch (e) { Alert.alert('Error', e?.message || 'Could not archive.'); }
  }

  async function handleRenew(listing) {
    try { const u = await renewListing(listing.id); setListings(p => p.map(l => l.id === listing.id ? u : l)); Alert.alert('Renewed!', 'Your listing is live for another 60 days.'); }
    catch (e) { Alert.alert('Error', e?.message || 'Could not renew.'); }
  }

  function onSold(updated) { setListings(p => p.map(l => l.id === updated.id ? updated : l)); }

  const statusOf = l => l.status || (l.is_active === false ? 'archived' : 'active');
  const visible  = listings.filter(l => tab === 'active' ? statusOf(l) === 'active' : statusOf(l) !== 'active');

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator size="large" color="#FF6B6B" /></View>;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Listings</Text>
          <View style={{ width: 40 }} />
        </View>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(t => {
            const active = tab === t.id;
            const count  = listings.filter(l => t.id === 'active' ? statusOf(l) === 'active' : statusOf(l) !== 'active').length;
            return (
              <TouchableOpacity key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.id); }}>
                <Ionicons name={t.icon} size={14} color={active ? '#2D1B69' : 'rgba(255,255,255,0.65)'} />
                <Text style={[styles.tabTxt, { color: active ? '#2D1B69' : 'rgba(255,255,255,0.65)' }]}>{t.label}</Text>
                {count > 0 && <View style={[styles.tabBadge, { backgroundColor: active ? '#2D1B6930' : 'rgba(255,255,255,0.2)' }]}><Text style={[styles.tabBadgeTxt, { color: active ? '#2D1B69' : '#fff' }]}>{count}</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {visible.length === 0 ? (
        <EmptyState
          type="listings"
          title={tab === 'active' ? 'No active listings' : 'Nothing archived'}
          body={tab === 'active' ? 'Your live listings will appear here.' : 'Sold and archived items live here.'}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ListingCard
              item={item} theme={theme}
              onEdit={l => navigation.navigate('Classifieds', { screen: 'EditListing', params: { listing: l } })}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onRelist={handleRelist}
              onRenew={handleRenew}
              onMarkSold={l => setSoldModal({ visible: true, listing: l })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B6B" />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
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
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: borderRadius.full, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.12)' },
  tabActive: { backgroundColor: '#fff' },
  tabTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  tabBadge: { borderRadius: borderRadius.full, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeTxt: { fontSize: 11, fontWeight: '700' },
});
