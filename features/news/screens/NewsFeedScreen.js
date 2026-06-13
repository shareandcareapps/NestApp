// features/news/screens/NewsFeedScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getNews, PAGE_SIZE } from '../services/newsService';
import { useTheme } from '../../../core/theme/ThemeContext';
import EmptyState from '../../../core/components/EmptyState';
import SkeletonLoader from '../../../core/components/SkeletonLoader';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const CATEGORIES = [
  { id: null,       label: 'All',      icon: 'apps-outline',         gradient: ['#2D1B69','#4A2D9C'],  flag: '🌐' },
  { id: 'india',    label: 'India',    icon: 'flag-outline',         gradient: ['#FF9933','#138808'],  flag: '🇮🇳' },
  { id: 'pakistan', label: 'Pakistan', icon: 'flag-outline',         gradient: ['#01411C','#005C2E'],  flag: '🇵🇰' },
  { id: 'nepal',    label: 'Nepal',    icon: 'flag-outline',         gradient: ['#003580','#DC143C'],  flag: '🇳🇵' },
  { id: 'arab',     label: 'Arab',     icon: 'moon-outline',         gradient: ['#006C35','#C8A84B'],  flag: '🌙' },
  { id: 'local',    label: 'Local',    icon: 'location-outline',     gradient: ['#FF6B6B','#E84393'],  flag: '📍' },
];

const CAT_META = {
  india:    { icon: 'globe-outline',      gradient: ['#FF9933','#138808'] },
  pakistan: { icon: 'globe-outline',      gradient: ['#01411C','#005C2E'] },
  nepal:    { icon: 'globe-outline',      gradient: ['#003580','#DC143C'] },
  arab:     { icon: 'moon-outline',       gradient: ['#006C35','#C8A84B'] },
  local:    { icon: 'home-outline',       gradient: ['#FF6B6B','#E84393'] },
  visa:     { icon: 'document-text-outline', gradient: ['#0099FF','#0055CC'] },
  jobs:     { icon: 'briefcase-outline',  gradient: ['#00C48C','#007A5E'] },
  events:   { icon: 'calendar-outline',   gradient: ['#F4A833','#E68A00'] },
};

const STORIES = [
  { id: '1', name: 'India',    icon: 'globe-outline',         gradient: ['#FF9933','#138808'] },
  { id: '2', name: 'Pakistan', icon: 'globe-outline',         gradient: ['#01411C','#5B8F6E'] },
  { id: '3', name: 'Nepal',    icon: 'globe-outline',         gradient: ['#003580','#DC143C'] },
  { id: '4', name: 'Arab',     icon: 'moon-outline',          gradient: ['#006C35','#C8A84B'] },
  { id: '5', name: 'Local',    icon: 'home-outline',          gradient: ['#FF6B6B','#E84393'] },
  { id: '6', name: 'Events',   icon: 'calendar-outline',      gradient: ['#F4A833','#E68A00'] },
];

const TRENDING = ['#StLouis', '#H1BVisa', '#OPTExtension', '#DesiFood', '#Diwali', '#Eid2025'];

