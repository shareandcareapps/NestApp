// features/messages/services/messagesService.js
// MESSAGES FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to conversations and messages tables
// No other feature should ever import this file

import { supabase } from '../../../core/database/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Local persistence keys ───────────────────────────────────────────────────
// All keyed by userId so state survives logout/login across multiple accounts.
const readKey    = (userId) => `@nest_read_convs_${userId}`;
const deletedKey = (userId) => `@nest_deleted_convs_${userId}`;

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

// ─── Deleted conversation persistence ────────────────────────────────────────
// Client-side soft-delete: even if the DB delete fails (RLS), the conversation
// stays hidden permanently for this user. This is the ground truth for deletion.

export async function getPersistedDeletedIds(userId) {
  try {
    const raw = await AsyncStorage.getItem(deletedKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export async function persistDeletedConversation(userId, conversationId) {
  try {
    const raw = await AsyncStorage.getItem(deletedKey(userId));
    const ids = raw ? JSON.parse(raw) : [];
    if (!ids.includes(conversationId)) {
      await AsyncStorage.setItem(deletedKey(userId), JSON.stringify([...ids, conversationId]));
    }
  } catch {}
}

export async function unpersistedDeletedConversation(userId, conversationId) {
  try {
    const raw = await AsyncStorage.getItem(deletedKey(userId));
    if (!raw) return;
    const ids = JSON.parse(raw).filter(id => id !== conversationId);
    await AsyncStorage.setItem(deletedKey(userId), JSON.stringify(ids));
  } catch {}
}

// ─── Get or create conversation ───────────────
// Per-listing threading (Facebook Marketplace model): a conversation is scoped
// to a listing. The same two people can have separate threads per item.
// listingId === null is used for non-listing chats (rides, direct). Ride chats
// pass rideId so retention can key off the actual ride instead of title text.
export async function getOrCreateConversation(userId, otherUserId, listingId = null, listingTitle = null, contextDate = null, rideId = null) {
  const type = listingId ? 'listing' : (rideId || (listingTitle || '').includes('→')) ? 'ride' : 'direct';

  function exactQuery() {
    let q = supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`
      );
    if (listingId) q = q.eq('listing_id', listingId);
    else if (listingTitle) q = q.is('listing_id', null).eq('listing_title', listingTitle);
    else q = q.is('listing_id', null).is('listing_title', null);
    return q.order('created_at', { ascending: true }).limit(1);
  }

  // .limit(1) instead of .maybeSingle() — never throws if duplicates exist
  const { data: rows, error: selErr } = await exactQuery();
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
      type,
      ride_id: rideId,
    })
    .select()
    .single();

  if (error) {
    // Unique violation: another device/request created the thread between our
    // SELECT and INSERT — fetch and return it. (The DB index now includes
    // listing_title, so this is a plain race, never a different thread.)
    if (error.code === '23505') {
      const { data: exact } = await exactQuery();
      if (exact && exact.length > 0) return exact[0];
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

  // Enrich with 3 batched queries total (was 2-3 queries PER conversation):
  // other-participant profiles, last-message senders, and listing images.
  const otherIds = [...new Set(
    data.map(c => (c.participant_1 === userId ? c.participant_2 : c.participant_1)).filter(Boolean)
  )];
  const convIds = data.map(c => c.id);
  const listingIds = [...new Set(data.map(c => c.listing_id).filter(Boolean))];

  const [profilesRes, messagesRes, listingsRes] = await Promise.all([
    otherIds.length
      ? supabase.from('profiles').select('id, username, avatar_url').in('id', otherIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('messages')
      .select('conversation_id, sender_id, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false }),
    listingIds.length
      ? supabase.from('listings').select('id, images').in('id', listingIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = {};
  (profilesRes.data || []).forEach(p => { profileMap[p.id] = p; });

  // First row per conversation = latest message (rows are sorted desc)
  const lastSenderMap = {};
  (messagesRes.data || []).forEach(m => {
    if (!(m.conversation_id in lastSenderMap)) lastSenderMap[m.conversation_id] = m.sender_id;
  });

  const listingImgMap = {};
  (listingsRes.data || []).forEach(l => { listingImgMap[l.id] = l.images?.[0] || null; });

  return data.map(conv => {
    const otherUserId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;
    return {
      ...conv,
      otherProfile:  profileMap[otherUserId] || null,
      lastSenderId:  lastSenderMap[conv.id] || null,
      listingTitle:  conv.listing_title || null,
      listingImage:  conv.listing_id ? (listingImgMap[conv.listing_id] || null) : null,
    };
  });
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
// ─── Vendor activity signal ────────────────────
// True if the user has sent any message recently (default 7 days) — used to
// show an "Active" badge for sellers/vendors who actively reply to inquiries.
export async function isUserActive(userId, days = 7) {
  if (!userId) return false;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('sender_id', userId)
    .gte('created_at', since)
    .limit(1);
  if (error) return false;
  return (data?.length || 0) > 0;
}
