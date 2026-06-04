// features/messages/screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { getMessages, sendMessage, markMessagesAsRead } from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';

function MessageBubble({ item, isMe, colors }) {
  const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.bubbleContainer, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 0.5 }]}>
        <Text style={[styles.bubbleText, { color: isMe ? '#fff' : colors.textPrimary }]}>{item.body}</Text>
      </View>
      <Text style={[styles.bubbleTime, { color: colors.textLight }, isMe ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>
        {time}
      </Text>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { conversation, otherProfile } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const flatListRef = useRef(null);
  const otherName = otherProfile?.full_name || 'Community Member';
  const initials = otherName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarColors = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];
  const colorIndex = otherName.charCodeAt(0) % avatarColors.length;

  useEffect(() => {
    navigation.setOptions({
      title: otherName,
      headerRight: () => (
        <View style={[styles.headerAvatar, { backgroundColor: avatarColors[colorIndex] }]}>
          <Text style={styles.headerAvatarText}>{initials}</Text>
        </View>
      ),
    });
    fetchMessages();
    const subscription = supabaseSubscription();
    return () => subscription?.unsubscribe();
  }, []);

  function supabaseSubscription() {
    const { supabase } = require('../../../core/database/index');
    return supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();
  }

  async function fetchMessages() {
    try {
      setLoading(true);
      const data = await getMessages(conversation.id);
      setMessages(data);
      await markMessagesAsRead(conversation.id, user.id);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
  }

  async function handleSend() {
    if (!message.trim()) return;
    const body = message.trim();
    setMessage('');
    setSending(true);
    try {
      const newMessage = await sendMessage(conversation.id, user.id, body);
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#9B59B6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👋</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Say hello!</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Start the conversation with {otherName}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble item={item} isMe={item.sender_id === user.id} colors={colors} />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
        />
      )}
      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: (!message.trim() || sending) ? colors.border : '#9B59B6' }]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendButtonText}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  messagesList: { padding: 16, paddingBottom: 8 },
  bubbleContainer: { marginBottom: 12, maxWidth: '80%' },
  bubbleRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#9B59B6', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  bubbleTimeRight: { textAlign: 'right' },
  bubbleTimeLeft: { textAlign: 'left' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 0.5, gap: 8 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, borderWidth: 0.5, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});