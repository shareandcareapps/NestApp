// features/messages/screens/ConversationsScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Alert, Image, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  getConversations, getUnreadCountPerConversation,
  getPersistedReadIds, removePersistedReadConversation,
  getPersistedDeletedIds, persistDeletedConversation,
} from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { supabase } from '../../../core/database/index';
import { formatDisplayName } from '../../../core/components/UserProfileModal';
import { getPendingVerificationForBuyer, resolveVerification } from '../../../core/services/salesService';
import RatingModal from '../../../core/components/RatingModal';
import EmptyState from '../../../core/components/EmptyState';
import PulsingDot from '../../../core/components/PulsingDot';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const AVATAR_COLORS = ['#FF6B6B','#2D1B69','#00C48C','#0099FF','#9B59B6','#F4A833'];
const FILTERS       = ['All', 'Classifieds', 'Rides'];
const MSG_PURPLE    = '#9B59B6';

function formatLastMessage(body) {
  if (!body) return '';
  if (body.startsWith('[image]:'))    return 'Photo';
  if (body.startsWith('[location]:')) {
    const addr = body.slice(11).replace(/^[^:]*:/, '').trim();
    return addr || 'Location';
  }
  return body;
}

function timeAgo(date) {
  const diff = new Date() - new Date(date);
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function isRideConversation(item) {
  return item.listing_title?.includes('→');
}

function isOnline(item) {
  // Consider "online" if last message was within 10 minutes
  if (!item.last_message_at) return false;
  return (new Date() - new Date(item.last_message_at)) < 10 * 60 * 1000;
}

// ─── Conversation Card ────────────────────────────────────────────────────────
function ConversationCard({ item, currentUserId, hasUnread, onPress, theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const otherUserId = item.participant_1 === currentUserId ? item.participant_2 : item.participant_1;
  const name        = formatDisplayName(item.otherProfile?.username);
  const initials    = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const isRide      = isRideConversation(item);
  const online      = isOnline(item);

  const contextDate = item.context_date ? new Date(item.context_date) : null;
  const isPastRide  = isRide && contextDate && contextDate < new Date();

  const tagColor   = isRide ? '#00C48C' : '#FF6B6B';
  const tagLabel   = item.listingTitle ? item.listingTitle.replace(/^\w+:\s*/, '') : null;
  const routeLabel = isRide && tagLabel
    ? (() => { const a = tagLabel.indexOf(','); return a > 0 ? tagLabel.slice(0, a).trim() : tagLabel; })()
    : tagLabel;

  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => onPress(item, item.otherProfile || { id: otherUserId, username: name })}
      activeOpacity={1}
      style={{ opacity: isPastRide ? 0.65 : 1 }}
    >
      <Animated.View style={[cStyles.card, { backgroundColor: theme.card, transform: [{ scale }] }]}>
        {/* Avatar */}
        <View style={cStyles.avatarWrap}>
          {item.listingImage
            ? <Image source={{ uri: item.listingImage }} style={cStyles.avatar} resizeMode="cover" />
            : <LinearGradient colors={[avatarColor, avatarColor + 'BB']} style={cStyles.avatar}>
                <Text style={cStyles.avatarTxt}>{initials}</Text>
              </LinearGradient>
          }
          {hasUnread && <PulsingDot size={14} color={MSG_PURPLE} style={cStyles.unreadDot} />}
          {online && !hasUnread && (
            <View style={[cStyles.onlineDot, { borderColor: theme.card }]} />
          )}
        </View>

        <View style={cStyles.body}>
          {/* Row 1: name + tag + time */}
          <View style={cStyles.row1}>
            <Text style={[cStyles.name, { color: theme.textPrimary, fontWeight: hasUnread ? '800' : '600' }]} numberOfLines={1}>{name}</Text>
            {online && <View style={cStyles.onlineBadge}><Text style={cStyles.onlineBadgeTxt}>online</Text></View>}
            {routeLabel && (
              <View style={[cStyles.tag, { backgroundColor: tagColor + '18' }]}>
                <Ionicons name={isRide ? 'car-outline' : 'pricetag-outline'} size={10} color={tagColor} />
                <Text style={[cStyles.tagTxt, { color: tagColor }]} numberOfLines={1}>{routeLabel}</Text>
              </View>
            )}
            <Text style={[cStyles.time, { color: hasUnread ? MSG_PURPLE : theme.textLight, fontWeight: hasUnread ? '700' : '400' }]}>
              {timeAgo(item.last_message_at)}
            </Text>
          </View>

          {/* Row 2: last message + badge */}
          <View style={cStyles.row2}>
            <Text style={[cStyles.lastMsg, { color: hasUnread ? theme.textPrimary : theme.textSecondary, fontWeight: hasUnread ? '600' : '400' }]} numberOfLines={1}>
              {item.last_message
                ? `${item.lastSenderId === currentUserId ? 'You: ' : ''}${formatLastMessage(item.last_message)}`
                : 'Start a conversation…'}
            </Text>
            {hasUnread && <View style={cStyles.badge} />}
            {isPastRide && <View style={[cStyles.pastTag, { backgroundColor: theme.border }]}><Text style={[cStyles.pastTagTxt, { color: theme.textLight }]}>Past ride</Text></View>}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const cStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 13, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  unreadDot: { position: 'absolute', top: -2, right: -2 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: '#00C48C', borderWidth: 2 },
  onlineBadge: { backgroundColor: '#00C48C20', borderRadius: borderRadius.full, paddingHorizontal: 6, paddingVertical: 2 },
  onlineBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#00C48C' },
  body: { flex: 1, gap: 4 },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: fonts.sizes.md, letterSpacing: -0.2, flexShrink: 0 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 1, maxWidth: 120 },
  tagTxt: { fontSize: 11, fontWeight: '600' },
  time: { fontSize: 12, marginLeft: 'auto', flexShrink: 0 },
  row2: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lastMsg: { fontSize: fonts.sizes.sm, flex: 1 },
  badge: { width: 10, height: 10, borderRadius: 5, backgroundColor: MSG_PURPLE },
  pastTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pastTagTxt: { fontSize: 10, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ConversationsScreen({ navigation }) {
  const [allConversations,  setAllConversations]  = useState([]);
  const [unreadMap,         setUnreadMap]         = useState({});
  const unreadMapRef        = useRef({});
  const allConversationsRef = useRef([]);
  const deletedIdsRef       = useRef(new Set()); // client-side deleted IDs, never come back
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [showSearch,        setShowSearch]        = useState(false);
  const searchRef = useRef(null);
  const searchHeightAnim = useRef(new Animated.Value(0)).current;

  function toggleSearch() {
    const opening = !showSearch;
    setShowSearch(opening);
    Animated.spring(searchHeightAnim, { toValue: opening ? 1 : 0, useNativeDriver: false, tension: 70, friction: 12 }).start();
    if (opening) { setTimeout(() => searchRef.current?.focus(), 150); }
    else { setSearchQuery(''); searchRef.current?.blur(); }
  }
  const [activeFilter,      setActiveFilter]      = useState('All');
  const [pendingVerification, setPendingVerification] = useState(null);
  const [ratingModal, setRatingModal] = useState({ visible: false, toUserId: null, toUsername: null, referenceId: null });

  const user                    = useAppStore(s => s.user);
  const unreadConversationIds   = useAppStore(s => s.unreadConversationIds);
  const addUnreadConversation   = useAppStore(s => s.addUnreadConversation);
  const clearUnreadConversation = useAppStore(s => s.clearUnreadConversation);
  const setInitialUnread        = useAppStore(s => s.setInitialUnread);
  const theme                   = useTheme();
  const insets                  = useSafeAreaInsets();

  useEffect(() => { unreadMapRef.current = unreadMap; }, [unreadMap]);
  useEffect(() => {
    const map = {};
    unreadConversationIds.forEach(id => { map[id] = true; });
    setUnreadMap(map); unreadMapRef.current = map;
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new;
        // Never resurface a deleted conversation
        if (deletedIdsRef.current.has(newMsg.conversation_id)) return;
        const data = await getConversations(user.id).catch(() => null);
        if (!data) return;
        // Strip deleted conversations from realtime updates too
        const visible = data.filter(c => !deletedIdsRef.current.has(c.id));
        const fromOther = newMsg.sender_id && newMsg.sender_id !== user.id;
        if (fromOther && !unreadMapRef.current[newMsg.conversation_id]) {
          addUnreadConversation(newMsg.conversation_id);
          removePersistedReadConversation(user.id, newMsg.conversation_id);
        }
        allConversationsRef.current = visible;
        setAllConversations(visible);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sale_verifications', filter: `buyer_id=eq.${user.id}` }, () => refreshPendingVerification())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { refreshPendingVerification(); }, [user?.id]));

  async function fetchConversations() {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const [data, unreadPerConv, persistedRead, deletedIds] = await Promise.all([
        getConversations(user.id),
        getUnreadCountPerConversation(user.id),
        getPersistedReadIds(user.id),
        getPersistedDeletedIds(user.id),
      ]);
      // Keep deleted set in memory so realtime handler can check synchronously
      deletedIdsRef.current = deletedIds;
      // Filter out client-side deleted conversations — ground truth
      const visible = data.filter(c => !deletedIds.has(c.id));
      setAllConversations(visible);
      allConversationsRef.current = visible;
      // Only mark as unread if: DB says unread AND user hasn't read it AND it's not deleted
      const trueUnread = Object.keys(unreadPerConv).filter(
        id => !persistedRead.has(id) && !deletedIds.has(id)
      );
      setInitialUnread(trueUnread);
      await refreshPendingVerification();
    } catch (e) { console.error('fetchConversations:', e); }
    finally { setLoading(false); }
  }

  async function handleVerifyPurchase(verify) {
    if (!pendingVerification) return;
    const current = pendingVerification;
    setPendingVerification(null);
    try {
      await resolveVerification(current, verify);
    } catch (e) {
      Alert.alert('Error', 'Could not update verification. Please try again.');
      setPendingVerification(current); return;
    }
    if (verify) {
      setRatingModal({ visible: true, toUserId: current.seller_id, toUsername: current.seller?.username, referenceId: current.listing?.id });
    } else {
      Alert.alert('Noted', 'Thank you for letting us know.');
    }
  }

  async function handleRefresh() { setRefreshing(true); await fetchConversations(); setRefreshing(false); }

  async function handleDeleteConversation(item, swipeRef) {
    Alert.alert('Delete Conversation', 'This will permanently delete this conversation and all its messages.', [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          // 1. Remove from UI immediately — never wait for network
          setAllConversations(prev => prev.filter(c => c.id !== item.id));
          allConversationsRef.current = allConversationsRef.current.filter(c => c.id !== item.id);

          // 2. Mark as deleted in memory ref so realtime handler ignores it
          deletedIdsRef.current = new Set([...deletedIdsRef.current, item.id]);

          // 3. Persist to AsyncStorage — this is the ground truth that survives re-login
          await persistDeletedConversation(user.id, item.id);

          // 4. Clear unread state for this conversation
          clearUnreadConversation(item.id);
          removePersistedReadConversation(user.id, item.id);

          // 5. Best-effort DB delete (may fail due to RLS — doesn't matter, steps 2-4 cover it)
          try {
            await supabase.from('messages').delete().eq('conversation_id', item.id);
            await supabase.from('conversations').delete().eq('id', item.id);
          } catch (e) {
            console.warn('DB delete failed (conversation hidden client-side):', e?.message);
          }
        },
      },
    ]);
  }

  function getFiltered() {
    let list = allConversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.otherProfile?.username?.toLowerCase().includes(q) || c.last_message?.toLowerCase().includes(q) || c.listing_title?.toLowerCase().includes(q));
    }
    if (activeFilter === 'Classifieds') list = list.filter(c => c.listing_id !== null && !isRideConversation(c));
    else if (activeFilter === 'Rides')  list = list.filter(c => isRideConversation(c));
    return list;
  }

  const filtered = getFiltered();
  const totalUnread = Object.keys(unreadMap).length;

  if (!user) return null;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerSpecular} pointerEvents="none" />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            {totalUnread > 0 && (
              <View style={styles.unreadBanner}>
                <View style={styles.unreadDotSmall} />
                <Text style={styles.unreadBannerTxt}>{totalUnread} unread conversation{totalUnread !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={toggleSearch} style={styles.iconBtn} activeOpacity={0.8}>
            <Ionicons name={showSearch ? 'close' : 'search'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Expandable search */}
        <Animated.View style={{ height: searchHeightAnim.interpolate({ inputRange: [0,1], outputRange: [0, 48] }), overflow: 'hidden', marginBottom: searchHeightAnim.interpolate({ inputRange: [0,1], outputRange: [0, 10] }) }}>
          <View style={[styles.searchWrap, { borderColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search conversations…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f;
            return (
              <TouchableOpacity key={f} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveFilter(f); }} style={[styles.filterTab, isActive && styles.filterTabActive]}>
                <Text style={[styles.filterTabTxt, { color: isActive ? '#2D1B69' : 'rgba(255,255,255,0.75)' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Purchase Verification Banner */}
      {!loading && pendingVerification && (
        <View style={[styles.verifyCard, { backgroundColor: theme.card }, shadows.small]}>
          <View style={styles.verifyAccent} />
          <View style={styles.verifyHeaderRow}>
            <View style={styles.verifyIconCircle}><Ionicons name="bag-check" size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyTitle, { color: theme.textPrimary }]}>Confirm your purchase</Text>
              <Text style={[styles.verifySub, { color: theme.textLight }]}>{formatDisplayName(pendingVerification.seller?.username)} marked this as sold to you</Text>
            </View>
          </View>
          <View style={[styles.verifyItem, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            {pendingVerification.displayImage
              ? <Image source={{ uri: pendingVerification.displayImage }} style={styles.verifyItemImg} />
              : <View style={[styles.verifyItemImg, { backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="cube-outline" size={20} color={theme.textLight} /></View>
            }
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyItemTxt, { color: theme.textPrimary }]} numberOfLines={1}>{pendingVerification.displayTitle || 'Item'}</Text>
              {pendingVerification.displayPrice != null && <Text style={styles.verifyItemPrice}>${pendingVerification.displayPrice}</Text>}
            </View>
          </View>
          <View style={styles.verifyActions}>
            <TouchableOpacity style={[styles.verifyBtn, { backgroundColor: '#00C48C' }]} onPress={() => handleVerifyPurchase(true)}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.verifyBtnTxt}>Yes, I bought it</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.verifyBtnOutline, { borderColor: theme.border }]} onPress={() => handleVerifyPurchase(false)}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: fonts.sizes.sm }}>Not me</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={MSG_PURPLE} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState
          type="messages"
          title={searchQuery ? 'No results' : `No ${activeFilter === 'All' ? 'messages' : activeFilter.toLowerCase()} yet`}
          body={searchQuery ? 'Try a different search term.' : 'Connect with neighbors through listings or carpool posts.'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const swipeRef = React.createRef();

            const renderLeftActions = (progress, dragX) => {
              const scale = dragX.interpolate({ inputRange: [0, 80], outputRange: [0.8, 1], extrapolate: 'clamp' });
              return (
                <TouchableOpacity
                  style={styles.archiveAction}
                  onPress={() => { swipeRef.current?.close(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.85}
                >
                  <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 4 }}>
                    <Ionicons name="archive-outline" size={22} color="#fff" />
                    <Text style={styles.swipeActionTxt}>Archive</Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            };

            const renderRightActions = () => (
              <TouchableOpacity style={styles.deleteAction} onPress={() => handleDeleteConversation(item, swipeRef)} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.swipeActionTxt}>Delete</Text>
              </TouchableOpacity>
            );

            return (
              <Swipeable
                ref={swipeRef}
                renderLeftActions={renderLeftActions}
                renderRightActions={renderRightActions}
                leftThreshold={60}
                rightThreshold={60}
                overshootLeft={false}
                overshootRight={false}
                friction={2}
              >
                <ConversationCard
                  item={item}
                  currentUserId={user?.id}
                  hasUnread={!!unreadMap[item.id]}
                  theme={theme}
                  onPress={(conversation, otherProfile) => {
                    clearUnreadConversation(conversation.id);
                    navigation.navigate('Chat', {
                      conversation,
                      otherProfile,
                      listingTitle: conversation.listingTitle || null,
                      contextType: isRideConversation(conversation) ? 'ride' : (conversation.listing_id ? 'listing' : null),
                      rideContext: isRideConversation(conversation) ? (() => {
                        const title = (conversation.listingTitle || '').replace(/^\w+:\s*/, '');
                        const arrowIdx = title.indexOf('→'), commaIdx = title.indexOf(',');
                        const from = arrowIdx > 0 ? title.slice(0, arrowIdx).trim() : title;
                        const afterArrow = arrowIdx > 0 ? title.slice(arrowIdx + 1).trim() : '';
                        const to = commaIdx > 0 && commaIdx > arrowIdx ? title.slice(arrowIdx + 1, commaIdx).trim() : afterArrow;
                        const datePart = commaIdx > 0 ? title.slice(commaIdx + 1).trim() : null;
                        const dotIdx = datePart?.indexOf(' · ');
                        const date = dotIdx > 0 ? datePart.slice(0, dotIdx) : datePart;
                        const time = dotIdx > 0 ? datePart.slice(dotIdx + 3) : null;
                        return { from, to, date, time, seats: null, poster: formatDisplayName(conversation.otherProfile?.username) };
                      })() : undefined,
                    });
                  }}
                />
              </Swipeable>
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={MSG_PURPLE} />}
          showsVerticalScrollIndicator={false}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 14 },
  headerSpecular: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800' },
  unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  unreadDotSmall: { width: 7, height: 7, borderRadius: 4, backgroundColor: MSG_PURPLE },
  unreadBannerTxt: { color: 'rgba(255,255,255,0.65)', fontSize: fonts.sizes.xs, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.full, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: fonts.sizes.sm },
  filterRow: { paddingBottom: 4, gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.15)' },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabTxt: { fontSize: fonts.sizes.sm, fontWeight: '600' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 0.5, marginLeft: 80 },

  verifyCard: { marginHorizontal: spacing.md, marginTop: 14, borderRadius: borderRadius.xl, padding: 16, overflow: 'hidden' },
  verifyAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#00C48C' },
  verifyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  verifyIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#00C48C', alignItems: 'center', justifyContent: 'center' },
  verifyTitle: { fontSize: fonts.sizes.md, fontWeight: '800' },
  verifySub: { fontSize: fonts.sizes.xs, marginTop: 2 },
  verifyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: borderRadius.md, padding: 10, marginBottom: 14, borderWidth: 1 },
  verifyItemImg: { width: 46, height: 46, borderRadius: 10 },
  verifyItemTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  verifyItemPrice: { fontSize: fonts.sizes.sm, fontWeight: '700', color: '#00C48C', marginTop: 2 },
  verifyActions: { flexDirection: 'row', gap: 10 },
  verifyBtn: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: borderRadius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  verifyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: fonts.sizes.sm },
  verifyBtnOutline: { borderRadius: borderRadius.md, paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  archiveAction: { backgroundColor: '#F4A833', justifyContent: 'center', alignItems: 'center', width: 80, gap: 4 },
  deleteAction: { backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center', width: 80, gap: 4 },
  swipeActionTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
