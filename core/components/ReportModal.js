// core/components/ReportModal.js
// Bottom-sheet for reporting a user or content.
// Usage:
//   <ReportModal
//     visible={showReport}
//     onClose={() => setShowReport(false)}
//     reportedUserId={userId}        // required
//     listingId={listing.id}         // optional
//     rideId={ride.id}               // optional
//   />

import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Pressable, ScrollView, Alert,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing, borderRadius } from '../theme/index';

const REASONS = [
  { id: 'spam',        icon: 'ban-outline',           label: 'Spam or fake listing' },
  { id: 'scam',        icon: 'warning-outline',        label: 'Scam or fraud' },
  { id: 'harassment',  icon: 'alert-circle-outline',   label: 'Harassment or bullying' },
  { id: 'hate',        icon: 'hand-left-outline',      label: 'Hate speech or discrimination' },
  { id: 'illegal',     icon: 'shield-outline',         label: 'Illegal goods or services' },
  { id: 'misinformation', icon: 'information-circle-outline', label: 'False or misleading info' },
  { id: 'other',       icon: 'ellipsis-horizontal-outline', label: 'Other' },
];

export default function ReportModal({ visible, onClose, reportedUserId, listingId, rideId }) {
  const theme  = useTheme();
  const user   = useAppStore(s => s.user);
  const insets = useSafeAreaInsets();

  const [selectedReason, setSelectedReason] = useState(null);
  const [notes,          setNotes]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [submitted,      setSubmitted]      = useState(false);

  function reset() {
    setSelectedReason(null);
    setNotes('');
    setLoading(false);
    setSubmitted(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!selectedReason) {
      Alert.alert('Select a reason');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id:      user.id,
        reported_user_id: reportedUserId || null,
        listing_id:       listingId || null,
        ride_id:          rideId    || null,
        reason:           selectedReason,
        notes:            notes.trim() || null,
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Report failed', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        {submitted ? (
          /* ── Thank-you state ── */
          <View style={styles.thankYou}>
            <View style={[styles.thankIcon, { backgroundColor: '#00C48C18' }]}>
              <Ionicons name="checkmark-circle" size={48} color="#00C48C" />
            </View>
            <Text style={[styles.thankTitle, { color: theme.textPrimary }]}>Report Received</Text>
            <Text style={[styles.thankBody, { color: theme.textSecondary }]}>
              Thank you for helping keep the community safe. Our team will review this report within 24 hours.
            </Text>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: '#00C48C' }]} onPress={handleClose}>
              <Text style={styles.doneBtnTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Report form ── */
          <>
            <View style={styles.headerRow}>
              <Ionicons name="flag" size={20} color="#FF6B6B" />
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Report</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={theme.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              What's the issue? We'll review your report confidentially.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {REASONS.map(r => {
                const isSelected = selectedReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.reasonRow,
                      { borderColor: isSelected ? '#FF6B6B' : theme.border, backgroundColor: isSelected ? '#FF6B6B12' : theme.background },
                    ]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedReason(r.id); }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={r.icon} size={18} color={isSelected ? '#FF6B6B' : theme.textSecondary} />
                    <Text style={[styles.reasonLabel, { color: isSelected ? '#FF6B6B' : theme.textPrimary, fontWeight: isSelected ? '700' : '500' }]}>
                      {r.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#FF6B6B" style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedReason && (
              <TextInput
                style={[styles.notesInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Additional details (optional)"
                placeholderTextColor={theme.textLight}
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={500}
              />
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitTxt}>Submit Report</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sheetTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', flex: 1 },
  closeBtn: { padding: 4 },
  subtitle: { fontSize: fonts.sizes.sm, lineHeight: 20, marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: borderRadius.md,
    padding: 12, marginBottom: 8,
  },
  reasonLabel: { fontSize: fonts.sizes.sm, flex: 1 },
  notesInput: {
    borderRadius: borderRadius.md, borderWidth: 1.5,
    padding: 12, fontSize: fonts.sizes.sm,
    minHeight: 72, textAlignVertical: 'top',
    marginTop: 8, marginBottom: 4,
  },
  submitBtn: {
    backgroundColor: '#FF6B6B', borderRadius: borderRadius.full,
    height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  submitTxt: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800' },
  thankYou: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  thankIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  thankTitle: { fontSize: fonts.sizes.xl, fontWeight: '800' },
  thankBody: { fontSize: fonts.sizes.sm, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md },
  doneBtn: { borderRadius: borderRadius.full, paddingHorizontal: 40, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  doneBtnTxt: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800' },
});
