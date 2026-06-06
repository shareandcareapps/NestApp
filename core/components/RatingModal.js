import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { submitRating } from '../services/ratingsService';
import useAppStore from '../store/index';

export default function RatingModal({ visible, toUserId, toUsername, type, referenceId, onDone }) {
  const colors = useTheme();
  const user = useAppStore((s) => s.user);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const typeLabel = type === 'ride' ? 'Driver' : 'Seller';
  const displayName = toUsername
    ? toUsername.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'this user';

  async function handleSubmit() {
    if (!rating) return;
    setSaving(true);
    try {
      await submitRating({
        fromUserId: user.id,
        toUserId,
        type,
        referenceId,
        rating,
        comment: comment.trim() || null,
      });
      onDone();
    } catch (err) {
      // 23505 = already rated this item/ride — treat as done, not an error
      if (err?.code === '23505') {
        onDone();
        return;
      }
      console.error('Rating error:', err);
      Alert.alert('Could not submit rating', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Rate {typeLabel}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            How was your experience with {displayName}?
          </Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} style={styles.starBtn}>
                <Ionicons
                  name={s <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={s <= rating ? '#F39C12' : colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
            </Text>
          )}

          {/* Optional comment */}
          <TextInput
            style={[styles.commentInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Leave a comment (optional)..."
            placeholderTextColor={colors.textLight}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.skipBtn, { borderColor: colors.border }]} onPress={onDone}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: rating ? colors.secondary : colors.border }]}
              onPress={handleSubmit}
              disabled={!rating || saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={styles.submitText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 20, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  ratingText: { textAlign: 'center', fontSize: 15, fontWeight: '600', marginBottom: 14 },
  commentInput: { borderRadius: 10, borderWidth: 0.5, padding: 12, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  skipBtn: { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center', borderWidth: 0.5 },
  skipText: { fontSize: 14, fontWeight: '500' },
  submitBtn: { flex: 2, borderRadius: 10, padding: 13, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
