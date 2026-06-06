// features/rides/screens/EditRideScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Keyboard, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import AppModal from '../../../core/components/AppModal';
import { updateRide } from '../services/ridesService';
import { useTheme } from '../../../core/theme/ThemeContext';
import { DatePicker, TimePicker } from '../../../core/components/DateTimePicker';
import { encodeLongRideNotes, decodeLongRideNotes, LUGGAGE_OPTIONS } from '../utils/longRideUtils';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';

const OFFER_COLOR    = '#00C48C';
const REQUEST_COLOR  = '#9B59B6';
const LONGRIDE_COLOR = '#F4A833';

const CATEGORIES = [
  { id: 'airport',    label: 'Airport',          emoji: '✈️' },
  { id: 'university', label: 'University',        emoji: '🎓' },
  { id: 'temple',     label: 'Religious Centers', emoji: '🙏' },
  { id: 'longride',   label: 'Long Ride',         emoji: '🗺️' },
  { id: 'general',    label: 'General',           emoji: '🚗' },
];

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, editable = true, theme }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[inpS.base, multiline && inpS.area, { backgroundColor: theme.inputBackground, borderColor: focused ? '#F4A833' : theme.border, color: theme.textPrimary }]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={theme.textLight} multiline={multiline}
      keyboardType={keyboardType || 'default'} editable={editable}
      textAlignVertical={multiline ? 'top' : 'auto'}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}
const inpS = StyleSheet.create({
  base: { borderRadius: borderRadius.md, padding: 14, fontSize: fonts.sizes.md, borderWidth: 1.5 },
  area: { minHeight: 80, textAlignVertical: 'top' },
});

