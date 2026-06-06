// features/messages/screens/ConversationsScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, SafeAreaView, TextInput, Alert, Image, ScrollView,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import {
  getConversations, getUnreadCountPerConversation,
  getPersistedReadIds, removePersistedReadConversation,
} from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../core/database/index';
import { formatDisplayName } from '../../../core/components/UserProfileModal';
import { getPendingVerificationForBuyer, resolveVerification } from '../../../core/services/salesService';
import RatingModal from '../../../core/components/RatingModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];
const FILTERS       = ['All', 'Classifieds', 'Rides'];

function formatLastMessage(body) {
  if (!body) return '';
  if (body.startsWith('[image]:'))    return '📷 Photo';
  if (body.startsWith('[location]:')) {
    const addr = body.slice(11).replace(/^[^:]*:/, '').trim();
    return `📍 ${addr || 'Location'}`;
  }
  return body;
}

function timeAgo(date) {
  const diff  = new Date() - new Date(date);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'now';
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function isRideConversation(item) {
  // Rides have a listing_title containing '→' (formatted as "Carpool: from → to")
  return item.listing_title?.includes('→');
}

// ─── Conversation card ────────────────────────────────────────────────────────
function ConversationCard({ item, currentUserId, hasUnread, onPress, colors }) {
  const otherUserId  = item.participant_1 === currentUserId ? item.participant_2 : item.participant_1;
  const name         = formatDisplayName(item.otherProfile?.username);
  const initials     = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colorIndex   = name.charCodeAt(0) % AVATAR_COLORS.length;
  const avatarColor  = AVATAR_COLORS[colorIndex];
  const isRide       = isRideConversation(item);

  // Ride context date formatting
  const contextDate  = item.context_date ? new Date(item.context_date) : null;
  const isPastRide   = isRide && contextDate && contextDate < new Date();
  const rideLabel    = contextDate
    ? contextDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.card,
        { backgroundColor: colors.card },
        isPastRide && { opacity: 0.65 },
      ]}
      onPress={() => onPress(item, item.otherProfile || { id: otherUserId, username: name })}
    >
      {/* Avatar — listing photo for classifieds, initial for everything else */}
      <View style={styles.avatarWrap}>
        {item.listingImage ? (
          <Image source={{ uri: item.listingImage }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        {hasUnread && <View style={[styles.unreadDot, { borderColor: colors.card }]} />}
      </View>

      <View style={styles.cardContent}>
        {/* Name + chip + time all on one row */}
        <View style={styles.cardHeader}>
          <Text
            style={[styles.cardName, { color: colors.textPrimary, fontWeight: hasUnread ? '800' : '600' }]}
            numberOfLines={1}>
            {name}
          </Text>

          {item.listingTitle && (() => {
            const TINT    = isRide ? '#1ABC9C' : '#E63946';
            const cleaned = item.listingTitle.replace(/^\w+:\s*/, '');
            if (isRide) {
              const commaIdx = cleaned.indexOf(',');
              const route    = commaIdx > 0 ? cleaned.slice(0, commaIdx).trim() : cleaned;
              return (
                <View style={[styles.ctxTag, { backgroundColor: TINT + '14', flexShrink: 1 }]}>
                  <Text style={[styles.ctxTagTxt, { color: TINT }]} numberOfLines={1}>{route}</Text>
                </View>
              );
            }
            return (
              <View style={[styles.ctxTag, { backgroundColor: TINT + '14', flexShrink: 1 }]}>
                <Text style={[styles.ctxTagTxt, { color: TINT }]} numberOfLines={1}>{cleaned}</Text>
              </View>
            );
          })()}

          <Text style={[styles.cardTime, { color: hasUnread ? '#9B59B6' : colors.textLight, fontWeight: hasUnread ? '700' : '400' }]}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>

        {/* Last message + unread badge */}
        <View style={styles.cardBottom}>
          <Text
            style={[styles.cardMsg, {
              color: hasUnread ? colors.textPrimary : colors.textSecondary,
              fontWeight: hasUnread ? '600' : '400',
              flex: 1,
            }]}
            numberOfLines={1}>
            {item.last_message
              ? `${item.lastSenderId === currentUserId ? 'You: ' : ''}${formatLastMessage(item.last_message)}`
              : 'Start a conversation…'}
          </Text>
          {hasUnread && <View style={styles.badge} />}
          {isPastRide && (
            <View style={[styles.archivedBadge, { backgroundColor: colors.border }]}>
              <Text style={[styles.archivedBadgeTxt, { color: colors.textLight }]}>Past ride</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ConversationsScreen({ navigation }) {
  const [allConversations,  setAllConversations]  = useState([]);
  const [unreadMap,         setUnreadMap]         = useState({});
  const unreadMapRef        = useRef({});
  const allConversationsRef = useRef([]);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [activeFilter,      setActiveFilter]      = useState('All');
  const [pendingVerification, setPendingVerification] = useState(null);
  const [ratingModal, setRatingModal] = useState({ visible: false, toUserId: null, toUsername: null, referenceId: null });

  const user                   = useAppStore(s => s.user);
  const unreadConversationIds  = useAppStore(s => s.unreadConversationIds);
  const addUnreadConversation  = useAppStore(s => s.addUnreadConversation);
  const clearUnreadConversation = useAppStore(s => s.clearUnreadConversation);
  const setInitialUnread       = useAppStore(s => s.setInitialUnread);
  const colors                 = useTheme();

  useEffect(() => { unreadMapRef.current = unreadMap; }, [unreadMap]);

  useEffect(() => {
    const map = {};
    unreadConversationIds.forEach(id => { map[id] = true; });
    setUnreadMap(map);
    unreadMapRef.current = map;
  }, [unreadConversationIds]);

  async function refreshPendingVerification() {
    if (!user?.id) return;
    try { setPendingVerification(await getPendingVerificationForBuyer(user.id)); }
    catch (e) { console.error('pending verification:', e); }
  }

  useEffect(() => {
    if (!user?.id) return;
    fetchConversations();

    const channel = supabase
      .channel('conversations-watch')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new;
          const data = await getConversations(user.id).catch(() => null);
          if (!data) return;
          const fromOther = newMsg.sender_id && newMsg.sender_id !== user.id;
          if (fromOther && !unreadMapRef.current[newMsg.conversation_id]) {
            addUnreadConversation(newMsg.conversation_id);
            removePersistedReadConversation(user.id, newMsg.conversation_id);
          }
          allConversationsRef.current = data;
          setAllConversations(data);
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sale_verifications', filter: `buyer_id=eq.${user.id}` },
        () => refreshPendingVerification())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useFocusEffect(useCallback(() => { refreshPendingVerification(); }, [user?.id]));

  async function fetchConversations() {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const [data, unreadPerConv, persistedRead] = await Promise.all([
        getConversations(user.id),
        getUnreadCountPerConversation(user.id),
        getPersistedReadIds(user.id),
      ]);
      setAllConversations(data);
      allConversationsRef.current = data;
      // Remove conversations the user has already read locally — this survives
      // logout/login even if the DB is_read update was blocked by RLS.
      const trueUnread = Object.keys(unreadPerConv).filter(id => !persistedRead.has(id));
      setInitialUnread(trueUnread);
      await refreshPendingVerification();
    } catch (e) {
      console.error('fetchConversations:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPurchase(verify) {
    if (!pendingVerification) return;
    const current = pendingVerification;
    setPendingVerification(null);
    try {
      await resolveVerification(current, verify);
    } catch (e) {
      Alert.alert('Error', 'Could not update verification. Please try again.');
      setPendingVerification(current);
      return;
    }
    if (verify) {
      setRatingModal({ visible: true, toUserId: current.seller_id, toUsername: current.seller?.username, referenceId: current.listing?.id });
    } else {
      Alert.alert('Noted', 'Thank you for letting us know.');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }

  // ── Unified filter (search + category tab) ──────────────────────────────────
  function getFiltered() {
    let list = allConversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.otherProfile?.username?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q) ||
        c.listing_title?.toLowerCase().includes(q)
      );
    }
    if (activeFilter === 'Classifieds') {
      list = list.filter(c => c.listing_id !== null && !isRideConversation(c));
    } else if (activeFilter === 'Rides') {
      list = list.filter(c => isRideConversation(c));
    }
    return list;
  }

  if (!user?.id) return null;
  const filtered = getFiltered();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header + search + filter tabs ── */}
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.headerBar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Messages</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={14} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={[styles.searchInput, { color: '#fff' }]}
            placeholder="Search conversations…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setActiveFilter(f)}>
                <Text style={[styles.filterTabTxt, { color: active ? colors.secondary : 'rgba(255,255,255,0.75)' }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Purchase verification banner ── */}
      {!loading && pendingVerification && (
        <View style={[styles.verifyCard, { backgroundColor: colors.card }]}>
          <View style={styles.verifyAccent} />
          <View style={styles.verifyHeaderRow}>
            <View style={styles.verifyIconCircle}>
              <Ionicons name="bag-check" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyTitle, { color: colors.textPrimary }]}>Confirm your purchase</Text>
              <Text style={[styles.verifySub, { color: colors.textLight }]}>
                {formatDisplayName(pendingVerification.seller?.username)} marked this as sold to you
              </Text>
            </View>
          </View>
          <View style={[styles.verifyItemCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}>
            {pendingVerification.displayImage ? (
              <Image source={{ uri: pendingVerification.displayImage }} style={styles.verifyItemImage} />
            ) : (
              <View style={[styles.verifyItemImage, styles.verifyItemPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="cube-outline" size={20} color={colors.textLight} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyItemText, { color: colors.textPrimary }]} numberOfLines={1}>
                {pendingVerification.displayTitle || 'Item'}
              </Text>
              {pendingVerification.displayPrice != null && (
                <Text style={styles.verifyItemPrice}>${pendingVerification.displayPrice}</Text>
              )}
            </View>
          </View>
          <View style={styles.verifyActions}>
            <TouchableOpacity style={[styles.verifyBtn, { backgroundColor: '#2ECC71' }]} activeOpacity={0.85} onPress={() => handleVerifyPurchase(true)}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.verifyBtnText}>Yes, I bought it</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.verifyBtnOutline, { borderColor: colors.border }]} activeOpacity={0.7} onPress={() => handleVerifyPurchase(false)}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Not me</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── List / empty / loading ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B59B6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading messages…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{activeFilter === 'All' ? '💬' : activeFilter === 'Classifieds' ? '🛍️' : '🚗'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {searchQuery ? 'No results' : `No ${activeFilter === 'All' ? 'messages' : activeFilter.toLowerCase()} yet`}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchQuery
              ? 'Try a different search term'
              : 'Connect with neighbors through listings or carpool posts'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const swipeRef = React.createRef();
            const handleDelete = () => {
              Alert.alert(
                'Delete Conversation',
                'This will permanently delete this conversation and all its messages.',
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
                  {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                      try {
                        await supabase.from('messages').delete().eq('conversation_id', item.id);
                        await supabase.from('conversations').delete().eq('id', item.id);
                        setAllConversations(prev => prev.filter(c => c.id !== item.id));
                      } catch (e) {
                        console.error('delete conversation:', e);
                      }
                    },
                  },
                ],
              );
            };
            const renderRightActions = () => (
              <TouchableOpacity
                style={styles.deleteAction}
                onPress={handleDelete}
                activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.deleteActionTxt}>Delete</Text>
              </TouchableOpacity>
            );
            return (
              <Swipeable
                ref={swipeRef}
                renderRightActions={renderRightActions}
                rightThreshold={60}
                overshootRight={false}
                friction={2}>
                <ConversationCard
                  item={item}
                  currentUserId={user.id}
                  hasUnread={!!unreadMap[item.id]}
                  colors={colors}
                  onPress={(conversation, otherProfile) => {
                    clearUnreadConversation(conversation.id);
                    navigation.navigate('Chat', {
                      conversation,
                      otherProfile,
                      listingTitle: conversation.listingTitle || null,
                      contextType: isRideConversation(conversation)
                        ? 'ride'
                        : (conversation.listing_id ? 'listing' : null),
                      rideContext: isRideConversation(conversation) ? (() => {
                    const title = (conversation.listingTitle || '').replace(/^\w+:\s*/, '');
                    const arrowIdx = title.indexOf('→');
                    const commaIdx = title.indexOf(',');
                    const from = arrowIdx > 0 ? title.slice(0, arrowIdx).trim() : title;
                    const afterArrow = arrowIdx > 0 ? title.slice(arrowIdx + 1).trim() : '';
                    const to = commaIdx > 0 && commaIdx > arrowIdx
                      ? title.slice(arrowIdx + 1, commaIdx).trim()
                      : afterArrow;
                    const datePart = commaIdx > 0 ? title.slice(commaIdx + 1).trim() : null;
                    const dotIdx = datePart?.indexOf(' · ');
                    const date = dotIdx > 0 ? datePart.slice(0, dotIdx) : datePart;
                    const time = dotIdx > 0 ? datePart.slice(dotIdx + 3) : null;
                    const name = formatDisplayName(conversation.otherProfile?.username);
                    return { from, to, date, time, seats: null, poster: name };
                  })() : undefined,
                });
              }}
            />
              </Swipeable>
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 0.5, backgroundColor: colors.borderLight, marginLeft: 83 }} />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9B59B6" />}
        />
      )}

      <RatingModal
        visible={ratingModal.visible}
        toUserId={ratingModal.toUserId}
        toUsername={ratingModal.toUsername}
        type="listing"
        referenceId={ratingModal.referenceId}
        onDone={() => setRatingModal({ visible: false, toUserId: null, toUsername: null, referenceId: null })}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerBar:   { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Filter tabs
  filterRow: { paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabTxt:   { fontSize: 13, fontWeight: '600' },

  // Loading / empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:      { marginTop: 10, fontSize: 14 },
  emptyContainer:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji:       { fontSize: 48, marginBottom: 12 },
  emptyTitle:       { fontSize: 18, fontWeight: '600' },
  emptySubtitle:    { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // Conversation card
  card:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 13 },
  avatarWrap:  { position: 'relative' },
  avatar:      { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText:  { color: '#fff', fontSize: 18, fontWeight: '700' },
  unreadDot:   { position: 'absolute', top: -1, right: -1, width: 15, height: 15, borderRadius: 8, borderWidth: 2.5, backgroundColor: '#9B59B6' },

  cardContent: { flex: 1, gap: 3 },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardName:    { fontSize: 16, flexShrink: 0, letterSpacing: -0.2, paddingTop: 1 },
  cardTime:    { fontSize: 12, marginLeft: 'auto', paddingTop: 1 },

  ctxTag:      { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  ctxTagTxt:   { fontSize: 11, fontWeight: '600', maxWidth: 160 },

  deleteAction:    { backgroundColor: '#E63946', justifyContent: 'center', alignItems: 'center', width: 80, gap: 4 },
  deleteActionTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  ctxTagDate:  { fontSize: 11, fontWeight: '500' },

  cardBottom:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMsg:     { fontSize: 14 },
  badge:       { backgroundColor: '#9B59B6', borderRadius: 5, width: 10, height: 10 },

  archivedBadge:    { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  archivedBadgeTxt: { fontSize: 10, fontWeight: '600' },

  // Purchase verification card
  verifyCard:       { marginHorizontal: 14, marginTop: 12, borderRadius: 18, padding: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  verifyAccent:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#2ECC71' },
  verifyHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  verifyIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2ECC71', alignItems: 'center', justifyContent: 'center' },
  verifyTitle:      { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  verifySub:        { fontSize: 12, marginTop: 1 },
  verifyItemCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 10, marginBottom: 14, borderWidth: 0.5 },
  verifyItemImage:  { width: 46, height: 46, borderRadius: 9 },
  verifyItemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  verifyItemText:   { fontSize: 14, fontWeight: '700' },
  verifyItemPrice:  { fontSize: 13, fontWeight: '700', color: '#2ECC71', marginTop: 2 },
  verifyActions:    { flexDirection: 'row', gap: 10 },
  verifyBtn:        { flex: 1, flexDirection: 'row', gap: 6, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  verifyBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  verifyBtnOutline: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
