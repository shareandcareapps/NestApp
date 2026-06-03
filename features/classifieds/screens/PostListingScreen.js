// features/classifieds/screens/PostListingScreen.js
// CLASSIFIEDS FEATURE — Post new listing screen
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through listingsService only

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
import { createListing } from '../services/listingsService';
import useAppStore from '../../../core/store/index';

// ─── Category Config ───────────────────────────
const CATEGORIES = [
  { id: 'accommodation', label: 'Accommodation', emoji: '🏠' },
  { id: 'jobs', label: 'Jobs & Work', emoji: '💼' },
  { id: 'buysell', label: 'Buy & Sell', emoji: '🛍️' },
  { id: 'food', label: 'Food & Tiffin', emoji: '🍱' },
];

export default function PostListingScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = useAppStore((state) => state.user);

  async function handlePost() {
    if (!title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setLoading(true);
    try {
      await createListing({
        user_id: user.id,
        title,
        description,
        price: price ? parseFloat(price) : null,
        category,
        city: 'St. Louis',
        state: 'Missouri',
      });
      Alert.alert(
        'Success!',
        'Your listing has been posted.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to post listing. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>

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
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Room near Wash U, $650/mo"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your listing in detail..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        {/* Price */}
        <Text style={styles.label}>Price (USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 650 (leave empty if free)"
          placeholderTextColor="#999"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Your listing will be visible to the St. Louis Indian community immediately after posting.
          </Text>
        </View>

        {/* Post Button */}
        <TouchableOpacity
          style={styles.postButton}
          onPress={handlePost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post Listing</Text>
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
    borderColor: '#E63946',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
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
    color: '#E63946',
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
    height: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#1D3557',
    lineHeight: 18,
  },
  postButton: {
    backgroundColor: '#E63946',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  postButtonText: {
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