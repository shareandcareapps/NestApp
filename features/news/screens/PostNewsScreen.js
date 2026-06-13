// features/news/screens/PostNewsScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Alert,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { createNews } from '../services/newsService';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';
import { supabase } from '../../../core/database/index';
import { compressImage } from '../../../core/utils/imageUtils';

const CATEGORIES = [
  { id: 'india',    label: 'India',    emoji: '🇮🇳', gradient: ['#FF9933','#138808'] },
  { id: 'pakistan', label: 'Pakistan', emoji: '🇵🇰', gradient: ['#01411C','#5B8F6E'] },
  { id: 'nepal',    label: 'Nepal',    emoji: '🇳🇵', gradient: ['#003580','#DC143C'] },
  { id: 'arab',     label: 'Arab',     emoji: '🌙',  gradient: ['#006C35','#C8A84B'] },
  { id: 'local',    label: 'Local',    emoji: '📍',  gradient: ['#FF6B6B','#E84393'] },
  { id: 'events',   label: 'Events',   emoji: '🎉',  gradient: ['#F4A833','#E68A00'] },
];

const TAGS = ['#Visa', '#Jobs', '#Housing', '#Community', '#Culture', '#Events', '#Health', '#Education'];

function StyledInput({ value, onChangeText, placeholder, multiline, maxLength, theme }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[inpS.base, multiline && inpS.area, { backgroundColor: theme.inputBackground, borderColor: focused ? '#F4A833' : theme.border, color: theme.textPrimary }]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={theme.textLight} multiline={multiline}
      maxLength={maxLength} textAlignVertical={multiline ? 'top' : 'auto'}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}
const inpS = StyleSheet.create({
  base: { borderRadius: borderRadius.md, padding: 14, fontSize: fonts.sizes.md, borderWidth: 1.5 },
  area: { minHeight: 200, textAlignVertical: 'top' },
});

