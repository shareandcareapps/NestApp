// features/classifieds/screens/PostListingScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createListing } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { supabase } from '../../../core/database/index';
import { useTheme } from '../../../core/theme/ThemeContext';

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
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = useAppStore((state) => state.user);
  const colors = useTheme();

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      if (images.length >= 4) { Alert.alert('Maximum 4 photos allowed'); return; }
      await uploadImage(result.assets[0]);
    }
  }

  async function uploadImage(imageAsset) {
    try {
      setUploading(true);
      const ext = imageAsset.uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage.from('listings').upload(fileName, arrayBuffer, { contentType: `image/${ext}` });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('listings').getPublicUrl(fileName);
      setImages((prev) => [...prev, urlData.publicUrl]);
    } catch (error) {
      Alert.alert('Upload failed', 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePost() {
    if (!title) { Alert.alert('Error', 'Please enter a title'); return; }
    if (!category) { Alert.alert('Error', 'Please select a category'); return; }
    setLoading(true);
    try {
      await createListing({ user_id: user.id, title, description, price: price ? parseFloat(price) : null, category, city: 'St. Louis', state: 'Missouri', images });
      Alert.alert('Success!', 'Your listing has been posted.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to post listing. Please try again.');
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
                backgroundColor: colors.surface,
                borderColor: category === cat.id ? colors.primary : colors.border,
                borderWidth: category === cat.id ? 2 : 0.5,
              }]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: category === cat.id ? colors.primary : colors.textSecondary }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="e.g. Room near Wash U, $650/mo"
          placeholderTextColor={colors.textLight}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Describe your listing in detail..."
          placeholderTextColor={colors.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={[styles.label, { color: colors.textPrimary }]}>Price (USD)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="e.g. 650 (leave empty if free)"
          placeholderTextColor={colors.textLight}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <Text style={[styles.label, { color: colors.textPrimary }]}>Photos (up to 4)</Text>
        <View style={styles.photosContainer}>
          {images.map((uri, index) => (
            <View key={index} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => removeImage(index)}>
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 4 && (
            <TouchableOpacity
              style={[styles.addPhotoButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={pickImage}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator color={colors.primary} /> : (
                <>
                  <Text style={styles.addPhotoIcon}>📷</Text>
                  <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.infoBox, { backgroundColor: colors.infoBackground }]}>
          <Text style={[styles.infoText, { color: colors.secondary }]}>
            💡 Your listing will be visible to the St. Louis Indian community immediately after posting.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.postButton, { backgroundColor: colors.primary }]}
          onPress={handlePost}
          disabled={loading || uploading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Post Listing</Text>}
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
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: { width: '47%', borderRadius: 12, padding: 14, alignItems: 'center' },
  categoryEmoji: { fontSize: 24, marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { height: 100, textAlignVertical: 'top' },
  photosContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrapper: { position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: 'absolute', top: -6, right: -6, backgroundColor: '#E63946', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  removePhotoText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addPhotoButton: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoIcon: { fontSize: 20 },
  addPhotoText: { fontSize: 10, fontWeight: '500' },
  infoBox: { borderRadius: 10, padding: 12, marginTop: 20 },
  infoText: { fontSize: 13, lineHeight: 18 },
  postButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  postButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 15 },
});