export default function EditRideScreen({ route, navigation }) {
  const { ride }    = route.params;
  const theme       = useTheme();
  const insets      = useSafeAreaInsets();
  const btnScale    = useRef(new Animated.Value(1)).current;
  const isRequest   = ride.ride_type === 'request';
  const existingDate = new Date(ride.ride_date);
  const existingLR   = ride.category === 'longride' ? decodeLongRideNotes(ride.notes) : null;

  const [fromLocation, setFromLocation] = useState(ride.from_location || '');
  const [toLocation,   setToLocation]   = useState(ride.to_location   || '');
  const [rideDate,     setRideDate]     = useState(existingDate);
  const [rideTime,     setRideTime]     = useState(existingDate);
  const [seats,        setSeats]        = useState(ride.seats_available?.toString() || '1');
  const [category,     setCategory]     = useState(ride.category || null);
  const [notes,        setNotes]        = useState(existingLR?.userNotes ?? ride.notes ?? '');
  const [loading,      setLoading]      = useState(false);
  const [modal,        setModal]        = useState({ visible: false });
  const [lrStops,      setLrStops]      = useState(existingLR?.stops ?? '');
  const [lrLuggage,    setLrLuggage]    = useState(existingLR?.luggage ?? null);
  const [lrIsRoundTrip, setLrIsRoundTrip] = useState(!!existingLR?.returnDate);
  const [lrReturnDate,  setLrReturnDate]  = useState(existingLR?.returnDate ? new Date(existingLR.returnDate) : null);

  const currentIsLongRide = category === 'longride';
  const accent = isRequest ? REQUEST_COLOR : (currentIsLongRide ? LONGRIDE_COLOR : OFFER_COLOR);

  async function handleUpdate() {
    if (!fromLocation.trim()) { setModal({ visible: true, type: 'warn', emoji: '📍', title: 'Missing Info', subtitle: 'Please enter the pickup location.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!toLocation.trim())   { setModal({ visible: true, type: 'warn', emoji: '📍', title: 'Missing Info', subtitle: 'Please enter the drop-off location.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!rideDate)             { setModal({ visible: true, type: 'warn', emoji: '📅', title: 'Missing Info', subtitle: 'Please select a date.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!rideTime)             { setModal({ visible: true, type: 'warn', emoji: '⏰', title: 'Missing Info', subtitle: 'Please select a time.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (!category)             { setModal({ visible: true, type: 'warn', emoji: '🚗', title: 'Missing Info', subtitle: 'Please select a ride category.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }
    if (currentIsLongRide && !isRequest && !lrLuggage) { setModal({ visible: true, type: 'warn', emoji: '🧳', title: 'Missing Info', subtitle: 'Please indicate luggage space available.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) }); return; }

    const combinedDateTime = new Date(rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate(), rideTime.getHours(), rideTime.getMinutes());
    if (combinedDateTime <= new Date()) {
      setModal({ visible: true, type: 'warn', emoji: '⏰', title: 'Invalid Time', subtitle: 'Please select a future date and time.', primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) });
      return;
    }

    let finalNotes = notes.trim();
    if (currentIsLongRide) {
      finalNotes = encodeLongRideNotes({
        stops:      lrStops,
        luggage:    !isRequest ? lrLuggage : null,
        returnDate: lrIsRoundTrip && lrReturnDate ? lrReturnDate.toISOString().split('T')[0] : null,
        userNotes:  notes,
      });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await updateRide(ride.id, {
        from_location:   fromLocation.trim(),
        to_location:     toLocation.trim(),
        ride_date:       combinedDateTime.toISOString(),
        seats_available: parseInt(seats, 10) || 1,
        category,
        notes:           finalNotes,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Ride updated! ✅', text2: 'Your changes are now live.' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could Not Save', text2: 'Something went wrong. Please try again.' });
    } finally { setLoading(false); }
  }

  const headerGradient = isRequest ? [REQUEST_COLOR,'#6C3483'] : currentIsLongRide ? [LONGRIDE_COLOR,'#E68A00'] : [OFFER_COLOR,'#007A5E'];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={headerGradient} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{isRequest ? '🙋' : currentIsLongRide ? '🗺️' : '🚗'}</Text>
            <View>
              <Text style={styles.headerSub}>Editing</Text>
              <Text style={styles.headerTitle}>{isRequest ? 'Ride Request' : currentIsLongRide ? 'Long Ride' : 'Ride Offer'}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formCard, { backgroundColor: theme.card }]}>
          <View style={styles.formCardHeader}>
            <LinearGradient colors={headerGradient} style={styles.formAccent} start={{x:0,y:0}} end={{x:0,y:1}} />
            <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>Route Details</Text>
          </View>

          {/* Ride Type */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Ride Type</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(cat => {
              const isActive  = category === cat.id;
              const catAccent = cat.id === 'longride' ? LONGRIDE_COLOR : accent;
              return (
                <TouchableOpacity key={cat.id} onPress={() => { setCategory(cat.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.8} style={{ width: '30%' }}>
                  {isActive
                    ? <LinearGradient colors={cat.id === 'longride' ? [LONGRIDE_COLOR,'#E68A00'] : isRequest ? [REQUEST_COLOR,'#7B2FBE'] : [OFFER_COLOR,'#007A5E']} style={styles.catChip}>
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catLabel, { color: '#fff' }]}>{cat.label}</Text>
                      </LinearGradient>
                    : <View style={[styles.catChip, { backgroundColor: theme.inputBackground, borderColor: theme.border, borderWidth: 1.5 }]}>
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catLabel, { color: theme.textSecondary }]}>{cat.label}</Text>
                      </View>
                  }
                </TouchableOpacity>
              );
            })}
          </View>

          {/* From */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 16 }]}>
            {currentIsLongRide ? 'Origin City / State' : 'Pickup Location'} <Text style={{ color: '#FF6B6B' }}>*</Text>
          </Text>
          <StyledInput theme={theme} value={fromLocation} onChangeText={setFromLocation} placeholder={currentIsLongRide ? 'e.g. St. Louis, MO' : 'e.g. Clayton, St. Louis'} />

          {/* To */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {currentIsLongRide ? 'Destination City / State' : 'Drop-off Location'} <Text style={{ color: '#FF6B6B' }}>*</Text>
          </Text>
          <StyledInput theme={theme} value={toLocation} onChangeText={setToLocation} placeholder={currentIsLongRide ? 'e.g. Chicago, IL' : 'e.g. Chesterfield, St. Louis'} />

          {/* Long Ride stops */}
          {currentIsLongRide && (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Intermediate Stops</Text>
              <StyledInput theme={theme} value={lrStops} onChangeText={setLrStops} placeholder="e.g. Springfield, IL; Bloomington, IL" />
              <Text style={[styles.hint, { color: theme.textLight }]}>Separate with semicolons</Text>
            </>
          )}
        </View>

        {/* Date/Time */}
        <View style={[styles.formCard, { backgroundColor: theme.card }]}>
          <View style={styles.formCardHeader}>
            <LinearGradient colors={headerGradient} style={styles.formAccent} start={{x:0,y:0}} end={{x:0,y:1}} />
            <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>Date & Time</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
              <DatePicker value={rideDate} onChange={setRideDate} accentColor={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Time <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
              <TimePicker value={rideTime} onChange={setRideTime} accentColor={accent} />
            </View>
          </View>
          {/* Round Trip */}
          {currentIsLongRide && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Trip Type</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[{id:false,label:'One Way',icon:'arrow-forward-outline'},{id:true,label:'Round Trip',icon:'repeat-outline'}].map(opt => {
                  const isActive = lrIsRoundTrip === opt.id;
                  return (
                    <TouchableOpacity key={String(opt.id)} onPress={() => { setLrIsRoundTrip(opt.id); if (!opt.id) setLrReturnDate(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.8}
                      style={[styles.tripBtn, { flex: 1, backgroundColor: isActive ? LONGRIDE_COLOR + '15' : theme.inputBackground, borderColor: isActive ? LONGRIDE_COLOR : theme.border, borderWidth: isActive ? 2 : 1 }]}>
                      <Ionicons name={opt.icon} size={16} color={isActive ? LONGRIDE_COLOR : theme.textLight} />
                      <Text style={[{ fontSize: fonts.sizes.sm, fontWeight: isActive ? '700' : '500', color: isActive ? LONGRIDE_COLOR : theme.textSecondary }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {lrIsRoundTrip && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Return Date</Text>
                  <DatePicker value={lrReturnDate} onChange={setLrReturnDate} accentColor={LONGRIDE_COLOR} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Seats + Luggage */}
        <View style={[styles.formCard, { backgroundColor: theme.card }]}>
          <View style={styles.formCardHeader}>
            <LinearGradient colors={headerGradient} style={styles.formAccent} start={{x:0,y:0}} end={{x:0,y:1}} />
            <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>{isRequest ? 'People' : 'Seats & Luggage'}</Text>
          </View>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {isRequest ? 'Number of People' : 'Seats Available'} <Text style={{ color: '#FF6B6B' }}>*</Text>
          </Text>
          <StyledInput theme={theme} value={seats} onChangeText={setSeats} placeholder="e.g. 2" keyboardType="numeric" />

          {currentIsLongRide && !isRequest && (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 16 }]}>Luggage Space <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
              <View style={styles.luggageGrid}>
                {LUGGAGE_OPTIONS.map(opt => {
                  const isActive = lrLuggage === opt.id;
                  return (
                    <TouchableOpacity key={opt.id} onPress={() => { setLrLuggage(opt.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.8}
                      style={[styles.luggageCard, { width: '47%', backgroundColor: isActive ? LONGRIDE_COLOR + '12' : theme.inputBackground, borderColor: isActive ? LONGRIDE_COLOR : theme.border, borderWidth: isActive ? 2 : 1 }]}>
                      <View style={[styles.luggageIcon, { backgroundColor: isActive ? LONGRIDE_COLOR + '20' : theme.card }]}>
                        <Ionicons name={opt.icon} size={22} color={isActive ? LONGRIDE_COLOR : theme.textLight} />
                      </View>
                      <Text style={[{ fontSize: fonts.sizes.sm, fontWeight: '700', textAlign: 'center', color: isActive ? LONGRIDE_COLOR : theme.textPrimary }]}>{opt.label}</Text>
                      <Text style={[{ fontSize: 10, textAlign: 'center', color: theme.textLight }]}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Notes */}
        <View style={[styles.formCard, { backgroundColor: theme.card }]}>
          <View style={styles.formCardHeader}>
            <LinearGradient colors={headerGradient} style={styles.formAccent} start={{x:0,y:0}} end={{x:0,y:1}} />
            <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>Notes</Text>
            <Text style={[styles.optional, { color: theme.textLight }]}>optional</Text>
          </View>
          <StyledInput theme={theme} value={notes} onChangeText={setNotes} placeholder={currentIsLongRide ? 'Departure point, parking spot, special instructions…' : 'Any extra info…'} multiline />
          <View style={[styles.costBadge, { backgroundColor: theme.inputBackground, marginTop: 10 }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={accent} />
            <Text style={[styles.costTxt, { color: theme.textSecondary }]}>Cost sharing is arranged privately via chat.</Text>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
          onPress={handleUpdate}
          disabled={loading}
          activeOpacity={1}
        >
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <LinearGradient colors={headerGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtn}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.saveTxt}>Save Changes</Text><Ionicons name="checkmark-circle" size={18} color="#fff" /></>}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelTxt, { color: theme.textSecondary }]}>Discard Changes</Text>
        </TouchableOpacity>
      </ScrollView>

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
  header: { paddingHorizontal: spacing.md, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji: { fontSize: 26 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: fonts.sizes.xs, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.md },

  formCard: { borderRadius: borderRadius.xl, padding: 16, marginBottom: 12, ...shadows.small },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  formAccent: { width: 4, height: 22, borderRadius: 2 },
  formCardTitle: { fontSize: fonts.sizes.md, fontWeight: '800', flex: 1 },
  optional: { fontSize: 11, fontStyle: 'italic' },

  fieldLabel: { fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 11, marginTop: 5 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { borderRadius: borderRadius.lg, padding: 10, alignItems: 'center', gap: 4 },
  catEmoji: { fontSize: 20 },
  catLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  tripBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: borderRadius.md, padding: 12 },

  luggageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  luggageCard: { borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', gap: 6 },
  luggageIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },

  costBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 10 },
  costTxt: { flex: 1, fontSize: fonts.sizes.xs, lineHeight: 18 },

  saveBtn: { borderRadius: borderRadius.full, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.glow },
  saveTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelTxt: { fontSize: fonts.sizes.md },
});
