// features/rides/screens/EditRideScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateRide } from '../services/ridesService';
import AppModal from '../../../core/components/AppModal';
import { useTheme } from '../../../core/theme/ThemeContext';
import { DatePicker, TimePicker } from '../../../core/components/DateTimePicker';
import {
  encodeLongRideNotes,
  decodeLongRideNotes,
  LUGGAGE_OPTIONS,
} from '../utils/longRideUtils';

const OFFER_COLOR    = '#1ABC9C';
const REQUEST_COLOR  = '#9B59B6';
const LONGRIDE_COLOR = '#E67E22';

const CATEGORIES = [
  { id: 'airport',    label: 'Airport',          emoji: '✈️' },
  { id: 'university', label: 'University',        emoji: '🎓' },
  { id: 'temple',     label: 'Religious Centers', emoji: '🙏' },
  { id: 'longride',   label: 'Long Ride',         emoji: '🗺️' },
  { id: 'general',    label: 'General',           emoji: '🚗' },
];

export default function EditRideScreen({ route, navigation }) {
  const { ride }    = route.params;
  const colors      = useTheme();
  const isRequest   = ride.ride_type === 'request';
  const isLongRide  = ride.category === 'longride';

  const existingDate = new Date(ride.ride_date);

  // Decode existing long ride metadata if applicable
  const existingLR = isLongRide ? decodeLongRideNotes(ride.notes) : null;

  const [fromLocation, setFromLocation] = useState(ride.from_location || '');
  const [toLocation,   setToLocation]   = useState(ride.to_location   || '');
  const [rideDate,     setRideDate]     = useState(existingDate);
  const [rideTime,     setRideTime]     = useState(existingDate);
  const [seats,        setSeats]        = useState(ride.seats_available?.toString() || '1');
  const [category,     setCategory]     = useState(ride.category || null);
  const [notes,        setNotes]        = useState(existingLR?.userNotes ?? ride.notes ?? '');
  const [loading,      setLoading]      = useState(false);
  const [modal,        setModal]        = useState({ visible: false });

  // Long ride extras — initialized from existing data
  const [lrStops,       setLrStops]       = useState(existingLR?.stops       ?? '');
  const [lrLuggage,     setLrLuggage]     = useState(existingLR?.luggage     ?? null);
  const [lrIsRoundTrip, setLrIsRoundTrip] = useState(!!existingLR?.returnDate);
  const [lrReturnDate,  setLrReturnDate]  = useState(
    existingLR?.returnDate ? new Date(existingLR.returnDate) : null
  );

  const currentIsLongRide = category === 'longride';
  const accent = isRequest ? REQUEST_COLOR : (currentIsLongRide ? LONGRIDE_COLOR : OFFER_COLOR);

  async function handleUpdate() {
    if (!fromLocation.trim()) { setModal({ visible: true, type: 'warn', emoji: '📍', title: 'Missing Info', subtitle: 'Please enter the pickup location.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!toLocation.trim())   { setModal({ visible: true, type: 'warn', emoji: '📍', title: 'Missing Info', subtitle: 'Please enter the drop-off location.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!rideDate)             { setModal({ visible: true, type: 'warn', emoji: '📅', title: 'Missing Info', subtitle: 'Please select a date.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!rideTime)             { setModal({ visible: true, type: 'warn', emoji: '⏰', title: 'Missing Info', subtitle: 'Please select a time.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!category)             { setModal({ visible: true, type: 'warn', emoji: '🚗', title: 'Missing Info', subtitle: 'Please select a ride category.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (currentIsLongRide && !isRequest && !lrLuggage) { setModal({ visible: true, type: 'warn', emoji: '🧳', title: 'Missing Info', subtitle: 'Please indicate luggage space available.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }

    const combinedDateTime = new Date(
      rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate(),
      rideTime.getHours(), rideTime.getMinutes(),
    );
    if (combinedDateTime <= new Date()) {
      setModal({ visible: true, type: 'warn', emoji: '⏰', title: 'Invalid Time', subtitle: 'Please select a future date and time.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) });
      return;
    }

    let finalNotes = notes.trim();
    if (currentIsLongRide) {
      finalNotes = encodeLongRideNotes({
        stops:      lrStops,
        luggage:    !isRequest ? lrLuggage : null,
        returnDate: lrIsRoundTrip && lrReturnDate
          ? lrReturnDate.toISOString().split('T')[0]
          : null,
        userNotes: notes,
      });
    }

    setLoading(true);
    try {
      await updateRide(ride.id, {
        from_location:   fromLocation.trim(),
        to_location:     toLocation.trim(),
        ride_date:       combinedDateTime.toISOString(),
        seats_available: parseInt(seats) || 1,
        category,
        notes:           finalNotes,
      });
      setModal({
        visible:      true,
        type:         'success',
        emoji:        '✏️',
        title:        'Updated!',
        subtitle:     isRequest ? 'Your ride request has been updated.' : 'Your ride offer has been updated.',
        primaryLabel: 'Done',
        onPrimary:    () => { setModal({ visible: false }); navigation.goBack(); },
      });
    } catch (err) {
      setModal({
        visible:      true,
        type:         'error',
        emoji:        '😕',
        title:        'Could Not Save',
        subtitle:     'Something went wrong. Please try again.',
        primaryLabel: 'OK',
        onPrimary:    () => setModal({ visible: false }),
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>

          {/* Type badge */}
          <View style={[styles.typeBadge, {
            backgroundColor: accent + '14',
            borderColor:     accent + '35',
          }]}>
            <Ionicons
              name={isRequest ? 'hand-left-outline' : (currentIsLongRide ? 'map-outline' : 'car-sport-outline')}
              size={16}
              color={accent}
            />
            <Text style={[styles.typeBadgeText, { color: accent }]}>
              {isRequest ? 'Editing Ride Request' : (currentIsLongRide ? 'Editing Long Ride' : 'Editing Ride Offer')}
            </Text>
          </View>

          {/* Ride Type */}
          <Label text="Ride Type" required />
          <View style={styles.catRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              const catAccent = cat.id === 'longride' ? LONGRIDE_COLOR : (isRequest ? REQUEST_COLOR : OFFER_COLOR);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCard, {
                    backgroundColor: active ? catAccent + '14' : colors.surface,
                    borderColor:     active ? catAccent : colors.border,
                    borderWidth:     active ? 2 : 0.5,
                  }]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, { color: active ? catAccent : colors.textSecondary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* From */}
          <Label text={currentIsLongRide ? 'Origin City / State' : 'Pickup Location'} required />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder={currentIsLongRide ? 'e.g. St. Louis, MO' : 'e.g. Clayton, St. Louis'}
            placeholderTextColor={colors.textLight}
            value={fromLocation}
            onChangeText={setFromLocation}
          />

          {/* To */}
          <Label text={currentIsLongRide ? 'Destination City / State' : 'Drop-off Location'} required />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder={currentIsLongRide ? 'e.g. Chicago, IL' : 'e.g. Chesterfield, St. Louis'}
            placeholderTextColor={colors.textLight}
            value={toLocation}
            onChangeText={setToLocation}
          />

          {/* Long ride: stops */}
          {currentIsLongRide && (
            <>
              <Label text="Intermediate Stops (optional)" />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Springfield, IL; Bloomington, IL"
                placeholderTextColor={colors.textLight}
                value={lrStops}
                onChangeText={setLrStops}
              />
              <Text style={[styles.fieldHint, { color: colors.textLight }]}>
                Separate cities with semicolons.
              </Text>
            </>
          )}

          {/* Date & Time row */}
          <View style={styles.dateTimeRow}>
            <View style={{ flex: 1 }}>
              <Label text="Date" required />
              <DatePicker value={rideDate} onChange={setRideDate} label="date" />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="Time" required />
              <TimePicker value={rideTime} onChange={setRideTime} label="time" />
            </View>
          </View>

          {/* Long ride: round trip */}
          {currentIsLongRide && (
            <>
              <Label text="Return Trip?" />
              <View style={styles.toggleRow}>
                {[
                  { id: false, label: '→ One Way',     emoji: '➡️' },
                  { id: true,  label: '↔ Round Trip',  emoji: '🔄' },
                ].map((opt) => {
                  const active = lrIsRoundTrip === opt.id;
                  return (
                    <TouchableOpacity
                      key={String(opt.id)}
                      style={[styles.toggleBtn, {
                        backgroundColor: active ? LONGRIDE_COLOR + '14' : colors.surface,
                        borderColor:     active ? LONGRIDE_COLOR : colors.border,
                        borderWidth:     active ? 2 : 0.5,
                      }]}
                      onPress={() => { setLrIsRoundTrip(opt.id); if (!opt.id) setLrReturnDate(null); }}
                    >
                      <Text style={styles.toggleEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.toggleLabel, { color: active ? LONGRIDE_COLOR : colors.textSecondary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {lrIsRoundTrip && (
                <>
                  <Label text="Return Date" required />
                  <DatePicker value={lrReturnDate} onChange={setLrReturnDate} label="return date" />
                </>
              )}
            </>
          )}

          {/* Seats */}
          <Label text={isRequest ? 'Number of People' : 'Seats Available'} required />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="e.g. 2"
            placeholderTextColor={colors.textLight}
            value={seats}
            onChangeText={setSeats}
            keyboardType="numeric"
            maxLength={2}
          />

          {/* Long ride: luggage (driver only) */}
          {currentIsLongRide && !isRequest && (
            <>
              <Label text="Luggage Space" required />
              <View style={styles.luggageRow}>
                {LUGGAGE_OPTIONS.map((opt) => {
                  const active = lrLuggage === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.luggageCard, {
                        backgroundColor: active ? LONGRIDE_COLOR + '14' : colors.surface,
                        borderColor:     active ? LONGRIDE_COLOR : colors.border,
                        borderWidth:     active ? 2 : 0.5,
                      }]}
                      onPress={() => setLrLuggage(opt.id)}
                    >
                      <Ionicons name={opt.icon} size={22} color={active ? LONGRIDE_COLOR : colors.textLight} />
                      <Text style={[styles.luggageLabel, { color: active ? LONGRIDE_COLOR : colors.textSecondary }]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.luggageDesc, { color: colors.textLight }]}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Cost info notice */}
          <View style={[styles.noticeRow, { backgroundColor: colors.infoBackground }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.secondary} style={{ marginTop: 1 }} />
            <Text style={[styles.noticeText, { color: colors.secondary }]}>
              Cost sharing is arranged privately via chat between driver and rider.
            </Text>
          </View>

          {/* Notes */}
          <Label text="Notes (optional)" />
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder={currentIsLongRide ? 'Departure point, parking spot, special instructions…' : 'Any extra info…'}
            placeholderTextColor={colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent }]}
            onPress={handleUpdate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <AppModal
        visible={!!modal.visible}
        type={modal.type}
        emoji={modal.emoji}
        title={modal.title}
        subtitle={modal.subtitle}
        primaryLabel={modal.primaryLabel}
        onPrimary={modal.onPrimary}
        secondaryLabel={modal.secondaryLabel}
        onSecondary={modal.onSecondary}
      />
    </KeyboardAvoidingView>
  );
}

function Label({ text, required }) {
  return (
    <Text style={styles.label}>
      {text}{required && <Text style={{ color: '#E63946' }}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, paddingBottom: 50 },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 4,
  },
  typeBadgeText: { fontSize: 14, fontWeight: '700' },

  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 18, marginBottom: 8 },
  fieldHint: { fontSize: 11, marginTop: 4, lineHeight: 16 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: { width: '30%', borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  catEmoji: { fontSize: 20 },
  catLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  dateTimeRow: { flexDirection: 'row', gap: 10 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  toggleEmoji: { fontSize: 20 },
  toggleLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  luggageRow: { flexDirection: 'row', gap: 8 },
  luggageCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  luggageLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  luggageDesc:  { fontSize: 10, textAlign: 'center', lineHeight: 13 },

  input: { borderRadius: 10, padding: 13, fontSize: 15, borderWidth: 0.5 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  noticeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 10, padding: 12, marginTop: 8,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 14, paddingVertical: 16, marginTop: 26,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { fontSize: 15 },
});
