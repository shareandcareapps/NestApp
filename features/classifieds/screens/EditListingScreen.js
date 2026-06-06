// features/classifieds/screens/EditListingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image, Switch, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { compressImage } from '../../../core/utils/imageUtils';
import { updateListing } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { supabase } from '../../../core/database/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const CATEGORY_META = {
  accommodation: { label: 'Housing',      emoji: '🏠', gradient: ['#FF6B6B','#E84393'] },
  jobs:          { label: 'Jobs',          emoji: '💼', gradient: ['#00C48C','#007A5E'] },
  buysell:       { label: 'Buy & Sell',    emoji: '🛍️', gradient: ['#0099FF','#0055CC'] },
  food:          { label: 'Food & Tiffin', emoji: '🍱', gradient: ['#F4A833','#E68A00'] },
};
const BUY_SELL_CATEGORIES = ['Cars','Furniture','Electronics','Toys & Games','Clothing & Apparel','Books','Appliances','Other'];

// ─── Form helpers (same as PostListingScreen) ─────────────────────────────────
function FormLabel({ children, optional, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 18 }}>
      <Text style={[fS.label, { color: theme.textPrimary }]}>{children}</Text>
      {optional && <Text style={[fS.optional, { color: theme.textLight }]}>optional</Text>}
    </View>
  );
}
const fS = StyleSheet.create({
  label: { fontSize: fonts.sizes.sm, fontWeight: '700', letterSpacing: 0.2 },
  optional: { fontSize: 11, fontStyle: 'italic' },
});

function FormInput({ value, onChangeText, placeholder, multiline, keyboardType, editable = true, theme }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[iS.base, multiline && iS.area, { backgroundColor: theme.inputBackground, borderColor: focused ? '#F4A833' : theme.border, color: theme.textPrimary }]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={theme.textLight} multiline={multiline}
      keyboardType={keyboardType || 'default'} editable={editable}
      textAlignVertical={multiline ? 'top' : 'auto'}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}
const iS = StyleSheet.create({
  base: { borderRadius: borderRadius.md, padding: 14, fontSize: fonts.sizes.md, borderWidth: 1.5 },
  area: { minHeight: 100 },
});

