// features/rides/screens/RideDetailScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';
import { deleteRide, getRidePoster } from '../services/ridesService';
import {
  createBooking, getBookingsForRide, getMyBooking,
  confirmBooking, updateCheckinStatus,
} from '../services/bookingsService';
import { getOrCreateConversation, sendMessage } from '../../messages/services/messagesService';
import UserProfileModal, { formatDisplayName } from '../../../core/components/UserProfileModal';
import AppModal from '../../../core/components/AppModal';
import AgeGateModal from '../../../core/components/AgeGateModal';
import ReportModal from '../../../core/components/ReportModal';
import { decodeLongRideNotes, luggageLabel, formatReturnDate } from '../utils/longRideUtils';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';
import { supabase } from '../../../core/database/index';

const AVATAR_COLORS  = ['#FF6B6B','#2D1B69','#00C48C','#0099FF','#9B59B6','#F4A833'];
const OFFER_GRADIENT   = ['#0099FF', '#0055CC'];
const REQUEST_GRADIENT = ['#F4A833', '#E68A00'];

const CATEGORY_ICONS  = { airport:'airplane', university:'school', temple:'leaf', general:'car-sport', longride:'map' };
const CATEGORY_LABELS = { airport:'Airport', university:'University', temple:'Religious', general:'General', longride:'Long Ride' };
const UNIVERSITIES    = [
  { id:'webster', label:'Webster University',          color:'#8E44AD' },
  { id:'slu',     label:'Saint Louis University',      color:'#C0392B' },
  { id:'umsl',    label:'Univ. of Missouri–St. Louis', color:'#C8102E' },
  { id:'washu',   label:'Washington University',       color:'#117A65' },
];

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, accent, theme }) {
  return (
    <View style={iStyles.row}>
      <View style={[iStyles.iconWrap, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <View style={iStyles.text}>
        <Text style={[iStyles.label, { color: theme?.textLight }]}>{label}</Text>
        <Text style={[iStyles.value, { color: theme?.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}
const iStyles = StyleSheet.create({
  row:      { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:10 },
  iconWrap: { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center' },
  text:     { flex:1 },
  label:    { fontSize:11, fontWeight:'600', letterSpacing:0.3, marginBottom:1 },
  value:    { fontSize:fonts.sizes.md, fontWeight:'700' },
});

// ─── PassengerRow (driver's passenger list) ───────────────────────────────────
function PassengerRow({ booking, accent, theme, onConfirm, onChat, isLast, isConfirming, position }) {
  const name  = formatDisplayName(booking.riderProfile?.username);
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const isPending  = booking.status === 'pending';
  const isOnTheWay = booking.checkin_status === 'on_my_way';

  return (
    <>
      <View style={pStyles.row}>
        <LinearGradient colors={[color, color + 'BB']} style={pStyles.avatar}>
          <Text style={pStyles.avatarTxt}>{name.charAt(0).toUpperCase()}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={[pStyles.name, { color: theme.textPrimary }]} numberOfLines={1}>{name}</Text>
            {isPending && position != null && (
              <View style={[pStyles.posPill, { backgroundColor: accent + '18' }]}>
                <Text style={[pStyles.posTxt, { color: accent }]}>#{position}</Text>
              </View>
            )}
          </View>
          {isPending ? (
            <Text style={[pStyles.sub, { color: theme.textLight }]}>Requested a seat</Text>
          ) : isOnTheWay ? (
            <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
              <View style={pStyles.greenDot} />
              <Text style={[pStyles.sub, { color:'#00C48C' }]}>On the way</Text>
            </View>
          ) : (
            <Text style={[pStyles.sub, { color: theme.textSecondary }]}>Confirmed · not checked in</Text>
          )}
        </View>

        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <TouchableOpacity
            style={[pStyles.iconBtn, { backgroundColor: accent + '15', borderColor: accent + '30' }]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={14} color={accent} />
          </TouchableOpacity>
          {isPending ? (
            <TouchableOpacity onPress={onConfirm} disabled={isConfirming} style={{ opacity: isConfirming ? 0.5 : 1 }}>
              <LinearGradient colors={['#00C48C','#007A5E']} style={pStyles.confirmBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
                <Text style={pStyles.confirmTxt}>Confirm</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <Ionicons name="checkmark-circle" size={22} color="#00C48C" />
          )}
        </View>
      </View>
      {!isLast && <View style={[pStyles.divider, { backgroundColor: theme.border }]} />}
    </>
  );
}
const pStyles = StyleSheet.create({
  row:        { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:10 },
  avatar:     { width:38, height:38, borderRadius:19, alignItems:'center', justifyContent:'center' },
  avatarTxt:  { color:'#fff', fontSize:fonts.sizes.sm, fontWeight:'800' },
  name:       { fontSize:fonts.sizes.sm, fontWeight:'700' },
  sub:        { fontSize:11, fontWeight:'500' },
  greenDot:   { width:6, height:6, borderRadius:3, backgroundColor:'#00C48C' },
  iconBtn:    { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center', borderWidth:1 },
  confirmBtn: { borderRadius:borderRadius.full, paddingHorizontal:14, paddingVertical:7 },
  confirmTxt: { color:'#fff', fontSize:fonts.sizes.sm, fontWeight:'800' },
  posPill:    { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  posTxt:     { fontSize: 10, fontWeight: '800' },
  divider:    { height:1, marginVertical:4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RideDetailScreen({ route, navigation }) {
  const { ride, fromChat } = route.params;
  const user   = useAppStore((state) => state.user);
  const theme  = useTheme();
  const insets = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  const isRequest   = ride.ride_type === 'request';
  const isDriver    = user?.id === ride.driver_id;
  const isRequester = user?.id === ride.requester_id;
  const isOwner     = isDriver || isRequester;
  const posterId    = isRequest ? ride.requester_id : ride.driver_id;

  const [poster,              setPoster]              = useState(ride.poster || null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [modal,               setModal]               = useState({ visible: false });
  const [msgLoading,          setMsgLoading]          = useState(false);
  const [showAgeGate,         setShowAgeGate]         = useState(false);
  const [showReport,          setShowReport]          = useState(false);
  const [ageGateLoading,      setAgeGateLoading]      = useState(false);
  // Booking state
  const [bookings,     setBookings]     = useState([]);   // driver: all bookings for this ride
  const [myBooking,    setMyBooking]    = useState(null); // rider: my booking
  const [checkedIn,    setCheckedIn]    = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  const rideDate   = new Date(ride.ride_date);
  const now        = new Date();
  const isToday    = now.toDateString() === rideDate.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === rideDate.toDateString();
  const dateLabel  = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
    : rideDate.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
  const timeLabel  = ride.any_time ? 'Flexible'
    : rideDate.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    if (!poster && posterId) getRidePoster(posterId).then(setPoster).catch(() => {});
  }, []);

  // Reload bookings every time the screen comes into focus so
  // the driver sees new requests even after navigating away and back.
  useFocusEffect(useCallback(() => {
    if (isDriver && !isRequest)  loadBookings();
    if (!isOwner  && !isRequest) loadMyBooking();
  }, []));

  async function loadBookings() {
    try { setBookings(await getBookingsForRide(ride.id)); } catch {}
  }

  async function loadMyBooking() {
    try {
      const data = await getMyBooking(ride.id, user.id);
      setMyBooking(data);
      if (data?.checkin_status === 'on_my_way') setCheckedIn(true);
    } catch {}
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const posterName  = formatDisplayName(poster?.username);
  const posterColor = AVATAR_COLORS[posterName.charCodeAt(0) % AVATAR_COLORS.length];
  const showRating  = !isRequest && (poster?.driver_rating_count ?? 0) >= 5;

  const gradient = isRequest ? REQUEST_GRADIENT : OFFER_GRADIENT;
  const accent   = gradient[0];
  const catIcon  = CATEGORY_ICONS[ride.category]  || 'car-sport';
  const catLabel = CATEGORY_LABELS[ride.category] || 'General';
  const uniData  = ride.category === 'university' ? UNIVERSITIES.find(u => u.id === ride.university) : null;
  const isLongRide   = ride.category === 'longride';
  const longInfo     = isLongRide ? decodeLongRideNotes(ride.notes) : null;
  const displayNotes = isLongRide ? (longInfo?.userNotes || '') : (ride.notes || '');

  // Seat count: driver derives live from bookings array; others use stored column
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;
  const seatTotal      = ride.seats_available || 1;
  const seatsBooked    = isDriver ? confirmedCount : (ride.seats_booked || 0);
  const seatsRemaining = Math.max(0, seatTotal - seatsBooked);
  const seatLabel      = isDriver
    ? `${seatsRemaining} of ${seatTotal} open`
    : seatsBooked > 0
      ? `${seatsRemaining}/${seatTotal} remaining`
      : `${seatTotal} seat${seatTotal !== 1 ? 's' : ''}`;

  // Show ride day banner when rider is confirmed AND it's today
  const showRideDayBanner = !isOwner && !isRequest && myBooking?.status === 'confirmed' && isToday;

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function openChat(otherUserId, otherProfileOverride = null, bookingId = null) {
    setMsgLoading(true);
    try {
      // ConversationsScreen parses listing_title as "ride:from → to, date · time"
      // to build the ride context banner in ChatScreen. We follow the same convention.
      const rideTitle = `ride:${ride.from_location} → ${ride.to_location}, ${dateLabel} · ${timeLabel}`;

      const conversation = await getOrCreateConversation(
        user.id, otherUserId, null, rideTitle, ride.ride_date
      );

      navigation.navigate('Messages', {
        screen: 'Chat',
        params: {
          conversation,
          otherProfile: otherProfileOverride || poster || null,
          listingTitle: rideTitle,
          contextType: 'ride',
          rideContext: {
            from:     ride.from_location,
            to:       ride.to_location,
            date:     dateLabel,
            time:     timeLabel,
            seats:    seatTotal,
            poster:   posterName,
            rideId:    ride.id,
            bookingId: bookingId || null,
            // driverId enables manage/request UI in chat
            driverId:  isRequest ? null : ride.driver_id,
          },
        },
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not open chat', text2: err.message });
    } finally { setMsgLoading(false); }
  }

  // Rider: check age attestation then open chat
  async function handleRequestSeat() {
    const { data } = await supabase.from('profiles').select('rides_age_attested').eq('id', user.id).maybeSingle();
    if (!data?.rides_age_attested) { setShowAgeGate(true); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await openChat(posterId);
  }

  async function handleAgeConfirmed() {
    setAgeGateLoading(true);
    await supabase.from('profiles').update({ rides_age_attested: true }).eq('id', user.id);
    setShowAgeGate(false);
    setAgeGateLoading(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await openChat(posterId);
  }

  // Driver: confirm a pending rider + send them a message automatically
  async function handleConfirmBooking(booking) {
    setConfirmingId(booking.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await confirmBooking(booking.id, ride.id);
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed' } : b));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `${formatDisplayName(booking.riderProfile?.username)} confirmed!` });

      // Send an automated message from the driver so the rider gets notified in chat
      const rideTitle = `ride:${ride.from_location} → ${ride.to_location}, ${dateLabel} · ${timeLabel}`;
      const conv = await getOrCreateConversation(user.id, booking.rider_id, null, rideTitle, ride.ride_date);
      await sendMessage(
        conv.id, user.id,
        `✅ Your seat is confirmed! See you on ${dateLabel} at ${timeLabel}. Feel free to coordinate pickup details here.`
      );
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not confirm', text2: err.message });
    } finally { setConfirmingId(null); }
  }

  // Rider: "I'm On My Way" check-in
  async function handleCheckin() {
    if (!myBooking) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCheckedIn(true); // optimistic
    try {
      await updateCheckinStatus(myBooking.id, 'on_my_way');
    } catch {
      setCheckedIn(false);
      Toast.show({ type: 'error', text1: 'Check-in failed — try again' });
    }
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* ── Hero ── */}
      <LinearGradient colors={gradient} start={{x:0,y:0}} end={{x:1,y:1}}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}>

        <View style={styles.heroTopBar}>
          <TouchableOpacity style={styles.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('BrowseRides')}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroBadge}>
            <Ionicons name={catIcon} size={12} color="#fff" />
            <Text style={styles.heroBadgeTxt}>{isRequest ? 'Seat Request' : catLabel}</Text>
          </View>
          {isOwner
            ? (
              <TouchableOpacity style={styles.editBtn}
                onPress={() => navigation.navigate('EditRide', { ride })}>
                <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editBtn}
                onPress={() => setShowReport(true)}>
                <Ionicons name="flag-outline" size={17} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )
          }
        </View>

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
            <Text style={styles.pillTxt}>{seatLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 16 }}>

        {/* ── Ride Day Banner (rider confirmed + today) ── */}
        {showRideDayBanner && (
          <LinearGradient
            colors={checkedIn ? ['#00C48C18','#00C48C08'] : ['#0099FF18','#0099FF08']}
            style={[styles.rideDayCard, { borderColor: checkedIn ? '#00C48C40' : '#0099FF40' }]}
            start={{x:0,y:0}} end={{x:1,y:1}}
          >
            <View style={styles.rideDayTop}>
              <View style={[styles.rideDayIcon, { backgroundColor: checkedIn ? '#00C48C20' : '#0099FF20' }]}>
                <Ionicons
                  name={checkedIn ? 'checkmark-circle' : 'car-sport'}
                  size={22}
                  color={checkedIn ? '#00C48C' : '#0099FF'}
                />
              </View>
              <View style={{ flex:1 }}>
                <Text style={[styles.rideDayTitle, { color: theme.textPrimary }]}>
                  {checkedIn ? "Driver knows you're coming" : 'Your ride is today!'}
                </Text>
                <Text style={[styles.rideDaySub, { color: theme.textSecondary }]}>
                  {checkedIn ? 'You checked in · See you soon 👋' : "Tap to let your driver know you're on the way"}
                </Text>
              </View>
            </View>
            {!checkedIn && (
              <TouchableOpacity onPress={handleCheckin} activeOpacity={0.85}>
                <LinearGradient colors={['#0099FF','#0055CC']} style={styles.onMyWayBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.onMyWayTxt}>I'm On My Way</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </LinearGradient>
        )}

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
            <View style={{ flex:1 }}>
              <Text style={[styles.posterName, { color: theme.textPrimary }]}>{posterName}</Text>
              {uniData && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:2 }}>
                  <Ionicons name="school-outline" size={12} color={theme.textLight} />
                  <Text style={[styles.posterSub, { color: theme.textSecondary }]}>{uniData.label}</Text>
                </View>
              )}
              {showRating && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:2 }}>
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
          <InfoRow icon="calendar-outline" label="Date"  value={dateLabel} accent={accent} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow icon="time-outline"     label="Time"  value={timeLabel} accent={accent} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow
            icon="people-outline"
            label={isRequest ? 'Seats Needed' : 'Seats Available'}
            value={seatLabel}
            accent={accent}
            theme={theme}
          />
        </View>

        {/* ── Passengers (driver only, offer rides) ── */}
        {isDriver && !isRequest && (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.passengersHeader}>
              <Text style={[styles.cardLabel, { color: theme.textLight, marginBottom:0 }]}>PASSENGERS</Text>
              {pendingCount > 0 && (
                <View style={[styles.pendingPill, { backgroundColor:'#F4A83320', borderColor:'#F4A83340' }]}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingPillTxt}>{pendingCount} new request{pendingCount !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>

            {bookings.length === 0 ? (
              <View style={styles.emptyPassengers}>
                <Ionicons name="people-outline" size={28} color={theme.textLight} />
                <Text style={[styles.emptyTxt, { color: theme.textLight }]}>No requests yet</Text>
              </View>
            ) : (
              bookings.map((booking, idx) => (
                <PassengerRow
                  key={booking.id}
                  booking={booking}
                  accent={accent}
                  theme={theme}
                  isLast={idx === bookings.length - 1}
                  isConfirming={confirmingId === booking.id}
                  position={idx + 1}
                  onConfirm={() => handleConfirmBooking(booking)}
                  onChat={() => openChat(booking.rider_id, booking.riderProfile, booking.id)}
                />
              ))
            )}
          </View>
        )}

        {/* ── Long Ride Details ── */}
        {isLongRide && longInfo && (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardLabel, { color: theme.textLight }]}>LONG RIDE</Text>
            {!!longInfo.stops    && <><View style={[styles.divider, { backgroundColor: theme.border }]} /><InfoRow icon="location-outline"  label="Stops"   value={longInfo.stops}                   accent={accent} theme={theme} /></>}
            {!!longInfo.luggage  && <><View style={[styles.divider, { backgroundColor: theme.border }]} /><InfoRow icon="briefcase-outline" label="Luggage" value={luggageLabel(longInfo.luggage)}   accent={accent} theme={theme} /></>}
            {!!longInfo.returnDate && <><View style={[styles.divider, { backgroundColor: theme.border }]} /><InfoRow icon="repeat-outline"    label="Return"  value={formatReturnDate(longInfo.returnDate)} accent={accent} theme={theme} /></>}
          </View>
        )}

        {/* ── Notes ── */}
        {!!displayNotes && (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardLabel, { color: theme.textLight }]}>NOTES</Text>
            <Text style={[styles.notes, { color: theme.textPrimary }]}>{displayNotes}</Text>
          </View>
        )}

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

      {/* ── CTA: Offer rides — booking-aware ── */}
      {!isOwner && !isRequest && (
        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background + 'F2' }]}>
          {myBooking?.status === 'pending' && (
            <View style={styles.statusRow}>
              <Ionicons name="time-outline" size={13} color="#F4A833" />
              <Text style={[styles.statusTxt, { color:'#F4A833' }]}>Request sent · Awaiting driver</Text>
            </View>
          )}
          {myBooking?.status === 'confirmed' && (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={13} color="#00C48C" />
              <Text style={[styles.statusTxt, { color:'#00C48C' }]}>You're confirmed for this ride</Text>
            </View>
          )}
          <TouchableOpacity
            onPressIn={() => Animated.spring(btnScale, { toValue:0.96, useNativeDriver:true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue:1, useNativeDriver:true }).start()}
            onPress={myBooking ? () => openChat(posterId) : handleRequestSeat}
            disabled={msgLoading}
            activeOpacity={1}
          >
            <Animated.View style={{ transform:[{ scale: btnScale }] }}>
              <LinearGradient colors={gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.ctaBtn}>
                <Ionicons
                  name={msgLoading ? 'hourglass-outline' : myBooking ? 'chatbubble-ellipses' : 'people'}
                  size={19} color="#fff"
                />
                <Text style={styles.ctaTxt}>
                  {msgLoading ? 'Opening...' : myBooking ? 'Chat with Driver' : 'Request a Seat'}
                </Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CTA: Request rides — unchanged ── */}
      {!isOwner && isRequest && (
        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background + 'F2' }]}>
          <TouchableOpacity
            onPressIn={() => Animated.spring(btnScale, { toValue:0.96, useNativeDriver:true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue:1, useNativeDriver:true }).start()}
            onPress={() => openChat(posterId)}
            disabled={msgLoading}
            activeOpacity={1}
          >
            <Animated.View style={{ transform:[{ scale: btnScale }] }}>
              <LinearGradient colors={gradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.ctaBtn}>
                <Ionicons name={msgLoading ? 'hourglass-outline' : 'chatbubble-ellipses'} size={19} color="#fff" />
                <Text style={styles.ctaTxt}>Offer a Seat</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}

      <AgeGateModal
        visible={showAgeGate}
        loading={ageGateLoading}
        onConfirm={handleAgeConfirmed}
        onDecline={() => setShowAgeGate(false)}
      />
      <UserProfileModal visible={profileModalVisible} onClose={() => setProfileModalVisible(false)} userId={posterId} />
      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={posterId}
        rideId={ride.id}
      />
      <AppModal visible={!!modal.visible} type={modal.type} title={modal.title}
        subtitle={modal.subtitle} primaryLabel={modal.primaryLabel} onPrimary={modal.onPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:'#0E0A1F' },

  // ── Hero
  hero:        { paddingHorizontal: spacing.md, paddingBottom: 20 },
  heroTopBar:  { flexDirection:'row', alignItems:'center', marginBottom:18, gap:10 },
  backBtn:     { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  heroBadge:   { flex:1, flexDirection:'row', alignItems:'center', gap:5 },
  heroBadgeTxt:{ color:'rgba(255,255,255,0.7)', fontSize:fonts.sizes.sm, fontWeight:'700', letterSpacing:0.3 },
  editBtn:     { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.12)', alignItems:'center', justifyContent:'center' },

  routeCard:    { marginBottom:16 },
  routeRow:     { flexDirection:'row', alignItems:'center', gap:10 },
  routeDotGreen:{ width:10, height:10, borderRadius:5, backgroundColor:'#A8FFD8', borderWidth:2, borderColor:'rgba(255,255,255,0.4)' },
  routeFrom:    { flex:1, color:'#fff', fontSize:fonts.sizes.xl, fontWeight:'800', letterSpacing:-0.3 },
  routeLine:    { paddingLeft:4, paddingVertical:5 },
  routeLineBar: { width:2, height:16, borderRadius:1, marginLeft:3 },
  routeTo:      { flex:1, color:'rgba(255,255,255,0.8)', fontSize:fonts.sizes.lg, fontWeight:'700' },

  pillsRow:    { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(0,0,0,0.2)', borderRadius:borderRadius.lg, paddingHorizontal:14, paddingVertical:10 },
  pill:        { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5 },
  pillTxt:     { color:'#fff', fontSize:fonts.sizes.sm, fontWeight:'600' },
  pillDivider: { width:1, height:16, backgroundColor:'rgba(255,255,255,0.2)' },

  // ── Cards
  card:       { marginHorizontal:spacing.md, marginBottom:12, borderRadius:borderRadius.xl, padding:16 },
  driverCard: { marginHorizontal:spacing.md, marginBottom:12, borderRadius:borderRadius.xl, padding:16, borderWidth:1 },
  cardLabel:  { fontSize:10, fontWeight:'800', letterSpacing:1.2, marginBottom:12 },
  divider:    { height:1 },

  // ── Ride Day Banner
  rideDayCard:  { marginHorizontal:spacing.md, marginBottom:12, borderRadius:borderRadius.xl, padding:16, borderWidth:1 },
  rideDayTop:   { flexDirection:'row', alignItems:'center', gap:12, marginBottom:14 },
  rideDayIcon:  { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  rideDayTitle: { fontSize:fonts.sizes.md, fontWeight:'800', marginBottom:3 },
  rideDaySub:   { fontSize:fonts.sizes.sm, lineHeight:18 },
  onMyWayBtn:   { borderRadius:borderRadius.full, height:44, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  onMyWayTxt:   { color:'#fff', fontSize:fonts.sizes.md, fontWeight:'800' },

  // ── Passengers
  passengersHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  pendingPill:      { flexDirection:'row', alignItems:'center', gap:5, borderRadius:borderRadius.full, paddingHorizontal:10, paddingVertical:4, borderWidth:1 },
  pendingDot:       { width:5, height:5, borderRadius:2.5, backgroundColor:'#F4A833' },
  pendingPillTxt:   { fontSize:11, fontWeight:'700', color:'#F4A833' },
  emptyPassengers:  { alignItems:'center', paddingVertical:20, gap:8 },
  emptyTxt:         { fontSize:fonts.sizes.sm, fontWeight:'500' },

  // ── Driver card content
  posterRow:      { flexDirection:'row', alignItems:'center', gap:12 },
  avatar:         { width:46, height:46, borderRadius:23, alignItems:'center', justifyContent:'center' },
  avatarTxt:      { color:'#fff', fontSize:fonts.sizes.md, fontWeight:'800' },
  posterName:     { fontSize:fonts.sizes.md, fontWeight:'800', marginBottom:2 },
  posterSub:      { fontSize:fonts.sizes.sm },
  profileChip:    { flexDirection:'row', alignItems:'center', gap:5, borderRadius:borderRadius.full, paddingHorizontal:12, paddingVertical:6, borderWidth:1 },
  profileChipTxt: { fontSize:fonts.sizes.sm, fontWeight:'700' },

  notes: { fontSize:fonts.sizes.md, lineHeight:22 },

  noticeBanner: { flexDirection:'row', alignItems:'flex-start', gap:10, marginHorizontal:spacing.md, marginBottom:12, borderRadius:borderRadius.md, padding:14, borderWidth:1 },
  noticeTxt:    { flex:1, fontSize:fonts.sizes.sm, lineHeight:19 },

  deleteBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginHorizontal:spacing.md, marginTop:4, padding:14, borderRadius:borderRadius.lg, borderWidth:1, borderColor:'#FF6B6B30', backgroundColor:'#FF6B6B0D' },
  deleteTxt: { color:'#FF6B6B', fontSize:fonts.sizes.md, fontWeight:'700' },

  // ── CTA
  ctaWrap:   { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:spacing.md, paddingTop:12 },
  statusRow: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, marginBottom:8 },
  statusTxt: { fontSize:fonts.sizes.sm, fontWeight:'700' },
  ctaBtn:    { borderRadius:borderRadius.full, height:52, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10 },
  ctaTxt:    { color:'#fff', fontSize:fonts.sizes.lg, fontWeight:'800' },
});
