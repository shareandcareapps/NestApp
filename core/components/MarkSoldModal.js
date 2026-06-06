// core/components/MarkSoldModal.js
// Facebook-Marketplace style "Mark as Sold" flow.
// Shows buyers who messaged about THIS listing, lets the seller pick one,
// archives the listing, and creates a pending purchase verification.

import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getListingBuyers } from '../../features/messages/services/messagesService';
import { setListingStatus } from '../../features/classifieds/services/listingsService';
import { createSaleVerification } from '../services/salesService';
import { formatDisplayName } from './UserProfileModal';

export default function MarkSoldModal({ visible, listing, sellerId, onClose, onSold }) {
  const colors = useTheme();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && listing) {
      setSelected(null);
      setLoading(true);
      // Strict Marketplace model: only people who messaged about THIS item
      getListingBuyers(listing.id, sellerId)
        .then(setBuyers)
        .catch(() => setBuyers([]))
        .finally(() => setLoading(false));
    }
  }, [visible, listing?.id]);

  async function finalize(buyer) {
    setSaving(true);
    try {
      const updated = await setListingStatus(listing.id, 'sold');
      if (buyer) {
        await createSaleVerification({
          listingId: listing.id,
          sellerId,
          buyerId: buyer.id,
          listingTitle: listing.title,
          listingImage: listing.images?.[0] || null,
          listingPrice: listing.price ?? null,
        });
      }
      onSold?.(updated);
      onClose?.();
      Alert.alert(
        'Marked as Sold 🎉',
        buyer
          ? `We've asked ${formatDisplayName(buyer.username)} to confirm the purchase. You'll earn points once they verify.`
          : 'Your listing has been moved to your Archive.'
      );
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not mark as sold. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleConfirm() {
    if (!selected) return;
    finalize(selected);
  }

  function handleNoBuyer() {
    Alert.alert(
      'Mark as sold without a buyer?',
      'No points will be awarded, but the listing will be archived.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Sold', onPress: () => finalize(null) },
      ]
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Who bought it?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            Select the buyer of "{listing?.title}". They'll get a prompt to confirm.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.secondary} />
            </View>
          ) : buyers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No one has messaged you about this item yet. You can still mark it
                sold to archive it — points are awarded once a buyer confirms.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {buyers.map((buyer) => {
                const isSel = selected?.id === buyer.id;
                return (
                  <TouchableOpacity
                    key={buyer.id}
                    style={[styles.buyerRow, {
                      backgroundColor: isSel ? colors.secondary + '18' : colors.surface,
                      borderColor: isSel ? colors.secondary : colors.border,
                    }]}
                    onPress={() => setSelected(buyer)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.buyerAvatar, { backgroundColor: colors.secondary }]}>
                      <Text style={styles.buyerAvatarText}>
                        {formatDisplayName(buyer.username).charAt(0)}
                      </Text>
                    </View>
                    <Text style={[styles.buyerName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {formatDisplayName(buyer.username)}
                    </Text>
                    {isSel && <Ionicons name="checkmark-circle" size={22} color={colors.secondary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Actions */}
          {buyers.length === 0 && !loading ? (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#2ECC71' }]}
                onPress={handleNoBuyer}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmText}>Mark Sold</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: selected ? '#2ECC71' : colors.border }]}
                onPress={handleConfirm}
                disabled={!selected || saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmText}>Confirm Sale</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  loadingBox: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  buyerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  buyerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buyerName: { flex: 1, fontSize: 15, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center', borderWidth: 0.5 },
  confirmBtn: { flex: 2, borderRadius: 10, padding: 13, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