function ToggleRow({ options, selected, onSelect, activeColor, theme }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {options.map(opt => {
        const isActive = selected === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[tS.btn, { backgroundColor: isActive ? activeColor + '18' : theme.card, borderColor: isActive ? activeColor : theme.border, borderWidth: isActive ? 2 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(opt.id); }}
          >
            <Text style={[tS.txt, { color: isActive ? activeColor : theme.textSecondary, fontWeight: isActive ? '700' : '500' }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const tS = StyleSheet.create({
  btn: { flex: 1, borderRadius: borderRadius.md, padding: 12, alignItems: 'center' },
  txt: { fontSize: fonts.sizes.sm },
});

function SwitchRow({ label, value, onValueChange, color, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
      <Text style={{ color: theme.textSecondary, fontSize: fonts.sizes.sm }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: theme.border, true: color }} thumbColor={value ? '#fff' : '#ccc'} />
    </View>
  );
}

function PhotosSection({ images, uploading, uploadProgress, onAdd, onRemove, accentColor, theme }) {
  return (
    <View style={pS.row}>
      {images.map((uri, i) => (
        <View key={i} style={pS.wrap}>
          <Image source={{ uri }} style={pS.img} />
          <TouchableOpacity style={pS.remove} onPress={() => onRemove(i)}>
            <Ionicons name="close" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
      {images.length < 4 && (
        <TouchableOpacity style={[pS.addBtn, { backgroundColor: theme.card, borderColor: accentColor }]} onPress={onAdd} disabled={uploading}>
          {uploading
            ? <View style={{ alignItems: 'center', gap: 4 }}>
                <ActivityIndicator color={accentColor} size="small" />
                <View style={{ width: 50, height: 3, backgroundColor: theme.border, borderRadius: 2 }}>
                  <View style={{ width: `${uploadProgress}%`, height: 3, backgroundColor: accentColor, borderRadius: 2 }} />
                </View>
              </View>
            : <>
                <Ionicons name="camera" size={22} color={accentColor} />
                <Text style={[pS.addTxt, { color: accentColor }]}>Add Photo</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}
const pS = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wrap: { position: 'relative' },
  img: { width: 80, height: 80, borderRadius: borderRadius.md },
  remove: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FF6B6B', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 80, height: 80, borderRadius: borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addTxt: { fontSize: 10, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EditListingScreen({ route, navigation }) {
  const { listing } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppStore((state) => state.user);
  const btnScale = useRef(new Animated.Value(1)).current;

  const category = listing.category;
  const catMeta = CATEGORY_META[category] || CATEGORY_META.buysell;
  const accentColor = catMeta.gradient[0];

  let meta = {};
  if (listing.metadata) {
    meta = typeof listing.metadata === 'string' ? JSON.parse(listing.metadata) : listing.metadata;
  }

  const [images, setImages] = useState(listing.images || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  // Accommodation
  const [acTitle, setAcTitle] = useState(listing.title || '');
  const [acDescription, setAcDescription] = useState(listing.description || '');
  const [acPrice, setAcPrice] = useState(listing.price?.toString() || '');
  const [acLocation, setAcLocation] = useState(meta.location || '');

  // Jobs
  const [jobRole, setJobRole] = useState(listing.title || '');
  const [jobCompany, setJobCompany] = useState(meta.company || '');
  const [jobSalary, setJobSalary] = useState(listing.price?.toString() || '');
  const [jobSalaryOpen, setJobSalaryOpen] = useState(meta.salary_open || false);
  const [jobType, setJobType] = useState(meta.job_type || 'part_time');
  const [jobHours, setJobHours] = useState(meta.hours_per_week || '');
  const [jobLocation, setJobLocation] = useState(meta.location || '');
  const [jobJoining, setJobJoining] = useState(meta.joining || 'immediate');
  const [jobDescription, setJobDescription] = useState(listing.description || '');

  // Buy & Sell
  const [bsProductName, setBsProductName] = useState(listing.title || '');
  const [bsDescription, setBsDescription] = useState(listing.description || '');
  const [bsPrice, setBsPrice] = useState(listing.price?.toString() || '');
  const [bsNegotiable, setBsNegotiable] = useState(meta.negotiable || false);
  const [bsProductCategory, setBsProductCategory] = useState(meta.product_category || null);
  const [bsCondition, setBsCondition] = useState(meta.condition || 'used');
  const [bsPickupLocation, setBsPickupLocation] = useState(meta.pickup_location || '');

  // Food
  const [foodTitle, setFoodTitle] = useState(listing.title || '');
  const [foodDescription, setFoodDescription] = useState(listing.description || '');
  const [foodPrice, setFoodPrice] = useState(listing.price?.toString() || '');
  const [foodNegotiable, setFoodNegotiable] = useState(meta.negotiable || false);
  const [foodPickup, setFoodPickup] = useState(meta.pickup || false);
  const [foodDelivery, setFoodDelivery] = useState(meta.delivery || false);

  async function pickImage() {
    if (images.length >= 4) { Toast.show({ type: 'warning', text1: 'Max 4 photos' }); return; }
    Alert.alert('Add Photo', 'Choose a source', [
      { text: '📷 Camera', onPress: async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Toast.show({ type: 'error', text1: 'Permission needed' }); return; }
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (!r.canceled) await uploadImage(r.assets[0]);
      }},
      { text: '🖼️ Photo Library', onPress: async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { Toast.show({ type: 'error', text1: 'Permission needed' }); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (!r.canceled) await uploadImage(r.assets[0]);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function uploadImage(imageAsset) {
    try {
      setUploading(true); setUploadProgress(10);
      const compressedUri = await compressImage(imageAsset.uri);
      const fileName = `${user.id}/${Date.now()}.jpg`;
      setUploadProgress(30);
      const response = await fetch(compressedUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      setUploadProgress(60);
      const { error } = await supabase.storage.from('listings').upload(fileName, arrayBuffer, { contentType: 'image/jpg' });
      if (error) throw error;
      setUploadProgress(90);
      const { data: urlData } = supabase.storage.from('listings').getPublicUrl(fileName);
      setImages(prev => [...prev, urlData.publicUrl]);
      setUploadProgress(100);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: error.message });
    } finally { setUploading(false); setUploadProgress(0); }
  }

  function removeImage(index) { setImages(prev => prev.filter((_, i) => i !== index)); }

  function buildUpdateData() {
    if (category === 'accommodation') return { title: acTitle, description: acDescription, price: acPrice ? parseFloat(acPrice) : null, images, metadata: { location: acLocation } };
    if (category === 'jobs') return { title: jobRole, description: jobDescription, price: jobSalaryOpen ? null : jobSalary ? parseFloat(jobSalary) : null, images, metadata: { company: jobCompany, salary_open: jobSalaryOpen, job_type: jobType, hours_per_week: jobHours, location: jobLocation, joining: jobJoining } };
    if (category === 'buysell') return { title: bsProductName, description: bsDescription, price: bsPrice ? parseFloat(bsPrice) : null, images, metadata: { negotiable: bsNegotiable, product_category: bsProductCategory, condition: bsCondition, pickup_location: bsPickupLocation } };
    if (category === 'food') return { title: foodTitle, description: foodDescription, price: foodPrice ? parseFloat(foodPrice) : null, images, metadata: { negotiable: foodNegotiable, pickup: foodPickup, delivery: foodDelivery } };
  }

  function validate() {
    if (category === 'accommodation' && !acTitle) { Toast.show({ type: 'warning', text1: 'Add a title' }); return false; }
    if (category === 'jobs' && (!jobRole || !jobCompany)) { Toast.show({ type: 'warning', text1: 'Add job role and company' }); return false; }
    if (category === 'buysell' && !bsProductName) { Toast.show({ type: 'warning', text1: 'Add product name' }); return false; }
    if (category === 'food' && !foodTitle) { Toast.show({ type: 'warning', text1: 'Add a title' }); return false; }
    return true;
  }

  async function handleUpdate() {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await updateListing(listing.id, buildUpdateData());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Listing updated! ✅', text2: 'Your changes are now live.' });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: error?.message || 'Please try again.' });
    } finally { setLoading(false); }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={catMeta.gradient} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{catMeta.emoji}</Text>
            <View>
              <Text style={styles.headerSub}>Editing</Text>
              <Text style={styles.headerTitle}>{catMeta.label}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 40 }]}>

        {/* ─── ACCOMMODATION ─── */}
        {category === 'accommodation' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}>
              <LinearGradient colors={catMeta.gradient} style={styles.formAccent} />
              <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>🏠 Housing Details</Text>
            </View>
            <FormLabel theme={theme}>Title</FormLabel>
            <FormInput theme={theme} value={acTitle} onChangeText={setAcTitle} placeholder="e.g. Room near Wash U, utilities included" />
            <FormLabel theme={theme} optional>Description</FormLabel>
            <FormInput theme={theme} value={acDescription} onChangeText={setAcDescription} placeholder="Describe the property..." multiline />
            <FormLabel theme={theme} optional>Monthly Rent (USD)</FormLabel>
            <FormInput theme={theme} value={acPrice} onChangeText={setAcPrice} placeholder="e.g. 650" keyboardType="numeric" />
            <FormLabel theme={theme} optional>Location / Neighborhood</FormLabel>
            <FormInput theme={theme} value={acLocation} onChangeText={setAcLocation} placeholder="e.g. Clayton, Creve Coeur" />
            <FormLabel theme={theme} optional>Photos (up to 4)</FormLabel>
            <PhotosSection images={images} uploading={uploading} uploadProgress={uploadProgress} onAdd={pickImage} onRemove={removeImage} accentColor={accentColor} theme={theme} />
          </View>
        )}

        {/* ─── JOBS ─── */}
        {category === 'jobs' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}>
              <LinearGradient colors={catMeta.gradient} style={styles.formAccent} />
              <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>💼 Job Details</Text>
            </View>
            <FormLabel theme={theme}>Job Role / Position</FormLabel>
            <FormInput theme={theme} value={jobRole} onChangeText={setJobRole} placeholder="e.g. Cashier, Server, Tutor" />
            <FormLabel theme={theme}>Company / Store Name</FormLabel>
            <FormInput theme={theme} value={jobCompany} onChangeText={setJobCompany} placeholder="e.g. Patel Brothers, Curry House" />
            <FormLabel theme={theme}>Job Type</FormLabel>
            <ToggleRow options={[{id:'part_time',label:'Part Time'},{id:'full_time',label:'Full Time'}]} selected={jobType} onSelect={setJobType} activeColor={accentColor} theme={theme} />
            <FormLabel theme={theme} optional>Hours per Week</FormLabel>
            <FormInput theme={theme} value={jobHours} onChangeText={setJobHours} placeholder="e.g. 20" keyboardType="numeric" />
            <FormLabel theme={theme} optional>Salary (USD/hr)</FormLabel>
            <FormInput theme={theme} value={jobSalary} onChangeText={setJobSalary} placeholder="e.g. 15" keyboardType="numeric" editable={!jobSalaryOpen} />
            <SwitchRow label="Open to discuss salary" value={jobSalaryOpen} onValueChange={setJobSalaryOpen} color={accentColor} theme={theme} />
            <FormLabel theme={theme} optional>Work Location</FormLabel>
            <FormInput theme={theme} value={jobLocation} onChangeText={setJobLocation} placeholder="e.g. Clayton, St. Louis" />
            <FormLabel theme={theme}>Joining</FormLabel>
            <ToggleRow options={[{id:'immediate',label:'⚡ Immediate'},{id:'flexible',label:'📅 Flexible'}]} selected={jobJoining} onSelect={setJobJoining} activeColor={accentColor} theme={theme} />
            <FormLabel theme={theme} optional>Job Description</FormLabel>
            <FormInput theme={theme} value={jobDescription} onChangeText={setJobDescription} placeholder="Describe the role and requirements..." multiline />
          </View>
        )}

        {/* ─── BUY & SELL ─── */}
        {category === 'buysell' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}>
              <LinearGradient colors={catMeta.gradient} style={styles.formAccent} />
              <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>🛍️ Product Details</Text>
            </View>
            <FormLabel theme={theme}>Product Name</FormLabel>
            <FormInput theme={theme} value={bsProductName} onChangeText={setBsProductName} placeholder="e.g. IKEA Desk, iPhone 13" />
            <FormLabel theme={theme} optional>Category</FormLabel>
            <View style={styles.chipWrap}>
              {BUY_SELL_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} onPress={() => setBsProductCategory(cat)} style={[styles.chip, { backgroundColor: bsProductCategory === cat ? '#0099FF20' : theme.inputBackground, borderColor: bsProductCategory === cat ? '#0099FF' : theme.border, borderWidth: bsProductCategory === cat ? 2 : 1 }]}>
                  <Text style={[styles.chipTxt, { color: bsProductCategory === cat ? '#0099FF' : theme.textSecondary, fontWeight: bsProductCategory === cat ? '700' : '500' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormLabel theme={theme}>Condition</FormLabel>
            <ToggleRow options={[{id:'new',label:'✨ New'},{id:'used',label:'🔄 Used'}]} selected={bsCondition} onSelect={setBsCondition} activeColor={accentColor} theme={theme} />
            <FormLabel theme={theme} optional>Description</FormLabel>
            <FormInput theme={theme} value={bsDescription} onChangeText={setBsDescription} placeholder="Describe the product, any defects..." multiline />
            <FormLabel theme={theme} optional>Price (USD)</FormLabel>
            <FormInput theme={theme} value={bsPrice} onChangeText={setBsPrice} placeholder="e.g. 50" keyboardType="numeric" />
            <SwitchRow label="Price is negotiable" value={bsNegotiable} onValueChange={setBsNegotiable} color={accentColor} theme={theme} />
            <FormLabel theme={theme} optional>Pickup Location</FormLabel>
            <FormInput theme={theme} value={bsPickupLocation} onChangeText={setBsPickupLocation} placeholder="e.g. Clayton, St. Louis" />
            <FormLabel theme={theme} optional>Photos (up to 4)</FormLabel>
            <PhotosSection images={images} uploading={uploading} uploadProgress={uploadProgress} onAdd={pickImage} onRemove={removeImage} accentColor={accentColor} theme={theme} />
          </View>
        )}

        {/* ─── FOOD ─── */}
        {category === 'food' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}>
              <LinearGradient colors={catMeta.gradient} style={styles.formAccent} />
              <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>🍱 Food & Tiffin Details</Text>
            </View>
            <FormLabel theme={theme}>Title</FormLabel>
            <FormInput theme={theme} value={foodTitle} onChangeText={setFoodTitle} placeholder="e.g. Home cooked tiffin service" />
            <FormLabel theme={theme} optional>Description & Menu</FormLabel>
            <FormInput theme={theme} value={foodDescription} onChangeText={setFoodDescription} placeholder="Describe your food, menu items..." multiline />
            <FormLabel theme={theme} optional>Price (USD)</FormLabel>
            <FormInput theme={theme} value={foodPrice} onChangeText={setFoodPrice} placeholder="e.g. 8 per day" keyboardType="numeric" />
            <SwitchRow label="Price is negotiable" value={foodNegotiable} onValueChange={setFoodNegotiable} color={accentColor} theme={theme} />
            <FormLabel theme={theme}>Service Options</FormLabel>
            <View style={styles.serviceRow}>
              {[{key:'pickup',label:'🏪 Pickup',val:foodPickup,set:setFoodPickup},{key:'delivery',label:'🚴 Delivery',val:foodDelivery,set:setFoodDelivery}].map(s => (
                <TouchableOpacity key={s.key} onPress={() => s.set(!s.val)} style={[styles.serviceBtn, { backgroundColor: s.val ? accentColor + '20' : theme.card, borderColor: s.val ? accentColor : theme.border, borderWidth: s.val ? 2 : 1 }]}>
                  <Text style={styles.serviceEmoji}>{s.label.split(' ')[0]}</Text>
                  <Text style={[styles.serviceTxt, { color: s.val ? accentColor : theme.textSecondary, fontWeight: s.val ? '700' : '500' }]}>{s.label.split(' ')[1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormLabel theme={theme} optional>Photos (up to 4)</FormLabel>
            <PhotosSection images={images} uploading={uploading} uploadProgress={uploadProgress} onAdd={pickImage} onRemove={removeImage} accentColor={accentColor} theme={theme} />
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
          onPress={handleUpdate}
          disabled={loading || uploading}
          activeOpacity={1}
        >
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <LinearGradient
              colors={loading ? ['#888','#666'] : catMeta.gradient}
              start={{x:0,y:0}} end={{x:1,y:0}}
              style={styles.saveBtn}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.saveBtnTxt}>Save Changes</Text><Ionicons name="checkmark-circle" size={18} color="#fff" /></>}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelTxt, { color: theme.textSecondary }]}>Discard Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji: { fontSize: 26 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: fonts.sizes.xs, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  inner: { padding: spacing.md },

  formCard: { borderRadius: borderRadius.xl, padding: 16, marginBottom: 16, ...shadows.small },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  formAccent: { width: 4, height: 22, borderRadius: 2 },
  formCardTitle: { fontSize: fonts.sizes.lg, fontWeight: '800' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  chipTxt: { fontSize: fonts.sizes.sm },

  serviceRow: { flexDirection: 'row', gap: 10 },
  serviceBtn: { flex: 1, borderRadius: borderRadius.lg, padding: 16, alignItems: 'center', gap: 6 },
  serviceEmoji: { fontSize: 24 },
  serviceTxt: { fontSize: fonts.sizes.sm },

  saveBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.glow },
  saveBtnTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelTxt: { fontSize: fonts.sizes.md },
});
