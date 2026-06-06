// features/messages/screens/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMessages, sendMessage, markMessagesAsRead } from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { supabase } from '../../../core/database/index';

// Detects phone numbers: (123) 456-7890, 123-456-7890, 1234567890, +1 etc.
const PHONE_REGEX = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/;

const BRAND = '#9B59B6';
const GROUP_GAP_MS = 5 * 60 * 1000; // 5 min — split message groups

const avatarColors = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];

function timeOf(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function MessageRow({ item, isMe, firstOfGroup, lastOfGroup, showDay, showTime, otherInitial, otherColor, isLastSent, onToggleTime, colors }) {
  // Instagram-style grouped corner radii
  const radius = 20, tight = 6;
  const meCorners = {
    borderTopRightRadius: firstOfGroup ? radius : tight,
    borderBottomRightRadius: lastOfGroup ? radius : tight,
    borderTopLeftRadius: radius,
    borderBottomLeftRadius: radius,
  };
  const themCorners = {
    borderTopLeftRadius: firstOfGroup ? radius : tight,
    borderBottomLeftRadius: lastOfGroup ? radius : tight,
    borderTopRightRadius: radius,
    borderBottomRightRadius: radius,
  };

  return (
    <View>
      {showDay && (
        <View style={styles.daySeparator}>
          <Text style={[styles.dayText, { color: colors.textLight, backgroundColor: colors.surfaceSecondary }]}>
            {dayLabel(item.created_at)}
          </Text>
        </View>
      )}

      <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem, { marginTop: firstOfGroup ? 10 : 2 }]}>
        {/* Avatar gutter for received messages */}
        {!isMe && (
          <View style={styles.avatarGutter}>
            {lastOfGroup ? (
              <View style={[styles.smallAvatar, { backgroundColor: otherColor }]}>
                <Text style={styles.smallAvatarText}>{otherInitial}</Text>
              </View>
            ) : <View style={styles.smallAvatar} />}
          </View>
        )}

        <TouchableOpacity activeOpacity={0.85} onPress={onToggleTime} style={{ maxWidth: '76%' }}>
          <View style={[
            styles.bubble,
            isMe ? { backgroundColor: BRAND } : { backgroundColor: colors.surfaceSecondary },
            isMe ? meCorners : themCorners,
          ]}>
            <Text style={[styles.bubbleText, { color: isMe ? '#fff' : colors.textPrimary }]}>{item.body}</Text>
          </View>

          {showTime && (
            <Text style={[styles.timeUnderBubble, { color: colors.textLight, textAlign: isMe ? 'right' : 'left' }]}>
              {timeOf(item.created_at)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Read receipt under the last sent message */}
      {isLastSent && (
        <View style={styles.receiptRow}>
          {item.is_read ? (
            <Text style={[styles.receiptText, { color: BRAND }]}>Seen</Text>
          ) : (
            <Text style={[styles.receiptText, { color: colors.textLight }]}>Delivered</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { conversation, otherProfile, listingTitle } = route.params;
  const productContext = listingTitle || conversation?.listingTitle || null;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPhoneWarning, setShowPhoneWarning] = useState(false);
  const [revealedId, setRevealedId] = useState(null);
  const pendingMessageRef = useRef('');
  const user = useAppStore((state) => state.user);
  const clearUnreadConversation = useAppStore((state) => state.clearUnreadConversation);
  const colors = useTheme();
  const flatListRef = useRef(null);

  const rawOtherName = otherProfile?.username || 'Community Member';
  const otherName = rawOtherName.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const otherInitial = otherName.charAt(0).toUpperCase();
  const otherColor = avatarColors[otherName.charCodeAt(0) % avatarColors.length];

  useEffect(() => {
    fetchMessages();
    markRead();

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      // Incoming/echoed inserts
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          scrollToBottom();
          if (newMsg.sender_id !== user.id) { clearUnreadConversation(conversation.id); markRead(); }
        }
      )
      // Read-receipt updates → live "Seen"
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const upd = payload.new;
          setMessages((prev) => prev.map(m => (m.id === upd.id ? { ...m, ...upd } : m)));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function markRead() {
    try { await markMessagesAsRead(conversation.id, user.id); } catch (_) {}
    clearUnreadConversation(conversation.id);
  }

  async function fetchMessages() {
    try {
      setLoading(true);
      const data = await getMessages(conversation.id);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 80);
  }, []);

  async function doSend(body) {
    setSending(true);
    try {
      const newMessage = await sendMessage(conversation.id, user.id, body);
      setMessages((prev) => (prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]));
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }

  function handleSend() {
    if (!message.trim()) return;
    const body = message.trim();
    if (PHONE_REGEX.test(body)) {
      pendingMessageRef.current = body;
      setShowPhoneWarning(true);
      return;
    }
    setMessage('');
    doSend(body);
  }

  function handleWarningSend() {
    setShowPhoneWarning(false);
    setMessage('');
    doSend(pendingMessageRef.current);
  }

  const lastMyIndex = messages.reduce((last, m, i) => (m.sender_id === user.id ? i : last), -1);

  function renderItem({ item, index }) {
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const isMe = item.sender_id === user.id;
    const t = new Date(item.created_at).getTime();

    const firstOfGroup = !prev || prev.sender_id !== item.sender_id || (t - new Date(prev.created_at).getTime()) > GROUP_GAP_MS;
    const lastOfGroup = !next || next.sender_id !== item.sender_id || (new Date(next.created_at).getTime() - t) > GROUP_GAP_MS;
    const showDay = !prev || new Date(prev.created_at).toDateString() !== new Date(item.created_at).toDateString();

    return (
      <MessageRow
        item={item}
        isMe={isMe}
        firstOfGroup={firstOfGroup}
        lastOfGroup={lastOfGroup}
        showDay={showDay}
        showTime={revealedId === item.id}
        otherInitial={otherInitial}
        otherColor={otherColor}
        isLastSent={isMe && index === lastMyIndex}
        onToggleTime={() => setRevealedId(revealedId === item.id ? null : item.id)}
        colors={colors}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Messenger-style header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.secondary }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.headerAvatar, { backgroundColor: otherColor }]}>
            <Text style={styles.headerAvatarText}>{otherInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
            {productContext ? (
              <Text style={styles.headerSub} numberOfLines={1}>🏷 {productContext}</Text>
            ) : (
              <Text style={styles.headerSub} numberOfLines={1}>Community member</Text>
            )}
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyAvatar, { backgroundColor: otherColor }]}>
              <Text style={styles.emptyAvatarText}>{otherInitial}</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{otherName}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Say hi 👋 — start the conversation
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToBottom}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <View style={[styles.inputPill, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Message…"
              placeholderTextColor={colors.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: (!message.trim() || sending) ? colors.border : BRAND }]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
            accessibilityLabel="Send message"
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="arrow-up" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Phone Number Warning Modal */}
      <Modal visible={showPhoneWarning} transparent animationType="fade">
        <View style={styles.warningOverlay}>
          <View style={[styles.warningSheet, { backgroundColor: colors.card }]}>
            <View style={styles.warningIconRow}>
              <Ionicons name="shield-checkmark" size={36} color="#F39C12" />
            </View>
            <Text style={[styles.warningTitle, { color: colors.textPrimary }]}>Be careful sharing your number</Text>
            <Text style={[styles.warningBody, { color: colors.textSecondary }]}>
              You're about to share a phone number with someone you may not know personally. Only share contact details with people you trust.
            </Text>
            <View style={[styles.warningTip, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.warningTipText, { color: colors.textSecondary }]}>
                💡 Tip: Keep conversations inside NestApp until you're comfortable with the other person.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.warningSendBtn, { backgroundColor: '#E67E22' }]}
              onPress={handleWarningSend}
              accessibilityLabel="Send message with phone number anyway"
            >
              <Text style={styles.warningSendBtnText}>Send Anyway</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.warningCancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowPhoneWarning(false)}
              accessibilityLabel="Go back and edit message"
            >
              <Text style={[styles.warningCancelBtnText, { color: colors.textSecondary }]}>Go Back & Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, gap: 6 },
  headerBack: { padding: 4 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyAvatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },

  messagesList: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },

  daySeparator: { alignItems: 'center', marginVertical: 12 },
  dayText: { fontSize: 11, fontWeight: '600', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },

  row: { flexDirection: 'row', alignItems: 'flex-end' },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  avatarGutter: { width: 30, justifyContent: 'flex-end' },
  smallAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  smallAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  bubble: { paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontSize: 15.5, lineHeight: 21 },
  timeUnderBubble: { fontSize: 10.5, marginTop: 3, marginHorizontal: 4 },

  receiptRow: { alignItems: 'flex-end', marginTop: 3, marginRight: 2 },
  receiptText: { fontSize: 11, fontWeight: '600' },

  // Input
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 0.5, gap: 8 },
  inputPill: { flex: 1, borderRadius: 22, borderWidth: 0.5, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 4, justifyContent: 'center', minHeight: 42, maxHeight: 120 },
  input: { fontSize: 15.5, maxHeight: 100, padding: 0 },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  warningOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  warningSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  warningIconRow: { alignItems: 'center', marginBottom: 12 },
  warningTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  warningBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  warningTip: { borderRadius: 10, padding: 12, marginBottom: 20 },
  warningTipText: { fontSize: 13, lineHeight: 19 },
  warningSendBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  warningSendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  warningCancelBtn: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  warningCancelBtnText: { fontSize: 15, fontWeight: '500' },
});
