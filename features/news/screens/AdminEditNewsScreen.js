// features/news/screens/AdminEditNewsScreen.js
// Admin-only screen to edit or delete an auto-generated news article.
// Reached from NewsDetailScreen when the viewer has role = 'admin'.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../core/database/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const CATEGORIES = [
  { id: 'india',    label: 'India',    emoji: '🇮🇳' },
  { id: 'pakistan', label: 'Pakistan', emoji: '🇵🇰' },
  { id: 'nepal',    label: 'Nepal',    emoji: '🇳🇵' },
  { id: 'arab',     label: 'Arab',     emoji: '🌙' },
  { id: 'local',    label: 'Local',    emoji: '📍' },
  { id: 'visa',     label: 'Visa',     emoji: '📋' },
  { id: 'jobs',     label: 'Jobs',     emoji: '💼' },
  { id: 'events',   label: 'Events',   emoji: '🎉' },
];

export default function AdminEditNewsScreen({ route, navigation }) {
  const { article } = route.params;
  const theme  = useTheme();
  const insets = useSafeAreaInsets();

  const [title,    setTitle]    = useState(article.title);
  const [body,     setBody]     = useState(article.body);
  const [category, setCategory] = useState(article.category);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Title is required'); return; }
    if (!body.trim())  { Alert.alert('Body is required'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('news')
        .update({ title: title.trim(), body: body.trim(), category })
        .eq('id', article.id);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Article updated');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Article?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from('news').delete().eq('id', article.id);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Article deleted');
      navigation.navigate('NewsFeed');
    } catch (e) {
      Alert.alert('Delete failed', e?.message || 'Please try again.');
      setDeleting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>

        {/* Header */}
        <LinearGradient colors={['#1D3557','#0F1F35']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Article</Text>
            <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color="#FF6B6B" />
                : <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              }
            </TouchableOpacity>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#F4A833" />
            <Text style={styles.adminTxt}>Admin · Edit Mode</Text>
          </View>
        </LinearGradient>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 40 }]}
        >

          {/* Category picker */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {CATEGORIES.map(cat => {
              const active = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(cat.id); }}
                  style={[styles.catChip, active
                    ? { backgroundColor: '#F4A83320', borderColor: '#F4A833', borderWidth: 2 }
                    : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1.5 }
                  ]}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, { color: active ? '#F4A833' : theme.textSecondary, fontWeight: active ? '700' : '500' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Title */}
          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 20 }]}>
            Title <Text style={{ color: '#FF6B6B' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Article title"
            placeholderTextColor={theme.textLight}
            maxLength={150}
          />
          <Text style={[styles.charCount, { color: theme.textLight }]}>{title.length}/150</Text>

          {/* Body */}
          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>
            Body <Text style={{ color: '#FF6B6B' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.bodyInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }]}
            value={body}
            onChangeText={setBody}
            placeholder="Article body"
            placeholderTextColor={theme.textLight}
            multiline
            textAlignVertical="top"
          />

          {/* Source URL (read-only display) */}
          {article.source_url ? (
            <View style={[styles.sourceRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="link-outline" size={14} color={theme.textLight} />
              <Text style={[styles.sourceTxt, { color: theme.textLight }]} numberOfLines={1}>
                Source: {article.source_url}
              </Text>
            </View>
          ) : null}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.saveBtnTxt}>Save Changes</Text>
                </>
            }
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
  header: { paddingHorizontal: spacing.md, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,107,107,0.15)', alignItems: 'center', justifyContent: 'center' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 5 },
  adminTxt: { color: '#F4A833', fontSize: fonts.sizes.sm, fontWeight: '700' },
  inner: { padding: spacing.md },
  label: { fontSize: fonts.sizes.sm, fontWeight: '700', marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 8 },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: fonts.sizes.sm },
  input: { borderRadius: borderRadius.md, borderWidth: 1.5, padding: 14, fontSize: fonts.sizes.md },
  bodyInput: { minHeight: 220, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', fontSize: 11, marginTop: 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: borderRadius.md, borderWidth: 1, padding: 10, marginTop: 14 },
  sourceTxt: { fontSize: 11, flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00C48C', borderRadius: borderRadius.full, height: 54, marginTop: 24, ...shadows.small },
  saveBtnTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelTxt: { fontSize: fonts.sizes.md },
});
