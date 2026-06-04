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
import { DatePicker, TimePicker } from '../../../core/components/DateTimePicker';
import { useTheme } from '../../../core/theme/ThemeContext';

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
  const [rideDate, setRideDate] = useState(null);
  const [rideTime, setRideTime] = useState(null);
  const [seats, setSeats] = useState('1');
  const [peopleCount, setPeopleCount] = useState('1');
  const [costShare, setCostShare] = useState('');
  const [pricingType, setPricingType] = useState('per_mile');
  const [totalMiles, setTotalMiles] = useState('');
  const [category, setCategory] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useAppStore((state) => state.user);
  const colors = useTheme();

  function calculateCostPerPerson() {
    if (pricingType === 'per_mile' && totalMiles && seats) {
      return (parseFloat(totalMiles) / parseInt(seats)).toFixed(2);
    }
    return null;
  }

  async function handlePost() {
    if (!fromLocation) { Alert.alert('Error', 'Please enter pickup location'); return; }
    if (!toLocation) { Alert.alert('Error', 'Please enter drop location'); return; }
    if (!rideDate) { Alert.alert('Error', 'Please select a date'); return; }
    if (!rideTime) { Alert.alert('Error', 'Please select a time'); return; }
    if (!category) { Alert.alert('Error', 'Please select a ride type'); return; }

    const combinedDateTime = new Date(
      rideDate.getFullYear(),
      rideDate.getMonth(),
      rideDate.getDate(),
      rideTime.getHours(),
      rideTime.getMinutes(),
    );

    let finalCost = null;
    if (pricingType === 'per_mile' && totalMiles && seats) {
      finalCost = parseFloat((parseFloat(totalMiles) / parseInt(seats)).toFixed(2));
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
        seats_available: postType === 'offer' ? parseInt(seats) || 1 : parseInt(peopleCount) || 1,
        cost_share: finalCost,
        category,
        notes,
        is_active: true,
      });
      Alert.alert(
        postType === 'offer' ? 'Ride Posted!' : 'Request Posted!',
        postType === 'offer' ? 'Your ride offer has been posted.' : 'Your ride request has been posted. Drivers will contact you.',
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>

        {/* Post Type */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>I am a... *</Text>
        <View style={styles.postTypeRow}>
          <TouchableOpacity
            style={[styles.postTypeCard, {
              backgroundColor: colors.surface,
              borderColor: postType === 'offer' ? '#2ECC71' : colors.border,
              borderWidth: postType === 'offer' ? 2 : 0.5,
              backgroundColor: postType === 'offer' ? colors.successBackground : colors.surface,
            }]}
            onPress={() => setPostType('offer')}
          >
            <Text style={styles.postTypeEmoji}>🚗</Text>
            <Text style={[styles.postTypeLabel, { color: postType === 'offer' ? '#27AE60' : colors.textSecondary }]}>
              Driver
            </Text>
            <Text style={[styles.postTypeSubLabel, { color: colors.textLight }]}>I have seats available</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.postTypeCard, {
              borderColor: postType === 'request' ? '#9B59B6' : colors.border,
              borderWidth: postType === 'request' ? 2 : 0.5,
              backgroundColor: postType === 'request' ? '#F5EEF8' : colors.surface,
            }]}
            onPress={() => setPostType('request')}
          >
            <Text style={styles.postTypeEmoji}>🙋</Text>
            <Text style={[styles.postTypeLabel, { color: postType === 'request' ? '#9B59B6' : colors.textSecondary }]}>
              Rider
            </Text>
            <Text style={[styles.postTypeSubLabel, { color: colors.textLight }]}>I need a ride</Text>
          </TouchableOpacity>
        </View>

        {/* Cash Notice */}
        <View style={[styles.cashNotice, { backgroundColor: colors.successBackground }]}>
          <Text style={[styles.cashNoticeText, { color: colors.successText }]}>
            💵 All rides are cash-based — payment directly between driver and rider
          </Text>
        </View>

        {/* Ride Type */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Ride Type *</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, {
                backgroundColor: category === cat.id ? colors.successBackground : colors.surface,
                borderColor: category === cat.id ? '#2ECC71' : colors.border,
                borderWidth: category === cat.id ? 2 : 0.5,
              }]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: category === cat.id ? '#27AE60' : colors.textSecondary }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* From */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>From (Pickup Location) *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="e.g. Clayton, St. Louis"
          placeholderTextColor={colors.textLight}
          value={fromLocation}
          onChangeText={setFromLocation}
        />

        {/* To */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>To (Drop Location) *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="e.g. STL Lambert Airport"
          placeholderTextColor={colors.textLight}
          value={toLocation}
          onChangeText={setToLocation}
        />

        {/* Date Picker */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Date *</Text>
        <DatePicker value={rideDate} onChange={setRideDate} label="date" />

        {/* Time Picker */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Time *</Text>
        <TimePicker value={rideTime} onChange={setRideTime} label="time" />

        {/* Seats — drivers only */}
        {postType === 'offer' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Seats Available *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. 2"
              placeholderTextColor={colors.textLight}
              value={seats}
              onChangeText={setSeats}
              keyboardType="numeric"
            />
          </>
        )}

        {/* People Count — riders only */}
        {postType === 'request' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Number of People *</Text>
            <View style={styles.peopleRow}>
              {['1', '2', '3', '4', '5', '6'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.peopleCard, {
                    backgroundColor: peopleCount === num ? '#F5EEF8' : colors.surface,
                    borderColor: peopleCount === num ? '#9B59B6' : colors.border,
                    borderWidth: peopleCount === num ? 2 : 0.5,
                  }]}
                  onPress={() => setPeopleCount(num)}
                >
                  <Text style={styles.peopleEmoji}>
                    {num === '1' ? '🧑' : num === '2' ? '👥' : '👨‍👩‍👧'}
                  </Text>
                  <Text style={[styles.peopleLabel, { color: peopleCount === num ? '#9B59B6' : colors.textSecondary }]}>
                    {num} {num === '1' ? 'person' : 'people'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Pricing — drivers only */}
        {postType === 'offer' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Pricing Type *</Text>
            <View style={styles.pricingRow}>
              {[
                { id: 'per_mile', emoji: '📏', label: 'Per Mile', sub: '$1/mile ÷ riders' },
                { id: 'fixed', emoji: '💵', label: 'Fixed', sub: 'Set your price' },
                { id: 'free', emoji: '🎁', label: 'Free', sub: 'No charge' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pricingCard, {
                    backgroundColor: pricingType === p.id ? colors.successBackground : colors.surface,
                    borderColor: pricingType === p.id ? '#2ECC71' : colors.border,
                    borderWidth: pricingType === p.id ? 2 : 0.5,
                  }]}
                  onPress={() => setPricingType(p.id)}
                >
                  <Text style={styles.pricingEmoji}>{p.emoji}</Text>
                  <Text style={[styles.pricingLabel, { color: pricingType === p.id ? '#27AE60' : colors.textSecondary }]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.pricingSubLabel, { color: colors.textLight }]}>{p.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {pricingType === 'per_mile' && (
              <>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Total Miles *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. 21"
                  placeholderTextColor={colors.textLight}
                  value={totalMiles}
                  onChangeText={setTotalMiles}
                  keyboardType="numeric"
                />
                {totalMiles && seats ? (
                  <View style={[styles.calculationBox, { backgroundColor: colors.successBackground }]}>
                    <Text style={[styles.calculationText, { color: colors.successText }]}>
                      📏 {totalMiles} miles × $1 = ${totalMiles} total
                    </Text>
                    <Text style={[styles.calculationResult, { color: colors.successText }]}>
                      💵 ${calculateCostPerPerson()} per person
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {pricingType === 'fixed' && (
              <>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Cost per Person (USD) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. 15"
                  placeholderTextColor={colors.textLight}
                  value={costShare}
                  onChangeText={setCostShare}
                  keyboardType="numeric"
                />
              </>
            )}
          </>
        )}

        {/* Budget — riders only */}
        {postType === 'request' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Your Budget per Person (USD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. 15 (leave empty to discuss with driver)"
              placeholderTextColor={colors.textLight}
              value={costShare}
              onChangeText={setCostShare}
              keyboardType="numeric"
            />
            <View style={[styles.infoBox, { backgroundColor: colors.infoBackground }]}>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                💡 Leave budget empty if you want to discuss price with the driver directly.
              </Text>
            </View>
          </>
        )}

        {/* Notes */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder={postType === 'offer' ? 'Any extra info for riders...' : 'Any info for drivers... ex. I have a lot of luggage'}
          placeholderTextColor={colors.textLight}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Post Button */}
        <TouchableOpacity
          style={[styles.postButton, { backgroundColor: postType === 'offer' ? '#2ECC71' : '#9B59B6' }]}
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
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  postTypeRow: { flexDirection: 'row', gap: 10 },
  postTypeCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  postTypeEmoji: { fontSize: 28, marginBottom: 6 },
  postTypeLabel: { fontSize: 14, fontWeight: '600' },
  postTypeSubLabel: { fontSize: 11, marginTop: 3, textAlign: 'center' },
  cashNotice: { borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16 },
  cashNoticeText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  categoryEmoji: { fontSize: 20, marginBottom: 4 },
  categoryLabel: { fontSize: 9, fontWeight: '500', textAlign: 'center' },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { height: 80, textAlignVertical: 'top' },
  peopleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  peopleCard: { width: '30%', borderRadius: 10, padding: 10, alignItems: 'center' },
  peopleEmoji: { fontSize: 20, marginBottom: 4 },
  peopleLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  pricingRow: { flexDirection: 'row', gap: 8 },
  pricingCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  pricingEmoji: { fontSize: 20, marginBottom: 4 },
  pricingLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  pricingSubLabel: { fontSize: 9, textAlign: 'center', marginTop: 2 },
  calculationBox: { borderRadius: 10, padding: 12, marginTop: 8, gap: 4 },
  calculationText: { fontSize: 13 },
  calculationResult: { fontSize: 15, fontWeight: '700' },
  infoBox: { borderRadius: 10, padding: 12, marginTop: 8 },
  infoText: { fontSize: 13, lineHeight: 18 },
  postButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 24 },
  postButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 15 },
});