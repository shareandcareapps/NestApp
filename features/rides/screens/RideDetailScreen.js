// features/rides/screens/RideDetailScreen.js
// RIDES FEATURE — Ride detail screen
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through ridesService only

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import useAppStore from '../../../core/store/index';

const categoryEmojis = {
  airport: '✈️',
  grocery: '🛒',
  temple: '🛕',
  event: '🎉',
  general: '🚗',
};

const categoryLabels = {
  airport: 'Airport Ride',
  grocery: 'Grocery Run',
  temple: 'Temple Visit',
  event: 'Event Ride',
  general: 'General Ride',
};

export default function RideDetailScreen({ route, navigation }) {
  const { ride } = route.params;
  const user = useAppStore((state) => state.user);
  const isDriver = user?.id === ride.driver_id;
  const rideDate = new Date(ride.ride_date);

  function handleCall() {
    Alert.alert(
      'Contact Driver',
      'To get the driver\'s contact, send them a message first.',
      [{ text: 'OK' }]
    );
  }

  function handleWhatsApp() {
    Alert.alert(
      'Contact Driver',
      'To get the driver\'s WhatsApp, send them a message first.',
      [{ text: 'OK' }]
    );
  }

  function handleMessage() {
    Alert.alert(
      'Coming Soon',
      'In-app messaging will be available soon!',
      [{ text: 'OK' }]
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>
          {categoryEmojis[ride.category] || '🚗'}
        </Text>
        <Text style={styles.bannerLabel}>
          {categoryLabels[ride.category] || 'Ride'}
        </Text>
      </View>

      <View style={styles.content}>

        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: '#2ECC71' }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>FROM</Text>
                <Text style={styles.routeText}>{ride.from_location}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: '#E63946' }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>TO</Text>
                <Text style={styles.routeText}>{ride.to_location}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailEmoji}>📅</Text>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {rideDate.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailEmoji}>🕐</Text>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {rideDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailEmoji}>👤</Text>
            <Text style={styles.detailLabel}>Seats</Text>
            <Text style={styles.detailValue}>
              {ride.seats_available} left
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailEmoji}>💵</Text>
            <Text style={styles.detailLabel}>Cost</Text>
            <Text style={[styles.detailValue, { color: '#27AE60' }]}>
              {ride.cost_share ? `$${ride.cost_share}` : 'Free'}
            </Text>
          </View>
        </View>

        {/* Cash Notice */}
        <View style={styles.cashNotice}>
          <Text style={styles.cashNoticeText}>
            💵 Payment is cash only — pay the driver directly
          </Text>
        </View>

        {/* Notes */}
        {ride.notes && (
          <>
            <Text style={styles.sectionTitle}>Driver Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{ride.notes}</Text>
            </View>
          </>
        )}

        {/* Contact Buttons */}
        {!isDriver && (
          <>
            <Text style={styles.sectionTitle}>Contact Driver</Text>
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#2ECC71' }]}
                onPress={handleCall}
              >
                <Text style={styles.contactButtonText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                onPress={handleWhatsApp}
              >
                <Text style={styles.contactButtonText}>💬 WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#1D3557' }]}
                onPress={handleMessage}
              >
                <Text style={styles.contactButtonText}>✉️ Message</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Driver Badge */}
        {isDriver && (
          <View style={styles.driverBadge}>
            <Text style={styles.driverBadgeText}>
              🚗 You are the driver for this ride
            </Text>
          </View>
        )}

        {/* Safety Notice */}
        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>
            🛡️ Safety tip: Share your ride details with a friend or family member before getting in.
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  banner: {
    backgroundColor: '#E8F8F0',
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  bannerEmoji: {
    fontSize: 48,
  },
  bannerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
  },
  content: {
    padding: 20,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  routeRow: {
    gap: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 9,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E0E0E0',
    marginLeft: 5,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  detailEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  cashNotice: {
    backgroundColor: '#E8F8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cashNoticeText: {
    fontSize: 13,
    color: '#27AE60',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  driverBadge: {
    backgroundColor: '#E8F8F0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  driverBadgeText: {
    color: '#27AE60',
    fontWeight: '600',
    fontSize: 14,
  },
  safetyBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    padding: 12,
  },
  safetyText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});