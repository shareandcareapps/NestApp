// features/messages/services/messagesService.js
// MESSAGES FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to conversations and messages tables
// No other feature should ever import this file

import { supabase } from '../../../core/database/index';

// ─── Get or create conversation ───────────────
export async function getOrCreateConversation(userId, otherUserId) {
  // Check if conversation exists in either direction
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`
    )
    .single();

  if (existing) return existing;

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_1: userId,
      participant_2: otherUserId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Get all conversations for user ───────────
export async function getConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  // Fetch other user's profile + last message sender for each conversation
  if (data && data.length > 0) {
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherUserId = conv.participant_1 === userId
          ? conv.participant_2
          : conv.participant_1;
        const [{ data: profile }, { data: lastMsg }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', otherUserId)
            .single(),
          supabase
            .from('messages')
            .select('sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
        ]);
        return { ...conv, otherProfile: profile, lastSenderId: lastMsg?.sender_id || null };
      })
    );
    return enriched;
  }

  return data;
}

// ─── Get messages in conversation ─────────────
export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// ─── Send message ──────────────────────────────
export async function sendMessage(conversationId, senderId, body) {
  // Insert message
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation last message
  await supabase
    .from('conversations')
    .update({
      last_message: body,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return data;
}

// ─── Mark messages as read ─────────────────────
// Uses `neq(true)` to catch both is_read=false AND is_read=null
export async function markMessagesAsRead(conversationId, userId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .neq('is_read', true); // catches null and false

  if (error) throw error;
}

// ─── Get unread count per conversation ────────
export async function getUnreadCountPerConversation(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .neq('is_read', true) // catches null and false
    .neq('sender_id', userId);

  if (error) return {};
  return (data || []).reduce((acc, msg) => {
    acc[msg.conversation_id] = true;
    return acc;
  }, {});
}

// ─── Get total unread conversations count ─────
export async function getUnreadCount(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .neq('is_read', true) // catches null and false
    .neq('sender_id', userId);

  if (error) return 0;
  const unique = new Set((data || []).map(m => m.conversation_id));
  return unique.size;
}