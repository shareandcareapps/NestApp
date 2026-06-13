import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Alert,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';

const TOPICS = [
  { id: 'bug',     label: '🐛 Bug Report',        desc: 'Something is broken or not working',      color: '#FF3B30' },
  { id: 'feature', label: '✨ Feature Request',    desc: 'An idea to make NestApp better',          color: '#0099FF' },
  { id: 'content', label: '📝 Content Suggestion', desc: 'News, categories, community content',     color: '#00C48C' },
  { id: 'other',   label: '💬 Other',              desc: 'Anything else on your mind',              color: '#9B59B6' },
];

export default function FeedbackScreen({ navigation }) {
  const user  = useAppStore(s => s.user);
  const theme = useTheme();

  const [topic,    setTopic]    = useState(null);
  const [message,  setMessage]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [focused,  setFocused]  = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const activeTopic = TOPICS.find(t => t.id === topic);
  const canSubmit = topic && message.trim().length >= 10;

  async function handleSubmit() {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id || null,
        topic,
        message: message.trim(),
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (e) {
      Alert.alert('Could not submit');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.doneWrap}>
          <LinearGradient colors={['#00C48C', '#007A5E']} style={styles.doneCircle}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </LinearGradient>
          <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>Thank you!</Text>
          <Text style={[styles.doneBody, { color: theme.textSecondary }]}>
            Your feedback has been sent to the NestApp team. We read every message and appreciate you taking the time to help us improve.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.doneBtnTxt, { color: theme.textPrimary }]}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <LinearGradient colors={['#2D1B69', '#1A0F3D']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback & Suggestions</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.inner, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <View style={[styles.introBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="heart-outline" size={18} color="#F4A833" />
            <Text style={[styles.introTxt, { color: theme.textSecondary }]}>
              NestApp is built for this community — your input shapes what we build next.
            </Text>
          </View>

          {/* Topic selector */}
          <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>What's your feedback about?</Text>
          <View style={styles.topicGrid}>
            {TOPICS.map(t => {
              const active = topic === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTopic(t.id); }}
                  style={[
                    styles.topicCard,
                    { backgroundColor: active ? t.color + '15' : theme.card, borderColor: active ? t.color : theme.border, borderWidth: active ? 2 : 1 },
                    shadows.small,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.topicEmoji}>{t.label.split(' ')[0]}</Text>
                  <Text style={[styles.topicLabel, { color: active ? t.color : theme.textPrimary }]}>
                    {t.label.substring(t.label.indexOf(' ') + 1)}
                  </Text>
                  <Text style={[styles.topicDesc, { color: theme.textLight }]} numberOfLines={2}>
                    {t.desc}
                  </Text>
                  {active && (
                    <View style={[styles.topicCheck, { backgroundColor: t.color }]}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Message */}
          <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Tell us more</Text>
          <TextInput
            style={[
              styles.messageInput,
              { backgroundColor: theme.card, borderColor: focused ? (activeTopic?.color || '#F4A833') : theme.border, color: theme.textPrimary },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your feedback in detail — the more specific, the better..."
            placeholderTextColor={theme.textLight}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <Text style={[styles.charHint, { color: message.trim().length < 10 ? '#FF6B6B' : theme.textLight }]}>
            {message.trim().length < 10 ? `${10 - message.trim().length} more characters needed` : `${message.trim().length} characters`}
          </Text>

          {/* Submit */}
          <TouchableOpacity
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <LinearGradient
                colors={canSubmit ? ['#F4A833', '#FF6B6B'] : [theme.border, theme.border]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Text style={[styles.submitTxt, { color: canSubmit ? '#fff' : theme.textLight }]}>
                        Send Feedback
                      </Text>
                      <Ionicons name="send" size={16} color={canSubmit ? '#fff' : theme.textLight} />
                    </>
                }
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  inner: { padding: spacing.md },
  introBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: borderRadius.md, padding: 14, marginBottom: 24,
    borderWidth: 1,
  },
  introTxt: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 20 },
  sectionLabel: { fontSize: fonts.sizes.md, fontWeight: '800', marginBottom: 12 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  topicCard: {
    width: '47.5%', borderRadius: borderRadius.lg,
    padding: 14, gap: 6, position: 'relative',
  },
  topicEmoji: { fontSize: 24 },
  topicLabel: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  topicDesc: { fontSize: 11, lineHeight: 15 },
  topicCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  messageInput: {
    borderRadius: borderRadius.md, padding: 14, fontSize: fonts.sizes.md,
    borderWidth: 1.5, minHeight: 140,
  },
  charHint: { fontSize: 11, marginTop: 6, marginBottom: 20, textAlign: 'right' },
  submitBtn: {
    borderRadius: borderRadius.full, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  submitTxt: { fontSize: fonts.sizes.md, fontWeight: '800' },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  doneCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  doneTitle: { fontSize: fonts.sizes.xxl, fontWeight: '800' },
  doneBody: { fontSize: fonts.sizes.sm, lineHeight: 22, textAlign: 'center' },
  doneBtn: { marginTop: 16, borderRadius: borderRadius.full, height: 50, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  doneBtnTxt: { fontSize: fonts.sizes.md, fontWeight: '700' },
});
