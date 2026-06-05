// features/rides/screens/RideDetailScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../../../core/store/index';

import { useTheme } from '../../../core/theme/ThemeContext';

const UNIVERSITIES = [
  { id: 'webster', label: 'Webster University',          color: '#8E44AD', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://webster.edu&size=128' } },
  { id: 'slu',     label: 'Saint Louis University',      color: '#C0392B', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slu.edu&size=128' } },
  { id: 'umsl',    label: 'Univ. of Missouri–St. Louis', color: '#C8102E', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://umsl.edu&size=128' } },
  { id: 'washu',   label: 'Washington University',       color: '#117A65', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wustl.edu&size=128' } },
];

const CATEGORY_META = {
  airport:    { icon: 'airplane',         color: '#3498DB', label: 'Airport Carpool' },
  university: { icon: 'school',           color: '#8E44AD', label: 'University Carpool' },
  temple:     { icon: 'partly-sunny-outline', color: '#E67E22', label: 'Religious Centers Carpool' },
  general:    { icon: 'car-sport',        color: '#2ECC71', label: 'Carpool' },
};

const REQUEST_META = {
  airport:    { label: 'Need Airport Ride' },
  university: { label: 'Need University Ride' },
  temple:     { label: 'Need Ride to Religious Centre' },
  general:    { label: 'Need a Seat' },
};

export default function RideDetailScreen({ route, navigation }) {
  const { ride } = route.params;
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const isDriver = user?.id === ride.driver_id;
  const isRequest = ride.ride_type === 'request';
  const isRequester = user?.id === ride.requester_id;
  const rideDate = new Date(ride.ride_date);
  const isToday = new Date().toDateString() === rideDate.toDateString();
  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === rideDate.toDateString();
  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : rideDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const catMeta = CATEGORY_META[ride.category] || CATEGORY_META.general;
  const accent = isRequest ? '#9B59B6' : catMeta.color;
  const uniData = ride.category === 'university' ? UNIVERSITIES.find(u => u.id === ride.university) : null;
  const bannerLabel = isRequest
    ? (REQUEST_META[ride.category]?.label || 'Need a Seat')
    : (uniData ? uniData.label : catMeta.label);

  async function handleMessage() {
    try {
      const { getOrCreateConversation } = require('../../../features/messages/services/messagesService');
      const otherUserId = isRequest ? ride.requester_id : ride.driver_id;
      const conversation = await getOrCreateConversation(user.id, otherUserId);
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: { conversation, otherProfile: { full_name: isRequest ? 'Rider' : 'Driver' } },
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open chat. Please try again.');
    }
  }

  async function handleDeleteRide() {
    Alert.alert(
      isRequest ? 'Delete Request' : 'Delete Ride',
      'Are you sure you want to delete this? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteRide } = require('../services/ridesService');
              await deleteRide(ride.id);
              Alert.alert('Deleted', 'Successfully deleted.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Could not delete. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: accent + '18' }]}>
        {uniData ? (
          <Image source={uniData.logo} style={styles.bannerUniLogo} resizeMode="contain" />
        ) : (
          <View style={[styles.bannerIconWrap, { backgroundColor: accent + '25' }]}>
            <Ionicons name={catMeta.icon} size={36} color={accent} />
          </View>
        )}
        <Text style={[styles.bannerLabel, { color: accent }]}>{bannerLabel}</Text>
        <View style={[styles.typePill, { backgroundColor: accent }]}>
          <Ionicons
            name={isRequest ? 'hand-left' : 'car-sport'}
            size={12}
            color="#fff"
            style={{ marginRight: 5 }}
          />
          <Text style={styles.typePillText}>{isRequest ? 'Need a Seat' : 'Offering Seat'}</Text>
        </View>
      </View>

      <View style={styles.content}>

        {/* Route Card */}
        <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.routeRow}>
            <View style={styles.routeIndicator}>
              <View style={[styles.dotFilled, { backgroundColor: '#2ECC71' }]} />
              <View style={[styles.routeDash, { backgroundColor: colors.border }]} />
              <View style={[styles.dotRing, { borderColor: accent }]} />
            </View>
            <View style={styles.routeLabels}>
              <View style={styles.routeStop}>
                <Text style={[styles.stopTag, { color: colors.textLight }]}>FROM</Text>
                <Text style={[styles.stopText, { color: colors.textPrimary }]}>{ride.from_location}</Text>
              </View>
              <View style={{ height: 18 }} />
              <View style={styles.routeStop}>
                <Text style={[styles.stopTag, { color: colors.textLight }]}>TO</Text>
                <Text style={[styles.stopText, { color: colors.textPrimary }]}>{ride.to_location}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          {[
            { icon: 'calendar-clear-outline', label: 'Date', value: dateLabel, color: '#3498DB' },
            { icon: 'time-outline',           label: 'Time', value: timeLabel, color: '#9B59B6' },
            {
              icon: isRequest ? 'people-outline' : 'person-outline',
              label: isRequest ? 'People' : 'Seats',
              value: isRequest
                ? `${ride.seats_available} ${ride.seats_available === 1 ? 'person' : 'people'}`
                : `${ride.seats_available} seat${ride.seats_available > 1 ? 's' : ''}`,
              color: '#2ECC71',
            },
            { icon: 'chatbubble-ellipses-outline', label: 'Cost', value: 'Via chat', color: '#E67E22' },
          ].map((d) => (
            <View key={d.label} style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: d.color + '18' }]}>
                <Ionicons name={d.icon} size={18} color={d.color} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>{d.label}</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Community notice */}
        <View style={[styles.noticeCard, { backgroundColor: colors.infoBackground, borderColor: colors.info + '30' }]}>
          <View style={[styles.noticeIconWrap, { backgroundColor: colors.info + '20' }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
          </View>
          <Text style={[styles.noticeText, { color: colors.secondary }]}>
            Community carpool — drivers and riders are encouraged to discuss sharing costs and any other details privately via chat
          </Text>
        </View>

        {/* Notes */}
        {ride.notes && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {isRequest ? 'Rider Notes' : 'Driver Notes'}
            </Text>
            <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={16} color={colors.textLight} style={{ marginBottom: 6 }} />
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{ride.notes}</Text>
            </View>
          </>
        )}

        {/* Connect button — non owners */}
        {!isDriver && !isRequester && (
          <>
            <TouchableOpacity
              style={[styles.messageButton, { backgroundColor: accent }]}
              onPress={handleMessage}
              activeOpacity={0.85}
            >
              <View style={styles.messageButtonInner}>
                <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                <Text style={styles.messageButtonText}>
                  {isRequest ? 'Connect with Rider' : 'Connect with Driver'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Owner badge + actions */}
        {(isDriver && !isRequest) || (isRequester && isRequest) ? (
          <>
            <View style={[styles.ownerBadge, {
              backgroundColor: isRequest ? '#F5EEF8' : colors.successBackground,
              borderColor: isRequest ? '#9B59B6' + '30' : '#2ECC71' + '30',
            }]}>
              <Ionicons
                name={isRequest ? 'hand-left-outline' : 'car-sport-outline'}
                size={18}
                color={isRequest ? '#9B59B6' : colors.successText}
              />
              <Text style={[styles.ownerBadgeText, { color: isRequest ? '#9B59B6' : colors.successText }]}>
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
                onPress={handleDeleteRide}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* Safety Notice */}
        <View style={[styles.safetyBox, { backgroundColor: colors.warningBackground, borderColor: colors.warning + '30' }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warningText} style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={[styles.safetyText, { color: colors.warningText }]}>
            Share your ride details with a friend or family member before travelling.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { borderColor: colors.border }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.textSecondary }]}>Disclaimer</Text>
          <Text style={[styles.disclaimerText, { color: colors.textLight }]}>
            NestApp is a community platform dedicated to connecting people together. We do not organise, operate, or take responsibility for any arrangements made between members through this app. All interactions, including safety, cost, and conduct, are solely the responsibility of the individuals involved. NestApp is not liable for any loss, injury, dispute, or inconvenience arising from the use of this or any other feature. By using NestApp you agree to exercise your own judgement and due caution in all community interactions.
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Banner
  banner: { paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  bannerUniLogo: { width: 64, height: 64, borderRadius: 14 },
  bannerIconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bannerLabel: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  typePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  typePillText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  content: { padding: 16 },

  // Route card
  routeCard: { borderRadius: 16, padding: 18, borderWidth: 0.5, marginBottom: 14 },
  routeRow: { flexDirection: 'row', gap: 14 },
  routeIndicator: { width: 16, alignItems: 'center', paddingTop: 6 },
  dotFilled: { width: 12, height: 12, borderRadius: 6 },
  dotRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, backgroundColor: 'transparent' },
  routeDash: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  routeLabels: { flex: 1 },
  routeStop: { gap: 2 },
  stopTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  stopText: { fontSize: 16, fontWeight: '600' },

  // Details grid
  detailsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  detailCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 0.5, gap: 5 },
  detailIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 10, fontWeight: '500' },
  detailValue: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Notice
  noticeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 0.5, marginBottom: 18, gap: 12 },
  noticeIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },

  // Notes
  notesCard: { borderRadius: 14, padding: 14, borderWidth: 0.5, marginBottom: 18 },
  notesText: { fontSize: 14, lineHeight: 21 },

  // Message button
  messageButton: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 10 },
  messageButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  messageButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Privacy notice

  // Owner badge
  ownerBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, gap: 10, borderWidth: 0.5 },
  ownerBadgeText: { flex: 1, fontWeight: '600', fontSize: 14 },

  // Owner actions
  ownerActions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 13, borderWidth: 0.5 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },

  // Safety
  safetyBox: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, padding: 14, borderWidth: 0.5, marginBottom: 14 },
  safetyText: { flex: 1, fontSize: 13, lineHeight: 19 },
  disclaimer: { borderTopWidth: 0.5, paddingTop: 16, marginBottom: 30 },
  disclaimerTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  disclaimerText: { fontSize: 11, lineHeight: 17 },
});
