// features/classifieds/screens/EditListingScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { updateListing } from '../services/listingsService';
import { useTheme } from '../../../core/theme/ThemeContext';

const CATEGORIES = [
  { id: 'accommodation', label: 'Accommodation', emoji: '🏠' },
  { id: 'jobs', label: 'Jobs & Work', emoji: '💼' },
  { id: 'buysell', label: 'Buy & Sell', emoji: '🛍️' },
  { id: 'food', label: 'Food & Tiffin', emoji: '🍱' },
];

export default function EditListingScreen({ route, navigation }) {
  const { listing } = route.params;
  const colors = useTheme();
  const [title, setTitle] = useState(listing.title || '');
  const [description, setDescription] = useState(listing.description || '');
  const [price, setPrice] = useState(listing.price?.toString() || '');
  const [category, setCategory] = useState(listing.category || null);
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    if (!title) { Alert.alert('Error', 'Please enter a title'); return; }
    if (!category) { Alert.alert('Error', 'Please select a category'); return; }
    setLoading(true);
    try {
      await updateListing(listing.id, {
        title,
        description,
        price: price ? parseFloat(price) : null,
        category,
      });
      Alert.alert('Updated!', 'Your listing has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Could not update listing. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Category *</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, {
                backgroundColor: category === cat.id ? colors.errorBackground : colors.surface,
                borderColor: category === cat.id ? colors.primary : colors.border,
                borderWidth: category === cat.id ? 2 : 0.5,
              }]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, {
                color: category === cat.id ? colors.primary : colors.textSecondary,
              }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="Listing title"
          placeholderTextColor={colors.textLight}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="Describe your listing..."
          placeholderTextColor={colors.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Price (USD)</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="e.g. 650"
          placeholderTextColor={colors.textLight}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.updateButton, { backgroundColor: colors.primary }]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: { width: '47%', borderRadius: 12, padding: 14, alignItems: 'center' },
  categoryEmoji: { fontSize: 24, marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { height: 100, textAlignVertical: 'top' },
  updateButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 24 },
  updateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 15 },
});