// features/rides/screens/RideDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { deleteRide, getRidePoster } from '../services/ridesService';
import { getOrCreateConversation } from '../../messages/services/messagesService';
import UserProfileModal, { formatDisplayName } from '../../../core/components/UserProfileModal';
import AppModal from '../../../core/components/AppModal';
import { decodeLongRideNotes, luggageLabel, formatReturnDate } from '../utils/longRideUtils';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const AVATAR_COLORS = ['#FF6B6B','#2D1B69','#00C48C','#0099FF','#9B59B6','#F4A833'];

// Two colors only: blue for offers, amber/teal for requests
const OFFER_GRADIENT   = ['#0099FF', '#0055CC'];
const REQUEST_GRADIENT = ['#F4A833', '#E68A00'];

const CATEGORY_ICONS = {
  airport:    'airplane',
  university: 'school',
  temple:     'leaf',
  general:    'car-sport',
  longride:   'map',
};
const CATEGORY_LABELS = {
  airport: 'Airport', university: 'University', temple: 'Religious', general: 'General', longride: 'Long Ride',
};

const UNIVERSITIES = [
  { id: 'webster', label: 'Webster University',          color: '#8E44AD' },
  { id: 'slu',     label: 'Saint Louis University',      color: '#C0392B' },
  { id: 'umsl',    label: 'Univ. of Missouri–St. Louis', color: '#C8102E' },
  { id: 'washu',   label: 'Washington University',       color: '#117A65' },
];

function InfoRow({ icon, label, value, accent, theme }) {
  return (
    <View style={iStyles.row}>
      <View style={[iStyles.iconWrap, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <View style={iStyles.text}>
        <Text style={[iStyles.label, { color: theme?.textLight || 'rgba(255,255,255,0.45)' }]}>{label}</Text>
        <Text style={[iStyles.value, { color: theme?.textPrimary || '#fff' }]}>{value}</Text>
      </View>
    </View>
  );
}
const iStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text:     { flex: 1 },
  label:    { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 1 },
  value:    { fontSize: fonts.sizes.md, fontWeight: '700' },
});

