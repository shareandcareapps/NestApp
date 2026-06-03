// features/rides/screens/PostRideScreen.js
// RIDES FEATURE — Post a ride screen
// Supports Driver Offer and Rider Request
// GOLDEN RULE 1: Never imports from other features
// GOLDEN RULE 3: All data calls go through ridesService only

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createRide } from '../services/ridesService';
import useAppStore from '../../../core/store/index';

// ─── Category Config ───────────────────────────
const CATEGORIES = [
  { id: 'airport', label: 'Airport', emoji: '✈️' },
  { id: 'university', label: 'University', emoji: '🎓' },
  { id: 'temple', label: 'Temple', emoji: '🛕' },
  { id: 'general', label: 'General', emoji: '🚗' },
];

export default function PostRideScreen({ navigation }) {
  const [postType, setPostType] = useState('offer');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');
  const [seats, setSeats] = useState('1');
  const [costShare, setCostShare] = useState('');
  const [pricingType, setPricingType] = useState('per_mile');
  const [totalMiles, setTotalMiles] = useState('');
  const [category, setCategory] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useAppStore((state) => state.user);

  function calculateCostPerPerson() {
    if (pricingType === 'per_mile' && totalMiles && seats) {
      return (parseFloat(totalMiles) / parseInt(seats)).toFixed(2);
    }
    return null;
  }

  async function handlePost() {
    if (!fromLocation) {
      Alert.alert('Error', 'Please enter pickup location');
      return;
    }
    if (!toLocation) {
      Alert.alert('Error', 'Please enter drop location');
      return;
    }
    if (!rideDate || !rideTime) {
      Alert.alert('Error', 'Please enter date and time');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a ride type');
      return;
    }

    const combinedDateTime = new Date(`${rideDate}T${rideTime}`);
    if (isNaN(combinedDateTime.getTime())) {
      Alert.alert('Error', 'Please enter valid date (YYYY-MM-DD) and time (HH:MM)');
      return;
    }

    // Calculate final cost
    let finalCost = null;
    if (pricingType === 'per_mile' && totalMiles && seats) {
      finalCost = parseFloat(
        (parseFloat(totalMiles) / parseInt(seats)).toFixed(2)
      );
    } else if (pricingType === 'fixed' && costShare) {
      finalCost = parseFloat(costShare);
    }

    setLoading(true);
    try {
      await createRide({
        driver_id: postType === 'offer' ? user.id : null,
        requester_id: postType === 'request' ? user.id : null,
        ride_type: postType,
        from_location: fromLocation,
        to_location: toLocation,
        ride_date: combinedDateTime.toISOString(),
        seats_available: parseInt(seats) || 1,
        cost_share: finalCost,
        category,
        notes,
        is_active: true,
      });
      Alert.alert(
        postType === 'offer' ? 'Ride Posted!' : 'Request Posted!',
        postType === 'offer'
          ? 'Your ride offer has been posted.'
          : 'Your ride request has been posted. Drivers will contact you.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to post. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>

        {/* Post Type — Driver or Rider */}
        <Text style={styles.label}>I am a... *</Text>
        <View style={styles.postTypeRow}>
          <TouchableOpacity
            style={[
              styles.postTypeCard,
              postType === 'offer' && styles.postTypeCardActive,
            ]}
            onPress={() => setPostType('offer')}
          >
            <Text style={styles.postTypeEmoji}>🚗</Text>
            <Text style={[
              styles.postTypeLabel,
              postType === 'offer' && styles.postTypeLabelActive,
            ]}>Driver</Text>
            <Text style={styles.postTypeSubLabel}>
              I have seats available
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.postTypeCard,
              postType === 'request' && styles.postTypeCardActiveRequest,
            ]}
            onPress={() => setPostType('request')}
          >
            <Text style={styles.postTypeEmoji}>🙋</Text>
            <Text style={[
              styles.postTypeLabel,
              postType === 'request' && styles.postTypeLabelActiveRequest,
            ]}>Rider</Text>
            <Text style={styles.postTypeSubLabel}>
              I need a ride
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cash Notice */}
        <View style={styles.cashNotice}>
          <Text style={styles.cashNoticeText}>
            💵 All rides are cash-based — payment directly between driver and rider
          </Text>
        </View>

        {/* Ride Type */}
        <Text style={styles.label}>Ride Type *</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                category === cat.id && styles.categoryCardActive,
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[
                styles.categoryLabel,
                category === cat.id && styles.categoryLabelActive,
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* From */}
        <Text style={styles.label}>From (Pickup Location) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Clayton, St. Louis"
          placeholderTextColor="#999"
          value={fromLocation}
          onChangeText={setFromLocation}
        />

        {/* To */}
        <Text style={styles.label}>To (Drop Location) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. STL Lambert Airport"
          placeholderTextColor="#999"
          value={toLocation}
          onChangeText={setToLocation}
        />

        {/* Date */}
        <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2026-06-10"
          placeholderTextColor="#999"
          value={rideDate}
          onChangeText={setRideDate}
        />

        {/* Time */}
        <Text style={styles.label}>Time * (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 08:30"
          placeholderTextColor="#999"
          value={rideTime}
          onChangeText={setRideTime}
        />

        {/* Seats — only for drivers */}
        {postType === 'offer' && (
          <>
            <Text style={styles.label}>Seats Available *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2"
              placeholderTextColor="#999"
              value={seats}
              onChangeText={setSeats}
              keyboardType="numeric"
            />
          </>
        )}

        {/* Pricing — for drivers only */}
        {postType === 'offer' && (
          <>
            <Text style={styles.label}>Pricing Type *</Text>
            <View style={styles.pricingRow}>
              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  pricingType === 'per_mile' && styles.pricingCardActive,
                ]}
                onPress={() => setPricingType('per_mile')}
              >
                <Text style={styles.pricingEmoji}>📏</Text>
                <Text style={[
                  styles.pricingLabel,
                  pricingType === 'per_mile' && styles.pricingLabelActive,
                ]}>Per Mile</Text>
                <Text style={styles.pricingSubLabel}>$1/mile ÷ riders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  pricingType === 'fixed' && styles.pricingCardActive,
                ]}
                onPress={() => setPricingType('fixed')}
              >
                <Text style={styles.pricingEmoji}>💵</Text>
                <Text style={[
                  styles.pricingLabel,
                  pricingType === 'fixed' && styles.pricingLabelActive,
                ]}>Fixed</Text>
                <Text style={styles.pricingSubLabel}>Set your price</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  pricingType === 'free' && styles.pricingCardActive,
                ]}
                onPress={() => setPricingType('free')}
              >
                <Text style={styles.pricingEmoji}>🎁</Text>
                <Text style={[
                  styles.pricingLabel,
                  pricingType === 'free' && styles.pricingLabelActive,
                ]}>Free</Text>
                <Text style={styles.pricingSubLabel}>No charge</Text>
              </TouchableOpacity>
            </View>

            {/* Per Mile Input */}
            {pricingType === 'per_mile' && (
              <>
                <Text style={styles.label}>Total Miles *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 21"
                  placeholderTextColor="#999"
                  value={totalMiles}
                  onChangeText={setTotalMiles}
                  keyboardType="numeric"
                />
                {totalMiles && seats ? (
                  <View style={styles.calculationBox}>
                    <Text style={styles.calculationText}>
                      📏 {totalMiles} miles × $1 = ${totalMiles} total
                    </Text>
                    <Text style={styles.calculationResult}>
                      💵 ${calculateCostPerPerson()} per person
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {/* Fixed Price Input */}
            {pricingType === 'fixed' && (
              <>
                <Text style={styles.label}>Cost per Person (USD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 15"
                  placeholderTextColor="#999"
                  value={costShare}
                  onChangeText={setCostShare}
                  keyboardType="numeric"
                />
              </>
            )}
          </>
        )}

        {/* Budget — for riders */}
        {postType === 'request' && (
          <>
            <Text style={styles.label}>Your Budget per Person (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15 (leave empty to discuss with driver)"
              placeholderTextColor="#999"
              value={costShare}
              onChangeText={setCostShare}
              keyboardType="numeric"
            />
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Leave budget empty if you want to discuss price with the driver directly.
              </Text>
            </View>
          </>
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={
            postType === 'offer'
              ? 'Any extra info for riders...'
              : 'Any extra info for drivers...'
          }
          placeholderTextColor="#999"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Post Button */}
        <TouchableOpacity
          style={[
            styles.postButton,
            { backgroundColor: postType === 'offer' ? '#2ECC71' : '#9B59B6' }
          ]}
          onPress={handlePost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>
              {postType === 'offer' ? 'Post Ride Offer' : 'Post Ride Request'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  inner: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 16,
  },
  postTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  postTypeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  postTypeCardActive: {
    borderColor: '#2ECC71',
    borderWidth: 2,
    backgroundColor: '#E8F8F0',
  },
  postTypeCardActiveRequest: {
    borderColor: '#9B59B6',
    borderWidth: 2,
    backgroundColor: '#F5EEF8',
  },
  postTypeEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  postTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  postTypeLabelActive: {
    color: '#27AE60',
  },
  postTypeLabelActiveRequest: {
    color: '#9B59B6',
  },
  postTypeSubLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
    textAlign: 'center',
  },
  cashNotice: {
    backgroundColor: '#E8F8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  cashNoticeText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  categoryCardActive: {
    borderColor: '#2ECC71',
    borderWidth: 2,
    backgroundColor: '#E8F8F0',
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 9,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#27AE60',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    color: '#1A1A1A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pricingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  pricingCardActive: {
    borderColor: '#2ECC71',
    borderWidth: 2,
    backgroundColor: '#E8F8F0',
  },
  pricingEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  pricingLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  pricingLabelActive: {
    color: '#27AE60',
  },
  pricingSubLabel: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  calculationBox: {
    backgroundColor: '#E8F8F0',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  calculationText: {
    fontSize: 13,
    color: '#27AE60',
  },
  calculationResult: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27AE60',
  },
  infoBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1D3557',
    lineHeight: 18,
  },
  postButton: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
  },
});