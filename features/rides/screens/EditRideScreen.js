// features/rides/screens/EditRideScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { updateRide } from '../services/ridesService';
import { useTheme } from '../../../core/theme/ThemeContext';
import { DatePicker, TimePicker } from '../../../core/components/DateTimePicker';

const CATEGORIES = [
  { id: 'airport', label: 'Airport', emoji: '✈️' },
  { id: 'university', label: 'University', emoji: '🎓' },
  { id: 'temple', label: 'Temple', emoji: '🛕' },
  { id: 'general', label: 'General', emoji: '🚗' },
];

export default function EditRideScreen({ route, navigation }) {
  const { ride } = route.params;
  const colors = useTheme();
  const isRequest = ride.ride_type === 'request';

  const existingDate = new Date(ride.ride_date);

  const [fromLocation, setFromLocation] = useState(ride.from_location || '');
  const [toLocation, setToLocation] = useState(ride.to_location || '');
  const [rideDate, setRideDate] = useState(existingDate);
  const [rideTime, setRideTime] = useState(existingDate);
  const [seats, setSeats] = useState(ride.seats_available?.toString() || '1');
  const [costShare, setCostShare] = useState(ride.cost_share?.toString() || '');
  const [category, setCategory] = useState(ride.category || null);
  const [notes, setNotes] = useState(ride.notes || '');
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
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

    setLoading(true);
    try {
      await updateRide(ride.id, {
        from_location: fromLocation,
        to_location: toLocation,
        ride_date: combinedDateTime.toISOString(),
        seats_available: parseInt(seats) || 1,
        cost_share: costShare ? parseFloat(costShare) : null,
        category,
        notes,
      });
      Alert.alert(
        'Updated!',
        isRequest ? 'Your ride request has been updated.' : 'Your ride has been updated.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not update. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>

        {/* Type Badge */}
        <View style={[styles.typeBadge, {
          backgroundColor: isRequest ? '#F5EEF8' : colors.successBackground,
        }]}>
          <Text style={[styles.typeBadgeText, {
            color: isRequest ? '#9B59B6' : colors.successText,
          }]}>
            {isRequest ? '🙋 Editing Ride Request' : '🚗 Editing Ride Offer'}
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
              <Text style={[styles.categoryLabel, {
                color: category === cat.id ? '#27AE60' : colors.textSecondary,
              }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* From */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>From (Pickup Location) *</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="e.g. Clayton, St. Louis"
          placeholderTextColor={colors.textLight}
          value={fromLocation}
          onChangeText={setFromLocation}
        />

        {/* To */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>To (Drop Location) *</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
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

        {/* Seats */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {isRequest ? 'Number of People' : 'Seats Available'} *
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="e.g. 2"
          placeholderTextColor={colors.textLight}
          value={seats}
          onChangeText={setSeats}
          keyboardType="numeric"
        />

        {/* Cost */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {isRequest ? 'Budget per Person (USD)' : 'Cost per Person (USD)'}
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder={isRequest ? 'Leave empty to discuss with driver' : 'e.g. 15'}
          placeholderTextColor={colors.textLight}
          value={costShare}
          onChangeText={setCostShare}
          keyboardType="numeric"
        />

        {/* Notes */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="Any extra info..."
          placeholderTextColor={colors.textLight}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Cash Notice */}
        <View style={[styles.cashNotice, { backgroundColor: colors.successBackground }]}>
          <Text style={[styles.cashNoticeText, { color: colors.successText }]}>
            💵 All rides are cash-based — payment directly between driver and rider
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, {
            backgroundColor: isRequest ? '#9B59B6' : '#2ECC71',
          }]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, paddingBottom: 40 },
  typeBadge: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadgeText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  categoryEmoji: { fontSize: 20, marginBottom: 4 },
  categoryLabel: { fontSize: 9, fontWeight: '500', textAlign: 'center' },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { height: 80, textAlignVertical: 'top' },
  cashNotice: { borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16 },
  cashNoticeText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  saveButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 15 },
});