// features/news/screens/NewsDetailScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';
import { supabase } from '../../../core/database/index';
import useAppStore from '../../../core/store/index';

const CAT_META = {
  india:    { emoji: '🇮🇳', gradient: ['#FF9933','#138808'], label: 'India News' },
  pakistan: { emoji: '🇵🇰', gradient: ['#01411C','#5B8F6E'], label: 'Pakistan News' },
  nepal:    { emoji: '🇳🇵', gradient: ['#003580','#DC143C'], label: 'Nepal News' },
  arab:     { emoji: '🌙',  gradient: ['#006C35','#C8A84B'], label: 'Arab Community' },
  local:    { emoji: '📍',  gradient: ['#FF6B6B','#E84393'], label: 'Local News' },
  visa:     { emoji: '📋',  gradient: ['#0099FF','#0055CC'], label: 'Visa Updates' },
  jobs:     { emoji: '💼',  gradient: ['#00C48C','#007A5E'], label: 'Jobs & Work' },
  events:   { emoji: '🎉',  gradient: ['#F4A833','#E68A00'], label: 'Events' },
};

const MOCK_COMMENTS = [
  { id: '1', author: 'Priya S.', avatar: '🙋‍♀️', time: '2h ago', text: 'Very helpful update! Thanks for sharing this with the community.', likes: 4 },
  { id: '2', author: 'Ahmed K.', avatar: '👨‍💼', time: '3h ago', text: 'I had the same experience. Glad to see someone posting about this.', likes: 2,
    replies: [{ id: '2r1', author: 'Sunita R.', avatar: '👩', time: '2h ago', text: 'Same here! This is really useful.', likes: 1 }] },
  { id: '3', author: 'Raj M.', avatar: '🧑', time: '5h ago', text: 'Does anyone know if this applies to F-2 visa holders as well?', likes: 0 },
];

function CommentBubble({ comment, theme, accent, isReply }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(comment.likes);
  const scale = useRef(new Animated.Value(1)).current;

  function toggleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setLiked(p => !p);
    setCount(p => liked ? p - 1 : p + 1);
  }

  return (
    <View style={[cmtS.wrap, isReply && cmtS.replyWrap]}>
      {isReply && <View style={[cmtS.replyLine, { backgroundColor: accent + '40' }]} />}
      <View style={[cmtS.bubble, { backgroundColor: theme.card }, !isReply && shadows.small]}>
        <View style={cmtS.header}>
          <View style={[cmtS.avatar, { backgroundColor: accent + '22' }]}>
            <Text style={cmtS.avatarEmoji}>{comment.avatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[cmtS.author, { color: theme.textPrimary }]}>{comment.author}</Text>
            <Text style={[cmtS.time, { color: theme.textLight }]}>{comment.time}</Text>
          </View>
          <TouchableOpacity style={cmtS.likeBtn} onPress={toggleLike}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? '#FF6B6B' : theme.textLight} />
            </Animated.View>
            {count > 0 && <Text style={[cmtS.likeCount, { color: liked ? '#FF6B6B' : theme.textLight }]}>{count}</Text>}
          </TouchableOpacity>
        </View>
        <Text style={[cmtS.text, { color: theme.textSecondary }]}>{comment.text}</Text>
      </View>
      {comment.replies?.map(r => <CommentBubble key={r.id} comment={r} theme={theme} accent={accent} isReply />)}
    </View>
  );
}

