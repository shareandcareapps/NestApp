// features/news/screens/NewsDetailScreen.js
// NEWS FEATURE — Full article screen
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through newsService only

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

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

export default function NewsDetailScreen({ route }) {
  const { article } = route.params;
  const color = categoryColors[article.category] || '#3498DB';
  const emoji = categoryEmojis[article.category] || '📰';

  return (
    <ScrollView style={styles.container}>

      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: color + '20' }]}>
        <Text style={styles.bannerEmoji}>{emoji}</Text>
        <View style={[styles.categoryTag, { backgroundColor: color }]}>
          <Text style={styles.categoryTagText}>
            {article.category?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.content}>

        {/* Title */}
        <Text style={styles.title}>{article.title}</Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            📍 St. Louis, Missouri
          </Text>
          <Text style={styles.metaText}>
            🕐 {new Date(article.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body */}
        <Text style={styles.body}>{article.body}</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            — Posted by NestApp Admin Team
          </Text>
          <Text style={styles.footerText}>
            St. Louis Indian Community News
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  banner: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bannerEmoji: {
    fontSize: 48,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 32,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginBottom: 20,
  },
  body: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
});