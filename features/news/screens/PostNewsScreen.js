// features/news/screens/PostNewsScreen.js
// NEWS FEATURE — Admin post news screen
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through newsService only

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createNews } from '../services/newsService';
import useAppStore from '../../../core/store/index';

// ─── Category Config ───────────────────────────
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

  async function handlePost() {
    if (!title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!body) {
      Alert.alert('Error', 'Please enter the article body');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setLoading(true);
    try {
      await createNews({
        admin_id: user.id,
        title,
        body,
        category,
      });
      Alert.alert(
        'Published!',
        'Your news article has been published.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to publish article. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>

        {/* Admin Notice */}
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>
            🔐 Admin — Post Community News
          </Text>
        </View>

        {/* Category Selector */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                category === cat.id && styles.categoryCardActive,
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[
                styles.categoryLabel,
                category === cat.id && styles.categoryLabelActive,
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.label}>Article Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. USCIS announces new OPT rules"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          maxLength={150}
        />

        {/* Body */}
        <Text style={styles.label}>Article Body *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write the full article here..."
          placeholderTextColor="#999"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={8}
        />

        {/* Publish Button */}
        <TouchableOpacity
          style={styles.publishButton}
          onPress={handlePost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>
              Publish Article
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  inner: {
    padding: 20,
    paddingBottom: 40,
  },
  adminBadge: {
    backgroundColor: '#1D3557',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  categoryCardActive: {
    borderColor: '#3498DB',
    borderWidth: 2,
    backgroundColor: '#EBF5FB',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#3498DB',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    color: '#1A1A1A',
  },
  textArea: {
    height: 200,
    textAlignVertical: 'top',
  },
  publishButton: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
  },
});