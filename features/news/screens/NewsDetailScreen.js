// features/news/screens/NewsDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeContext';

const categoryColors = { visa: '#3498DB', jobs: '#2ECC71', events: '#F39C12', local: '#E63946' };
const categoryEmojis = { visa: '📋', jobs: '💼', events: '🎉', local: '📍' };

export default function NewsDetailScreen({ route }) {
  const { article } = route.params;
  const colors = useTheme();
  const color = categoryColors[article.category] || '#3498DB';
  const emoji = categoryEmojis[article.category] || '📰';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.banner, { backgroundColor: color + '20' }]}>
        <Text style={styles.bannerEmoji}>{emoji}</Text>
        <View style={[styles.categoryTag, { backgroundColor: color }]}>
          <Text style={styles.categoryTagText}>{article.category?.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{article.title}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>📍 St. Louis, Missouri</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>🕐 {new Date(article.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.body, { color: colors.textPrimary }]}>{article.body}</Text>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>— Posted by NestApp Admin Team</Text>
          <Text style={[styles.footerText, { color: colors.textLight }]}>St. Louis Indian Community News</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { height: 140, alignItems: 'center', justifyContent: 'center', gap: 12 },
  bannerEmoji: { fontSize: 48 },
  categoryTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  categoryTagText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaText: { fontSize: 13 },
  divider: { height: 0.5, marginBottom: 20 },
  body: { fontSize: 16, lineHeight: 26 },
  footer: { marginTop: 32, paddingTop: 16, borderTopWidth: 0.5, alignItems: 'center', gap: 4 },
  footerText: { fontSize: 13, fontStyle: 'italic' },
});