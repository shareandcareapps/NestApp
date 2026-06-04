// features/rides/screens/RideDetailScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import useAppStore from '../../../core/store/index';
import { useTheme } from '../../../core/theme/ThemeContext';

const driverCategoryEmojis = { airport: '✈️', university: '🎓', temple: '🛕', general: '🚗' };
const driverCategoryLabels = { airport: 'Airport Ride', university: 'University Ride', temple: 'Temple Ride', general: 'General Ride' };
const requestCategoryEmojis = { airport: '✈️', university: '🎓', temple: '🛕', general: '🙋' };
const requestCategoryLabels = { airport: 'Airport Request', university: 'University Request', temple: 'Temple Request', general: 'Ride Request' };

export default function RideDetailScreen({ route, navigation }) {
  const { ride } = route.params;
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const isDriver = user?.id === ride.driver_id;
  const isRequest = ride.ride_type === 'request';
  const isRequester = user?.id === ride.requester_id;
  const rideDate = new Date(ride.ride_date);
  const categoryEmojis = isRequest ? requestCategoryEmojis : driverCategoryEmojis;
  const categoryLabels = isRequest ? requestCategoryLabels : driverCategoryLabels;

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
      <View style={[styles.banner, {
        backgroundColor: isRequest ? '#F5EEF8' : colors.successBackground,
      }]}>
        <Text style={styles.bannerEmoji}>
          {categoryEmojis[ride.category] || (isRequest ? '🙋' : '🚗')}
        </Text>
        <Text style={[styles.bannerLabel, {
          color: isRequest ? '#9B59B6' : colors.successText,
        }]}>
          {categoryLabels[ride.category] || (isRequest ? 'Ride Request' : 'Ride Offer')}
        </Text>
      </View>

      <View style={styles.content}>

        {/* Route Card */}
        <View style={[styles.routeCard, {
          backgroundColor: colors.card,
          borderColor: colors.border,
        }]}>
          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <View style={styles.routeInfo}>
                <Text style={[styles.routeLabel, { color: colors.textLight }]}>FROM</Text>
                <Text style={[styles.routeText, { color: colors.textPrimary }]}>
                  {ride.from_location}
                </Text>
              </View>
            </View>
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={styles.routeInfo}>
                <Text style={[styles.routeLabel, { color: colors.textLight }]}>TO</Text>
                <Text style={[styles.routeText, { color: colors.textPrimary }]}>
                  {ride.to_location}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          {[
            { emoji: '📅', label: 'Date', value: rideDate.toLocaleDateString() },
            {
              emoji: '🕐',
              label: 'Time',
              value: rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            {
              emoji: isRequest ? '👥' : '👤',
              label: isRequest ? 'People' : 'Seats',
              value: isRequest
                ? `${ride.seats_available} ${ride.seats_available === 1 ? 'person' : 'people'}`
                : `${ride.seats_available} left`,
            },
            {
              emoji: '💵',
              label: 'Cost',
              value: ride.cost_share ? `$${ride.cost_share}/person` : isRequest ? 'Open' : 'Free',
              color: colors.successText,
            },
          ].map((detail) => (
            <View key={detail.label} style={[styles.detailCard, {
              backgroundColor: colors.card,
              borderColor: colors.border,
            }]}>
              <Text style={styles.detailEmoji}>{detail.emoji}</Text>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>{detail.label}</Text>
              <Text style={[styles.detailValue, { color: detail.color || colors.textPrimary }]}>
                {detail.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Cash Notice */}
        <View style={[styles.cashNotice, { backgroundColor: colors.successBackground }]}>
          <Text style={[styles.cashNoticeText, { color: colors.successText }]}>
            💵 Payment is cash only — pay the driver directly
          </Text>
        </View>

        {/* Notes */}
        {ride.notes && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {isRequest ? 'Rider Notes' : 'Driver Notes'}
            </Text>
            <View style={[styles.notesCard, {
              backgroundColor: colors.card,
              borderColor: colors.border,
            }]}>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{ride.notes}</Text>
            </View>
          </>
        )}

        {/* Contact Button — non owners */}
        {!isDriver && !isRequester && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {isRequest ? 'Contact Rider' : 'Contact Driver'}
            </Text>
            <TouchableOpacity
              style={[styles.messageButton, {
                backgroundColor: isRequest ? '#9B59B6' : '#2ECC71',
              }]}
              onPress={handleMessage}
            >
              <Text style={styles.messageButtonText}>💬 Send Message</Text>
            </TouchableOpacity>
            <View style={[styles.privacyNotice, {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            }]}>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                🔒 Messages are private — you can share contact details inside the chat
              </Text>
            </View>
          </>
        )}

        {/* Driver Badge + Edit + Delete */}
        {isDriver && !isRequest && (
          <>
            <View style={[styles.ownerBadge, { backgroundColor: colors.successBackground }]}>
              <Text style={[styles.ownerBadgeText, { color: colors.successText }]}>
                🚗 You are the driver for this ride
              </Text>
            </View>
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={[styles.editButton, {
                  backgroundColor: colors.infoBackground,
                  borderColor: colors.info,
                }]}
                onPress={() => navigation.navigate('EditRide', { ride })}
              >
                <Text style={[styles.editButtonText, { color: colors.info }]}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteActionButton, {
                  backgroundColor: colors.errorBackground,
                  borderColor: colors.error,
                }]}
                onPress={handleDeleteRide}
              >
                <Text style={[styles.deleteActionText, { color: colors.error }]}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Requester Badge + Edit + Delete */}
        {isRequester && isRequest && (
          <>
            <View style={[styles.ownerBadge, { backgroundColor: '#F5EEF8' }]}>
              <Text style={[styles.ownerBadgeText, { color: '#9B59B6' }]}>
                🙋 You posted this ride request
              </Text>
            </View>
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={[styles.editButton, {
                  backgroundColor: colors.infoBackground,
                  borderColor: colors.info,
                }]}
                onPress={() => navigation.navigate('EditRide', { ride })}
              >
                <Text style={[styles.editButtonText, { color: colors.info }]}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteActionButton, {
                  backgroundColor: colors.errorBackground,
                  borderColor: colors.error,
                }]}
                onPress={handleDeleteRide}
              >
                <Text style={[styles.deleteActionText, { color: colors.error }]}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Safety Notice */}
        <View style={[styles.safetyBox, { backgroundColor: colors.warningBackground }]}>
          <Text style={[styles.safetyText, { color: colors.warningText }]}>
            🛡️ Safety tip: Share your ride details with a friend or family member before getting in.
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { padding: 30, alignItems: 'center', gap: 8 },
  bannerEmoji: { fontSize: 48 },
  bannerLabel: { fontSize: 14, fontWeight: '600' },
  content: { padding: 20 },
  routeCard: { borderRadius: 12, padding: 16, borderWidth: 0.5, marginBottom: 16 },
  routeRow: { gap: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  routeText: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  routeLine: { width: 2, height: 16, marginLeft: 5 },
  detailsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  detailCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 0.5 },
  detailEmoji: { fontSize: 20, marginBottom: 4 },
  detailLabel: { fontSize: 10, marginBottom: 2 },
  detailValue: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  cashNotice: { borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
  cashNoticeText: { fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  notesCard: { borderRadius: 10, padding: 14, borderWidth: 0.5, marginBottom: 16 },
  notesText: { fontSize: 14, lineHeight: 20 },
  messageButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
  messageButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  privacyNotice: { borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 0.5 },
  privacyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  ownerBadge: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  ownerBadgeText: { fontWeight: '600', fontSize: 14 },
  ownerActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  editButton: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 0.5 },
  editButtonText: { fontSize: 14, fontWeight: '600' },
  deleteActionButton: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 0.5 },
  deleteActionText: { fontSize: 14, fontWeight: '600' },
  safetyBox: { borderRadius: 10, padding: 12 },
  safetyText: { fontSize: 12, lineHeight: 18 },
});