// features/rides/screens/RideDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { deleteRide, getRidePoster } from '../services/ridesService';
import { getOrCreateConversation } from '../../messages/services/messagesService';
import UserProfileModal, { formatDisplayName } from '../../../core/components/UserProfileModal';
import AppModal from '../../../core/components/AppModal';
import { decodeLongRideNotes, luggageLabel, formatReturnDate, LUGGAGE_OPTIONS } from '../utils/longRideUtils';

const AVATAR_COLORS = ['#E63946', '#1D3557', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];

const UNIVERSITIES = [
  { id: 'webster', label: 'Webster University',          color: '#8E44AD', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://webster.edu&size=128' } },
  { id: 'slu',     label: 'Saint Louis University',      color: '#C0392B', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slu.edu&size=128' } },
  { id: 'umsl',    label: 'Univ. of Missouri–St. Louis', color: '#C8102E', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://umsl.edu&size=128' } },
  { id: 'washu',   label: 'Washington University',       color: '#117A65', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wustl.edu&size=128' } },
];

const CATEGORY_META = {
  airport:    { icon: 'airplane',      color: '#3498DB', label: 'Airport Carpool' },
  university: { icon: 'school',        color: '#8E44AD', label: 'University Carpool' },
  temple:     { icon: 'leaf',          color: '#27AE60', label: 'Religious Centers Carpool' },
  general:    { icon: 'car-sport',     color: '#1ABC9C', label: 'Carpool' },
  longride:   { icon: 'map',           color: '#E67E22', label: 'Long Ride' },
};

const REQUEST_LABELS = {
  airport:    'Need Airport Ride',
  university: 'Need University Ride',
  temple:     'Need Ride to Religious Centre',
  general:    'Need a Seat',
  longride:   'Need a Long Ride Seat',
};

const OFFER_ACCENT   = '#1ABC9C';
const REQUEST_ACCENT = '#9B59B6';

export default function RideDetailScreen({ route, navigation }) {
  const { ride, fromChat } = route.params;
  const user       = useAppStore((state) => state.user);
  const colors     = useTheme();
  const isRequest  = ride.ride_type === 'request';
  const isDriver   = user?.id === ride.driver_id;
  const isRequester = user?.id === ride.requester_id;
  const isOwner    = isDriver || isRequester;
  const posterId   = isRequest ? ride.requester_id : ride.driver_id;

  const [poster,              setPoster]              = useState(ride.poster || null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [modal,               setModal]               = useState({ visible: false });

  useEffect(() => {
    if (!poster && posterId) getRidePoster(posterId).then(setPoster).catch(() => {});
  }, []);

  // When entered cross-tab (fromChat or no Carpool history), inject a back button.
  // canGoBack() can't be trusted here — the tab navigator itself satisfies it
  // even when there's no screen to go back to within the Carpool stack.
  useEffect(() => {
    if (fromChat || !navigation.canGoBack()) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => fromChat
              ? navigation.navigate('Messages')
              : navigation.navigate('BrowseRides')
            }
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
  const tomorrow   = new Date(now.getTime() + 86400000);
  const isToday    = now.toDateString()      === rideDate.toDateString();
  const isTomorrow = tomorrow.toDateString() === rideDate.toDateString();
  const dateLabel  = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
    : rideDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel  = rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const catMeta    = CATEGORY_META[ride.category] || CATEGORY_META.general;
  const accent     = isRequest ? REQUEST_ACCENT : catMeta.color;
  const uniData    = ride.category === 'university' ? UNIVERSITIES.find(u => u.id === ride.university) : null;
  const isLongRide = ride.category === 'longride';
  const longRideInfo = isLongRide ? decodeLongRideNotes(ride.notes) : null;
  const bannerLabel = isRequest
    ? (REQUEST_LABELS[ride.category] || 'Need a Seat')
    : (uniData ? uniData.label : catMeta.label);

  async function handleMessage() {
    try {
      const isFlexible = !!ride.any_time;
      const rideTitle  = isFlexible
        ? `${ride.from_location || '?'} → ${ride.to_location || '?'}, ${dateLabel}`
        : `${ride.from_location || '?'} → ${ride.to_location || '?'}, ${dateLabel} · ${timeLabel}`;
      const conversation = await getOrCreateConversation(user.id, posterId, ride.id, rideTitle, ride.ride_date || null);
      navigation.navigate('Tabs', {
        screen: 'Messages',
        params: {
          screen: 'Chat',
          params: {
            conversation,
            otherProfile: poster || { id: posterId, username: isRequest ? 'Rider' : 'Driver' },
            listingTitle: rideTitle,
            contextType: 'ride',
            rideContext: {
              rideId: ride.id,
              from:   ride.from_location || '?',
              to:     ride.to_location   || '?',
              date:   dateLabel,
              time:   isFlexible ? null : timeLabel,
              seats:  ride.seats_available ?? null,
              poster: posterName,
            },
          },
        },
      });
    } catch (err) {
      console.error('open chat error:', err);
      setModal({
        visible:      true,
        type:         'error',
        emoji:        '💬',
        title:        'Could Not Open Chat',
        subtitle:     err?.message || 'Please try again.',
        primaryLabel: 'OK',
        onPrimary:    () => setModal({ visible: false }),
      });
    }
  }

  function handleDelete() {
    setModal({
      visible:       true,
      type:          'confirm',
      emoji:         '🗑️',
      title:         isRequest ? 'Delete Request?' : 'Delete Ride?',
      subtitle:      'This cannot be undone. Your post will be permanently removed.',
      primaryLabel:  'Yes, Delete',
      onPrimary:     async () => {
        setModal({ visible: false });
        try {
          await deleteRide(ride.id);
          setModal({
            visible:      true,
            type:         'success',
            emoji:        '✅',
            title:        'Deleted',
            subtitle:     'Your post has been removed.',
            primaryLabel: 'OK',
            onPrimary:    () => { setModal({ visible: false }); navigation.goBack(); },
          });
        } catch {
          setModal({
            visible:      true,
            type:         'error',
            emoji:        '😕',
            title:        'Could Not Delete',
            subtitle:     'Something went wrong. Please try again.',
            primaryLabel: 'OK',
            onPrimary:    () => setModal({ visible: false }),
          });
        }
      },
      secondaryLabel: 'Cancel',
      onSecondary:    () => setModal({ visible: false }),
    });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Compact Hero Strip ── */}
      <View style={[styles.hero, { backgroundColor: accent + '14' }]}>
        <View style={[styles.heroIconWrap, { backgroundColor: accent + '22' }]}>
          {uniData ? (
            <Image source={uniData.logo} style={styles.heroUniLogo} resizeMode="contain" />
          ) : (
            <Ionicons name={catMeta.icon} size={20} color={accent} />
          )}
        </View>
        <Text style={[styles.heroLabel, { color: accent }]} numberOfLines={1}>{bannerLabel}</Text>
        <View style={[styles.heroBadge, { backgroundColor: accent }]}>
          <Ionicons name={isRequest ? 'hand-left' : 'car-sport'} size={11} color="#fff" />
          <Text style={styles.heroBadgeText}>
            {isRequest ? 'Need a Seat' : 'Offering Seat'}
          </Text>
        </View>
      </View>

      <View style={styles.body}>

        {/* ── Route Card ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textLight }]}>Route</Text>
          <View style={styles.routeRow}>
            <View style={styles.routeTrack}>
              <View style={[styles.dotFilled, { backgroundColor: '#2ECC71' }]} />
              <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
              <View style={[styles.dotRing, { borderColor: accent }]} />
            </View>
            <View style={styles.routeLabels}>
              <View style={styles.routeStop}>
                <Text style={[styles.stopTag, { color: colors.textLight }]}>FROM</Text>
                <Text style={[styles.stopText, { color: colors.textPrimary }]} numberOfLines={2}>
                  {ride.from_location}
                </Text>
              </View>
              <View style={{ height: 20 }} />
              <View style={styles.routeStop}>
                <Text style={[styles.stopTag, { color: colors.textLight }]}>TO</Text>
                <Text style={[styles.stopText, { color: colors.textPrimary }]} numberOfLines={2}>
                  {ride.to_location}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Long Ride Info Card ── */}
        {isLongRide && (longRideInfo?.stops || longRideInfo?.luggage || longRideInfo?.returnDate) && (
          <View style={[styles.card, { backgroundColor: '#FFF8F0', borderColor: '#E67E2230' }]}>
            <Text style={[styles.cardTitle, { color: '#E67E22' }]}>Trip Details</Text>
            <View style={styles.longRideInfoGrid}>
              {!!longRideInfo.stops && (
                <View style={styles.longRideInfoRow}>
                  <View style={[styles.longRideInfoIcon, { backgroundColor: '#E67E2218' }]}>
                    <Ionicons name="ellipsis-horizontal" size={16} color="#E67E22" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.longRideInfoLabel}>Stops Along the Way</Text>
                    <Text style={[styles.longRideInfoValue, { color: '#555' }]}>{longRideInfo.stops}</Text>
                  </View>
                </View>
              )}
              {!!longRideInfo.luggage && !isRequest && (
                <View style={styles.longRideInfoRow}>
                  <View style={[styles.longRideInfoIcon, { backgroundColor: '#E67E2218' }]}>
                    <Ionicons
                      name={LUGGAGE_OPTIONS.find(o => o.id === longRideInfo.luggage)?.icon || 'briefcase-outline'}
                      size={16}
                      color="#E67E22"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.longRideInfoLabel}>Luggage Space</Text>
                    <Text style={[styles.longRideInfoValue, { color: '#555' }]}>
                      {luggageLabel(longRideInfo.luggage)} — {LUGGAGE_OPTIONS.find(o => o.id === longRideInfo.luggage)?.desc}
                    </Text>
                  </View>
                </View>
              )}
              {!!longRideInfo.returnDate && (
                <View style={styles.longRideInfoRow}>
                  <View style={[styles.longRideInfoIcon, { backgroundColor: '#E67E2218' }]}>
                    <Ionicons name="refresh-outline" size={16} color="#E67E22" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.longRideInfoLabel}>Return Trip Available</Text>
                    <Text style={[styles.longRideInfoValue, { color: '#555' }]}>
                      {formatReturnDate(longRideInfo.returnDate)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Details Grid ── */}
        <View style={styles.detailsGrid}>
          {[
            { icon: 'calendar-clear-outline', label: 'Date',  value: dateLabel, color: '#3498DB' },
            { icon: 'time-outline',            label: 'Time',  value: timeLabel, color: '#9B59B6' },
            {
              icon:  isRequest ? 'people-outline' : 'person-outline',
              label: isRequest ? 'People' : 'Seats',
              value: isRequest
                ? `${ride.seats_available} ${ride.seats_available === 1 ? 'person' : 'people'}`
                : `${ride.seats_available} seat${ride.seats_available > 1 ? 's' : ''}`,
              color: '#2ECC71',
            },
            { icon: 'chatbubble-ellipses-outline', label: 'Cost', value: 'Chat to arrange', color: '#E67E22' },
          ].map((d) => (
            <View key={d.label} style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.detailIcon, { backgroundColor: d.color + '18' }]}>
                <Ionicons name={d.icon} size={17} color={d.color} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>{d.label}</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Posted by ── */}
        {poster && (
          <TouchableOpacity
            style={[styles.card, styles.posterCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={isOwner ? 1 : 0.75}
            onPress={() => !isOwner && setProfileModalVisible(true)}
          >
            <View style={[styles.posterAvatar, { backgroundColor: posterColor }]}>
              <Text style={styles.posterAvatarText}>{posterName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.posterName, { color: colors.textPrimary }]}>{posterName}</Text>
              <Text style={[styles.posterSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {isRequest ? 'Looking for a ride' : 'Offering this carpool'}
                {showRating ? `  ·  ⭐ ${poster.driver_rating?.toFixed(1)} (${poster.driver_rating_count})` : ''}
              </Text>
            </View>
            {!isOwner && <Ionicons name="chevron-forward" size={18} color={colors.textLight} />}
          </TouchableOpacity>
        )}

        {/* ── Community notice ── */}
        <View style={[styles.noticeRow, { backgroundColor: colors.infoBackground, borderColor: colors.info + '25' }]}>
          <View style={[styles.noticeIcon, { backgroundColor: colors.info + '20' }]}>
            <Ionicons name="shield-checkmark-outline" size={17} color={colors.info} />
          </View>
          <Text style={[styles.noticeText, { color: colors.secondary }]}>
            Community carpool — discuss cost sharing and trip details privately via chat
          </Text>
        </View>

        {/* ── Notes ── */}
        {(() => {
          const displayNotes = isLongRide ? longRideInfo?.userNotes : ride.notes;
          return !!displayNotes && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textLight }]}>
                {isRequest ? 'Rider Notes' : 'Driver Notes'}
              </Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{displayNotes}</Text>
            </View>
          );
        })()}

        {/* ── Connect button (non-owners) ── */}
        {!isOwner && (
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: accent }]}
            onPress={handleMessage}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.connectBtnText}>
              {isRequest ? 'Connect with Rider' : 'Connect with Driver'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Owner panel ── */}
        {isOwner && (
          <>
            <View style={[styles.ownerBadge, {
              backgroundColor: isRequest ? '#F5EEF8' : colors.successBackground,
              borderColor:     isRequest ? REQUEST_ACCENT + '30' : '#2ECC7130',
            }]}>
              <Ionicons
                name={isRequest ? 'hand-left-outline' : 'car-sport-outline'}
                size={17}
                color={isRequest ? REQUEST_ACCENT : colors.successText}
              />
              <Text style={[styles.ownerBadgeText, { color: isRequest ? REQUEST_ACCENT : colors.successText }]}>
                {isRequest ? "You're looking for a seat on this route" : "You're offering a seat on this carpool"}
              </Text>
            </View>
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.infoBackground, borderColor: colors.info + '40' }]}
                onPress={() => navigation.navigate('EditRide', { ride })}
              >
                <Ionicons name="create-outline" size={16} color={colors.info} />
                <Text style={[styles.actionBtnText, { color: colors.info }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.errorBackground, borderColor: colors.error + '40' }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Safety notice ── */}
        <View style={[styles.safetyRow, { backgroundColor: colors.warningBackground, borderColor: colors.warning + '30' }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warningText} style={{ marginTop: 1 }} />
          <Text style={[styles.safetyText, { color: colors.warningText }]}>
            Share your trip details with a friend or family member before travelling.
          </Text>
        </View>

        {/* ── Disclaimer ── */}
        <View style={[styles.disclaimer, { borderColor: colors.border }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.textSecondary }]}>Disclaimer</Text>
          <Text style={[styles.disclaimerText, { color: colors.textLight }]}>
            NestApp is a community platform for connecting people. We do not organise, operate, or take responsibility for arrangements made between members. All interactions — including safety, cost, and conduct — are solely the responsibility of the individuals involved. NestApp is not liable for any loss, injury, dispute, or inconvenience arising from using this or any other feature.
          </Text>
        </View>

      </View>

      <UserProfileModal
        visible={profileModalVisible}
        userId={posterId}
        onClose={() => setProfileModalVisible(false)}
        onMessage={!isOwner ? handleMessage : null}
      />

      <AppModal
        visible={modal.visible}
        type={modal.type}
        emoji={modal.emoji}
        title={modal.title}
        subtitle={modal.subtitle}
        primaryLabel={modal.primaryLabel}
        onPrimary={modal.onPrimary}
        secondaryLabel={modal.secondaryLabel}
        onSecondary={modal.onSecondary}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero — compact horizontal strip
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  heroIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  heroUniLogo: { width: 26, height: 26, borderRadius: 6 },
  heroLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  body: { padding: 16, gap: 12 },

  // Card base
  card: { borderRadius: 16, padding: 16, borderWidth: 0.5 },
  cardTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' },

  // Route
  routeRow: { flexDirection: 'row', gap: 14 },
  routeTrack: { width: 16, alignItems: 'center', paddingTop: 5 },
  dotFilled: { width: 12, height: 12, borderRadius: 6 },
  dotRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, backgroundColor: 'transparent' },
  routeLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  routeLabels: { flex: 1 },
  routeStop: { gap: 3 },
  stopTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  stopText: { fontSize: 16, fontWeight: '600' },

  // Details
  detailsGrid: { flexDirection: 'row', gap: 8 },
  detailCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 0.5, gap: 5 },
  detailIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 10, fontWeight: '500' },
  detailValue: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Poster
  posterCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posterAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  posterAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  posterName: { fontSize: 15, fontWeight: '700' },
  posterSub: { fontSize: 12, marginTop: 2 },

  // Notice
  noticeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 0.5,
  },
  noticeIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },

  // Long ride info
  longRideInfoGrid: { gap: 10 },
  longRideInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  longRideInfoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  longRideInfoLabel: { fontSize: 10, fontWeight: '700', color: '#E67E22', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  longRideInfoValue: { fontSize: 14, fontWeight: '500', lineHeight: 19 },

  // Notes
  notesText: { fontSize: 14, lineHeight: 21 },

  // Connect
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 16, paddingVertical: 16,
  },
  connectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Owner
  ownerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, borderWidth: 0.5,
  },
  ownerBadgeText: { flex: 1, fontWeight: '600', fontSize: 14 },
  ownerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 13, borderWidth: 0.5,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },

  // Safety
  safetyRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, padding: 14, borderWidth: 0.5,
  },
  safetyText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Disclaimer
  disclaimer: { borderTopWidth: 0.5, paddingTop: 16, marginTop: 4, marginBottom: 30 },
  disclaimerTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  disclaimerText: { fontSize: 11, lineHeight: 17 },
});
