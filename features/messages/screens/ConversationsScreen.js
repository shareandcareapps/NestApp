// features/messages/screens/ConversationsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, TextInput } from 'react-native';
import { getConversations } from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';

function ConversationCard({ item, currentUserId, onPress, colors }) {
  const otherUserId = item.participant_1 === currentUserId
    ? item.participant_2
    : item.participant_1;

  const name = item.otherProfile?.full_name || 'Community Member';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
        backgroundColor: colors.card,
        borderBottomColor: colors.borderLight,
      }]}
      onPress={() => onPress(item, item.otherProfile || { id: otherUserId, full_name: name })}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColors[colorIndex] }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.cardTime, { color: colors.textLight }]}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>
        <Text style={[styles.cardLastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.last_message || 'Start a conversation...'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [allConversations, setAllConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const user = useAppStore((state) => state.user);
  const colors = useTheme();

  useEffect(() => { fetchConversations(); }, []);

  async function fetchConversations() {
    try {
      setLoading(true);
      const data = await getConversations(user.id);
      setAllConversations(data);
      setConversations(data);
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
              colors={colors}
              onPress={(conversation, otherProfile) => navigation.navigate('Chat', { conversation, otherProfile })}
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
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '600', flex: 1 },
  cardTime: { fontSize: 12 },
  cardLastMessage: { fontSize: 13 },
});