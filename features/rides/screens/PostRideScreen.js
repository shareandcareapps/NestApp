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
  Keyboard,
  Image,
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

const UNIVERSITIES = [
  { id: 'webster', short: 'Webster', full: 'Webster University',           color: '#8E44AD', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://webster.edu&size=128' } },
  { id: 'slu',     short: 'SLU',     full: 'Saint Louis University',       color: '#C0392B', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slu.edu&size=128' } },
  { id: 'umsl',    short: 'UMSL',    full: 'Univ. of Missouri–St. Louis',  color: '#C8102E', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://umsl.edu&size=128' } },
  { id: 'washu',   short: 'Wash U',  full: 'Washington University',        color: '#117A65', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wustl.edu&size=128' } },
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
  const [university, setUniversity] = useState(null);
  const [universityDirection, setUniversityDirection] = useState(null); // 'from' | 'to'
  const [airportDirection, setAirportDirection] = useState(null); // 'from' | 'to'
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

    if (combinedDateTime <= new Date()) {
      Alert.alert('Invalid Time', 'Please select a future date and time.');
      return;
    }

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
        university: category === 'university' ? university : null,
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
    >
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
              onPress={() => { setCategory(cat.id); setUniversity(null); setUniversityDirection(null); setAirportDirection(null); setFromLocation(''); setToLocation(''); }}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: category === cat.id ? '#27AE60' : colors.textSecondary }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* University Selector */}
        {category === 'university' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Select University *</Text>
            <View style={styles.universityGrid}>
              {UNIVERSITIES.map((uni) => (
                <TouchableOpacity
                  key={uni.id}
                  style={[styles.universityCard, {
                    backgroundColor: university === uni.id ? uni.color + '18' : colors.surface,
                    borderColor: university === uni.id ? uni.color : colors.border,
                    borderWidth: university === uni.id ? 2 : 0.5,
                  }]}
                  onPress={() => { setUniversity(uni.id); setUniversityDirection(null); setFromLocation(''); setToLocation(''); }}
                >
                  <Image source={uni.logo} style={styles.universityLogo} resizeMode="contain" />
                  <Text style={[styles.universityShort, { color: university === uni.id ? uni.color : colors.textPrimary }]}>
                    {uni.short}
                  </Text>
                  <Text style={[styles.universityFull, { color: colors.textLight }]} numberOfLines={2}>
                    {uni.full}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* University Direction Picker */}
        {category === 'university' && university && (() => {
          const uni = UNIVERSITIES.find(u => u.id === university);
          return (
            <>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Direction *</Text>
              <View style={styles.directionRow}>
                <TouchableOpacity
                  style={[styles.directionCard, {
                    backgroundColor: universityDirection === 'from' ? uni.color + '18' : colors.surface,
                    borderColor: universityDirection === 'from' ? uni.color : colors.border,
                    borderWidth: universityDirection === 'from' ? 2 : 0.5,
                  }]}
                  onPress={() => { setUniversityDirection('from'); setFromLocation(uni.short); setToLocation(''); }}
                >
                  <Text style={styles.directionEmoji}>🏫→🏠</Text>
                  <Text style={[styles.directionTitle, { color: universityDirection === 'from' ? uni.color : colors.textPrimary }]}>
                    From {uni.short}
                  </Text>
                  <Text style={[styles.directionSub, { color: colors.textLight }]}>University is pickup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.directionCard, {
                    backgroundColor: universityDirection === 'to' ? uni.color + '18' : colors.surface,
                    borderColor: universityDirection === 'to' ? uni.color : colors.border,
                    borderWidth: universityDirection === 'to' ? 2 : 0.5,
                  }]}
                  onPress={() => { setUniversityDirection('to'); setToLocation(uni.short); setFromLocation(''); }}
                >
                  <Text style={styles.directionEmoji}>🏠→🏫</Text>
                  <Text style={[styles.directionTitle, { color: universityDirection === 'to' ? uni.color : colors.textPrimary }]}>
                    To {uni.short}
                  </Text>
                  <Text style={[styles.directionSub, { color: colors.textLight }]}>University is drop-off</Text>
                </TouchableOpacity>
              </View>
            </>
          );
        })()}

        {/* Airport Direction Picker */}
        {category === 'airport' && (
          <>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Direction *</Text>
            <View style={styles.directionRow}>
              <TouchableOpacity
                style={[styles.directionCard, {
                  backgroundColor: airportDirection === 'to' ? '#1D355720' : colors.surface,
                  borderColor: airportDirection === 'to' ? colors.secondary : colors.border,
                  borderWidth: airportDirection === 'to' ? 2 : 0.5,
                }]}
                onPress={() => { setAirportDirection('to'); setToLocation('STL Lambert Airport'); setFromLocation(''); }}
              >
                <Text style={styles.directionEmoji}>🏠→✈️</Text>
                <Text style={[styles.directionTitle, { color: airportDirection === 'to' ? colors.secondary : colors.textPrimary }]}>
                  To Airport
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.directionCard, {
                  backgroundColor: airportDirection === 'from' ? '#1D355720' : colors.surface,
                  borderColor: airportDirection === 'from' ? colors.secondary : colors.border,
                  borderWidth: airportDirection === 'from' ? 2 : 0.5,
                }]}
                onPress={() => { setAirportDirection('from'); setFromLocation('STL Lambert Airport'); setToLocation(''); }}
              >
                <Text style={styles.directionEmoji}>✈️→🏠</Text>
                <Text style={[styles.directionTitle, { color: airportDirection === 'from' ? colors.secondary : colors.textPrimary }]}>
                  From Airport
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* For university/airport rides: hide everything until direction is picked */}
        {(category !== 'university' || universityDirection) &&
         (category !== 'airport'    || airportDirection) && (
          <>
            {/* From — hide if pre-filled by university/airport */}
            {!((category === 'university' && universityDirection === 'from') ||
               (category === 'airport'    && airportDirection    === 'from')) && (
              <>
                <Text style={[styles.label, { color: colors.textPrimary }]}>From (Pickup Location) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Clayton, St. Louis"
                  placeholderTextColor={colors.textLight}
                  value={fromLocation}
                  onChangeText={setFromLocation}
                />
              </>
            )}

            {/* To — hide if pre-filled by university/airport */}
            {!((category === 'university' && universityDirection === 'to') ||
               (category === 'airport'    && airportDirection    === 'to')) && (
              <>
                <Text style={[styles.label, { color: colors.textPrimary }]}>To (Drop Location) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Your neighborhood"
                  placeholderTextColor={colors.textLight}
                  value={toLocation}
                  onChangeText={setToLocation}
                />
              </>
            )}

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
          </>
        )}

        {/* Post Button */}
        <TouchableOpacity
          style={[styles.postButton, {
            backgroundColor: postType === 'offer' ? '#2ECC71' : '#9B59B6',
            opacity: (loading || (category === 'university' && !universityDirection) || (category === 'airport' && !airportDirection)) ? 0.4 : 1,
          }]}
          onPress={handlePost}
          disabled={loading || (category === 'university' && !universityDirection) || (category === 'airport' && !airportDirection)}
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
  directionRow: { flexDirection: 'row', gap: 8 },
  directionCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  directionEmoji: { fontSize: 18, marginBottom: 2 },
  directionTitle: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  directionSub: { fontSize: 9, textAlign: 'center' },
  lockedField: { borderRadius: 10, padding: 12, borderWidth: 0.5 },
  lockedFieldText: { fontSize: 15, fontWeight: '500' },
  universityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  universityCard: { width: '47%', borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  universityLogo: { width: 28, height: 28 },
  universityShort: { fontSize: 11, fontWeight: '700' },
  universityFull: { fontSize: 9, textAlign: 'center' },
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