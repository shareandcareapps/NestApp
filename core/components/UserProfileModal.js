import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { getPublicProfile } from '../services/ratingsService';
import { getTier } from '../services/pointsService';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import ReportModal from './ReportModal';

const SCREEN_H = Dimensions.get('window').height;

function StarRow({ rating, count, label, color }) {
  if (!count || count < 5) return null;
  const stars = Math.round(rating);
  return (
    <View style={styles.ratingRow}>
      <Text style={[styles.ratingLabel, { color }]}>{label}</Text>
      <View style={styles.starsRow}>
        {[1,2,3,4,5].map(i => (
          <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={14} color="#F39C12" />
        ))}
        <Text style={styles.ratingValue}>{rating?.toFixed(1)} ({count})</Text>
      </View>
    </View>
  );
}

function StatBox({ emoji, value, label, colors }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textLight }]}>{label}</Text>
    </View>
  );
}

export function formatDisplayName(username) {
  if (!username) return 'Community Member';
  return username
    .split(/[\s_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function UserProfileModal({ visible, userId, onClose, onMessage }) {
  const colors       = useTheme();
  const currentUser  = useAppStore(s => s.user);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [isBlocked,  setIsBlocked]  = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const slideAnim = useState(new Animated.Value(SCREEN_H))[0];

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (visible && userId) {
      setLoading(true);
      setIsBlocked(false);
      Promise.all([
        getPublicProfile(userId),
        checkBlockStatus(userId),
      ])
        .then(([prof]) => setProfile(prof))
        .catch(console.error)
        .finally(() => setLoading(false));
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, userId]);

  async function checkBlockStatus(targetId) {
    if (!currentUser?.id || !targetId) return;
    const { data } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', currentUser.id)
      .eq('blocked_id', targetId)
      .maybeSingle();
    setIsBlocked(!!data);
  }

  async function handleBlock() {
    if (!currentUser?.id || !userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const action = isBlocked ? 'Unblock' : 'Block';
    Alert.alert(
      `${action} ${formatDisplayName(profile?.username)}?`,
      isBlocked
        ? 'You will be able to see their content again.'
        : 'You will no longer see their listings, rides, or messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action, style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            setBlockLoading(true);
            try {
              if (isBlocked) {
                await supabase.from('blocked_users').delete()
                  .eq('blocker_id', currentUser.id)
                  .eq('blocked_id', userId);
                setIsBlocked(false);
                Alert.alert('User unblocked');
              } else {
                await supabase.from('blocked_users').insert({
                  blocker_id: currentUser.id,
                  blocked_id: userId,
                });
                setIsBlocked(true);
                Alert.alert('User blocked');
                onClose();
              }
            } catch (e) {
              Alert.alert('Could not update block', e?.message || 'Please try again.');
            } finally {
              setBlockLoading(false);
            }
          },
        },
      ],
    );
  }

  const tier        = getTier(profile?.points || 0);
  const displayName = formatDisplayName(profile?.username);
  const initial     = displayName.charAt(0).toUpperCase();
  const avatarColors = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];
  const colorIndex  = displayName.charCodeAt(0) % avatarColors.length;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, { backgroundColor: colors.card }, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : profile ? (
            <>
              {/* Avatar + name */}
              <View style={styles.headerRow}>
                <View style={[styles.avatar, { backgroundColor: avatarColors[colorIndex] }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.displayName, { color: colors.textPrimary }]}>{displayName}</Text>
                    <Text style={styles.tierBadge}>{tier.badge}</Text>
                  </View>
                  <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>{tier.label}</Text>
                  {memberSince ? (
                    <Text style={[styles.memberSince, { color: colors.textLight }]}>Member since {memberSince}</Text>
                  ) : null}
                </View>
              </View>

              {/* Points */}
              <View style={[styles.pointsBar, { backgroundColor: colors.secondary + '18' }]}>
                <Text style={[styles.pointsValue, { color: colors.secondary }]}>{profile.points || 0}</Text>
                <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>Community Points</Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <StatBox emoji="📦" value={profile.listingCount} label="Listings" colors={colors} />
                <StatBox emoji="🚗" value={profile.rideCount} label="Rides" colors={colors} />
                <StatBox emoji="🏙️" value={profile.city || 'STL'} label="City" colors={colors} />
              </View>

              {/* Ratings */}
              <View style={[styles.ratingsBox, { borderColor: colors.borderLight }]}>
                <StarRow rating={profile.seller_rating} count={profile.seller_rating_count} label="Seller" color={colors.textSecondary} />
                <StarRow rating={profile.driver_rating} count={profile.driver_rating_count} label="Driver" color={colors.textSecondary} />
                {(!profile.seller_rating_count || profile.seller_rating_count < 5) &&
                 (!profile.driver_rating_count || profile.driver_rating_count < 5) && (
                  <Text style={[styles.noRatings, { color: colors.textLight }]}>No ratings yet</Text>
                )}
              </View>

              {/* Action buttons — only for other users */}
              {!isOwnProfile && (
                <View style={styles.actionsRow}>
                  {onMessage && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.messageBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => { onClose(); onMessage(); }}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                      <Text style={styles.messageBtnText}>Message</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.blockBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={handleBlock}
                    disabled={blockLoading}
                  >
                    {blockLoading
                      ? <ActivityIndicator size="small" color={colors.textLight} />
                      : <>
                          <Ionicons name={isBlocked ? 'person-add-outline' : 'ban-outline'} size={16} color={isBlocked ? '#00C48C' : colors.textSecondary} />
                          <Text style={[styles.blockBtnText, { color: isBlocked ? '#00C48C' : colors.textSecondary }]}>
                            {isBlocked ? 'Unblock' : 'Block'}
                          </Text>
                        </>
                    }
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.reportBtn, { borderColor: '#FF6B6B30', backgroundColor: '#FF6B6B10' }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReport(true); }}
                  >
                    <Ionicons name="flag-outline" size={16} color="#FF6B6B" />
                    <Text style={[styles.blockBtnText, { color: '#FF6B6B' }]}>Report</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <Text style={[styles.noRatings, { color: colors.textSecondary }]}>Could not load profile.</Text>
          )}
        </Animated.View>
      </Modal>

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={userId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  loadingBox: { height: 180, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { fontSize: 20, fontWeight: '700' },
  tierBadge: { fontSize: 20 },
  tierLabel: { fontSize: 13, marginTop: 2 },
  memberSince: { fontSize: 11, marginTop: 3 },
  pointsBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, marginBottom: 14 },
  pointsValue: { fontSize: 24, fontWeight: '800' },
  pointsLabel: { fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 10 },
  ratingsBox: { borderTopWidth: 0.5, paddingTop: 12, marginBottom: 14, gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingLabel: { fontSize: 13, fontWeight: '500' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingValue: { fontSize: 12, color: '#888', marginLeft: 4 },
  noRatings: { fontSize: 13, textAlign: 'center', paddingVertical: 4 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  messageBtn: {},
  messageBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  blockBtn: { borderWidth: 1.5 },
  reportBtn: { borderWidth: 1.5 },
  blockBtnText: { fontSize: 13, fontWeight: '600' },
});
