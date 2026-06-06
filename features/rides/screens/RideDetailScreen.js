// features/rides/screens/RideDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
import { decodeLongRideNotes, luggageLabel, formatReturnDate, LUGGAGE_OPTIONS } from '../utils/longRideUtils';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const AVATAR_COLORS  = ['#FF6B6B','#2D1B69','#00C48C','#0099FF','#9B59B6','#F4A833'];
const OFFER_COLOR    = '#00C48C';
const REQUEST_COLOR  = '#9B59B6';

const UNIVERSITIES = [
  { id: 'webster', label: 'Webster University',          color: '#8E44AD', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://webster.edu&size=128' } },
  { id: 'slu',     label: 'Saint Louis University',      color: '#C0392B', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slu.edu&size=128' } },
  { id: 'umsl',    label: 'Univ. of Missouri–St. Louis', color: '#C8102E', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://umsl.edu&size=128' } },
  { id: 'washu',   label: 'Washington University',       color: '#117A65', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wustl.edu&size=128' } },
];

const CATEGORY_META = {
  airport:    { icon: 'airplane',      gradient: ['#3498DB','#0055AA'], label: 'Airport Carpool' },
  university: { icon: 'school',        gradient: ['#8E44AD','#6C3483'], label: 'University Carpool' },
  temple:     { icon: 'leaf',          gradient: ['#27AE60','#1E8449'], label: 'Religious Centers' },
  general:    { icon: 'car-sport',     gradient: ['#00C48C','#007A5E'], label: 'Carpool' },
  longride:   { icon: 'map',           gradient: ['#F4A833','#E68A00'], label: 'Long Ride' },
};

export default function RideDetailScreen({ route, navigation }) {
  const { ride, fromChat } = route.params;
  const user    = useAppStore((state) => state.user);
  const theme   = useTheme();
  const insets  = useSafeAreaInsets();
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
    if (!poster && posterId) getRidePoster(posterId).then(setPoster).catch(() => {});
  }, []);

  useEffect(() => {
    if (fromChat || !navigation.canGoBack()) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => fromChat ? navigation.navigate('Messages') : navigation.navigate('BrowseRides')}
            style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation]);

  const posterName  = formatDisplayName(poster?.username);
  const posterColor = AVATAR_COLORS[posterName.charCodeAt(0) % AVATAR_COLORS.length];
  const showRating  = !isRequest && (poster?.driver_rating_count ?? 0) >= 5;

  const rideDate   = new Date(ride.ride_date);
  const now        = new Date();
  const isToday    = now.toDateString() === rideDate.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === rideDate.toDateString();
  const dateLabel  = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
    : rideDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const timeLabel  = ride.any_time ? 'Flexible — coordinate in chat'
    : rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const catMeta   = CATEGORY_META[ride.category] || CATEGORY_META.general;
  const accent    = isRequest ? REQUEST_COLOR : catMeta.gradient[0];
  const uniData   = ride.category === 'university' ? UNIVERSITIES.find(u => u.id === ride.university) : null;
  const isLongRide = ride.category === 'longride';
  const longInfo  = isLongRide ? decodeLongRideNotes(ride.notes) : null;
  const displayNotes = isLongRide ? (longInfo?.userNotes || '') : (ride.notes || '');

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
    Alert.alert(
      'Delete Ride',
      'Are you sure? This cannot be undone.',
      [
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
      ]
    );
  }

  const seatCount = ride.seats_available || 1;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Gradient Hero Header */}
      <LinearGradient
        colors={isRequest ? [REQUEST_COLOR, '#6C3483'] : catMeta.gradient}
        style={[styles.hero, { paddingTop: insets.top + 10 }]}
      >
        {/* Back button */}
        <BlurView intensity={20} tint="dark" style={styles.backBtn}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('BrowseRides')}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
        </BlurView>

        {/* Category badge */}
        <View style={styles.heroCatBadge}>
          <Ionicons name={catMeta.icon} size={14} color="#fff" />
          <Text style={styles.heroCatTxt}>{isRequest ? (ride.category === 'longride' ? 'Long Ride Request' : 'Seat Request') : catMeta.label}</Text>
        </View>

        {/* Route */}
        <View style={styles.heroRoute}>
          <View style={styles.heroRouteTrack}>
            <View style={styles.heroRouteDotGreen} />
            {[0,1,2,3,4].map(i => <View key={i} style={styles.heroRouteDash} />)}
            <Ionicons name="navigate" size={16} color="#fff" style={{ marginTop: 2 }} />
          </View>
          <View style={styles.heroRouteLabels}>
            <Text style={styles.heroFrom} numberOfLines={1}>{ride.from_location}</Text>
            <View style={{ height: 14 }} />
            <Text style={styles.heroTo} numberOfLines={1}>{ride.to_location}</Text>
          </View>
        </View>

        {/* Meta pills row */}
        <View style={styles.heroPillsRow}>
          <View style={styles.heroPill}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroPillTxt}>{dateLabel}</Text>
          </View>
          <View style={styles.heroPill}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroPillTxt}>{timeLabel}</Text>
          </View>
          <View style={styles.heroPill}>
            <Ionicons name={isRequest ? 'people-outline' : 'car-sport-outline'} size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroPillTxt}>{seatCount} {isRequest ? 'need' : 'seat'}{seatCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* ── Driver / Requester Card ── */}
        <View style={[styles.section, { backgroundColor: theme.card }, shadows.small]}>
          <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{isRequest ? 'REQUESTED BY' : 'DRIVER'}</Text>
          <TouchableOpacity style={styles.posterRow} onPress={() => setProfileModalVisible(true)} activeOpacity={0.8}>
            <LinearGradient colors={[posterColor, posterColor + 'BB']} style={styles.posterAvatar}>
              <Text style={styles.posterAvatarTxt}>{posterName.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.posterName, { color: theme.textPrimary }]}>{posterName}</Text>
              {uniData && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Image source={uniData.logo} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  <Text style={[styles.posterSub, { color: theme.textSecondary }]}>{uniData.label}</Text>
                </View>
              )}
              {showRating && (
                <View style={styles.ratingRow}>
                  <Text style={[styles.ratingTxt, { color: theme.textSecondary }]}>⭐ {poster?.driver_rating?.toFixed(1)} · {poster?.driver_rating_count} trips</Text>
                </View>
              )}
            </View>
            <View style={[styles.viewProfileBtn, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
              <Text style={[styles.viewProfileTxt, { color: accent }]}>View Profile</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Seats Indicator ── */}
        <View style={[styles.section, { backgroundColor: theme.card }, shadows.small]}>
          <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{isRequest ? 'PEOPLE NEEDING SEATS' : 'SEATS AVAILABLE'}</Text>
          <View style={styles.seatDotsRow}>
            {Array.from({ length: Math.min(seatCount, 6) }).map((_, i) => (
              <LinearGradient key={i} colors={[accent, accent + 'BB']} style={styles.seatDot} />
            ))}
            {seatCount > 6 && <Text style={[styles.seatOverflow, { color: accent }]}>+{seatCount - 6}</Text>}
          </View>
          <Text style={[styles.seatLabel, { color: theme.textSecondary }]}>
            {isRequest
              ? `${seatCount} person${seatCount !== 1 ? 's' : ''} looking for a ride`
              : `${seatCount} seat${seatCount !== 1 ? 's' : ''} available in this ride`
            }
          </Text>
        </View>

        {/* ── Long Ride Info ── */}
        {isLongRide && longInfo && (
          <View style={[styles.section, { backgroundColor: theme.card }, shadows.small]}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>LONG RIDE DETAILS</Text>
            <View style={{ gap: 10 }}>
              {longInfo.stops ? (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#F4A83318' }]}>
                    <Ionicons name="location-outline" size={16} color="#F4A833" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailKey, { color: theme.textLight }]}>Stops</Text>
                    <Text style={[styles.detailVal, { color: theme.textPrimary }]}>{longInfo.stops}</Text>
                  </View>
                </View>
              ) : null}
              {longInfo.luggage ? (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#F4A83318' }]}>
                    <Ionicons name="briefcase-outline" size={16} color="#F4A833" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailKey, { color: theme.textLight }]}>Luggage Space</Text>
                    <Text style={[styles.detailVal, { color: theme.textPrimary }]}>{luggageLabel(longInfo.luggage)}</Text>
                  </View>
                </View>
              ) : null}
              {longInfo.returnDate ? (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#F4A83318' }]}>
                    <Ionicons name="repeat-outline" size={16} color="#F4A833" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailKey, { color: theme.textLight }]}>Return Date</Text>
                    <Text style={[styles.detailVal, { color: theme.textPrimary }]}>{formatReturnDate(longInfo.returnDate)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Notes ── */}
        {displayNotes ? (
          <View style={[styles.section, { backgroundColor: theme.card }, shadows.small]}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>NOTES</Text>
            <Text style={[styles.notesText, { color: theme.textPrimary }]}>{displayNotes}</Text>
          </View>
        ) : null}

        {/* ── Cost notice ── */}
        <View style={[styles.costBanner, { backgroundColor: theme.card, borderColor: accent + '30' }]}>
          <Ionicons name="lock-closed-outline" size={14} color={accent} />
          <Text style={[styles.costTxt, { color: theme.textSecondary }]}>
            Cost sharing is arranged privately in chat — community carpool only
          </Text>
        </View>

        {/* ── Owner Actions ── */}
        {isOwner && (
          <View style={[styles.section, { backgroundColor: theme.card }, shadows.small]}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>MANAGE</Text>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[styles.manageBtn, { backgroundColor: accent + '18', borderColor: accent + '40' }]}
                onPress={() => navigation.navigate('EditRide', { ride })}
              >
                <Ionicons name="create-outline" size={18} color={accent} />
                <Text style={[styles.manageBtnTxt, { color: accent }]}>Edit Ride</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manageBtn, { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B40' }]}
                onPress={confirmDelete}
              >
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                <Text style={[styles.manageBtnTxt, { color: '#FF6B6B' }]}>Delete Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Floating CTA ── */}
      {!isOwner && (
        <BlurView intensity={60} tint={theme.isDark ? 'dark' : 'light'} style={[styles.floatingCTA, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={handleMessage}
            disabled={msgLoading}
            activeOpacity={1}
            style={{ flex: 1 }}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <LinearGradient
                colors={isRequest ? [REQUEST_COLOR,'#7B2FBE'] : catMeta.gradient}
                start={{x:0,y:0}} end={{x:1,y:0}}
                style={styles.ctaBtn}
              >
                <Ionicons name={msgLoading ? 'hourglass-outline' : 'chatbubble-ellipses'} size={20} color="#fff" />
                <Text style={styles.ctaBtnTxt}>
                  {isRequest ? 'Offer a Seat' : 'Request a Seat'}
                </Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </BlurView>
      )}

      <UserProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        userId={posterId}
      />
      <AppModal
        visible={!!modal.visible}
        type={modal.type}
        emoji={modal.emoji}
        title={modal.title}
        subtitle={modal.subtitle}
        primaryLabel={modal.primaryLabel}
        onPrimary={modal.onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  hero: { paddingHorizontal: spacing.md, paddingBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 18 },
  heroCatTxt: { color: '#fff', fontSize: fonts.sizes.xs, fontWeight: '700', letterSpacing: 0.5 },

  heroRoute: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  heroRouteTrack: { alignItems: 'center', gap: 3, paddingTop: 3 },
  heroRouteDotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#A8FFD8' },
  heroRouteDash: { width: 2, height: 5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  heroRouteLabels: { flex: 1 },
  heroFrom: { color: '#fff', fontSize: fonts.sizes.xl, fontWeight: '800' },
  heroTo: { color: 'rgba(255,255,255,0.85)', fontSize: fonts.sizes.xl, fontWeight: '800' },

  heroPillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  heroPillTxt: { color: '#fff', fontSize: fonts.sizes.sm, fontWeight: '600' },

  section: { borderRadius: borderRadius.xl, marginHorizontal: spacing.md, marginTop: 14, padding: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },

  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posterAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  posterAvatarTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  posterName: { fontSize: fonts.sizes.md, fontWeight: '800', marginBottom: 2 },
  posterSub: { fontSize: fonts.sizes.sm },
  ratingRow: { marginTop: 2 },
  ratingTxt: { fontSize: fonts.sizes.sm },
  viewProfileBtn: { borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  viewProfileTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },

  seatDotsRow: { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  seatDot: { width: 36, height: 36, borderRadius: 18 },
  seatOverflow: { width: 36, height: 36, borderRadius: 18, textAlign: 'center', lineHeight: 36, fontSize: fonts.sizes.sm, fontWeight: '800' },
  seatLabel: { fontSize: fonts.sizes.sm },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detailKey: { fontSize: fonts.sizes.xs, fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  detailVal: { fontSize: fonts.sizes.md, fontWeight: '600' },

  notesText: { fontSize: fonts.sizes.md, lineHeight: 22 },

  costBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: spacing.md, marginTop: 14, borderRadius: borderRadius.md, padding: 14, borderWidth: 1 },
  costTxt: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 20 },

  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: borderRadius.md, padding: 14, borderWidth: 1 },
  manageBtnTxt: { fontSize: fonts.sizes.md, fontWeight: '700' },

  floatingCTA: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.md, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  ctaBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.glow },
  ctaBtnTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
});
