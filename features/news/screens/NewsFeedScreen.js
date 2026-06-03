// features/news/screens/NewsFeedScreen.js
// NEWS FEATURE — Main news feed screen
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through newsService only

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getNews } from '../services/newsService';

// ─── Category Config ───────────────────────────
const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 'visa', label: 'Visa' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'events', label: 'Events' },
  { id: 'local', label: 'Local' },
];

const categoryColors = {
  visa: '#3498DB',
  jobs: '#2ECC71',
  events: '#F39C12',
  local: '#E63946',
};

const categoryEmojis = {
  visa: '📋',
  jobs: '💼',
  events: '🎉',
  local: '📍',
};

// ─── News Card Component ───────────────────────
function NewsCard({ item, onPress }) {
  const color = categoryColors[item.category] || '#E63946';
  const emoji = categoryEmojis[item.category] || '📰';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      {/* Category Banner */}
      <View style={[styles.cardBanner, { backgroundColor: color + '20' }]}>
        <Text style={styles.bannerEmoji}>{emoji}</Text>
      </View>

      <View style={styles.cardContent}>
        {/* Category Tag */}
        <View style={[styles.categoryTag, { backgroundColor: color + '20' }]}>
          <Text style={[styles.categoryTagText, { color }]}>
            {item.category?.toUpperCase()}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Body Preview */}
        <Text style={styles.cardBody} numberOfLines={2}>
          {item.body}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTime}>
            🕐 {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={[styles.readMore, { color }]}>
            Read more →
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────
export default function NewsFeedScreen({ navigation }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

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
    <View style={styles.container}>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[
              styles.filterButton,
              selectedCategory === cat.id && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[
              styles.filterLabel,
              selectedCategory === cat.id && styles.filterLabelActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* News List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      ) : news.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No news yet</Text>
          <Text style={styles.emptySubtitle}>
            Check back soon for St. Louis Indian community news
          </Text>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NewsCard
              item={item}
              onPress={(article) =>
                navigation.navigate('NewsDetail', { article })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3498DB"
            />
          }
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  filterLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterLabelActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  cardBanner: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 36,
  },
  cardContent: {
    padding: 14,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 22,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  cardTime: {
    fontSize: 12,
    color: '#999',
  },
  readMore: {
    fontSize: 13,
    fontWeight: '600',
  },
});