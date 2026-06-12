// features/classifieds/screens/PostListingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image, Switch, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { compressImage } from '../../../core/utils/imageUtils';
import { createListing } from '../services/listingsService';
import useAppStore from '../../../core/store/index';
import { supabase } from '../../../core/database/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { awardPoints } from '../../../core/services/pointsService';
import StepProgress from '../../../core/components/StepProgress';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const CATEGORIES = [
  { id: 'accommodation', label: 'Housing',    emoji: '🏠', gradient: ['#FF6B6B','#E84393'] },
  { id: 'jobs',          label: 'Jobs',        emoji: '💼', gradient: ['#00C48C','#007A5E'] },
  { id: 'buysell',       label: 'Buy & Sell',  emoji: '🛍️', gradient: ['#0099FF','#0055CC'] },
  { id: 'food',          label: 'Food & Tiffin',emoji: '🍱', gradient: ['#F4A833','#E68A00'] },
  { id: 'events',        label: 'Events',      emoji: '🎉', gradient: ['#9B59B6','#6C3483'] },
];

const BUY_SELL_CATEGORIES = ['Cars','Furniture','Electronics','Toys & Games','Clothing & Apparel','Books','Appliances','Other'];

// ─── Shared form sub-components ───────────────────────────────────────────────

function FormLabel({ children, optional, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 18 }}>
      <Text style={[fStyles.label, { color: theme.textPrimary }]}>{children}</Text>
      {optional && <Text style={[fStyles.optional, { color: theme.textLight }]}>optional</Text>}
    </View>
  );
}
const fStyles = StyleSheet.create({
  label: { fontSize: fonts.sizes.sm, fontWeight: '700', letterSpacing: 0.2 },
  optional: { fontSize: 11, fontStyle: 'italic' },
});

function FormInput({ value, onChangeText, placeholder, multiline, keyboardType, editable = true, theme, numberOfLines }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[inputStyle.base, multiline && inputStyle.area, { backgroundColor: theme.inputBackground, borderColor: focused ? '#F4A833' : theme.border, color: theme.textPrimary }]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={theme.textLight} multiline={multiline}
      keyboardType={keyboardType || 'default'} editable={editable}
      numberOfLines={numberOfLines} textAlignVertical={multiline ? 'top' : 'auto'}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}
const inputStyle = StyleSheet.create({
  base: { borderRadius: borderRadius.md, padding: 14, fontSize: fonts.sizes.md, borderWidth: 1.5 },
  area: { minHeight: 100, textAlignVertical: 'top' },
});