export default function PostNewsScreen({ navigation }) {
  const [title,      setTitle]      = useState('');
  const [body,       setBody]       = useState('');
  const [category,   setCategory]   = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [coverImage, setCoverImage] = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const user    = useAppStore((state) => state.user);
  const theme   = useTheme();
  const insets  = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  const activeCat = CATEGORIES.find(c => c.id === category);

  function toggleTag(tag) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function pickCoverImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, aspect: [16, 9], allowsEditing: true });
    if (res.canceled || !res.assets?.length) return;
    setCoverImage(res.assets[0].uri);
  }

  async function uploadCoverImage() {
    if (!coverImage) return null;
    setUploading(true);
    try {
      const compressed = await compressImage(coverImage);
      const path = `news/${Date.now()}.jpg`;
      const buf  = await (await fetch(compressed)).arrayBuffer();
      const { error } = await supabase.storage.from('listings').upload(path, buf, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const { data: u } = supabase.storage.from('listings').getPublicUrl(path);
      return u.publicUrl;
    } catch (e) {
      Alert.alert('Image upload failed');
      return null;
    } finally { setUploading(false); }
  }

  async function handlePost(draft = false) {
    if (!category)     { Alert.alert('Select a category'); return; }
    if (!title.trim()) { Alert.alert('Add a title'); return; }
    if (!body.trim())  { Alert.alert('Add the article body'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const imageUrl = await uploadCoverImage();
      await createNews({ admin_id: user.id, title: title.trim(), body: body.trim(), category, image_url: imageUrl, tags: selectedTags, draft }, user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(draft ? 'Saved as draft 📝' : 'Published! 🎉', draft ? 'You can edit and publish it later.' : 'Your news article is now live.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Failed to publish');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        {/* Header */}
        <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post News Article</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#F4A833" />
            <Text style={styles.adminTxt}>Admin · St. Louis Community News</Text>
          </View>
        </LinearGradient>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 40 }]}>

          {/* Cover image picker */}
          <TouchableOpacity onPress={pickCoverImage} activeOpacity={0.85}>
            {coverImage ? (
              <View style={styles.coverWrap}>
                <Image source={{ uri: coverImage }} style={styles.coverImg} resizeMode="cover" />
                <View style={styles.coverOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.coverOverlayTxt}>Change Cover</Text>
                </View>
                <TouchableOpacity style={styles.removeCover} onPress={() => setCoverImage(null)}>
                  <Ionicons name="close-circle" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <LinearGradient colors={['#2D1B6920','#4A2D9C15']} style={[styles.coverPlaceholder, { borderColor: theme.border }]}>
                <Ionicons name="image-outline" size={36} color={theme.textLight} />
                <Text style={[styles.coverPlaceholderTxt, { color: theme.textSecondary }]}>Add Cover Photo</Text>
                <Text style={[styles.coverPlaceholderSub, { color: theme.textLight }]}>Recommended: 16:9 ratio</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          {/* Category */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {CATEGORIES.map(cat => {
              const isActive = category === cat.id;
              return (
                <TouchableOpacity key={cat.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(cat.id); }} activeOpacity={0.85}>
                  {isActive
                    ? <LinearGradient colors={cat.gradient} style={styles.catChip}>
                        <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catChipLabel, { color: '#fff' }]}>{cat.label}</Text>
                      </LinearGradient>
                    : <View style={[styles.catChip, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1.5 }]}>
                        <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catChipLabel, { color: theme.textSecondary }]}>{cat.label}</Text>
                      </View>
                  }
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tags */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 20 }]}>Tags</Text>
          <View style={styles.tagsWrap}>
            {TAGS.map(tag => {
              const isActive = selectedTags.includes(tag);
              return (
                <TouchableOpacity key={tag} onPress={() => toggleTag(tag)}
                  style={[styles.tagChip, isActive ? { backgroundColor: '#F4A833', borderColor: '#F4A833' } : { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.tagTxt, { color: isActive ? '#fff' : theme.textSecondary }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: theme.card }, shadows.small]}>
            {activeCat && (
              <View style={styles.formCardHeader}>
                <LinearGradient colors={activeCat.gradient} style={styles.formAccent} />
                <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>{activeCat.emoji} {activeCat.label}</Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Article Title <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
            <StyledInput theme={theme} value={title} onChangeText={setTitle} placeholder="e.g. USCIS announces new OPT rules for F-1 students" maxLength={150} />
            <Text style={[styles.charCount, { color: theme.textLight }]}>{title.length}/150</Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Article Body <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
            <StyledInput theme={theme} value={body} onChangeText={setBody} placeholder="Write the full article here…" multiline />
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={() => handlePost(false)}
            disabled={loading || uploading}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <LinearGradient
                colors={(loading || uploading) ? ['#888','#666'] : (activeCat?.gradient || ['#2D1B69','#4A2D9C'])}
                start={{x:0,y:0}} end={{x:1,y:0}}
                style={styles.publishBtn}
              >
                {(loading || uploading)
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="rocket" size={18} color="#fff" /><Text style={styles.publishBtnTxt}>Publish Article</Text></>
                }
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.draftBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handlePost(true)}
            disabled={loading || uploading}
          >
            <Ionicons name="save-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.draftTxt, { color: theme.textSecondary }]}>Save as Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelTxt, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  adminTxt: { color: '#F4A833', fontSize: fonts.sizes.sm, fontWeight: '700' },
  inner: { padding: spacing.md },

  coverWrap: { borderRadius: borderRadius.xl, overflow: 'hidden', height: 180, marginBottom: 20, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  coverOverlay: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  coverOverlayTxt: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '600' },
  removeCover: { position: 'absolute', top: 10, right: 10 },
  coverPlaceholder: { height: 150, borderRadius: borderRadius.xl, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 },
  coverPlaceholderTxt: { fontSize: fonts.sizes.md, fontWeight: '700' },
  coverPlaceholderSub: { fontSize: fonts.sizes.xs },

  sectionTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', marginBottom: 14 },

  catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: borderRadius.full, paddingHorizontal: 16, paddingVertical: 10 },
  catChipEmoji: { fontSize: 18 },
  catChipLabel: { fontSize: fonts.sizes.sm, fontWeight: '700' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: { borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  tagTxt: { fontSize: fonts.sizes.sm, fontWeight: '600' },

  formCard: { borderRadius: borderRadius.xl, padding: 16, marginBottom: 16 },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  formAccent: { width: 4, height: 22, borderRadius: 2 },
  formCardTitle: { fontSize: fonts.sizes.md, fontWeight: '800' },
  fieldLabel: { fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  charCount: { textAlign: 'right', fontSize: 11, marginTop: 4 },

  publishBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.glow },
  publishBtnTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  draftBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: borderRadius.full, height: 48, borderWidth: 1.5, marginTop: 10 },
  draftTxt: { fontSize: fonts.sizes.md, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelTxt: { fontSize: fonts.sizes.md },
});