const cmtS = StyleSheet.create({
  wrap: { marginBottom: 10 },
  replyWrap: { marginLeft: 20, marginBottom: 8, flexDirection: 'row', gap: 8 },
  replyLine: { width: 2, borderRadius: 1, flexShrink: 0 },
  bubble: { borderRadius: borderRadius.lg, padding: 12, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 18 },
  author: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  time: { fontSize: 11, marginTop: 1 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likeCount: { fontSize: 12, fontWeight: '600' },
  text: { fontSize: fonts.sizes.sm, lineHeight: 20 },
});

export default function NewsDetailScreen({ route, navigation }) {
  const { article } = route.params;
  const theme   = useTheme();
  const insets  = useSafeAreaInsets();
  const user    = useAppStore(s => s.user);
  const meta    = CAT_META[article.category] || { emoji: '📰', gradient: ['#2D1B69','#4A2D9C'], label: 'News' };
  const timeStr = new Date(article.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const [following,    setFollowing]    = useState(false);
  const [commentText,  setCommentText]  = useState('');
  const [comments,     setComments]     = useState(MOCK_COMMENTS);
  const [isAdmin,      setIsAdmin]      = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === 'admin'));
  }, [user?.id]);

  function handleFollow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowing(p => !p);
  }

  function submitComment() {
    if (!commentText.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setComments(prev => [{
      id: Date.now().toString(), author: 'You', avatar: '🙋', time: 'Just now',
      text: commentText.trim(), likes: 0,
    }, ...prev]);
    setCommentText('');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {/* Hero — full-bleed image or gradient */}
          {article.image_url ? (
            <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
              <Image source={{ uri: article.image_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <LinearGradient colors={['rgba(0,0,0,0.1)','rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.heroTopRow}>
                <BlurView intensity={20} tint="dark" style={styles.backBtn}>
                  <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('NewsFeed')}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                  </TouchableOpacity>
                </BlurView>
                {isAdmin && (
                  <BlurView intensity={20} tint="dark" style={styles.backBtn}>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminEditNews', { article })}>
                      <Ionicons name="create-outline" size={20} color="#F4A833" />
                    </TouchableOpacity>
                  </BlurView>
                )}
              </View>
              <View style={styles.heroCategoryBadge}>
                <Text style={styles.heroCategoryTxt}>{meta.label.toUpperCase()}</Text>
              </View>
            </View>
          ) : (
            <LinearGradient colors={meta.gradient} style={[styles.hero, { paddingTop: insets.top + 10 }]} start={{x:0,y:0}} end={{x:1,y:1}}>
              <View style={styles.heroTopRow}>
                <BlurView intensity={20} tint="dark" style={styles.backBtn}>
                  <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('NewsFeed')}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                  </TouchableOpacity>
                </BlurView>
                {isAdmin && (
                  <BlurView intensity={20} tint="dark" style={styles.backBtn}>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminEditNews', { article })}>
                      <Ionicons name="create-outline" size={20} color="#F4A833" />
                    </TouchableOpacity>
                  </BlurView>
                )}
              </View>
              <Text style={styles.heroEmoji}>{meta.emoji}</Text>
              <View style={styles.heroCategoryBadge}>
                <Text style={styles.heroCategoryTxt}>{meta.label.toUpperCase()}</Text>
              </View>
            </LinearGradient>
          )}

          {/* Content card */}
          <View style={[styles.contentCard, { backgroundColor: theme.card }, shadows.medium]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{article.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={meta.gradient[0]} />
                <Text style={[styles.metaTxt, { color: theme.textSecondary }]}>St. Louis, Missouri</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={meta.gradient[0]} />
                <Text style={[styles.metaTxt, { color: theme.textSecondary }]}>{timeStr}</Text>
              </View>
            </View>

            <LinearGradient colors={meta.gradient} style={styles.divider} start={{x:0,y:0}} end={{x:1,y:0}} />

            <Text style={[styles.body, { color: theme.textPrimary }]}>{article.body}</Text>

            {/* Author card */}
            <View style={[styles.authorCard, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <LinearGradient colors={meta.gradient} style={styles.authorAvatar}>
                <Text style={styles.authorAvatarTxt}>N</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.authorName, { color: theme.textPrimary }]}>NestApp Admin Team</Text>
                <Text style={[styles.authorSub, { color: theme.textLight }]}>St. Louis Community · Verified</Text>
              </View>
              <TouchableOpacity
                style={[styles.followBtn, following
                  ? { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1.5 }
                  : { backgroundColor: meta.gradient[0] }]}
                onPress={handleFollow}
              >
                <Text style={[styles.followTxt, { color: following ? theme.textSecondary : '#fff' }]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments */}
          <View style={[styles.commentsSection, { marginTop: 16, marginHorizontal: spacing.md }]}>
            <View style={styles.commentsHeader}>
              <Ionicons name="chatbubbles-outline" size={16} color={meta.gradient[0]} />
              <Text style={[styles.commentsTitleTxt, { color: theme.textPrimary }]}>Community Comments</Text>
              <View style={[styles.commentCount, { backgroundColor: meta.gradient[0] + '22' }]}>
                <Text style={[styles.commentCountTxt, { color: meta.gradient[0] }]}>{comments.length}</Text>
              </View>
            </View>

            {/* Input row */}
            <View style={[styles.commentInputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.commentInput, { color: theme.textPrimary }]}
                placeholder="Add a comment…"
                placeholderTextColor={theme.textLight}
                value={commentText}
                onChangeText={setCommentText}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity
                style={[styles.commentSend, { backgroundColor: commentText.trim() ? meta.gradient[0] : theme.border }]}
                onPress={submitComment}
                disabled={!commentText.trim()}
              >
                <Ionicons name="arrow-up" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {comments.map(c => <CommentBubble key={c.id} comment={c} theme={theme} accent={meta.gradient[0]} />)}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: 220, paddingHorizontal: spacing.md, justifyContent: 'space-between', paddingBottom: 20 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 64, textAlign: 'center', marginTop: -10 },
  heroCategoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 6 },
  heroCategoryTxt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  contentCard: { borderRadius: borderRadius.xl, marginHorizontal: spacing.md, marginTop: -24, padding: 20 },
  title: { fontSize: fonts.sizes.xl, fontWeight: '800', lineHeight: 30, marginBottom: 14 },
  metaRow: { gap: 8, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: fonts.sizes.sm },
  divider: { height: 3, borderRadius: 2, marginBottom: 18 },
  body: { fontSize: fonts.sizes.md, lineHeight: 28, letterSpacing: 0.1, marginBottom: 20 },

  authorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: borderRadius.lg, padding: 14, borderWidth: 1 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  authorAvatarTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
  authorName: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  authorSub: { fontSize: 11, marginTop: 2 },
  followBtn: { borderRadius: borderRadius.full, paddingHorizontal: 16, paddingVertical: 8 },
  followTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },

  commentsSection: {},
  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  commentsTitleTxt: { fontSize: fonts.sizes.md, fontWeight: '800', flex: 1 },
  commentCount: { borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  commentCountTxt: { fontSize: 12, fontWeight: '700' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.full, borderWidth: 1.5, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, gap: 8, marginBottom: 14 },
  commentInput: { flex: 1, fontSize: fonts.sizes.sm, paddingVertical: 6 },
  commentSend: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