function ToggleRow({ options, selected, onSelect, activeColor, theme }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {options.map(opt => {
        const isActive = selected === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[tStyles.btn, { backgroundColor: isActive ? activeColor + '18' : theme.card, borderColor: isActive ? activeColor : theme.border, borderWidth: isActive ? 2 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(opt.id); }}
          >
            <Text style={[tStyles.txt, { color: isActive ? activeColor : theme.textSecondary, fontWeight: isActive ? '700' : '500' }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const tStyles = StyleSheet.create({
  btn: { flex: 1, borderRadius: borderRadius.md, padding: 12, alignItems: 'center' },
  txt: { fontSize: fonts.sizes.sm },
});

function SwitchRow({ label, value, onValueChange, color, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
      <Text style={[{ color: theme.textSecondary, fontSize: fonts.sizes.sm }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: theme.border, true: color }} thumbColor={value ? '#fff' : '#ccc'} />
    </View>
  );
}

function PhotosSection({ images, uploading, uploadProgress, onAdd, onRemove, accentColor, theme }) {
  return (
    <View style={photoStyles.row}>
      {images.map((uri, i) => (
        <View key={i} style={photoStyles.wrap}>
          <Image source={{ uri }} style={photoStyles.img} />
          <TouchableOpacity style={photoStyles.remove} onPress={() => onRemove(i)}>
            <Ionicons name="close" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
      {images.length < 4 && (
        <TouchableOpacity style={[photoStyles.addBtn, { backgroundColor: theme.card, borderColor: accentColor }]} onPress={onAdd} disabled={uploading}>
          {uploading
            ? <View style={{ alignItems: 'center', gap: 4 }}>
                <ActivityIndicator color={accentColor} size="small" />
                <View style={{ width: 50, height: 3, backgroundColor: theme.border, borderRadius: 2 }}>
                  <View style={{ width: `${uploadProgress}%`, height: 3, backgroundColor: accentColor, borderRadius: 2 }} />
                </View>
              </View>
            : <>
                <Ionicons name="camera" size={22} color={accentColor} />
                <Text style={[photoStyles.addTxt, { color: accentColor }]}>Add Photo</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}
const photoStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wrap: { position: 'relative' },
  img: { width: 80, height: 80, borderRadius: borderRadius.md },
  remove: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FF6B6B', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 80, height: 80, borderRadius: borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addTxt: { fontSize: 10, fontWeight: '600' },
});

function AttestRow({ checked, onToggle, color = '#F4A833', theme, children }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(!checked); }}
      style={[aStyles.row, { backgroundColor: checked ? color + '12' : theme.card, borderColor: checked ? color : theme.border }]}
    >
      <View style={[aStyles.box, { backgroundColor: checked ? color : 'transparent', borderColor: checked ? color : theme.border }]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={[aStyles.txt, { color: theme.textSecondary }]}>{children}</Text>
    </TouchableOpacity>
  );
}
const aStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: borderRadius.md, padding: 12, borderWidth: 1.5, marginTop: 12 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  txt: { flex: 1, fontSize: 12, lineHeight: 18 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 12, marginTop: 14, borderWidth: 1 },
  noticeTxt: { flex: 1, fontSize: 11, lineHeight: 17 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PostListingScreen({ navigation, route }) {
  const preselected = route?.params?.preselectedCategory || null;
  const [category, setCategory] = useState(preselected);
  const categoryLocked = preselected !== null;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState([]);
  const user = useAppStore((state) => state.user);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  // Accommodation
  const [acTitle, setAcTitle] = useState('');
  const [acDescription, setAcDescription] = useState('');
  const [acPrice, setAcPrice] = useState('');
  const [acLocation, setAcLocation] = useState('');

  // Jobs
  const [jobRole, setJobRole] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobSalary, setJobSalary] = useState('');
  const [jobSalaryOpen, setJobSalaryOpen] = useState(false);
  const [jobType, setJobType] = useState('part_time');
  const [jobHours, setJobHours] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobJoining, setJobJoining] = useState('immediate');
  const [jobDescription, setJobDescription] = useState('');

  // Buy & Sell
  const [bsProductName, setBsProductName] = useState('');
  const [bsDescription, setBsDescription] = useState('');
  const [bsPrice, setBsPrice] = useState('');
  const [bsNegotiable, setBsNegotiable] = useState(false);
  const [bsProductCategory, setBsProductCategory] = useState(null);
  const [bsCondition, setBsCondition] = useState('used');
  const [bsPickupLocation, setBsPickupLocation] = useState('');

  // Events
  const [evtTitle,       setEvtTitle]       = useState('');
  const [evtDescription, setEvtDescription] = useState('');
  const [evtDate,        setEvtDate]        = useState('');
  const [evtTime,        setEvtTime]        = useState('');
  const [evtVenue,       setEvtVenue]       = useState('');
  const [evtIsFree,      setEvtIsFree]      = useState(true);
  const [evtTicketPrice, setEvtTicketPrice] = useState('');
  const [evtOrganizer,   setEvtOrganizer]   = useState('');

  // Food
  const [foodTitle, setFoodTitle] = useState('');
  const [foodDescription, setFoodDescription] = useState('');
  const [foodPrice, setFoodPrice] = useState('');
  const [foodNegotiable, setFoodNegotiable] = useState(false);
  const [foodPickup, setFoodPickup] = useState(false);
  const [foodDelivery, setFoodDelivery] = useState(false);
  const [foodBusinessName, setFoodBusinessName] = useState('');
  const [foodAllergens, setFoodAllergens] = useState('');
  const [foodAttested, setFoodAttested] = useState(false);

  const activeCat = CATEGORIES.find(c => c.id === category);
  const accentColor = activeCat?.gradient?.[0] || '#F4A833';

  async function pickImage() {
    if (images.length >= 4) { Toast.show({ type: 'warning', text1: 'Max 4 photos' }); return; }
    Alert.alert('Add Photo', 'Choose a source', [
      { text: '📷 Camera', onPress: async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Allow camera access.' }); return; }
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (!r.canceled) await uploadImage(r.assets[0]);
      }},
      { text: '🖼️ Photo Library', onPress: async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Allow photo access.' }); return; }
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

  function buildListingData() {
    const base = { user_id: user.id, category, city: 'St. Louis', state: 'Missouri', images };
    if (category === 'accommodation') return { ...base, title: acTitle, description: acDescription, price: acPrice ? parseFloat(acPrice) : null, metadata: { location: acLocation } };
    if (category === 'jobs') return { ...base, title: jobRole, description: jobDescription, price: jobSalaryOpen ? null : jobSalary ? parseFloat(jobSalary) : null, metadata: { company: jobCompany, salary_open: jobSalaryOpen, job_type: jobType, hours_per_week: jobHours, location: jobLocation, joining: jobJoining } };
    if (category === 'buysell') return { ...base, title: bsProductName, description: bsDescription, price: bsPrice ? parseFloat(bsPrice) : null, metadata: { negotiable: bsNegotiable, product_category: bsProductCategory, condition: bsCondition, pickup_location: bsPickupLocation } };
    if (category === 'food') return { ...base, title: foodTitle, description: foodDescription, price: foodPrice ? parseFloat(foodPrice) : null, metadata: { negotiable: foodNegotiable, pickup: foodPickup, delivery: foodDelivery, business_name: foodBusinessName.trim() || null, allergens: foodAllergens.trim() || null, attested: true, attested_at: new Date().toISOString() } };
    if (category === 'events') return { ...base, title: evtTitle, description: evtDescription, price: evtIsFree ? 0 : evtTicketPrice ? parseFloat(evtTicketPrice) : null, metadata: { event_date: evtDate.trim(), event_time: evtTime.trim(), venue: evtVenue.trim(), is_free: evtIsFree, organizer: evtOrganizer.trim() || null } };
  }

  function validateForm() {
    if (!category) { Toast.show({ type: 'warning', text1: 'Select a category' }); return false; }
    if (category === 'accommodation' && !acTitle) { Toast.show({ type: 'warning', text1: 'Add a title' }); return false; }
    if (category === 'jobs' && (!jobRole || !jobCompany)) { Toast.show({ type: 'warning', text1: 'Add job role and company' }); return false; }
    if (category === 'buysell' && !bsProductName) { Toast.show({ type: 'warning', text1: 'Add product name' }); return false; }
    if (category === 'food' && !foodTitle) { Toast.show({ type: 'warning', text1: 'Add a title' }); return false; }
    if (category === 'food' && !foodAllergens.trim()) { Toast.show({ type: 'warning', text1: 'Allergen info required', text2: 'List any allergens or write "No known allergens".' }); return false; }
    if (category === 'food' && !foodAttested) { Toast.show({ type: 'warning', text1: 'Confirmation required', text2: 'Please confirm the food responsibility agreement to post.' }); return false; }
    if (category === 'events' && !evtTitle) { Toast.show({ type: 'warning', text1: 'Add an event title' }); return false; }
    if (category === 'events' && !evtDate.trim()) { Toast.show({ type: 'warning', text1: 'Add the event date' }); return false; }
    if (category === 'events' && !evtVenue.trim()) { Toast.show({ type: 'warning', text1: 'Add a venue or location' }); return false; }
    return true;
  }

  async function handlePost() {
    if (!validateForm()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const newListing = await createListing(buildListingData());
      const { count } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      await awardPoints(user.id, count === 1 ? 'first_listing' : 'post_listing', newListing.id);
      const pts = count === 1 ? 20 : 5;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Posted! 🎉', text2: `Your listing is live. +${pts} community points earned!` });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Failed to post listing.' });
    } finally { setLoading(false); }
  }

  const step = category ? 1 : 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Listing</Text>
          <View style={{ width: 40 }} />
        </View>
        <StepProgress steps={['Category', 'Details', 'Publish']} currentStep={step} style={{ marginTop: 12 }} />
      </LinearGradient>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 40 }]}>

        {/* Category selector */}
        {!categoryLocked && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Choose Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(cat => {
                const isActive = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(cat.id); }}
                    activeOpacity={0.85}
                    style={styles.catCardWrap}
                  >
                    {isActive
                      ? <LinearGradient colors={cat.gradient} style={styles.catCard}>
                          <Text style={styles.catEmoji}>{cat.emoji}</Text>
                          <Text style={[styles.catLabel, { color: '#fff' }]}>{cat.label}</Text>
                        </LinearGradient>
                      : <View style={[styles.catCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1.5 }]}>
                          <Text style={styles.catEmoji}>{cat.emoji}</Text>
                          <Text style={[styles.catLabel, { color: theme.textSecondary }]}>{cat.label}</Text>
                        </View>
                    }
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {categoryLocked && activeCat && (
          <LinearGradient colors={activeCat.gradient} style={styles.lockedBadge} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Text style={{ fontSize: 24 }}>{activeCat.emoji}</Text>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 }}>CATEGORY</Text>
              <Text style={{ color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' }}>{activeCat.label}</Text>
            </View>
          </LinearGradient>
        )}

        {/* ─── ACCOMMODATION ─── */}
        {category === 'accommodation' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}><LinearGradient colors={['#FF6B6B','#E84393']} style={styles.formAccent} /><Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>🏠 Housing Details</Text></View>
            <FormLabel theme={theme}>Title</FormLabel>
            <FormInput theme={theme} value={acTitle} onChangeText={setAcTitle} placeholder="e.g. Room near Wash U, utilities included" />
            <FormLabel theme={theme} optional>Description</FormLabel>
            <FormInput theme={theme} value={acDescription} onChangeText={setAcDescription} placeholder="Describe the property..." multiline />
            <FormLabel theme={theme} optional>Monthly Rent (USD)</FormLabel>
            <FormInput theme={theme} value={acPrice} onChangeText={setAcPrice} placeholder="e.g. 650" keyboardType="numeric" />
            <FormLabel theme={theme} optional>Location / Neighborhood</FormLabel>
            <FormInput theme={theme} value={acLocation} onChangeText={setAcLocation} placeholder="e.g. Clayton, Creve Coeur" />
            <FormLabel theme={theme} optional>Photos (up to 4)</FormLabel>
            <PhotosSection images={images} uploading={uploading} uploadProgress={uploadProgress} onAdd={pickImage} onRemove={removeImage} accentColor="#FF6B6B" theme={theme} />
          </View>
        )}

        {/* ─── JOBS ─── */}
        {category === 'jobs' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}><LinearGradient colors={['#00C48C','#007A5E']} style={styles.formAccent} /><Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>💼 Job Details</Text></View>
            <FormLabel theme={theme}>Job Role / Position</FormLabel>
            <FormInput theme={theme} value={jobRole} onChangeText={setJobRole} placeholder="e.g. Cashier, Server, Tutor" />
            <FormLabel theme={theme}>Company / Store Name</FormLabel>
            <FormInput theme={theme} value={jobCompany} onChangeText={setJobCompany} placeholder="e.g. Patel Brothers, Curry House" />
            <FormLabel theme={theme}>Job Type</FormLabel>
            <ToggleRow options={[{id:'part_time',label:'Part Time'},{id:'full_time',label:'Full Time'}]} selected={jobType} onSelect={setJobType} activeColor="#00C48C" theme={theme} />
            <FormLabel theme={theme} optional>Hours per Week</FormLabel>
            <FormInput theme={theme} value={jobHours} onChangeText={setJobHours} placeholder="e.g. 20" keyboardType="numeric" />
            <FormLabel theme={theme} optional>Salary (USD/hr)</FormLabel>
            <FormInput theme={theme} value={jobSalary} onChangeText={setJobSalary} placeholder="e.g. 15" keyboardType="numeric" editable={!jobSalaryOpen} />
            <SwitchRow label="Open to discuss salary" value={jobSalaryOpen} onValueChange={setJobSalaryOpen} color="#00C48C" theme={theme} />
            <FormLabel theme={theme} optional>Work Location</FormLabel>
            <FormInput theme={theme} value={jobLocation} onChangeText={setJobLocation} placeholder="e.g. Clayton, St. Louis" />
            <FormLabel theme={theme}>Joining</FormLabel>
            <ToggleRow options={[{id:'immediate',label:'⚡ Immediate'},{id:'flexible',label:'📅 Flexible'}]} selected={jobJoining} onSelect={setJobJoining} activeColor="#00C48C" theme={theme} />
            <FormLabel theme={theme} optional>Job Description</FormLabel>
            <FormInput theme={theme} value={jobDescription} onChangeText={setJobDescription} placeholder="Describe the role and requirements..." multiline />
          </View>
        )}

        {/* ─── BUY & SELL ─── */}
        {category === 'buysell' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}><LinearGradient colors={['#0099FF','#0055CC']} style={styles.formAccent} /><Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>🛍️ Product Details</Text></View>
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
            <ToggleRow options={[{id:'new',label:'✨ New'},{id:'used',label:'🔄 Used'}]} selected={bsCondition} onSelect={setBsCondition} activeColor="#0099FF" theme={theme} />
            <FormLabel theme={theme} optional>Description</FormLabel>
            <FormInput theme={theme} value={bsDescription} onChangeText={setBsDescription} placeholder="Describe the product, any defects..." multiline />
            <FormLabel theme={theme} optional>Price (USD)</FormLabel>
            <FormInput theme={theme} value={bsPrice} onChangeText={setBsPrice} placeholder="e.g. 50" keyboardType="numeric" />
            <SwitchRow label="Price is negotiable" value={bsNegotiable} onValueChange={setBsNegotiable} color="#0099FF" theme={theme} />
            <FormLabel theme={theme} optional>Pickup Location</FormLabel>
            <FormInput theme={theme} value={bsPickupLocation} onChangeText={setBsPickupLocation} placeholder="e.g. Clayton, St. Louis" />
            <FormLabel theme={theme} optional>Photos (up to 4)</FormLabel>
            <PhotosSection images={images} uploading={uploading} uploadProgress={uploadProgress} onAdd={pickImage} onRemove={removeImage} accentColor="#0099FF" theme={theme} />
          </View>
        )}

        {/* ─── FOOD ─── */}
        {category === 'food' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}><LinearGradient colors={['#F4A833','#E68A00']} style={styles.formAccent} /><Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>🍱 Food & Tiffin Details</Text></View>
            <FormLabel theme={theme}>Title</FormLabel>
            <FormInput theme={theme} value={foodTitle} onChangeText={setFoodTitle} placeholder="e.g. Home cooked tiffin service, Biryani catering" />
            <FormLabel theme={theme} optional>Description & Menu</FormLabel>
            <FormInput theme={theme} value={foodDescription} onChangeText={setFoodDescription} placeholder="Describe your food, menu items, dietary options..." multiline />
            <FormLabel theme={theme} optional>Price (USD)</FormLabel>
            <FormInput theme={theme} value={foodPrice} onChangeText={setFoodPrice} placeholder="e.g. 8 per day" keyboardType="numeric" />
            <SwitchRow label="Price is negotiable" value={foodNegotiable} onValueChange={setFoodNegotiable} color="#F4A833" theme={theme} />
            <FormLabel theme={theme}>Service Options</FormLabel>
            <View style={styles.serviceRow}>
              {[{key:'pickup',label:'🏪 Pickup',val:foodPickup,set:setFoodPickup},{key:'delivery',label:'🚴 Delivery',val:foodDelivery,set:setFoodDelivery}].map(s => (
                <TouchableOpacity key={s.key} onPress={() => s.set(!s.val)} style={[styles.serviceBtn, { backgroundColor: s.val ? '#F4A83320' : theme.card, borderColor: s.val ? '#F4A833' : theme.border, borderWidth: s.val ? 2 : 1 }]}>
                  <Text style={styles.serviceEmoji}>{s.label.split(' ')[0]}</Text>
                  <Text style={[styles.serviceTxt, { color: s.val ? '#F4A833' : theme.textSecondary, fontWeight: s.val ? '700' : '500' }]}>{s.label.split(' ')[1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormLabel theme={theme} optional>Business / Kitchen Name</FormLabel>
            <FormInput theme={theme} value={foodBusinessName} onChangeText={setFoodBusinessName} placeholder="e.g. Sharma's Home Kitchen (if registered)" />
            <FormLabel theme={theme}>Allergen & Ingredient Info</FormLabel>
            <FormInput theme={theme} value={foodAllergens} onChangeText={setFoodAllergens} placeholder='e.g. Contains dairy, nuts, gluten. Write "No known allergens" if none.' multiline />
            <FormLabel theme={theme} optional>Photos (up to 4)</FormLabel>
            <PhotosSection images={images} uploading={uploading} uploadProgress={uploadProgress} onAdd={pickImage} onRemove={removeImage} accentColor="#F4A833" theme={theme} />

            <View style={[aStyles.notice, { backgroundColor: '#F4A83312', borderColor: '#F4A83330' }]}>
              <Ionicons name="restaurant-outline" size={15} color="#F4A833" />
              <Text style={[aStyles.noticeTxt, { color: theme.textSecondary }]}>
                NestApp is an advertising platform only — it does not sell, prepare, inspect, or deliver food. You are responsible for your own licenses, permits, food safety, and allergen disclosure under applicable local, state, and federal law.
              </Text>
            </View>
            <AttestRow checked={foodAttested} onToggle={setFoodAttested} color="#F4A833" theme={theme}>
              I confirm that I am solely responsible for complying with all food-safety laws, licenses, and permits that apply to me, and for accurately disclosing ingredients and allergens. I agree that NestApp and Share & Care Labs are not responsible for my food.
            </AttestRow>
          </View>
        )}

        {/* ─── EVENTS ─── */}
        {category === 'events' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.formCardHeader}><LinearGradient colors={['#9B59B6','#6C3483']} style={styles.formAccent} /><Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>🎉 Event Details</Text></View>
            <FormLabel theme={theme}>Event Name / Title</FormLabel>
            <FormInput theme={theme} value={evtTitle} onChangeText={setEvtTitle} placeholder="e.g. Diwali Celebration, Eid Dinner, Cultural Night" />
            <FormLabel theme={theme} optional>Description</FormLabel>
            <FormInput theme={theme} value={evtDescription} onChangeText={setEvtDescription} placeholder="What to expect, dress code, what's included..." multiline />
            <FormLabel theme={theme}>Event Date</FormLabel>
            <FormInput theme={theme} value={evtDate} onChangeText={setEvtDate} placeholder="e.g. December 25, 2025  or  2025-12-25" />
            <FormLabel theme={theme} optional>Event Time</FormLabel>
            <FormInput theme={theme} value={evtTime} onChangeText={setEvtTime} placeholder="e.g. 6:00 PM – 10:00 PM" />
            <FormLabel theme={theme}>Venue / Location</FormLabel>
            <FormInput theme={theme} value={evtVenue} onChangeText={setEvtVenue} placeholder="e.g. Frontenac Hilton, St. Louis, MO" />
            <FormLabel theme={theme}>Tickets</FormLabel>
            <ToggleRow options={[{id:true,label:'🎟 Free'},{id:false,label:'💵 Paid'}]} selected={evtIsFree} onSelect={setEvtIsFree} activeColor="#9B59B6" theme={theme} />
            {!evtIsFree && (
              <>
                <FormLabel theme={theme} optional>Ticket Price (USD)</FormLabel>
                <FormInput theme={theme} value={evtTicketPrice} onChangeText={setEvtTicketPrice} placeholder="e.g. 15" keyboardType="numeric" />
              </>
            )}
            <FormLabel theme={theme} optional>Organizer / Contact</FormLabel>
            <FormInput theme={theme} value={evtOrganizer} onChangeText={setEvtOrganizer} placeholder="e.g. St. Louis Indian Association" />
            <FormLabel theme={theme} optional>Photos / Flyer (up to 4)</FormLabel>
            <PhotosSection images={images} uploading={uploading} uploadProgress={uploadProgress} onAdd={pickImage} onRemove={removeImage} accentColor="#9B59B6" theme={theme} />
          </View>
        )}

        {/* Post button */}
        {category && (
          <>
            <View style={[styles.infoBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="information-circle" size={16} color="#F4A833" />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Your listing will be visible to the community immediately after posting.
              </Text>
            </View>
            <TouchableOpacity
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
              onPress={handlePost}
              disabled={loading || uploading}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <LinearGradient
                  colors={loading ? ['#888','#666'] : (activeCat?.gradient || ['#F4A833','#FF6B6B'])}
                  start={{x:0,y:0}} end={{x:1,y:0}}
                  style={styles.postBtn}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.postBtnTxt}>Publish Listing</Text><Ionicons name="rocket" size={18} color="#fff" /></> }
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelTxt, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  inner: { padding: spacing.md },
  sectionTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', marginBottom: 14, marginTop: 8 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  catCardWrap: { width: '47%' },
  catCard: { borderRadius: borderRadius.lg, padding: 16, alignItems: 'center', gap: 8 },
  catEmoji: { fontSize: 28 },
  catLabel: { fontSize: fonts.sizes.sm, fontWeight: '700', textAlign: 'center' },

  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: borderRadius.lg, padding: 16, marginBottom: 4 },

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

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 12, marginBottom: 14, borderWidth: 1 },
  infoText: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 19 },

  postBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.glow },
  postBtnTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelTxt: { fontSize: fonts.sizes.md },
});
