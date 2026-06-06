// features/messages/screens/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Image,
  Linking, Alert, Pressable, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../../../core/utils/imageUtils';
import {
  getMessages, sendMessage, markMessagesAsRead,
  getReactionsForMessages, addReaction, removeReaction,
  persistReadConversation,
} from '../services/messagesService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { supabase } from '../../../core/database/index';
import UserProfileModal from '../../../core/components/UserProfileModal';
import { getRideById } from '../../rides/services/ridesService';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND      = '#9B59B6';
const GROUP_GAP  = 5 * 60 * 1000; // 5 min — new group if gap > this
const AVATAR_COLORS = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];
const PHONE_RE   = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/;
const REACTIONS  = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

// ─── Time helpers ─────────────────────────────────────────────────────────────
function timeOf(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function dayLabel(ts) {
  const d = new Date(ts), now = new Date(), yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())  return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}
function displayName(username) {
  if (!username) return 'Community Member';
  return username.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Message body parser ──────────────────────────────────────────────────────
// Conventions: "[image]:URL"  |  "[location]:lat,lng:address"  |  plain text
function parse(body = '') {
  if (body.startsWith('[image]:'))    return { type: 'image',    url: body.slice(8) };
  if (body.startsWith('[location]:')) {
    const rest = body.slice(11);
    const sep  = rest.indexOf(':');
    if (sep > 0) {
      const [coords, addr] = [rest.slice(0, sep), rest.slice(sep + 1)];
      const [lat, lng]     = coords.split(',').map(Number);
      return { type: 'location', address: addr, lat, lng };
    }
    return { type: 'location', address: rest, lat: null, lng: null };
  }
  return { type: 'text', text: body };
}

// ─── Context banner ───────────────────────────────────────────────────────────
function ContextBanner({ title, contextType, rideContext, onRidePress, colors }) {
  if (!title && !rideContext) return null;

  if (contextType === 'ride' && rideContext) {
    const TINT = '#1ABC9C';
    return (
      <TouchableOpacity
        activeOpacity={rideContext.rideId ? 0.7 : 1}
        onPress={rideContext.rideId ? onRidePress : undefined}
        style={[s.rideCard, { backgroundColor: TINT + '10', borderColor: TINT + '30' }]}>
        {/* Route row */}
        <View style={s.rideRouteRow}>
          <View style={[s.rideDot, { backgroundColor: TINT }]} />
          <Text style={[s.rideFrom, { color: colors.textPrimary }]} numberOfLines={1}>
            {rideContext.from}
          </Text>
          <Ionicons name="arrow-forward" size={12} color={TINT} style={{ marginHorizontal: 4 }} />
          <Text style={[s.rideTo, { color: colors.textPrimary }]} numberOfLines={1}>
            {rideContext.to}
          </Text>
        </View>
        {/* Meta row */}
        <View style={s.rideMetaRow}>
          {rideContext.date ? (
            <View style={s.rideChip}>
              <Ionicons name="calendar-outline" size={11} color={TINT} />
              <Text style={[s.rideChipTxt, { color: colors.textSecondary }]}>
                {rideContext.date}{rideContext.time ? ` · ${rideContext.time}` : ''}
              </Text>
            </View>
          ) : null}
          {rideContext.seats != null ? (
            <View style={s.rideChip}>
              <Ionicons name="person-outline" size={11} color={TINT} />
              <Text style={[s.rideChipTxt, { color: colors.textSecondary }]}>
                {rideContext.seats} seat{rideContext.seats !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}
          {rideContext.poster ? (
            <View style={s.rideChip}>
              <Ionicons name="car-outline" size={11} color={TINT} />
              <Text style={[s.rideChipTxt, { color: colors.textSecondary }]} numberOfLines={1}>
                {rideContext.poster}
              </Text>
            </View>
          ) : null}
          {rideContext.rideId ? (
            <View style={[s.rideChip, { marginLeft: 'auto' }]}>
              <Text style={[s.rideChipTxt, { color: TINT }]}>View details</Text>
              <Ionicons name="chevron-forward" size={11} color={TINT} />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  const tint = '#E63946';
  return (
    <View style={[s.ctxBanner, { backgroundColor: tint + '12', borderBottomColor: tint + '28' }]}>
      <View style={[s.ctxIconWrap, { backgroundColor: tint + '22' }]}>
        <Ionicons name="pricetag-outline" size={13} color={tint} />
      </View>
      <Text style={[s.ctxText, { color: tint }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

// ─── Image message ────────────────────────────────────────────────────────────
function ImageMsg({ url, isMe, onPress }) {
  const [ok, setOk] = useState(false);
  return (
    <TouchableOpacity onPress={() => onPress(url)} activeOpacity={0.9}
      style={[s.imgBubble, { alignSelf: isMe ? 'flex-end' : 'flex-start' }]}>
      {!ok && <ActivityIndicator style={s.imgLoader} color={BRAND} />}
      <Image source={{ uri: url }} style={s.imgMsg} resizeMode="cover" onLoad={() => setOk(true)} />
    </TouchableOpacity>
  );
}

// ─── Location message ─────────────────────────────────────────────────────────
function LocationMsg({ address, lat, lng, isMe, colors }) {
  function open() {
    const q   = encodeURIComponent(address || `${lat},${lng}`);
    const url = Platform.OS === 'ios' ? `maps:?q=${q}` : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${q}`));
  }
  return (
    <TouchableOpacity onPress={open} activeOpacity={0.85}>
      <View style={[s.locBubble, { backgroundColor: isMe ? BRAND : colors.surfaceSecondary,
        alignSelf: isMe ? 'flex-end' : 'flex-start' }]}>
        <View style={s.locHeader}>
          <Ionicons name="location" size={16} color={isMe ? '#fff' : '#E63946'} />
          <Text style={[s.locLabel, { color: isMe ? 'rgba(255,255,255,0.75)' : colors.textLight }]}>Location</Text>
        </View>
        <Text style={[s.locAddress, { color: isMe ? '#fff' : colors.textPrimary }]} numberOfLines={2}>
          {address || `${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}
        </Text>
        <Text style={[s.locAction, { color: isMe ? 'rgba(255,255,255,0.6)' : BRAND }]}>Open in Maps →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Reaction row (below bubble) ──────────────────────────────────────────────
function ReactionRow({ data, isMe, onTap, colors }) {
  const entries = Object.entries(data || {}).filter(([k, v]) => !k.startsWith('_') && v > 0);
  if (!entries.length) return null;
  return (
    <View style={[s.rxnRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
      {entries.map(([emoji, count]) => {
        const mine = data[`_${emoji}`];
        return (
          <TouchableOpacity key={emoji} onPress={() => onTap(emoji)}
            style={[s.rxnChip, { backgroundColor: mine ? BRAND + '22' : colors.surfaceSecondary,
              borderColor: mine ? BRAND : 'transparent' }]}>
            <Text style={s.rxnEmoji}>{emoji}</Text>
            {count > 1 && <Text style={[s.rxnCount, { color: colors.textSecondary }]}>{count}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Single message row ───────────────────────────────────────────────────────
function MsgRow({
  item, isMe, firstOfGroup, lastOfGroup, showDay, showTime,
  otherInitial, otherClr, isLastSent, onTime, onLong, onAvatar, onImg,
  onReact, rxnData, colors,
}) {
  const R = 20, T = 6;
  const meR = { borderTopRightRadius: firstOfGroup ? R : T, borderBottomRightRadius: lastOfGroup ? R : T, borderTopLeftRadius: R, borderBottomLeftRadius: R };
  const thR = { borderTopLeftRadius: firstOfGroup ? R : T,  borderBottomLeftRadius: lastOfGroup ? R : T,  borderTopRightRadius: R, borderBottomRightRadius: R };
  const p   = parse(item.body);

  // WhatsApp-style scale-pulse on long press
  const scale = useRef(new Animated.Value(1)).current;
  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }
  function onLongPressWithPulse() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 80 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 25, bounciness: 12 }),
    ]).start();
    onLong();
  }

  // Received bubble: white card with shadow; sent: BRAND purple
  const bubbleStyle = isMe
    ? [s.bubble, { backgroundColor: BRAND }, meR]
    : [s.bubble, { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, thR];

  return (
    <View>
      {showDay && (
        <View style={s.daySep}>
          <Text style={[s.dayTxt, { color: colors.textLight, backgroundColor: colors.surfaceSecondary }]}>
            {dayLabel(item.created_at)}
          </Text>
        </View>
      )}

      <View style={[s.row, isMe ? s.rowMe : s.rowThem, { marginTop: firstOfGroup ? 10 : 2 }]}>
        {!isMe && (
          <View style={s.avGutter}>
            {lastOfGroup ? (
              <TouchableOpacity onPress={onAvatar}>
                <View style={[s.smAv, { backgroundColor: otherClr }]}>
                  <Text style={s.smAvTxt}>{otherInitial}</Text>
                </View>
              </TouchableOpacity>
            ) : <View style={s.smAv} />}
          </View>
        )}

        <Animated.View style={{ maxWidth: '76%', transform: [{ scale }] }}>
          <Pressable
            onPress={onTime}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onLongPress={onLongPressWithPulse}
            delayLongPress={300}>
            {p.type === 'image'    && <ImageMsg    url={p.url} isMe={isMe} onPress={onImg} />}
            {p.type === 'location' && <LocationMsg address={p.address} lat={p.lat} lng={p.lng} isMe={isMe} colors={colors} />}
            {p.type === 'text'     && (
              <View style={bubbleStyle}>
                <Text style={[s.bubbleTxt, { color: isMe ? '#fff' : colors.textPrimary }]}>{p.text}</Text>
              </View>
            )}
            {showTime && (
              <Text style={[s.timeUnder, { color: colors.textLight, textAlign: isMe ? 'right' : 'left' }]}>
                {timeOf(item.created_at)}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </View>

      <ReactionRow data={rxnData} isMe={isMe} onTap={(e) => onReact(item.id, e)} colors={colors} />

      {isLastSent && (
        <View style={s.receipt}>
          <Text style={[s.receiptTxt, { color: item.is_read ? BRAND : colors.textLight }]}>
            {item.is_read ? 'Seen' : 'Delivered'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Long-press action menu ───────────────────────────────────────────────────
function ActionMenu({ visible, message, isMe, onClose, onReact, onCopy, onDelete, colors }) {
  if (!visible) return null;
  const p = message ? parse(message.body) : null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.menuOverlay} onPress={onClose} />
      <View style={s.menuWrap}>
        {/* Emoji strip */}
        <View style={[s.emojiStrip, { backgroundColor: colors.card }]}>
          {REACTIONS.map(e => (
            <TouchableOpacity key={e} style={s.emojiBtn}
              onPress={() => { onReact(message?.id, e); onClose(); }}>
              <Text style={s.emojiTxt}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Action rows */}
        <View style={[s.menuActions, { backgroundColor: colors.card }]}>
          {p?.type === 'text' && (
            <TouchableOpacity style={s.menuRow} onPress={() => { onCopy(message.body); onClose(); }}>
              <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
              <Text style={[s.menuRowTxt, { color: colors.textPrimary }]}>Copy</Text>
            </TouchableOpacity>
          )}
          {isMe && (
            <>
              <View style={[s.menuDivider, { backgroundColor: colors.borderLight }]} />
              <TouchableOpacity style={s.menuRow} onPress={() => { onDelete(message); onClose(); }}>
                <Ionicons name="trash-outline" size={20} color="#E63946" />
                <Text style={[s.menuRowTxt, { color: '#E63946' }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatScreen({ route, navigation }) {
  const { conversation, otherProfile, listingTitle, contextType, rideContext: rawRideContext } = route.params;
  const productCtx = listingTitle ?? conversation?.listing_title ?? null;

  // For old-format ride conversations that didn't embed a date in the title,
  // fall back to conversation.context_date for the date chip.
  const rideContext = rawRideContext ? (() => {
    if (rawRideContext.date) return rawRideContext;
    const cd = conversation?.context_date;
    if (!cd) return rawRideContext;
    const d = new Date(cd);
    const now = new Date();
    const tom = new Date(now.getTime() + 86400000);
    const fallbackDate = d.toDateString() === now.toDateString() ? 'Today'
      : d.toDateString() === tom.toDateString() ? 'Tomorrow'
      : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const fallbackTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { ...rawRideContext, date: fallbackDate, time: fallbackTime };
  })() : null;

  const [messages,        setMessages]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [text,            setText]            = useState('');
  const [sending,         setSending]         = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [revealedId,      setRevealedId]      = useState(null);
  const [reactions,       setReactions]       = useState({});    // { [msgId]: { emoji: count, _emoji: bool } }
  const [selectedMsg,     setSelectedMsg]     = useState(null);
  const [showMenu,        setShowMenu]        = useState(false);
  const [showAttach,      setShowAttach]      = useState(false);
  const [showLocInput,    setShowLocInput]    = useState(false);
  const [locText,         setLocText]         = useState('');
  const [fullImg,         setFullImg]         = useState(null);
  const [showProfile,     setShowProfile]     = useState(false);
  const [showPhoneWarn,   setShowPhoneWarn]   = useState(false);
  const [resolvedRideContext, setResolvedRideContext] = useState(rideContext);
  const pendingRef  = useRef('');
  const msgIdsRef   = useRef(new Set()); // kept in sync with messages for realtime filter

  const user                   = useAppStore(s => s.user);
  const clearUnread            = useAppStore(s => s.clearUnreadConversation);
  const colors                 = useTheme();
  const listRef                = useRef(null);

  const otherName  = displayName(otherProfile?.username);
  const otherInit  = otherName.charAt(0).toUpperCase();
  const otherClr   = avatarColor(otherName);

  // ── Fetch seats + rideId for ride conversations opened from the conversations list ──
  useEffect(() => {
    if (contextType !== 'ride' || !rideContext || (rideContext.seats != null && rideContext.rideId)) return;
    const otherId = otherProfile?.id;
    if (!otherId) return;
    supabase
      .from('rides')
      .select('id, seats_available')
      .or(`driver_id.eq.${otherId},requester_id.eq.${otherId}`)
      .eq('from_location', rideContext.from)
      .eq('to_location', rideContext.to)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setResolvedRideContext(prev => prev ? {
            ...prev,
            rideId: data.id,
            seats: data.seats_available ?? prev.seats,
          } : prev);
        }
      });
  }, []);

  // ── Fetch + realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMsgs();
    markRead();

    const ch = supabase.channel(`chat:${conversation.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        ({ new: msg }) => {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          scrollEnd();
          if (msg.sender_id !== user.id) { clearUnread(conversation.id); markRead(); }
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        ({ new: upd }) => setMessages(prev => prev.map(m => m.id === upd.id ? { ...m, ...upd } : m)))
      // Reaction INSERT — only apply for OTHER users (own reactions are already applied optimistically)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        ({ new: row }) => {
          if (row.user_id === user.id) return;          // own: already applied optimistically
          if (!msgIdsRef.current.has(row.message_id)) return; // different conversation
          setReactions(prev => {
            const cur = { ...(prev[row.message_id] || {}) };
            // Remove any previous reaction from that user in our local state
            // (they may have swapped emojis — handle it like a full refresh)
            cur[row.emoji] = (cur[row.emoji] || 0) + 1;
            return { ...prev, [row.message_id]: cur };
          });
        })
      // Reaction DELETE — refetch because payload.old only has the PK without REPLICA IDENTITY FULL
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        async () => {
          const ids = [...msgIdsRef.current];
          if (!ids.length) return;
          const updated = await getReactionsForMessages(ids, user.id).catch(() => null);
          if (updated) setReactions(updated);
        })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  // Keep msgIdsRef current so the realtime reaction handler can check membership
  useEffect(() => {
    msgIdsRef.current = new Set(messages.map(m => m.id));
  }, [messages]);

  async function markRead() {
    try { await markMessagesAsRead(conversation.id, user.id); } catch (_) {}
    clearUnread(conversation.id);
    persistReadConversation(user.id, conversation.id);
  }

  async function fetchMsgs() {
    try {
      setLoading(true);
      const data = await getMessages(conversation.id);
      setMessages(data || []);
      if (data?.length) {
        const rxns = await getReactionsForMessages(data.map(m => m.id), user.id).catch(() => ({}));
        setReactions(rxns);
      }
    } catch (e) {
      console.error('fetch messages:', e);
    } finally {
      setLoading(false);
      // inverted FlatList already starts at the bottom — no scroll needed on load
    }
  }

  // In an inverted FlatList, offset 0 = the newest message (visual bottom).
  const scrollEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
  }, []);

  // ── Send helpers ─────────────────────────────────────────────────────────────
  async function doSend(body) {
    setSending(true);
    try {
      const msg = await sendMessage(conversation.id, user.id, body);
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      scrollEnd();
    } catch (e) {
      console.error('send:', e);
    } finally {
      setSending(false);
    }
  }

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    if (PHONE_RE.test(body)) { pendingRef.current = body; setShowPhoneWarn(true); return; }
    setText('');
    doSend(body);
  }

  // ── Image picker ─────────────────────────────────────────────────────────────
  async function pickImage(camera = false) {
    setUploading(true);
    try {
      const fn   = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const res  = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
      if (res.canceled || !res.assets?.length) return;

      const asset       = res.assets[0];
      const compressedUri = await compressImage(asset.uri);
      const ext   = 'jpg';
      const path  = `chat/${conversation.id}_${Date.now()}.${ext}`;
      const buf   = await (await fetch(compressedUri)).arrayBuffer();

      const { error } = await supabase.storage.from('listings')
        .upload(path, buf, { contentType: `image/${ext}`, upsert: false });
      if (error) throw error;

      const { data: u } = supabase.storage.from('listings').getPublicUrl(path);
      await doSend(`[image]:${u.publicUrl}`);
    } catch (e) {
      Alert.alert('Upload failed', e?.message || 'Could not send image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // ── Location share ────────────────────────────────────────────────────────────
  async function sendLocation() {
    const addr = locText.trim();
    if (!addr) return;
    setShowLocInput(false);
    setLocText('');
    await doSend(`[location]:0,0:${addr}`);
  }

  // ── Reactions — one per user per message (WhatsApp/Messenger behavior) ─────────
  async function handleReact(msgId, emoji) {
    const cur = reactions[msgId] || {};
    const mine = !!cur[`_${emoji}`];

    // Find any OTHER emoji this user already reacted with on this message
    const prevEmoji = Object.keys(cur).find(
      k => k.startsWith('_') && k !== `_${emoji}` && cur[k] === true
    )?.slice(1); // e.g. '❤️' (strip leading '_')

    // ── Optimistic update (instant UI) ──────────────────────────────────────────
    setReactions(prev => {
      const c = { ...(prev[msgId] || {}) };
      // Remove prior different reaction from counts
      if (prevEmoji) {
        c[prevEmoji] = Math.max(0, (c[prevEmoji] || 1) - 1);
        delete c[`_${prevEmoji}`];
      }
      // Toggle selected emoji
      if (mine) {
        c[emoji] = Math.max(0, (c[emoji] || 1) - 1);
        delete c[`_${emoji}`];
      } else {
        c[emoji] = (c[emoji] || 0) + 1;
        c[`_${emoji}`] = true;
      }
      return { ...prev, [msgId]: c };
    });

    // ── Persist to Supabase ──────────────────────────────────────────────────────
    try {
      if (prevEmoji) await removeReaction(msgId, user.id, prevEmoji).catch(() => {});
      if (mine)      await removeReaction(msgId, user.id, emoji);
      else           await addReaction(msgId, user.id, emoji);
    } catch (_) {
      // Revert: refetch correct state from server
      const updated = await getReactionsForMessages([msgId], user.id).catch(() => ({}));
      setReactions(prev => ({ ...prev, [msgId]: updated[msgId] ?? prev[msgId] }));
    }
  }

  // ── Delete own message ────────────────────────────────────────────────────────
  async function deleteMsg(msg) {
    try {
      await supabase.from('messages').delete().eq('id', msg.id).eq('sender_id', user.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch {
      Alert.alert('Error', 'Could not delete message.');
    }
  }

  // ── Copy (best-effort — @react-native-clipboard/clipboard not installed) ──────
  function copyText(body) {
    Alert.alert('Message', body, [{ text: 'Close' }]);
  }

  // ── Render item ───────────────────────────────────────────────────────────────
  // Inverted FlatList receives newest-first so the list opens at the bottom instantly.
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  // In the reversed array the first occurrence of my messages = the newest = "Delivered" row.
  const lastMyIdx = reversedMessages.findIndex(m => m.sender_id === user.id);

  function renderItem({ item, index }) {
    const prev = reversedMessages[index + 1]; // older message is at a higher index when reversed
    const next = reversedMessages[index - 1]; // newer message is at a lower index when reversed
    const isMe = item.sender_id === user.id;
    const t    = new Date(item.created_at).getTime();
    return (
      <MsgRow
        item={item} isMe={isMe}
        firstOfGroup={!prev || prev.sender_id !== item.sender_id || (t - new Date(prev.created_at).getTime()) > GROUP_GAP}
        lastOfGroup={!next || next.sender_id !== item.sender_id  || (new Date(next.created_at).getTime() - t) > GROUP_GAP}
        showDay={!prev || new Date(prev.created_at).toDateString() !== new Date(item.created_at).toDateString()}
        showTime={revealedId === item.id}
        otherInitial={otherInit} otherClr={otherClr}
        isLastSent={isMe && index === lastMyIdx}
        onTime={() => setRevealedId(revealedId === item.id ? null : item.id)}
        onLong={() => { setSelectedMsg(item); setShowMenu(true); }}
        onAvatar={() => setShowProfile(true)}
        onImg={(url) => setFullImg(url)}
        onReact={handleReact}
        rxnData={reactions[item.id]}
        colors={colors}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.secondary }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          {/* Tappable avatar → profile */}
          <TouchableOpacity onPress={() => setShowProfile(true)} style={s.headerAvWrap}>
            <View style={[s.headerAv, { backgroundColor: otherClr }]}>
              <Text style={s.headerAvTxt}>{otherInit}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowProfile(true)} activeOpacity={0.7}>
            <Text style={s.headerName} numberOfLines={1}>{otherName}</Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {productCtx ? productCtx.replace(/^\w+:\s*/, '') : 'Community member'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Context banner (listing / ride) ── */}
      <ContextBanner
        title={productCtx}
        contextType={contextType}
        rideContext={resolvedRideContext}
        colors={colors}
        onRidePress={async () => {
          const rideId = resolvedRideContext?.rideId;
          if (!rideId) return;
          try {
            const ride = await getRideById(rideId);
            navigation.navigate('Tabs', {
              screen: 'Carpool',
              params: { screen: 'RideDetail', params: { ride, fromChat: true } },
            });
          } catch (e) {
            console.error('open ride:', e);
          }
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>

        {/* ── Message list ── */}
        {loading ? (
          <View style={[s.center, { backgroundColor: colors.surfaceSecondary }]}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : messages.length === 0 ? (
          <View style={[s.empty, { backgroundColor: colors.surfaceSecondary }]}>
            <TouchableOpacity onPress={() => setShowProfile(true)}>
              <View style={[s.emptyAv, { backgroundColor: otherClr }]}>
                <Text style={s.emptyAvTxt}>{otherInit}</Text>
              </View>
            </TouchableOpacity>
            <Text style={[s.emptyName, { color: colors.textPrimary }]}>{otherName}</Text>
            {productCtx && (
              <View style={[s.emptyCtxTag, { backgroundColor: BRAND + '18' }]}>
                <Ionicons name={contextType === 'ride' ? 'car-outline' : 'pricetag-outline'} size={12} color={BRAND} />
                <Text style={[s.emptyCtxTxt, { color: BRAND }]} numberOfLines={1}>{productCtx}</Text>
              </View>
            )}
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>Say hi 👋 — start the conversation</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={reversedMessages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            inverted
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: colors.surfaceSecondary }}
          />
        )}

        {/* ── Input bar ── */}
        <View style={[s.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[s.plusBtn, { backgroundColor: colors.inputBackground }]}
            onPress={() => setShowAttach(true)}
            accessibilityLabel="Attachments">
            <Ionicons name="add" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[s.pill, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <TextInput
              style={[s.input, { color: colors.textPrimary }]}
              placeholder="Message…"
              placeholderTextColor={colors.textLight}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: (!text.trim() || sending || uploading) ? colors.border : BRAND }]}
            onPress={handleSend}
            disabled={!text.trim() || sending || uploading}
            accessibilityLabel="Send">
            {(sending || uploading)
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="arrow-up" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ══════════════ MODALS ══════════════ */}

      {/* Phone-number warning */}
      <Modal visible={showPhoneWarn} transparent animationType="fade">
        <View style={s.warnOverlay}>
          <View style={[s.warnSheet, { backgroundColor: colors.card }]}>
            <View style={s.warnIcon}><Ionicons name="shield-checkmark" size={36} color="#F39C12" /></View>
            <Text style={[s.warnTitle, { color: colors.textPrimary }]}>Be careful sharing your number</Text>
            <Text style={[s.warnBody, { color: colors.textSecondary }]}>
              Only share contact details with people you trust.
            </Text>
            <TouchableOpacity style={[s.warnSend, { backgroundColor: '#E67E22' }]}
              onPress={() => { setShowPhoneWarn(false); setText(''); doSend(pendingRef.current); }}>
              <Text style={s.warnSendTxt}>Send Anyway</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.warnCancel, { borderColor: colors.border }]}
              onPress={() => setShowPhoneWarn(false)}>
              <Text style={[s.warnCancelTxt, { color: colors.textSecondary }]}>Go Back & Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Attach sheet */}
      <Modal visible={showAttach} transparent animationType="slide" onRequestClose={() => setShowAttach(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setShowAttach(false)} />
        <View style={[s.sheet, { backgroundColor: colors.card }]}>
          <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>Add to message</Text>
          <View style={s.attachGrid}>
            {[
              { icon: 'camera',  label: 'Camera',   color: '#E63946', onPress: () => { setShowAttach(false); pickImage(true); } },
              { icon: 'images',  label: 'Gallery',   color: '#3498DB', onPress: () => { setShowAttach(false); pickImage(false); } },
              { icon: 'location',label: 'Location',  color: '#2ECC71', onPress: () => { setShowAttach(false); setShowLocInput(true); } },
            ].map(({ icon, label, color, onPress: op }) => (
              <TouchableOpacity key={label} style={s.attachItem} onPress={op}>
                <View style={[s.attachIcon, { backgroundColor: color + '18' }]}>
                  <Ionicons name={icon} size={28} color={color} />
                </View>
                <Text style={[s.attachLabel, { color: colors.textPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <SafeAreaView edges={['bottom']} />
        </View>
      </Modal>

      {/* Location input sheet */}
      <Modal visible={showLocInput} transparent animationType="slide" onRequestClose={() => setShowLocInput(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setShowLocInput(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : undefined}>
          <View style={[s.sheet, { backgroundColor: colors.card }]}>
            <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>Share Location</Text>
            <View style={[s.locRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
              <Ionicons name="location-outline" size={18} color="#E63946" />
              <TextInput
                style={[s.locField, { color: colors.textPrimary }]}
                placeholder="Enter address or place…"
                placeholderTextColor={colors.textLight}
                value={locText}
                onChangeText={setLocText}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={sendLocation}
              />
            </View>
            <TouchableOpacity
              style={[s.locSendBtn, { backgroundColor: locText.trim() ? '#2ECC71' : colors.border }]}
              onPress={sendLocation} disabled={!locText.trim()}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={s.locSendTxt}>Share Location</Text>
            </TouchableOpacity>
            <SafeAreaView edges={['bottom']} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen image viewer */}
      <Modal visible={!!fullImg} transparent animationType="fade" onRequestClose={() => setFullImg(null)}>
        <View style={s.fsOverlay}>
          <TouchableOpacity style={s.fsClose} onPress={() => setFullImg(null)}>
            <Ionicons name="close-circle" size={34} color="#fff" />
          </TouchableOpacity>
          {fullImg && <Image source={{ uri: fullImg }} style={s.fsImg} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Long-press action menu */}
      <ActionMenu
        visible={showMenu}
        message={selectedMsg}
        isMe={selectedMsg?.sender_id === user?.id}
        onClose={() => { setShowMenu(false); setSelectedMsg(null); }}
        onReact={handleReact}
        onCopy={copyText}
        onDelete={deleteMsg}
        colors={colors}
      />

      {/* User profile modal */}
      <UserProfileModal
        visible={showProfile}
        userId={otherProfile?.id}
        onClose={() => setShowProfile(false)}
        onMessage={null}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, gap: 8 },
  backBtn:     { padding: 4 },
  headerAvWrap:{ position: 'relative' },
  headerAv:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerAvTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerName:  { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  headerSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },

  // Context banner
  ctxBanner:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  ctxIconWrap:{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ctxText:    { fontSize: 12.5, fontWeight: '600', flex: 1 },

  rideCard:       { marginHorizontal: 12, marginTop: 10, marginBottom: 4, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  rideRouteRow:   { flexDirection: 'row', alignItems: 'center' },
  rideDot:        { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  rideFrom:       { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  rideTo:         { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  rideMetaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rideChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(26,188,156,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  rideChipTxt:    { fontSize: 11, fontWeight: '500' },

  // Empty state
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyAv:    { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyAvTxt: { color: '#fff', fontSize: 30, fontWeight: '700' },
  emptyName:  { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyCtxTag:{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  emptyCtxTxt:{ fontSize: 12, fontWeight: '600', maxWidth: 200 },
  emptySub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Message list
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },

  // Day separator
  daySep: { alignItems: 'center', marginVertical: 12 },
  dayTxt: { fontSize: 11, fontWeight: '600', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },

  // Row layout
  row:    { flexDirection: 'row', alignItems: 'flex-end' },
  rowMe:  { justifyContent: 'flex-end' },
  rowThem:{ justifyContent: 'flex-start' },
  avGutter:{ width: 30, justifyContent: 'flex-end' },
  smAv:   { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  smAvTxt:{ color: '#fff', fontSize: 11, fontWeight: '700' },

  // Text bubble
  bubble:    { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleTxt: { fontSize: 15.5, lineHeight: 21 },
  timeUnder: { fontSize: 10.5, marginTop: 3, marginHorizontal: 4 },
  receipt:   { alignItems: 'flex-end', marginTop: 2, marginRight: 2 },
  receiptTxt:{ fontSize: 11, fontWeight: '600' },

  // Image message
  imgBubble: { borderRadius: 16, overflow: 'hidden', maxWidth: '76%' },
  imgMsg:    { width: 220, height: 160 },
  imgLoader: { position: 'absolute', top: '50%', left: '50%', zIndex: 1 },

  // Location message
  locBubble:  { borderRadius: 16, padding: 14, maxWidth: 240 },
  locHeader:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  locLabel:   { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  locAddress: { fontSize: 15, fontWeight: '600', lineHeight: 20, marginBottom: 6 },
  locAction:  { fontSize: 12, fontWeight: '500' },

  // Reactions
  rxnRow:   { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3, marginHorizontal: 34, gap: 4 },
  rxnChip:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, gap: 3 },
  rxnEmoji: { fontSize: 14 },
  rxnCount: { fontSize: 12, fontWeight: '600' },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 0.5, gap: 8 },
  plusBtn:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pill:     { flex: 1, borderRadius: 22, borderWidth: 0.5, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 4, minHeight: 42, maxHeight: 120, justifyContent: 'center' },
  input:    { fontSize: 15.5, maxHeight: 100, padding: 0 },
  sendBtn:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  // Phone warning modal
  warnOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  warnSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  warnIcon:    { alignItems: 'center', marginBottom: 12 },
  warnTitle:   { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  warnBody:    { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  warnSend:    { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  warnSendTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  warnCancel:  { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  warnCancelTxt:{ fontSize: 15, fontWeight: '500' },

  // Bottom sheet (attach + location)
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 10 },
  sheetHandle:  { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:   { fontSize: 17, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  attachGrid:   { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingBottom: 10 },
  attachItem:   { alignItems: 'center', gap: 8 },
  attachIcon:   { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attachLabel:  { fontSize: 13, fontWeight: '600' },
  locRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 14 },
  locField:     { flex: 1, fontSize: 15 },
  locSendBtn:   { borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 4 },
  locSendTxt:   { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Fullscreen image
  fsOverlay: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  fsClose:   { position: 'absolute', top: 54, right: 16, zIndex: 10 },
  fsImg:     { width: '100%', height: '80%' },

  // Long-press menu
  menuOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuWrap:    { position: 'absolute', bottom: 80, left: 24, right: 24, gap: 10 },
  emojiStrip:  { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  emojiBtn:    { padding: 6 },
  emojiTxt:    { fontSize: 28 },
  menuActions: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  menuRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 15 },
  menuRowTxt:  { fontSize: 16, fontWeight: '500' },
  menuDivider: { height: 0.5, marginHorizontal: 16 },
});
