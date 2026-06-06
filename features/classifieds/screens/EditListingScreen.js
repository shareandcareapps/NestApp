// features/classifieds/screens/EditListingScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, StyleSheet, Switch, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateListing } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { supabase } from '../../../core/database/index';
import { useTheme } from '../../../core/theme/ThemeContext';

const categoryColors = {
  accommodation: '#E63946',
  jobs: '#2ECC71',
  buysell: '#3498DB',
  food: '#F39C12',
};

const categoryEmojis = {
  accommodation: '🏠',
  jobs: '💼',
  buysell: '🛍️',
  food: '🍱',
};

const categoryLabels = {
  accommodation: 'Accommodation',
  jobs: 'Jobs & Work',
  buysell: 'Buy & Sell',
  food: 'Food & Tiffin',
};

const BUY_SELL_CATEGORIES = [
  'Cars', 'Furniture', 'Electronics', 'Toys & Games',
  'Clothing & Apparel', 'Books', 'Appliances', 'Other',
];

export default function EditListingScreen({ route, navigation }) {
  const { listing } = route.params;
  const colors = useTheme();
  const user = useAppStore((state) => state.user);
  const category = listing.category;
  const color = categoryColors[category] || '#E63946';

  // ─── Photos ────────────────────────────────
  const [images, setImages] = useState(listing.images || []);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    if (images.length >= 4) { Alert.alert('Maximum 4 photos allowed'); return; }
    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: '📷 Camera',
        onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (!p.granted) { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
          if (!r.canceled) await uploadImage(r.assets[0]);
        },
      },
      {
        text: '🖼️ Photo Library',
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
          if (!r.canceled) await uploadImage(r.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      Alert.alert('Upload failed', 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  // metadata is stored as jsonb — already an object from Supabase
  let meta = {};
  if (listing.metadata) {
    meta = typeof listing.metadata === 'string' ? JSON.parse(listing.metadata) : listing.metadata;
  }

  // ─── Accommodation fields ──────────────────
  const [acTitle, setAcTitle] = useState(listing.title || '');
  const [acDescription, setAcDescription] = useState(listing.description || '');
  const [acPrice, setAcPrice] = useState(listing.price?.toString() || '');

  // ─── Jobs fields ───────────────────────────
  const [jobRole, setJobRole] = useState(listing.title || '');
  const [jobCompany, setJobCompany] = useState(meta.company || '');
  const [jobSalary, setJobSalary] = useState(listing.price?.toString() || '');
  const [jobSalaryOpen, setJobSalaryOpen] = useState(meta.salary_open || false);
  const [jobType, setJobType] = useState(meta.job_type || 'part_time');
  const [jobHours, setJobHours] = useState(meta.hours_per_week || '');
  const [jobLocation, setJobLocation] = useState(meta.location || '');
  const [jobJoining, setJobJoining] = useState(meta.joining || 'immediate');
  const [jobDescription, setJobDescription] = useState(listing.description || '');

  // ─── Buy & Sell fields ─────────────────────
  const [bsProductName, setBsProductName] = useState(listing.title || '');
  const [bsDescription, setBsDescription] = useState(listing.description || '');
  const [bsPrice, setBsPrice] = useState(listing.price?.toString() || '');
  const [bsNegotiable, setBsNegotiable] = useState(meta.negotiable || false);
  const [bsProductCategory, setBsProductCategory] = useState(meta.product_category || null);
  const [bsCondition, setBsCondition] = useState(meta.condition || 'used');
  const [bsPickupLocation, setBsPickupLocation] = useState(meta.pickup_location || '');

  // ─── Food fields ───────────────────────────
  const [foodTitle, setFoodTitle] = useState(listing.title || '');
  const [foodDescription, setFoodDescription] = useState(listing.description || '');
  const [foodPrice, setFoodPrice] = useState(listing.price?.toString() || '');
  const [foodNegotiable, setFoodNegotiable] = useState(meta.negotiable || false);
  const [foodPickup, setFoodPickup] = useState(meta.pickup || false);
  const [foodDelivery, setFoodDelivery] = useState(meta.delivery || false);

  const [loading, setLoading] = useState(false);

  function buildUpdateData() {
    if (category === 'accommodation') {
      return {
        title: acTitle,
        description: acDescription,
        price: acPrice ? parseFloat(acPrice) : null,
        images,
      };
    }
    if (category === 'jobs') {
      return {
        title: jobRole,
        description: jobDescription,
        price: jobSalaryOpen ? null : jobSalary ? parseFloat(jobSalary) : null,
        images,
        metadata: {
          company: jobCompany,
          salary_open: jobSalaryOpen,
          job_type: jobType,
          hours_per_week: jobHours,
          location: jobLocation,
          joining: jobJoining,
        },
      };
    }
    if (category === 'buysell') {
      return {
        title: bsProductName,
        description: bsDescription,
        price: bsPrice ? parseFloat(bsPrice) : null,
        images,
        metadata: {
          negotiable: bsNegotiable,
          product_category: bsProductCategory,
          condition: bsCondition,
          pickup_location: bsPickupLocation,
        },
      };
    }
    if (category === 'food') {
      return {
        title: foodTitle,
        description: foodDescription,
        price: foodPrice ? parseFloat(foodPrice) : null,
        images,
        metadata: {
          negotiable: foodNegotiable,
          pickup: foodPickup,
          delivery: foodDelivery,
        },
      };
    }
  }

  // Photos section — shown for all categories except jobs
  const showPhotos = category !== 'jobs';
  const PhotosSection = () => (
    <>
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
            style={[styles.addPhotoButton, { backgroundColor: colors.surface, borderColor: color }]}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator color={color} /> : (
              <>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={[styles.addPhotoText, { color }]}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  function validate() {
    if (category === 'accommodation' && !acTitle) { Alert.alert('Error', 'Please enter a title'); return false; }
    if (category === 'jobs' && !jobRole) { Alert.alert('Error', 'Please enter job role'); return false; }
    if (category === 'jobs' && !jobCompany) { Alert.alert('Error', 'Please enter company name'); return false; }
    if (category === 'buysell' && !bsProductName) { Alert.alert('Error', 'Please enter product name'); return false; }
    if (category === 'food' && !foodTitle) { Alert.alert('Error', 'Please enter a title'); return false; }
    return true;
  }

  async function handleUpdate() {
    if (!validate()) return;
    setLoading(true);
    try {
      await updateListing(listing.id, buildUpdateData());
      Alert.alert('Updated!', 'Your listing has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Could not update. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>

        {/* Locked Category Badge */}
        {/* Category Header */}
<View style={[styles.categoryHeader, { backgroundColor: color }]}>
  <Text style={styles.categoryHeaderEmoji}>{categoryEmojis[category]}</Text>
  <View>
    <Text style={styles.categoryHeaderSub}>Editing Listing</Text>
    <Text style={styles.categoryHeaderTitle}>{categoryLabels[category]}</Text>
  </View>
</View>

        {/* ─── ACCOMMODATION FORM ─── */}
        {category === 'accommodation' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Room near Wash U"
              placeholderTextColor={colors.textLight}
              value={acTitle}
              onChangeText={setAcTitle}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe the property..."
              placeholderTextColor={colors.textLight}
              value={acDescription}
              onChangeText={setAcDescription}
              multiline
              numberOfLines={4}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Monthly Rent (USD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. 650"
              placeholderTextColor={colors.textLight}
              value={acPrice}
              onChangeText={setAcPrice}
              keyboardType="numeric"
            />
          </>
        )}

        {/* ─── JOBS FORM ─── */}
        {category === 'jobs' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Job Role / Position *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Cashier, Server, Tutor"
              placeholderTextColor={colors.textLight}
              value={jobRole}
              onChangeText={setJobRole}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Company / Store Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Patel Brothers"
              placeholderTextColor={colors.textLight}
              value={jobCompany}
              onChangeText={setJobCompany}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Job Type *</Text>
            <View style={styles.toggleRow}>
              {[{ id: 'part_time', label: 'Part Time' }, { id: 'full_time', label: 'Full Time' }].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.toggleButton, {
                    backgroundColor: jobType === t.id ? '#2ECC7120' : colors.surface,
                    borderColor: jobType === t.id ? '#2ECC71' : colors.border,
                    borderWidth: jobType === t.id ? 2 : 0.5,
                  }]}
                  onPress={() => setJobType(t.id)}
                >
                  <Text style={[styles.toggleLabel, { color: jobType === t.id ? '#27AE60' : colors.textSecondary, fontWeight: jobType === t.id ? '700' : '500' }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Hours per Week</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. 20"
              placeholderTextColor={colors.textLight}
              value={jobHours}
              onChangeText={setJobHours}
              keyboardType="numeric"
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Salary (USD/hr)</Text>
            <View style={styles.salaryRow}>
              <TextInput
                style={[styles.input, styles.salaryInput, {
                  backgroundColor: jobSalaryOpen ? colors.surfaceSecondary : colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  opacity: jobSalaryOpen ? 0.5 : 1,
                }]}
                placeholder="e.g. 15"
                placeholderTextColor={colors.textLight}
                value={jobSalary}
                onChangeText={setJobSalary}
                keyboardType="numeric"
                editable={!jobSalaryOpen}
              />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>Open to discuss</Text>
                <Switch
                  value={jobSalaryOpen}
                  onValueChange={setJobSalaryOpen}
                  trackColor={{ false: colors.border, true: '#2ECC71' }}
                  thumbColor={jobSalaryOpen ? '#27AE60' : '#fff'}
                />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Work Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Clayton, St. Louis"
              placeholderTextColor={colors.textLight}
              value={jobLocation}
              onChangeText={setJobLocation}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Joining</Text>
            <View style={styles.toggleRow}>
              {[{ id: 'immediate', label: '⚡ Immediate' }, { id: 'flexible', label: '📅 Flexible' }].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.toggleButton, {
                    backgroundColor: jobJoining === t.id ? '#2ECC7120' : colors.surface,
                    borderColor: jobJoining === t.id ? '#2ECC71' : colors.border,
                    borderWidth: jobJoining === t.id ? 2 : 0.5,
                  }]}
                  onPress={() => setJobJoining(t.id)}
                >
                  <Text style={[styles.toggleLabel, { color: jobJoining === t.id ? '#27AE60' : colors.textSecondary, fontWeight: jobJoining === t.id ? '700' : '500' }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Job Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe the role..."
              placeholderTextColor={colors.textLight}
              value={jobDescription}
              onChangeText={setJobDescription}
              multiline
              numberOfLines={4}
            />
          </>
        )}

        {/* ─── BUY & SELL FORM ─── */}
        {category === 'buysell' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Product Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. IKEA Desk"
              placeholderTextColor={colors.textLight}
              value={bsProductName}
              onChangeText={setBsProductName}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Product Category</Text>
            <View style={styles.productCategoryGrid}>
              {BUY_SELL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.productCategoryChip, {
                    backgroundColor: bsProductCategory === cat ? '#3498DB20' : colors.surface,
                    borderColor: bsProductCategory === cat ? '#3498DB' : colors.border,
                    borderWidth: bsProductCategory === cat ? 2 : 0.5,
                  }]}
                  onPress={() => setBsProductCategory(cat)}
                >
                  <Text style={[styles.productCategoryChipText, {
                    color: bsProductCategory === cat ? '#3498DB' : colors.textSecondary,
                    fontWeight: bsProductCategory === cat ? '600' : '400',
                  }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Condition</Text>
            <View style={styles.toggleRow}>
              {[{ id: 'new', label: '✨ New' }, { id: 'used', label: '🔄 Used' }].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.toggleButton, {
                    backgroundColor: bsCondition === c.id ? '#3498DB20' : colors.surface,
                    borderColor: bsCondition === c.id ? '#3498DB' : colors.border,
                    borderWidth: bsCondition === c.id ? 2 : 0.5,
                  }]}
                  onPress={() => setBsCondition(c.id)}
                >
                  <Text style={[styles.toggleLabel, { color: bsCondition === c.id ? '#3498DB' : colors.textSecondary, fontWeight: bsCondition === c.id ? '700' : '500' }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe the product..."
              placeholderTextColor={colors.textLight}
              value={bsDescription}
              onChangeText={setBsDescription}
              multiline
              numberOfLines={4}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Price (USD)</Text>
            <View style={styles.salaryRow}>
              <TextInput
                style={[styles.input, styles.salaryInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. 50"
                placeholderTextColor={colors.textLight}
                value={bsPrice}
                onChangeText={setBsPrice}
                keyboardType="numeric"
              />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>Negotiable</Text>
                <Switch
                  value={bsNegotiable}
                  onValueChange={setBsNegotiable}
                  trackColor={{ false: colors.border, true: '#3498DB' }}
                  thumbColor={bsNegotiable ? '#3498DB' : '#fff'}
                />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Pickup Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Clayton, St. Louis"
              placeholderTextColor={colors.textLight}
              value={bsPickupLocation}
              onChangeText={setBsPickupLocation}
            />
          </>
        )}

        {/* ─── FOOD FORM ─── */}
        {category === 'food' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Home cooked tiffin service"
              placeholderTextColor={colors.textLight}
              value={foodTitle}
              onChangeText={setFoodTitle}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Description & Menu Details</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe your food, menu items..."
              placeholderTextColor={colors.textLight}
              value={foodDescription}
              onChangeText={setFoodDescription}
              multiline
              numberOfLines={4}
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Price (USD)</Text>
            <View style={styles.salaryRow}>
              <TextInput
                style={[styles.input, styles.salaryInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. 8 per day"
                placeholderTextColor={colors.textLight}
                value={foodPrice}
                onChangeText={setFoodPrice}
                keyboardType="numeric"
              />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>Negotiable</Text>
                <Switch
                  value={foodNegotiable}
                  onValueChange={setFoodNegotiable}
                  trackColor={{ false: colors.border, true: '#F39C12' }}
                  thumbColor={foodNegotiable ? '#F39C12' : '#fff'}
                />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Service Options</Text>
            <View style={styles.serviceOptions}>
              <TouchableOpacity
                style={[styles.serviceOption, {
                  backgroundColor: foodPickup ? '#F39C1220' : colors.surface,
                  borderColor: foodPickup ? '#F39C12' : colors.border,
                  borderWidth: foodPickup ? 2 : 0.5,
                }]}
                onPress={() => setFoodPickup(!foodPickup)}
              >
                <Text style={styles.serviceOptionEmoji}>🏪</Text>
                <Text style={[styles.serviceOptionLabel, { color: foodPickup ? '#F39C12' : colors.textSecondary, fontWeight: foodPickup ? '700' : '500' }]}>Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.serviceOption, {
                  backgroundColor: foodDelivery ? '#F39C1220' : colors.surface,
                  borderColor: foodDelivery ? '#F39C12' : colors.border,
                  borderWidth: foodDelivery ? 2 : 0.5,
                }]}
                onPress={() => setFoodDelivery(!foodDelivery)}
              >
                <Text style={styles.serviceOptionEmoji}>🚴</Text>
                <Text style={[styles.serviceOptionLabel, { color: foodDelivery ? '#F39C12' : colors.textSecondary, fontWeight: foodDelivery ? '700' : '500' }]}>Delivery</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Photos — all categories except jobs */}
        {showPhotos && <PhotosSection />}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: color }]}
          onPress={handleUpdate}
          disabled={loading || uploading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  categoryHeader: {
  borderRadius: 14,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginBottom: 4,
},
categoryHeaderEmoji: {
  fontSize: 32,
},
categoryHeaderSub: {
  fontSize: 11,
  color: 'rgba(255,255,255,0.7)',
  fontWeight: '500',
  letterSpacing: 0.5,
},
categoryHeaderTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#fff',
  marginTop: 2,
},
  lockedEmoji: { fontSize: 20 },
  lockedText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { height: 100, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleButton: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  toggleLabel: { fontSize: 14 },
  salaryRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  salaryInput: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 13 },
  productCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productCategoryChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  productCategoryChipText: { fontSize: 13 },
  serviceOptions: { flexDirection: 'row', gap: 10 },
  serviceOption: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', gap: 6 },
  serviceOptionEmoji: { fontSize: 24 },
  serviceOptionLabel: { fontSize: 14 },
  photosContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  photoWrapper: { position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: 'absolute', top: -6, right: -6, backgroundColor: '#E63946', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  removePhotoText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addPhotoButton: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoIcon: { fontSize: 20 },
  addPhotoText: { fontSize: 10, fontWeight: '500' },
  saveButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 15 },
});