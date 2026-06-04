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
export async function markMessagesAsRead(conversationId, userId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

// ─── Get unread message count ──────────────────
export async function getUnreadCount(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('is_read', false)
    .neq('sender_id', userId);

  if (error) throw error;
  return data?.length || 0;
}