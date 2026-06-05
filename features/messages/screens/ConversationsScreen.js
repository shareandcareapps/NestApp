// features/messages/screens/ConversationsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, TextInput } from 'react-native';
import { getConversations, getUnreadCountPerConversation } from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';

function ConversationCard({ item, currentUserId, hasUnread, onPress, colors }) {
  const otherUserId = item.participant_1 === currentUserId
    ? item.participant_2
    : item.participant_1;

  const rawName = item.otherProfile?.username || item.otherProfile?.full_name || 'Community Member';
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
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

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: hasUnread ? colors.surfaceSecondary : colors.card,
        borderBottomColor: colors.borderLight,
      }]}
      onPress={() => onPress(item, item.otherProfile || { id: otherUserId, full_name: name })}
    >
      {/* Avatar */}
      <View style={[styles.avatarWrap]}>
        <View style={[styles.avatar, { backgroundColor: avatarColors[colorIndex] }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {hasUnread && <View style={[styles.onlineDot, { backgroundColor: '#9B59B6' }]} />}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: colors.textPrimary, fontWeight: hasUnread ? '700' : '600' }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.cardTime, { color: hasUnread ? '#9B59B6' : colors.textLight, fontWeight: hasUnread ? '600' : '400' }]}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={[styles.cardLastMessage, {
            color: hasUnread ? colors.textPrimary : colors.textSecondary,
            fontWeight: hasUnread ? '600' : '400',
            flex: 1,
          }]} numberOfLines={1}>
            {item.last_message || 'Start a conversation...'}
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
  const lastSnapshotRef = useRef('');

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(pollConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  async function pollConversations() {
    try {
      const data = await getConversations(user.id);
      if (!data) return;

      const snapshot = data.map(c => `${c.id}:${c.last_message_at}`).join('|');
      if (snapshot === lastSnapshotRef.current) return;
      lastSnapshotRef.current = snapshot;

      // Detect which conversations have new messages FROM THE OTHER PERSON
      data.forEach(conv => {
        const prev = allConversationsRef.current.find(c => c.id === conv.id);
        const isNewer = prev && conv.last_message_at !== prev.last_message_at;
        const fromOther = conv.lastSenderId && conv.lastSenderId !== user.id;
        const alreadyUnread = unreadMapRef.current[conv.id];
        if (isNewer && fromOther && !alreadyUnread) {
          addUnreadConversation(conv.id);
        }
      });

      allConversationsRef.current = data;
      setAllConversations(data);
      setConversations(data);
    } catch (_) {}
  }

  async function fetchConversations() {
    try {
      setLoading(true);
      const [data, unreadPerConv] = await Promise.all([
        getConversations(user.id),
        getUnreadCountPerConversation(user.id),
      ]);
      setAllConversations(data);
      setConversations(data);
      allConversationsRef.current = data;
      lastSnapshotRef.current = data.map(c => `${c.id}:${c.last_message_at}`).join('|');
      // Set initial unread state from DB
      const ids = Object.keys(unreadPerConv);
      setInitialUnread(ids);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
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
        c.otherProfile?.full_name?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q)
      ));
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.headerBar, { backgroundColor: colors.secondary }]}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: colors.secondary }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </SafeAreaView>
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
            Contact a listing owner or ride driver to start chatting
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9B59B6" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '500' },
  searchContainer: { padding: 12 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10, fontSize: 14, color: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardName: { fontSize: 15, flex: 1 },
  cardTime: { fontSize: 12, marginLeft: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLastMessage: { fontSize: 13 },
  badge: { backgroundColor: '#9B59B6', borderRadius: 6, width: 12, height: 12 },
});
