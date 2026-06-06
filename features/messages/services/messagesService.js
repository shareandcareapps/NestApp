// features/messages/services/messagesService.js
// MESSAGES FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to conversations and messages tables
// No other feature should ever import this file

import { supabase } from '../../../core/database/index';

// ─── Get or create conversation ───────────────
// Per-listing threading (Facebook Marketplace model): a conversation is scoped
// to a listing. The same two people can have separate threads per item.
// listingId === null is used for non-listing chats (e.g. rides, direct).
export async function getOrCreateConversation(userId, otherUserId, listingId = null, listingTitle = null) {
  let query = supabase
    .from('conversations')
    .select('*')
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`
    );

  // Scope to the listing thread (or to the no-listing direct thread)
  query = listingId ? query.eq('listing_id', listingId) : query.is('listing_id', null);

  // .limit(1) instead of .maybeSingle() — never throws if duplicates exist
  const { data: rows, error: selErr } = await query
    .order('created_at', { ascending: true })
    .limit(1);
  if (selErr) throw selErr;
  if (rows && rows.length > 0) return rows[0];

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_1: userId,
      participant_2: otherUserId,
      listing_id: listingId,
      listing_title: listingTitle, // snapshot so it survives RLS once sold
    })
    .select()
    .single();

  if (error) {
    // Unique-violation race: another insert won — fetch and return the existing row
    if (error.code === '23505') {
      let again = supabase
        .from('conversations')
        .select('*')
        .or(
          `and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`
        );
      again = listingId ? again.eq('listing_id', listingId) : again.is('listing_id', null);
      const { data: existingRow } = await again.limit(1);
      if (existingRow && existingRow.length > 0) return existingRow[0];
    }
    throw error;
  }
  return data;
}

// ─── Buyers who messaged about a specific listing ──
// Returns the other participants of every conversation tied to this listing.
export async function getListingBuyers(listingId, sellerId) {
  const { data: convos, error } = await supabase
    .from('conversations')
    .select('participant_1, participant_2')
    .eq('listing_id', listingId);

  if (error || !convos || convos.length === 0) return [];
  return profilesForOtherParticipants(convos, sellerId);
}

// ─── All people the user has ever chatted with (fallback) ──
// Used when a listing has no linked conversations (e.g. older threads created
// before per-listing linking). Ordered by most recent activity.
export async function getConversationPartners(userId) {
  const { data: convos, error } = await supabase
    .from('conversations')
    .select('participant_1, participant_2, last_message_at')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error || !convos || convos.length === 0) return [];
  return profilesForOtherParticipants(convos, userId);
}

// Shared helper: resolve the "other" participants of a set of conversations
// into profiles, de-duplicated and preserving first-seen order.
async function profilesForOtherParticipants(convos, selfId) {
  const otherIds = [...new Set(
    convos
      .map(c => (c.participant_1 === selfId ? c.participant_2 : c.participant_1))
      .filter(id => id && id !== selfId)
  )];
  if (otherIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', otherIds);

  // Preserve recency order from otherIds
  const map = {};
  (profiles || []).forEach(p => { map[p.id] = p; });
  return otherIds.map(id => map[id]).filter(Boolean);
}

// ─── Get all conversations for user ───────────
export async function getConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch other user's profile + last message sender for each conversation.
  // Listing title comes from the snapshot column (survives RLS once sold).
  const enriched = await Promise.all(
    data.map(async (conv) => {
      const otherUserId = conv.participant_1 === userId
        ? conv.participant_2
        : conv.participant_1;
      const [{ data: profile }, { data: lastMsg }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', otherUserId)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        ...conv,
        otherProfile: profile,
        lastSenderId: lastMsg?.sender_id || null,
        listingTitle: conv.listing_title || null,
      };
    })
  );
  return enriched;
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