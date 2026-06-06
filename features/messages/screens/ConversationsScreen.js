// features/messages/screens/ConversationsScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, TextInput, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getConversations, getUnreadCountPerConversation } from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../core/database/index';
import { formatDisplayName } from '../../../core/components/UserProfileModal';
import { getPendingVerificationForBuyer, resolveVerification } from '../../../core/services/salesService';
import RatingModal from '../../../core/components/RatingModal';

function ConversationCard({ item, currentUserId, hasUnread, onPress, colors }) {
  const otherUserId = item.participant_1 === currentUserId
    ? item.participant_2
    : item.participant_1;

  const name = formatDisplayName(item.otherProfile?.username);
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const timeAgo = (date) => {
    const diff = new Date() - new Date(date);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const avatarColors = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];
  const colorIndex = name.charCodeAt(0) % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => onPress(item, item.otherProfile || { id: otherUserId, username: name })}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {hasUnread && <View style={[styles.unreadRing, { borderColor: colors.card }]} />}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: colors.textPrimary, fontWeight: hasUnread ? '800' : '600' }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.cardTime, { color: hasUnread ? '#9B59B6' : colors.textLight, fontWeight: hasUnread ? '700' : '400' }]}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>

        {item.listingTitle ? (
          <View style={[styles.listingTag, { backgroundColor: avatarColor + '14' }]}>
            <Ionicons name="pricetag" size={10} color={avatarColor} />
            <Text style={[styles.listingTagText, { color: avatarColor }]} numberOfLines={1}>
              {item.listingTitle}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardBottom}>
          <Text
            style={[styles.cardLastMessage, {
              color: hasUnread ? colors.textPrimary : colors.textSecondary,
              fontWeight: hasUnread ? '600' : '400',
              flex: 1,
            }]}
            numberOfLines={1}
          >
            {item.last_message
              ? `${item.lastSenderId === currentUserId ? 'You: ' : ''}${item.last_message}`
              : 'Start a conversation…'}
          </Text>
          {hasUnread && <View style={styles.badge} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [allConversations, setAllConversations] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const unreadMapRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingVerification, setPendingVerification] = useState(null);
  const [ratingModal, setRatingModal] = useState({ visible: false, toUserId: null, toUsername: null, referenceId: null });
  const user = useAppStore((state) => state.user);
  const unreadConversationIds = useAppStore((state) => state.unreadConversationIds);
  const addUnreadConversation = useAppStore((state) => state.addUnreadConversation);
  const clearUnreadConversation = useAppStore((state) => state.clearUnreadConversation);
  const setInitialUnread = useAppStore((state) => state.setInitialUnread);
  const colors = useTheme();

  // Keep ref in sync for subscription closures
  useEffect(() => { unreadMapRef.current = unreadMap; }, [unreadMap]);

  // Sync local unreadMap from store whenever store changes
  useEffect(() => {
    const map = {};
    unreadConversationIds.forEach(id => { map[id] = true; });
    setUnreadMap(map);
    unreadMapRef.current = map;
  }, [unreadConversationIds]);

  const allConversationsRef = useRef([]);

  async function refreshPendingVerification() {
    if (!user?.id) return;
    try {
      const pending = await getPendingVerificationForBuyer(user.id);
      setPendingVerification(pending);
    } catch (e) {
      console.error('pending verification check:', e);
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    fetchConversations();

    const channel = supabase
      .channel('conversations-watch')
      // New messages → refresh conversation list
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new;
          const data = await getConversations(user.id).catch(() => null);
          if (!data) return;
          const fromOther = newMsg.sender_id && newMsg.sender_id !== user.id;
          const alreadyUnread = unreadMapRef.current[newMsg.conversation_id];
          if (fromOther && !alreadyUnread) addUnreadConversation(newMsg.conversation_id);
          allConversationsRef.current = data;
          setAllConversations(data);
          setConversations(data);
        }
      )
      // New sale verification targeting this user as buyer → show banner instantly
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sale_verifications', filter: `buyer_id=eq.${user.id}` },
        () => refreshPendingVerification()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Re-check pending verification every time the tab regains focus (robust fallback to realtime)
  useFocusEffect(
    useCallback(() => { refreshPendingVerification(); }, [user?.id])
  );

  async function fetchConversations() {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const [data, unreadPerConv] = await Promise.all([
        getConversations(user.id),
        getUnreadCountPerConversation(user.id),
      ]);
      setAllConversations(data);
      setConversations(data);
      allConversationsRef.current = data;
      const ids = Object.keys(unreadPerConv);
      setInitialUnread(ids);
      await refreshPendingVerification();
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPurchase(verify) {
    if (!pendingVerification) return;
    const current = pendingVerification;
    setPendingVerification(null); // dismiss banner immediately

    try {
      await resolveVerification(current, verify);
    } catch (e) {
      Alert.alert('Error', 'Could not update verification. Please try again.');
      setPendingVerification(current); // restore on failure
      return;
    }

    if (verify) {
      setRatingModal({
        visible: true,
        toUserId: current.seller_id,
        toUsername: current.seller?.username,
        referenceId: current.listing?.id,
      });
    } else {
      Alert.alert('Noted', 'Thank you for letting us know.');
    }
  }

  function handleSearch(text) {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setConversations(allConversations);
    } else {
      const q = text.toLowerCase();
      setConversations(allConversations.filter(c =>
        c.otherProfile?.username?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q)
      ));
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }

  // During logout the auth user briefly becomes null while this screen is still
  // mounted — render nothing rather than dereferencing user.id.
  if (!user?.id) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.headerBar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Messages</Text>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'transparent', borderWidth: 1, borderRadius: 10, marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7 }]}>
          <Ionicons name="search-outline" size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: '#fff', flex: 1 }]}
            placeholder="Search conversations..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </SafeAreaView>
      {/* Purchase verification banner — always visible, outside list/empty state */}
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
            <TouchableOpacity
              style={[styles.verifyBtn, { backgroundColor: '#2ECC71' }]}
              activeOpacity={0.85}
              onPress={() => handleVerifyPurchase(true)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.verifyBtnText}>Yes, I bought it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyBtnOutline, { borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => handleVerifyPurchase(false)}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Not me</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B59B6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading messages...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No messages yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Connect with your St. Louis neighbors — contact a listing owner or carpool driver to start chatting
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationCard
              item={item}
              currentUserId={user.id}
              hasUnread={!!unreadMap[item.id]}
              colors={colors}
              onPress={(conversation, otherProfile) => {
                clearUnreadConversation(conversation.id);
                navigation.navigate('Chat', { conversation, otherProfile });
              }}
            />
          )}
          ListHeaderComponent={null}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  searchContainer: { paddingVertical: 10 },
  searchInput: { fontSize: 14, paddingVertical: 10 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 13 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  unreadRing: { position: 'absolute', top: -1, right: -1, width: 15, height: 15, borderRadius: 8, borderWidth: 2.5, backgroundColor: '#9B59B6' },
  cardContent: { flex: 1, gap: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, flex: 1, letterSpacing: -0.2 },
  cardTime: { fontSize: 12, marginLeft: 8 },
  listingTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  listingTagText: { fontSize: 11, fontWeight: '600', maxWidth: 220 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLastMessage: { fontSize: 14 },
  badge: { backgroundColor: '#9B59B6', borderRadius: 5, width: 10, height: 10 },

  // Premium purchase-confirmation card
  verifyCard: { marginHorizontal: 14, marginTop: 12, borderRadius: 18, padding: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  verifyAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#2ECC71' },
  verifyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  verifyIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2ECC71', alignItems: 'center', justifyContent: 'center' },
  verifyTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  verifySub: { fontSize: 12, marginTop: 1 },
  verifyItemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 10, marginBottom: 14, borderWidth: 0.5 },
  verifyItemImage: { width: 46, height: 46, borderRadius: 9 },
  verifyItemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  verifyItemText: { fontSize: 14, fontWeight: '700' },
  verifyItemPrice: { fontSize: 13, fontWeight: '700', color: '#2ECC71', marginTop: 2 },
  verifyActions: { flexDirection: 'row', gap: 10 },
  verifyBtn: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  verifyBtnOutline: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