export default function RideDetailScreen({ route, navigation }) {
  const { ride, fromChat } = route.params;
  const user   = useAppStore((state) => state.user);
  const theme  = useTheme();
  const insets = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  const isRequest  = ride.ride_type === 'request';
  const isDriver   = user?.id === ride.driver_id;
  const isRequester = user?.id === ride.requester_id;
  const isOwner    = isDriver || isRequester;
  const posterId   = isRequest ? ride.requester_id : ride.driver_id;

  const [poster,              setPoster]              = useState(ride.poster || null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [modal,               setModal]               = useState({ visible: false });
  const [msgLoading,          setMsgLoading]          = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    if (!poster && posterId) getRidePoster(posterId).then(setPoster).catch(() => {});
  }, []);

  const posterName  = formatDisplayName(poster?.username);
  const posterColor = AVATAR_COLORS[posterName.charCodeAt(0) % AVATAR_COLORS.length];
  const showRating  = !isRequest && (poster?.driver_rating_count ?? 0) >= 5;

  const rideDate   = new Date(ride.ride_date);
  const now        = new Date();
  const isToday    = now.toDateString() === rideDate.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === rideDate.toDateString();
  const dateLabel  = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
    : rideDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel  = ride.any_time ? 'Flexible'
    : rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const gradient = isRequest ? REQUEST_GRADIENT : OFFER_GRADIENT;
  const accent   = gradient[0];
  const catIcon  = CATEGORY_ICONS[ride.category] || 'car-sport';
  const catLabel = CATEGORY_LABELS[ride.category] || 'General';
  const uniData  = ride.category === 'university' ? UNIVERSITIES.find(u => u.id === ride.university) : null;
  const isLongRide = ride.category === 'longride';
  const longInfo = isLongRide ? decodeLongRideNotes(ride.notes) : null;
  const displayNotes = isLongRide ? (longInfo?.userNotes || '') : (ride.notes || '');
  const seatCount = ride.seats_available || 1;

  async function handleMessage() {
    setMsgLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const conversation = await getOrCreateConversation(user.id, posterId, { rideId: ride.id });
      navigation.navigate('Messages', { screen: 'Chat', params: { conversation } });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not open chat', text2: err.message });
    } finally { setMsgLoading(false); }
  }

  function confirmDelete() {
    Alert.alert('Delete Ride', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteRide(ride.id);
          Toast.show({ type: 'success', text1: 'Ride deleted' });
          navigation.goBack();
        } catch {
          Toast.show({ type: 'error', text1: 'Could not delete ride' });
        }
      }},
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ── Compact Hero ── */}
      <LinearGradient colors={gradient} start={{x:0,y:0}} end={{x:1,y:1}}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}>

        {/* Top bar */}
        <View style={styles.heroTopBar}>
          <TouchableOpacity style={styles.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('BrowseRides')}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroBadge}>
            <Ionicons name={catIcon} size={12} color="#fff" />
            <Text style={styles.heroBadgeTxt}>{isRequest ? 'Seat Request' : catLabel}</Text>
          </View>
          {isOwner && (
            <TouchableOpacity style={styles.editBtn}
              onPress={() => navigation.navigate('EditRide', { ride })}>
              <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Route */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeDotGreen} />
            <Text style={styles.routeFrom} numberOfLines={1}>{ride.from_location}</Text>
          </View>
          <View style={styles.routeLine}>
            <View style={[styles.routeLineBar, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          </View>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.routeTo} numberOfLines={1}>{ride.to_location}</Text>
          </View>
        </View>

        {/* Pills row */}
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.75)" />
            <Text style={styles.pillTxt}>{dateLabel}</Text>
          </View>
          <View style={styles.pillDivider} />
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.75)" />
            <Text style={styles.pillTxt}>{timeLabel}</Text>
          </View>
          <View style={styles.pillDivider} />
          <View style={styles.pill}>
            <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.75)" />
            <Text style={styles.pillTxt}>{seatCount} seat{seatCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 16 }}>

        {/* ── Driver card ── */}
        <LinearGradient
          colors={[accent + '18', accent + '05']}
          style={[styles.driverCard, { borderColor: accent + '30' }]}
          start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={[styles.cardLabel, { color: accent }]}>{isRequest ? 'REQUESTED BY' : 'DRIVER'}</Text>
          <TouchableOpacity style={styles.posterRow} onPress={() => setProfileModalVisible(true)} activeOpacity={0.8}>
            <LinearGradient colors={[posterColor, posterColor + 'BB']} style={styles.avatar}>
              <Text style={styles.avatarTxt}>{posterName.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.posterName, { color: theme.textPrimary }]}>{posterName}</Text>
              {uniData && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="school-outline" size={12} color={theme.textLight} />
                  <Text style={[styles.posterSub, { color: theme.textSecondary }]}>{uniData.label}</Text>
                </View>
              )}
              {showRating && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="star" size={11} color="#F4A833" />
                  <Text style={[styles.posterSub, { color: theme.textSecondary }]}>
                    {poster?.driver_rating?.toFixed(1)} · {poster?.driver_rating_count} trips
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.profileChip, { backgroundColor: accent + '20', borderColor: accent + '40' }]}>
              <Ionicons name="person-outline" size={13} color={accent} />
              <Text style={[styles.profileChipTxt, { color: accent }]}>Profile</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Trip Details ── */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardLabel, { color: theme.textLight }]}>TRIP DETAILS</Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow icon="calendar-outline" label="Date" value={dateLabel} accent={accent} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow icon="time-outline" label="Time" value={timeLabel} accent={accent} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow
            icon="people-outline"
            label={isRequest ? 'Seats Needed' : 'Seats Available'}
            value={`${seatCount} seat${seatCount !== 1 ? 's' : ''}`}
            accent={accent}
            theme={theme}
          />
        </View>

        {/* ── Long Ride Details ── */}
        {isLongRide && longInfo && (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardLabel, { color: theme.textLight }]}>LONG RIDE</Text>
            {longInfo.stops ? (<><View style={[styles.divider, { backgroundColor: theme.border }]} /><InfoRow icon="location-outline" label="Stops" value={longInfo.stops} accent={accent} theme={theme} /></>) : null}
            {longInfo.luggage ? (<><View style={[styles.divider, { backgroundColor: theme.border }]} /><InfoRow icon="briefcase-outline" label="Luggage" value={luggageLabel(longInfo.luggage)} accent={accent} theme={theme} /></>) : null}
            {longInfo.returnDate ? (<><View style={[styles.divider, { backgroundColor: theme.border }]} /><InfoRow icon="repeat-outline" label="Return" value={formatReturnDate(longInfo.returnDate)} accent={accent} theme={theme} /></>) : null}
          </View>
        )}

        {/* ── Notes ── */}
        {displayNotes ? (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardLabel, { color: theme.textLight }]}>NOTES</Text>
            <Text style={[styles.notes, { color: theme.textPrimary }]}>{displayNotes}</Text>
          </View>
        ) : null}

        {/* ── Cost notice ── */}
        <View style={[styles.noticeBanner, { borderColor: accent + '25', backgroundColor: accent + '0D' }]}>
          <Ionicons name="shield-checkmark-outline" size={15} color={accent} />
          <Text style={[styles.noticeTxt, { color: theme.textSecondary }]}>
            Cost sharing is arranged privately in chat — community carpool only
          </Text>
        </View>

        {/* ── Owner: Delete ── */}
        {isOwner && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
            <Text style={styles.deleteTxt}>Delete Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Floating CTA ── */}
      {!isOwner && (
        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background + 'F2' }]}>
          <TouchableOpacity
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={handleMessage}
            disabled={msgLoading}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <LinearGradient colors={gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.ctaBtn}>
                <Ionicons name={msgLoading ? 'hourglass-outline' : 'chatbubble-ellipses'} size={19} color="#fff" />
                <Text style={styles.ctaTxt}>{isRequest ? 'Offer a Seat' : 'Request a Seat'}</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}

      <UserProfileModal visible={profileModalVisible} onClose={() => setProfileModalVisible(false)} userId={posterId} />
      <AppModal visible={!!modal.visible} type={modal.type} title={modal.title}
        subtitle={modal.subtitle} primaryLabel={modal.primaryLabel} onPrimary={modal.onPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0A1F' },

  // Hero
  hero: { paddingHorizontal: spacing.md, paddingBottom: 20 },
  heroTopBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroBadgeTxt: { color: 'rgba(255,255,255,0.7)', fontSize: fonts.sizes.sm, fontWeight: '700', letterSpacing: 0.3 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  routeCard: { marginBottom: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#A8FFD8', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  routeFrom: { flex: 1, color: '#fff', fontSize: fonts.sizes.xl, fontWeight: '800', letterSpacing: -0.3 },
  routeLine: { paddingLeft: 4, paddingVertical: 5 },
  routeLineBar: { width: 2, height: 16, borderRadius: 1, marginLeft: 3 },
  routeTo: { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: fonts.sizes.lg, fontWeight: '700' },

  pillsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pillTxt: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '600' },
  pillDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Cards
  card: { marginHorizontal: spacing.md, marginBottom: 12, borderRadius: borderRadius.xl, padding: 16 },
  driverCard: { marginHorizontal: spacing.md, marginBottom: 12, borderRadius: borderRadius.xl, padding: 16, borderWidth: 1 },
  darkCard: { backgroundColor: '#1A1035', marginHorizontal: spacing.md, marginBottom: 12, borderRadius: borderRadius.xl, padding: 16 },
  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  cardLabelLight: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  divider: { height: 1 },

  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800' },
  posterName: { fontSize: fonts.sizes.md, fontWeight: '800', marginBottom: 2 },
  posterSub: { fontSize: fonts.sizes.sm },
  profileChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  profileChipTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },

  notes: { fontSize: fonts.sizes.md, lineHeight: 22 },

  noticeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: spacing.md, marginBottom: 12, borderRadius: borderRadius.md, padding: 14, borderWidth: 1 },
  noticeTxt: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 19 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: spacing.md, marginTop: 4, padding: 14, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#FF6B6B30', backgroundColor: '#FF6B6B0D' },
  deleteTxt: { color: '#FF6B6B', fontSize: fonts.sizes.md, fontWeight: '700' },

  ctaWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.md, paddingTop: 12 },
  ctaBtn: { borderRadius: borderRadius.full, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
});
