// features/classifieds/screens/PostListingScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image, Switch, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../../../core/utils/imageUtils';
import { createListing } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { supabase } from '../../../core/database/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { awardPoints } from '../../../core/services/pointsService';

const CATEGORIES = [
  { id: 'accommodation', label: 'Accommodation', emoji: '🏠' },
  { id: 'jobs', label: 'Jobs & Work', emoji: '💼' },
  { id: 'buysell', label: 'Buy & Sell', emoji: '🛍️' },
  { id: 'food', label: 'Food & Tiffin', emoji: '🍱' },
];

const BUY_SELL_CATEGORIES = [
  'Cars', 'Furniture', 'Electronics', 'Toys & Games',
  'Clothing & Apparel', 'Books', 'Appliances', 'Other',
];

export default function PostListingScreen({ navigation, route }) {
  const preselected = route?.params?.preselectedCategory || null;
  const [category, setCategory] = useState(preselected);
  const categoryLocked = preselected !== null;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState([]);
  const user = useAppStore((state) => state.user);
  const colors = useTheme();

  // ─── Accommodation fields ──────────────────
  const [acTitle, setAcTitle] = useState('');
  const [acDescription, setAcDescription] = useState('');
  const [acPrice, setAcPrice] = useState('');
  const [acLocation, setAcLocation] = useState('');

  // ─── Jobs fields ───────────────────────────
  const [jobRole, setJobRole] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobSalary, setJobSalary] = useState('');
  const [jobSalaryOpen, setJobSalaryOpen] = useState(false);
  const [jobType, setJobType] = useState('part_time');
  const [jobHours, setJobHours] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobJoining, setJobJoining] = useState('immediate');
  const [jobDescription, setJobDescription] = useState('');

  // ─── Buy & Sell fields ─────────────────────
  const [bsProductName, setBsProductName] = useState('');
  const [bsDescription, setBsDescription] = useState('');
  const [bsPrice, setBsPrice] = useState('');
  const [bsNegotiable, setBsNegotiable] = useState(false);
  const [bsProductCategory, setBsProductCategory] = useState(null);
  const [bsCondition, setBsCondition] = useState('used');
  const [bsPickupLocation, setBsPickupLocation] = useState('');

  // ─── Food & Tiffin fields ──────────────────
  const [foodTitle, setFoodTitle] = useState('');
  const [foodDescription, setFoodDescription] = useState('');
  const [foodPrice, setFoodPrice] = useState('');
  const [foodNegotiable, setFoodNegotiable] = useState(false);
  const [foodPickup, setFoodPickup] = useState(false);
  const [foodDelivery, setFoodDelivery] = useState(false);

  async function pickImage() {
    if (images.length >= 4) { Alert.alert('Maximum 4 photos allowed'); return; }
    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: '📷 Camera',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow access to your camera.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
          });
          if (!result.canceled) await uploadImage(result.assets[0]);
        },
      },
      {
        text: '🖼️ Photo Library',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow access to your photos.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
          });
          if (!result.canceled) await uploadImage(result.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function uploadImage(imageAsset) {
    try {
      setUploading(true);
      setUploadProgress(10);
      const compressedUri = await compressImage(imageAsset.uri);
      const ext = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      setUploadProgress(30);
      const response = await fetch(compressedUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      setUploadProgress(60);
      const { error } = await supabase.storage.from('listings').upload(fileName, arrayBuffer, { contentType: `image/${ext}` });
      if (error) throw error;
      setUploadProgress(90);
      const { data: urlData } = supabase.storage.from('listings').getPublicUrl(fileName);
      setImages((prev) => [...prev, urlData.publicUrl]);
      setUploadProgress(100);
    } catch (error) {
      Alert.alert('Upload failed', `Could not upload image: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function buildListingData() {
    const base = { user_id: user.id, category, city: 'St. Louis', state: 'Missouri', images };

    if (category === 'accommodation') {
      return {
        ...base,
        title: acTitle,
        description: acDescription,
        price: acPrice ? parseFloat(acPrice) : null,
        metadata: { location: acLocation },
      };
    }

    if (category === 'jobs') {
      return {
        ...base,
        title: jobRole,
        description: jobDescription,
        price: jobSalaryOpen ? null : jobSalary ? parseFloat(jobSalary) : null,
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
        ...base,
        title: bsProductName,
        description: bsDescription,
        price: bsPrice ? parseFloat(bsPrice) : null,
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
        ...base,
        title: foodTitle,
        description: foodDescription,
        price: foodPrice ? parseFloat(foodPrice) : null,
        metadata: {
          negotiable: foodNegotiable,
          pickup: foodPickup,
          delivery: foodDelivery,
        },
      };
    }
  }

  function validateForm() {
    if (!category) { Alert.alert('Error', 'Please select a category'); return false; }
    if (category === 'accommodation' && !acTitle) { Alert.alert('Error', 'Please enter a title'); return false; }
    if (category === 'jobs' && !jobRole) { Alert.alert('Error', 'Please enter job role'); return false; }
    if (category === 'jobs' && !jobCompany) { Alert.alert('Error', 'Please enter company/store name'); return false; }
    if (category === 'buysell' && !bsProductName) { Alert.alert('Error', 'Please enter product name'); return false; }
    if (category === 'food' && !foodTitle) { Alert.alert('Error', 'Please enter a title'); return false; }
    return true;
  }

  async function handlePost() {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const newListing = await createListing(buildListingData());
      // Check if this is their first listing
      const { count } = await supabase
        .from('listings').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      await awardPoints(user.id, count === 1 ? 'first_listing' : 'post_listing', newListing.id);
      const pts = count === 1 ? 20 : 5;
      Alert.alert('Posted! 🎉', `Your listing is live.\n+${pts} community points earned!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to post listing. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ backgroundColor: colors.secondary }}>
        <View style={[styles.headerBar, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Listing</Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>

        {/* Category Selector — hidden if pre-selected from browse */}
{!categoryLocked && (
  <>
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
  </>
)}


        {/* ─── ACCOMMODATION FORM ─── */}
        {category === 'accommodation' && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.primary, borderBottomColor: colors.border }]}>
              🏠 Accommodation Details
            </Text>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Room near Wash U, utilities included"
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
            <Text style={[styles.label, { color: colors.textPrimary }]}>Location / Neighborhood</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Clayton, Creve Coeur, Brentwood"
              placeholderTextColor={colors.textLight}
              value={acLocation}
              onChangeText={setAcLocation}
            />
            {/* Photos */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>Photos (up to 4)</Text>
            <View style={styles.photosContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.removePhoto} onPress={() => removeImage(index)} accessibilityLabel="Remove photo">
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
                  {uploading ? (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={[styles.addPhotoText, { color: colors.primary }]}>{uploadProgress}%</Text>
                      <View style={{ width: 60, height: 3, backgroundColor: colors.border, borderRadius: 2 }}>
                        <View style={{ width: `${uploadProgress}%`, height: 3, backgroundColor: colors.primary, borderRadius: 2 }} />
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.addPhotoIcon}>📷</Text>
                      <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ─── JOBS FORM ─── */}
        {category === 'jobs' && (
          <>
            <Text style={[styles.sectionHeader, { color: '#2ECC71', borderBottomColor: colors.border }]}>
              💼 Job Details
            </Text>

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
              placeholder="e.g. Patel Brothers, Curry House"
              placeholderTextColor={colors.textLight}
              value={jobCompany}
              onChangeText={setJobCompany}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>Job Type *</Text>
            <View style={styles.toggleRow}>
              {[
                { id: 'part_time', label: 'Part Time' },
                { id: 'full_time', label: 'Full Time' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.toggleButton, {
                    backgroundColor: jobType === t.id ? '#2ECC7120' : colors.surface,
                    borderColor: jobType === t.id ? '#2ECC71' : colors.border,
                    borderWidth: jobType === t.id ? 2 : 0.5,
                  }]}
                  onPress={() => setJobType(t.id)}
                >
                  <Text style={[styles.toggleLabel, {
                    color: jobType === t.id ? '#27AE60' : colors.textSecondary,
                    fontWeight: jobType === t.id ? '700' : '500',
                  }]}>
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
            <View style={[styles.salaryRow]}>
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
              {[
                { id: 'immediate', label: '⚡ Immediate' },
                { id: 'flexible', label: '📅 Flexible' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.toggleButton, {
                    backgroundColor: jobJoining === t.id ? '#2ECC7120' : colors.surface,
                    borderColor: jobJoining === t.id ? '#2ECC71' : colors.border,
                    borderWidth: jobJoining === t.id ? 2 : 0.5,
                  }]}
                  onPress={() => setJobJoining(t.id)}
                >
                  <Text style={[styles.toggleLabel, {
                    color: jobJoining === t.id ? '#27AE60' : colors.textSecondary,
                    fontWeight: jobJoining === t.id ? '700' : '500',
                  }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Job Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe the job role, requirements..."
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
            <Text style={[styles.sectionHeader, { color: '#3498DB', borderBottomColor: colors.border }]}>
              🛍️ Product Details
            </Text>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Product Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. IKEA Desk, iPhone 13"
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
              {[
                { id: 'new', label: '✨ New' },
                { id: 'used', label: '🔄 Used' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.toggleButton, {
                    backgroundColor: bsCondition === c.id ? '#3498DB20' : colors.surface,
                    borderColor: bsCondition === c.id ? '#3498DB' : colors.border,
                    borderWidth: bsCondition === c.id ? 2 : 0.5,
                  }]}
                  onPress={() => setBsCondition(c.id)}
                >
                  <Text style={[styles.toggleLabel, {
                    color: bsCondition === c.id ? '#3498DB' : colors.textSecondary,
                    fontWeight: bsCondition === c.id ? '700' : '500',
                  }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe the product, any defects..."
              placeholderTextColor={colors.textLight}
              value={bsDescription}
              onChangeText={setBsDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>Price (USD)</Text>
            <View style={styles.salaryRow}>
              <TextInput
                style={[styles.input, styles.salaryInput, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }]}
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

            {/* Photos */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>Photos (up to 4)</Text>
            <View style={styles.photosContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.removePhoto} onPress={() => removeImage(index)} accessibilityLabel="Remove photo">
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 4 && (
                <TouchableOpacity
                  style={[styles.addPhotoButton, { backgroundColor: colors.surface, borderColor: '#3498DB' }]}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading ? <ActivityIndicator color="#3498DB" /> : (
                    <>
                      <Text style={styles.addPhotoIcon}>📷</Text>
                      <Text style={[styles.addPhotoText, { color: '#3498DB' }]}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ─── FOOD & TIFFIN FORM ─── */}
        {category === 'food' && (
          <>
            <Text style={[styles.sectionHeader, { color: '#F39C12', borderBottomColor: colors.border }]}>
              🍱 Food & Tiffin Details
            </Text>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Home cooked tiffin service, Biryani catering"
              placeholderTextColor={colors.textLight}
              value={foodTitle}
              onChangeText={setFoodTitle}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>Description & Menu Details</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe your food, menu items, dietary options..."
              placeholderTextColor={colors.textLight}
              value={foodDescription}
              onChangeText={setFoodDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>Price (USD)</Text>
            <View style={styles.salaryRow}>
              <TextInput
                style={[styles.input, styles.salaryInput, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }]}
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
                <Text style={[styles.serviceOptionLabel, {
                  color: foodPickup ? '#F39C12' : colors.textSecondary,
                  fontWeight: foodPickup ? '700' : '500',
                }]}>Pickup</Text>
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
                <Text style={[styles.serviceOptionLabel, {
                  color: foodDelivery ? '#F39C12' : colors.textSecondary,
                  fontWeight: foodDelivery ? '700' : '500',
                }]}>Delivery</Text>
              </TouchableOpacity>
            </View>

            {/* Photos */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>Photos (up to 4)</Text>
            <View style={styles.photosContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.removePhoto} onPress={() => removeImage(index)} accessibilityLabel="Remove photo">
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 4 && (
                <TouchableOpacity
                  style={[styles.addPhotoButton, { backgroundColor: colors.surface, borderColor: '#F39C12' }]}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading ? <ActivityIndicator color="#F39C12" /> : (
                    <>
                      <Text style={styles.addPhotoIcon}>📷</Text>
                      <Text style={[styles.addPhotoText, { color: '#F39C12' }]}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Post Button — only show when category selected */}
        {category && (
          <>
            <View style={[styles.infoBox, { backgroundColor: colors.infoBackground }]}>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                💡 Your listing will be visible to the St. Louis Indian community immediately after posting.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.postButton, {
                backgroundColor:
                  category === 'accommodation' ? colors.primary :
                  category === 'jobs' ? '#2ECC71' :
                  category === 'buysell' ? '#3498DB' : '#F39C12',
              }]}
              onPress={handlePost}
              disabled={loading || uploading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Post Listing</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '500' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 60 },
  backText: { color: '#fff', fontSize: 15 },
  inner: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 4,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: { width: '47%', borderRadius: 12, padding: 14, alignItems: 'center' },
  categoryEmoji: { fontSize: 24, marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
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
  photosContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrapper: { position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: 'absolute', top: -8, right: -8, backgroundColor: '#E63946', borderRadius: 13, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
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
  lockedCategory: {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 10,
  padding: 12,
  borderWidth: 1,
  gap: 8,
  marginBottom: 8,
},
lockedCategoryEmoji: { fontSize: 20 },
lockedCategoryText: { fontSize: 14, fontWeight: '600' },
});

