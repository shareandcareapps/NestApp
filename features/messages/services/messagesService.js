// features/messages/services/messagesService.js
// MESSAGES FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to conversations and messages tables
// No other feature should ever import this file

import { supabase } from '../../../core/database/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Local read-state persistence ─────────────────────────────────────────────
// Tracks which conversations the user has read, keyed by userId so it survives
// logout/login correctly across multiple accounts on the same device.
const readKey = (userId) => `@nest_read_convs_${userId}`;

export async function getPersistedReadIds(userId) {
  try {
    const raw = await AsyncStorage.getItem(readKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export async function persistReadConversation(userId, conversationId) {
  try {
    const raw = await AsyncStorage.getItem(readKey(userId));
    const ids = raw ? JSON.parse(raw) : [];
    if (!ids.includes(conversationId)) {
      await AsyncStorage.setItem(readKey(userId), JSON.stringify([...ids, conversationId]));
    }
  } catch {}
}

export async function removePersistedReadConversation(userId, conversationId) {
  try {
    const raw = await AsyncStorage.getItem(readKey(userId));
    if (!raw) return;
    const ids = JSON.parse(raw).filter(id => id !== conversationId);
    await AsyncStorage.setItem(readKey(userId), JSON.stringify(ids));
  } catch {}
}

// ─── Get or create conversation ───────────────
// Per-listing threading (Facebook Marketplace model): a conversation is scoped
// to a listing. The same two people can have separate threads per item.
// listingId === null is used for non-listing chats (e.g. rides, direct).
export async function getOrCreateConversation(userId, otherUserId, listingId = null, listingTitle = null, contextDate = null) {
  let query = supabase
    .from('conversations')
    .select('*')
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`
    );

  // Scope to the listing thread. For null-listing threads (ride fallback), also
  // scope by listing_title so each ride gets its own separate conversation.
  if (listingId) {
    query = query.eq('listing_id', listingId);
  } else if (listingTitle) {
    query = query.is('listing_id', null).eq('listing_title', listingTitle);
  } else {
    query = query.is('listing_id', null).is('listing_title', null);
  }

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
      listing_title: listingTitle,
      context_date: contextDate || null,
    })
    .select()
    .single();

  if (error) {
    // Unique-violation: the DB constraint blocked the INSERT because a row already exists.
    // This happens when the constraint doesn't yet include listing_title (old schema).
    // Strategy: try the exact-match query first; if that returns nothing (the conflicting
    // row has a different listing_title), upsert a new row using listing_title as the
    // discriminator by falling back to the broadest possible fetch.
    if (error.code === '23505') {
      const pairFilter = `and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`;

      // Pass 1: exact match (works after the SQL migration lands)
      let exactQ = supabase.from('conversations').select('*').or(pairFilter);
      if (listingId) {
        exactQ = exactQ.eq('listing_id', listingId);
      } else if (listingTitle) {
        exactQ = exactQ.is('listing_id', null).eq('listing_title', listingTitle);
      } else {
        exactQ = exactQ.is('listing_id', null).is('listing_title', null);
      }
      const { data: exact } = await exactQ.order('created_at', { ascending: true }).limit(1);
      if (exact && exact.length > 0) return exact[0];

      // Pass 2: the old constraint didn't include listing_title — the conflicting row has
      // a different listing_title. Find that row and update it so this ride gets its thread.
      const { data: any } = await supabase
        .from('conversations')
        .select('*')
        .or(pairFilter)
        .is('listing_id', null)
        .order('created_at', { ascending: true })
        .limit(1);
      if (any && any.length > 0) {
        // Update listing_title so the thread now belongs to this ride
        await supabase
          .from('conversations')
          .update({ listing_title: listingTitle, context_date: contextDate || null })
          .eq('id', any[0].id);
        return { ...any[0], listing_title: listingTitle };
      }
    }
    // Foreign-key violation: listing_id references listings table but this ID is a ride.
    // Fall back to a null-scoped thread keyed by listing_title so ride chats are isolated.
    if (error.code === '23503' && listingId) {
      return getOrCreateConversation(userId, otherUserId, null, listingTitle, contextDate);
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

  // Fetch other user's profile + last message sender + listing image for each conversation.
  const enriched = await Promise.all(
    data.map(async (conv) => {
      const otherUserId = conv.participant_1 === userId
        ? conv.participant_2
        : conv.participant_1;

      const queries = [
        supabase.from('profiles').select('id, username, avatar_url').eq('id', otherUserId).maybeSingle(),
        supabase.from('messages').select('sender_id').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ];

      // For classifieds (listing_id is a real listing FK), fetch the first photo from the images array
      if (conv.listing_id) {
        queries.push(
          supabase.from('listings').select('images').eq('id', conv.listing_id).maybeSingle()
        );
      }

      const results = await Promise.all(queries);
      const profile    = results[0]?.data;
      const lastMsg    = results[1]?.data;
      const listing    = conv.listing_id ? results[2]?.data : null;
      const listingImg = listing?.images?.[0] || null;

      return {
        ...conv,
        otherProfile:  profile,
        lastSenderId:  lastMsg?.sender_id || null,
        listingTitle:  conv.listing_title || null,
        listingImage:  listingImg,
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
  // Scope to conversations the user participates in to avoid leaking data
  // from conversations they're not part of (especially without strict RLS).
  const { data: convData } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  if (!convData || convData.length === 0) return {};
  const convIds = convData.map(c => c.id);

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .neq('is_read', true)
    .neq('sender_id', userId)
    .in('conversation_id', convIds);

  if (error) return {};
  return (data || []).reduce((acc, msg) => {
    acc[msg.conversation_id] = true;
    return acc;
  }, {});
}

// ─── Reactions ────────────────────────────────────────────────────────────────
// Shape returned: { [messageId]: { emoji: count, _emoji: boolean (myReaction) } }

export async function getReactionsForMessages(messageIds, userId) {
  if (!messageIds.length) return {};
  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, emoji, user_id')
    .in('message_id', messageIds);
  if (error) return {};
  return buildReactionsMap(data || [], userId);
}

function buildReactionsMap(rows, userId) {
  const map = {};
  for (const row of rows) {
    const mid = row.message_id;
    if (!map[mid]) map[mid] = {};
    map[mid][row.emoji] = (map[mid][row.emoji] || 0) + 1;
    if (row.user_id === userId) map[mid][`_${row.emoji}`] = true;
  }
  return map;
}

export async function addReaction(messageId, userId, emoji) {
  const { error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });
  if (error && error.code !== '23505') throw error; // ignore duplicate (already reacted)
}

export async function removeReaction(messageId, userId, emoji) {
  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
  if (error) throw error;
}

// ─── Get total unread conversations count ─────
export async function getUnreadCount(userId) {
  const { data: convData } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  if (!convData || convData.length === 0) return 0;
  const convIds = convData.map(c => c.id);

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .neq('is_read', true)
    .neq('sender_id', userId)
    .in('conversation_id', convIds);

  if (error) return 0;
  const unique = new Set((data || []).map(m => m.conversation_id));
  return unique.size;
}