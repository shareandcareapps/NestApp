// features/news/screens/PostNewsScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { createNews } from '../services/newsService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';

const CATEGORIES = [
  { id: 'visa', label: 'Visa Updates', emoji: '📋' },
  { id: 'jobs', label: 'Jobs', emoji: '💼' },
  { id: 'events', label: 'Events', emoji: '🎉' },
  { id: 'local', label: 'Local News', emoji: '📍' },
];

export default function PostNewsScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = useAppStore((state) => state.user);
  const colors = useTheme();

  async function handlePost() {
    if (!title) { Alert.alert('Error', 'Please enter a title'); return; }
    if (!body) { Alert.alert('Error', 'Please enter the article body'); return; }
    if (!category) { Alert.alert('Error', 'Please select a category'); return; }
    setLoading(true);
    try {
      await createNews({ admin_id: user.id, title, body, category });
      Alert.alert('Published!', 'Your news article has been published.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to publish article. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        <View style={[styles.adminBadge, { backgroundColor: colors.secondary }]}>
          <Text style={styles.adminBadgeText}>🔐 Admin — Post Community News</Text>
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Category *</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, {
                backgroundColor: colors.surface,
                borderColor: category === cat.id ? '#3498DB' : colors.border,
                borderWidth: category === cat.id ? 2 : 0.5,
              }]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: category === cat.id ? '#3498DB' : colors.textSecondary }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Article Title *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="e.g. USCIS announces new OPT rules"
          placeholderTextColor={colors.textLight}
          value={title}
          onChangeText={setTitle}
          maxLength={150}
        />
        <Text style={[styles.label, { color: colors.textPrimary }]}>Article Body *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Write the full article here..."
          placeholderTextColor={colors.textLight}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={8}
        />
        <TouchableOpacity
          style={[styles.publishButton, { backgroundColor: '#3498DB' }]}
          onPress={handlePost}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishButtonText}>Publish Article</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, paddingBottom: 40 },
  adminBadge: { borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 8 },
  adminBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: { width: '47%', borderRadius: 12, padding: 14, alignItems: 'center' },
  categoryEmoji: { fontSize: 24, marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { height: 200, textAlignVertical: 'top' },
  publishButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 24 },
  publishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 15 },
});