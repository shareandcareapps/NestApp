// features/news/screens/NewsFeedScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView,
} from 'react-native';
import { getNews } from '../services/newsService';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 'visa', label: 'Visa' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'events', label: 'Events' },
  { id: 'local', label: 'Local' },
];

const categoryColors = { visa: '#3498DB', jobs: '#2ECC71', events: '#F39C12', local: '#E63946' };
const categoryEmojis = { visa: '📋', jobs: '💼', events: '🎉', local: '📍' };

function NewsCard({ item, onPress, colors }) {
  const color = categoryColors[item.category] || '#E63946';
  const emoji = categoryEmojis[item.category] || '📰';
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(item)}
    >
      <View style={[styles.cardBanner, { backgroundColor: color + '20' }]}>
        <Text style={styles.bannerEmoji}>{emoji}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={[styles.categoryTag, { backgroundColor: color + '20' }]}>
          <Text style={[styles.categoryTagText, { color }]}>{item.category?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
        <View style={[styles.cardFooter, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.cardTime, { color: colors.textLight }]}>🕐 {new Date(item.created_at).toLocaleDateString()}</Text>
          <Text style={[styles.readMore, { color }]}>Read more →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NewsFeedScreen({ navigation }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const colors = useTheme();

  useEffect(() => { fetchNews(); }, [selectedCategory]);

  async function fetchNews() {
    try {
      setLoading(true);
      const data = await getNews(selectedCategory);
      setNews(data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.headerBar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>News</Text>
        </View>
      </SafeAreaView>
      <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {CATEGORIES.map((cat) => (
  <TouchableOpacity
    key={cat.label}
    style={[styles.filterButton, {
      backgroundColor: selectedCategory === cat.id ? '#3498DB' : colors.surfaceSecondary,
      borderColor: selectedCategory === cat.id ? '#3498DB' : colors.border,
    }]}
    onPress={() => setSelectedCategory(cat.id)}
  >
    <Text style={[styles.filterLabel, { color: selectedCategory === cat.id ? '#fff' : colors.textSecondary }]}>
      {cat.label}
    </Text>
  </TouchableOpacity>
))}
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading news...</Text>
        </View>
      ) : news.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No news yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Check back soon for St. Louis Indian community news
          </Text>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NewsCard item={item} colors={colors} onPress={(article) => navigation.navigate('NewsDetail', { article })} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3498DB" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  filterContainer: { flexDirection: 'row', padding: 12, borderBottomWidth: 0.5, gap: 8 },
  filterButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5 },
  filterLabel: { fontSize: 13, fontWeight: '500' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  listContent: { padding: 12 },
  card: { borderRadius: 12, marginBottom: 12, borderWidth: 0.5, overflow: 'hidden' },
  cardBanner: { height: 80, alignItems: 'center', justifyContent: 'center' },
  bannerEmoji: { fontSize: 36 },
  cardContent: { padding: 14 },
  categoryTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  categoryTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 6 },
  cardBody: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 0.5 },
  cardTime: { fontSize: 12 },
  readMore: { fontSize: 13, fontWeight: '600' },
});