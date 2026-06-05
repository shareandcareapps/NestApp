// features/messages/screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
  Animated, PanResponder, Dimensions,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
import { Ionicons } from '@expo/vector-icons';

// Detects phone numbers: (123) 456-7890, 123-456-7890, 1234567890, +1 etc.
const PHONE_REGEX = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/;
import { getMessages, sendMessage } from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { supabase } from '../../../core/database/index';

const TIME_REVEAL = 70; // how far (px) timestamps are offset to the right

function MessageBubble({ item, isMe, isLast, slideX, colors }) {
  const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    // Outer clip — hides the timestamp area until user slides
    <View style={styles.bubbleRowClip}>
      {/* Inner row is SCREEN_W + TIME_REVEAL wide, slides left to reveal time */}
      <Animated.View style={[
        styles.bubbleRow,
        { transform: [{ translateX: slideX }] },
      ]}>
        {/* Main content area — exactly SCREEN_W wide */}
        <View style={[styles.bubbleContent, isMe ? styles.bubbleContentRight : styles.bubbleContentLeft]}>
          <View style={[
            styles.bubble,
            isMe
              ? styles.bubbleMe
              : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 0.5 },
          ]}>
            <Text style={[styles.bubbleText, { color: isMe ? '#fff' : colors.textPrimary }]}>
              {item.body}
            </Text>
          </View>
          {isMe && isLast && (
            <View style={styles.statusRow}>
              {item.is_read ? (
                <>
                  <Ionicons name="checkmark-done" size={13} color="#9B59B6" />
                  <Text style={[styles.statusText, { color: '#9B59B6' }]}>
                    Seen · {new Date(item.updated_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={13} color={colors.textLight} />
                  <Text style={[styles.statusText, { color: colors.textLight }]}>Delivered</Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Time area — TIME_REVEAL wide, off-screen until slide */}
        <View style={styles.pullTimeBox}>
          <Text style={[styles.pullTime, { color: colors.textLight }]}>{time}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { conversation, otherProfile } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPhoneWarning, setShowPhoneWarning] = useState(false);
  const pendingMessageRef = React.useRef('');
  const user = useAppStore((state) => state.user);
  const clearUnreadConversation = useAppStore((state) => state.clearUnreadConversation);
  const colors = useTheme();
  const flatListRef = useRef(null);
  const slideX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy),
    onPanResponderMove: (_, { dx }) => {
      // Only allow left pull (negative dx), clamp to -TIME_REVEAL
      const clamped = Math.max(-TIME_REVEAL, Math.min(0, dx));
      slideX.setValue(clamped);
    },
    onPanResponderRelease: () => {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;
  const rawOtherName = otherProfile?.username || otherProfile?.full_name || 'Community Member';
  const otherName = rawOtherName.charAt(0).toUpperCase() + rawOtherName.slice(1);
  const initials = otherName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarColors = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];
  const colorIndex = otherName.charCodeAt(0) % avatarColors.length;

  const lastMessageIdRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: otherName });
    clearUnreadConversation(conversation.id);
    fetchMessages();
    refreshOtherProfile();

    // Poll for new messages every 3 seconds
    const interval = setInterval(pollNewMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  async function pollNewMessages() {
    try {
      const data = await getMessages(conversation.id);
      if (!data || data.length === 0) return;
      const latestId = data[data.length - 1]?.id;
      if (latestId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = latestId;
        setMessages(data);
        scrollToBottom();
        // Mark any incoming messages as read in store
        clearUnreadConversation(conversation.id);
      }
    } catch (_) {}
  }

  async function refreshOtherProfile() {
    if (!otherProfile?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', otherProfile.id)
      .single();
    if (data) {
      const fresh = data.username || data.full_name || 'Community Member';
      const freshName = fresh.charAt(0).toUpperCase() + fresh.slice(1);
      navigation.setOptions({ title: freshName });
    }
  }

  async function fetchMessages() {
    try {
      setLoading(true);
      const data = await getMessages(conversation.id);
      setMessages(data);
      if (data?.length) lastMessageIdRef.current = data[data.length - 1]?.id;
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

  async function doSend(body) {
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
          {...panResponder.panHandlers}
          renderItem={({ item, index }) => {
            const isMe = item.sender_id === user.id;
            const lastMyIndex = messages.reduce((last, m, i) => m.sender_id === user.id ? i : last, -1);
            const isLast = isMe && index === lastMyIndex;
            return <MessageBubble item={item} isMe={isMe} isLast={isLast} slideX={slideX} colors={colors} />;
          }}
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
      {/* Phone Number Warning Modal */}
      <Modal visible={showPhoneWarning} transparent animationType="fade">
        <View style={styles.warningOverlay}>
          <View style={[styles.warningSheet, { backgroundColor: colors.card }]}>
            <View style={styles.warningIconRow}>
              <Ionicons name="shield-checkmark" size={36} color="#F39C12" />
            </View>
            <Text style={[styles.warningTitle, { color: colors.textPrimary }]}>
              Be careful sharing your number
            </Text>
            <Text style={[styles.warningBody, { color: colors.textSecondary }]}>
              You're about to share a phone number with someone you may not know personally. Only share contact details with people you trust.
            </Text>
            <View style={[styles.warningTip, { backgroundColor: '#FEF9E7' }]}>
              <Text style={styles.warningTipText}>
                💡 Tip: Keep conversations inside NestApp until you're comfortable with the other person.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.warningSendBtn, { backgroundColor: '#E67E22' }]}
              onPress={handleWarningSend}
            >
              <Text style={styles.warningSendBtnText}>Send Anyway</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.warningCancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowPhoneWarning(false)}
            >
              <Text style={[styles.warningCancelBtnText, { color: colors.textSecondary }]}>Go Back & Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  messagesList: { paddingTop: 16, paddingBottom: 8 },
  // Clips the oversized inner row so time stays hidden until slide
  bubbleRowClip: { width: SCREEN_W, overflow: 'hidden', marginBottom: 12 },
  // Inner row is wider than screen to accommodate the time
  bubbleRow: { flexDirection: 'row', width: SCREEN_W + TIME_REVEAL, alignItems: 'center' },
  // Main content fills exactly the screen width with horizontal padding
  bubbleContent: { width: SCREEN_W, paddingHorizontal: 12 },
  bubbleContentRight: { alignItems: 'flex-end' },
  bubbleContentLeft: { alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: SCREEN_W * 0.72 },
  bubbleMe: { backgroundColor: '#9B59B6', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  // Time area sits in the extra width, centred vertically
  pullTimeBox: { width: TIME_REVEAL, justifyContent: 'center' },
  pullTime: { fontSize: 11 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, alignSelf: 'flex-end' },
  statusText: { fontSize: 11 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 0.5, gap: 8 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, borderWidth: 0.5, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  warningOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  warningSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  warningIconRow: { alignItems: 'center', marginBottom: 12 },
  warningTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  warningBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  warningTip: { borderRadius: 10, padding: 12, marginBottom: 20 },
  warningTipText: { fontSize: 13, color: '#7D6608', lineHeight: 19 },
  warningSendBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  warningSendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  warningCancelBtn: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  warningCancelBtnText: { fontSize: 15, fontWeight: '500' },
});