function StoriesRow({ theme }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stS.row}>
      {/* Add story button */}
      <View style={stS.storyWrap}>
        <View style={[stS.addCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="add" size={24} color="#F4A833" />
        </View>
        <Text style={[stS.storyLabel, { color: theme.textSecondary }]}>Your Story</Text>
      </View>
      {STORIES.map(s => (
        <TouchableOpacity key={s.id} style={stS.storyWrap} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} activeOpacity={0.8}>
          <LinearGradient colors={s.gradient} style={stS.storyRing} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={[stS.storyInner, { backgroundColor: theme.card }]}>
              <Ionicons name={s.icon} size={22} color={s.gradient[0]} />
            </View>
          </LinearGradient>
          <Text style={[stS.storyLabel, { color: theme.textSecondary }]} numberOfLines={1}>{s.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const stS = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingVertical: 14, gap: 16 },
  storyWrap: { alignItems: 'center', gap: 6, width: 62 },
  addCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  storyRing: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  storyInner: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  storyEmoji: { fontSize: 26 },
  storyLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

function TrendingRow({ theme }) {
  return (
    <View style={trS.wrap}>
      <View style={trS.header}>
        <Ionicons name="trending-up" size={14} color="#F4A833" />
        <Text style={[trS.title, { color: theme.textSecondary }]}>Trending</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={trS.chips}>
        {TRENDING.map(tag => (
          <TouchableOpacity key={tag} style={[trS.chip, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Text style={[trS.chipTxt, { color: '#F4A833' }]}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const trS = StyleSheet.create({
  wrap: { paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, marginBottom: 8 },
  title: { fontSize: fonts.sizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { paddingHorizontal: spacing.md, gap: 8 },
  chip: { borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
});

function NewsCard({ item, onPress, theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const meta  = CAT_META[item.category] || { emoji: '📰', gradient: ['#2D1B69','#4A2D9C'] };
  const timeStr = new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(item); }}
      activeOpacity={1}
    >
      <Animated.View style={[nStyles.card, { backgroundColor: theme.card, transform: [{ scale }] }, shadows.small]}>
        <LinearGradient colors={meta.gradient} style={nStyles.banner} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Ionicons name={meta.icon || 'newspaper-outline'} size={28} color="rgba(255,255,255,0.85)" />
          <View style={nStyles.categoryBadge}>
            <Text style={nStyles.categoryBadgeTxt}>{item.category?.toUpperCase() || 'NEWS'}</Text>
          </View>
        </LinearGradient>

        <View style={nStyles.content}>
          <Text style={[nStyles.title, { color: theme.textPrimary }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[nStyles.body, { color: theme.textSecondary }]} numberOfLines={2}>{item.body}</Text>
          <View style={nStyles.footer}>
            <View style={nStyles.metaRow}>
              <Ionicons name="location-outline" size={12} color={theme.textLight} />
            </View>
            <View style={nStyles.metaRow}>
              <Ionicons name="time-outline" size={12} color={theme.textLight} />
              <Text style={[nStyles.metaTxt, { color: theme.textLight }]}>{timeStr}</Text>
            </View>
            <Text style={[nStyles.readMore, { color: meta.gradient[0] }]}>Read →</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const nStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, marginHorizontal: spacing.md, marginBottom: 14, overflow: 'hidden' },
  banner: { height: 90, alignItems: 'center', justifyContent: 'space-between', padding: 14, flexDirection: 'row' },
  bannerEmoji: { fontSize: 40, flex: 1 },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  content: { padding: 14 },
  title: { fontSize: fonts.sizes.md, fontWeight: '800', lineHeight: 22, marginBottom: 6 },
  body: { fontSize: fonts.sizes.sm, lineHeight: 20, marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 11 },
  readMore: { fontSize: fonts.sizes.sm, fontWeight: '700', marginLeft: 'auto' },
});

export default function NewsFeedScreen({ navigation }) {
  const [news,       setNews]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,    setHasMore]    = useState(true);
  const pageRef = React.useRef(0);
  const theme  = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => { fetchNews(); }, [selected]);

  async function fetchNews() {
    try {
      setLoading(true);
      pageRef.current = 0;
      const data = await getNews(selected, 0);
      setNews(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchMoreNews() {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = pageRef.current + 1;
      const data = await getNews(selected, nextPage);
      pageRef.current = nextPage;
      setNews(prev => {
        const seen = new Set(prev.map(n => n.id));
        return [...prev, ...data.filter(n => !seen.has(n.id))];
      });
      setHasMore(data.length >= PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  }

  const ListHeader = () => (
    <>
      <StoriesRow theme={theme} />
      <TrendingRow theme={theme} />
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Community Stories</Text>
          </View>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}>
          {CATEGORIES.map(cat => {
            const isActive = selected === cat.id;
            return (
              <TouchableOpacity
                key={String(cat.id)}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(cat.id); }}
                style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              >
                <Text style={styles.chipFlag}>{cat.flag}</Text>
                <Text style={[styles.chipTxt, { color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[0,1,2].map(i => <SkeletonLoader key={i} type="news" style={{ marginBottom: 14 }} />)}
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={item => item.id}
          ListHeaderComponent={<ListHeader />}
          renderItem={({ item }) => (
            <NewsCard item={item} theme={theme} onPress={article => navigation.navigate('NewsDetail', { article })} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F4A833" />}
          onEndReached={fetchMoreNews}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <SkeletonLoader type="news" style={{ margin: 14 }} /> : null}
          ListEmptyComponent={
            <EmptyState type="news" title="No stories yet" body="Community news and updates for St. Louis will appear here." />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: fonts.sizes.xs, fontWeight: '600', letterSpacing: 0.5 },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  chipInactive: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipFlag: { fontSize: 14 },
  chipTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
});
