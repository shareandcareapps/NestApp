// features/rides/screens/PostRideScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Keyboard, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import AppModal from '../../../core/components/AppModal';
import AgeGateModal from '../../../core/components/AgeGateModal';
import { createRide } from '../services/ridesService';
import useAppStore from '../../../core/store/index';
import { awardPoints } from '../../../core/services/pointsService';
import { DatePicker, TimePicker } from '../../../core/components/DateTimePicker';
import { useTheme } from '../../../core/theme/ThemeContext';
import { encodeLongRideNotes, LUGGAGE_OPTIONS, PASSENGER_BAGS_OPTIONS } from '../utils/longRideUtils';
import { fonts, spacing, borderRadius, shadows } from '../../../core/theme/index';
import { supabase } from '../../../core/database/index';

const OFFER_COLOR    = '#00C48C';
const REQUEST_COLOR  = '#9B59B6';
const LONGRIDE_COLOR = '#F4A833';

const CATEGORIES = [
  { id: 'airport',    label: 'Airport',     emoji: '✈️',  desc: 'STL Lambert' },
  { id: 'university', label: 'University',  emoji: '🎓',  desc: 'Campus commutes' },
  { id: 'temple',     label: 'Religious',   emoji: '🙏',  desc: 'Masjid & temple' },
  { id: 'longride',   label: 'Long Ride',   emoji: '🗺️',  desc: 'Out of state / 2hr+' },
  { id: 'general',    label: 'General',     emoji: '🚗',  desc: 'Any destination' },
];

const UNIVERSITIES = [
  { id: 'webster', short: 'Webster', full: 'Webster University',          color: '#8E44AD', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://webster.edu&size=128' } },
  { id: 'slu',     short: 'SLU',     full: 'Saint Louis University',      color: '#C0392B', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slu.edu&size=128' } },
  { id: 'umsl',    short: 'UMSL',    full: 'Univ. of Missouri–St. Louis', color: '#C8102E', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://umsl.edu&size=128' } },
  { id: 'washu',   short: 'Wash U',  full: 'Washington University',       color: '#117A65', logo: { uri: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wustl.edu&size=128' } },
];

// ─── Reusable sub-components ─────────────────────────────────────────────────
function Section({ children, theme }) {
  return <View style={[sStyles.section, { backgroundColor: theme.card }, shadows.small]}>{children}</View>;
}
function SLabel({ text, required, theme }) {
  return (
    <Text style={[sStyles.slabel, { color: theme.textLight }]}>
      {text}{required && <Text style={{ color: '#FF6B6B' }}>  ●</Text>}
    </Text>
  );
}
const sStyles = StyleSheet.create({
  section: { borderRadius: borderRadius.xl, padding: 18, marginBottom: 12 },
  slabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 14 },
});

function Stepper({ value, onChange, min, max, color }) {
  return (
    <View style={stepStyles.row}>
      <TouchableOpacity style={[stepStyles.btn, { borderColor: value <= min ? '#DDD' : color + '60' }]} onPress={() => { if (value > min) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(value - 1); } }} disabled={value <= min}>
        <Ionicons name="remove" size={22} color={value <= min ? '#CCC' : color} />
      </TouchableOpacity>
      <LinearGradient colors={[color, color + 'BB']} style={stepStyles.valBg}>
        <Text style={stepStyles.valTxt}>{value}</Text>
      </LinearGradient>
      <TouchableOpacity style={[stepStyles.btn, { borderColor: value >= max ? '#DDD' : color + '60' }]} onPress={() => { if (value < max) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(value + 1); } }} disabled={value >= max}>
        <Ionicons name="add" size={22} color={value >= max ? '#CCC' : color} />
      </TouchableOpacity>
    </View>
  );
}
const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  btn: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  valBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  valTxt: { color: '#fff', fontSize: fonts.sizes.xxl, fontWeight: '800' },
});

function DirCard({ active, color, icon, title, sub, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[dStyles.card, { backgroundColor: active ? color + '10' : theme.card, borderColor: active ? color : theme.border, borderWidth: active ? 2 : 1 }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.8}
    >
      <View style={[dStyles.icon, { backgroundColor: active ? color + '20' : theme.inputBackground }]}>
        <Ionicons name={icon} size={18} color={active ? color : theme.textLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[dStyles.title, { color: active ? color : theme.textPrimary }]}>{title}</Text>
        <Text style={[dStyles.sub, { color: theme.textSecondary }]}>{sub}</Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={20} color={color} /> : <View style={[dStyles.radio, { borderColor: theme.border }]} />}
    </TouchableOpacity>
  );
}
const dStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: borderRadius.lg, padding: 14, marginBottom: 8 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fonts.sizes.md, fontWeight: '700' },
  sub: { fontSize: fonts.sizes.sm, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
});

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, editable = true, theme }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[inpStyles.base, multiline && inpStyles.area, { backgroundColor: theme.inputBackground, borderColor: focused ? '#F4A833' : theme.border, color: theme.textPrimary }]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={theme.textLight} multiline={multiline}
      keyboardType={keyboardType || 'default'} editable={editable}
      textAlignVertical={multiline ? 'top' : 'auto'}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}
const inpStyles = StyleSheet.create({
  base: { borderRadius: borderRadius.md, padding: 14, fontSize: fonts.sizes.md, borderWidth: 1.5 },
  area: { minHeight: 80, textAlignVertical: 'top' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PostRideScreen({ navigation }) {
  const [postType,            setPostType]            = useState(null);
  const [fromLocation,        setFromLocation]        = useState('');
  const [toLocation,          setToLocation]          = useState('');
  const [rideDate,            setRideDate]            = useState(null);
  const [rideTime,            setRideTime]            = useState(null);
  const [seats,               setSeats]               = useState(1);
  const [peopleCount,         setPeopleCount]         = useState(1);
  const [category,            setCategory]            = useState(null);
  const [university,          setUniversity]          = useState(null);
  const [universityDirection, setUniversityDirection] = useState(null);
  const [airportDirection,    setAirportDirection]    = useState(null);
  const [notes,               setNotes]               = useState('');
  const [loading,             setLoading]             = useState(false);
  const [modal,               setModal]               = useState({ visible: false });
  const [lrStops,             setLrStops]             = useState('');
  const [lrLuggage,           setLrLuggage]           = useState(null);
  const [lrBags,              setLrBags]              = useState(null);
  const [lrIsRoundTrip,       setLrIsRoundTrip]       = useState(false);
  const [lrReturnDate,        setLrReturnDate]        = useState(null);
  const [anyTime,             setAnyTime]             = useState(false);
  const [driverAttested,      setDriverAttested]      = useState(false);
  const [showAgeGate,         setShowAgeGate]         = useState(false);
  const [ageGateLoading,      setAgeGateLoading]      = useState(false);
  const [ageAttested,         setAgeAttested]         = useState(false);

  const user      = useAppStore((state) => state.user);
  const theme     = useTheme();
  const insets    = useSafeAreaInsets();
  const btnScale  = useRef(new Animated.Value(1)).current;
  const isLongRide = category === 'longride';
  const accent     = postType === 'request' ? REQUEST_COLOR : (isLongRide ? LONGRIDE_COLOR : OFFER_COLOR);

  // Check age attestation once on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('rides_age_attested').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.rides_age_attested) {
          setAgeAttested(true);
        } else {
          setShowAgeGate(true);
        }
      });
  }, [user?.id]);

  async function handleAgeConfirmed() {
    setAgeGateLoading(true);
    await supabase.from('profiles').update({ rides_age_attested: true }).eq('id', user.id);
    setAgeAttested(true);
    setShowAgeGate(false);
    setAgeGateLoading(false);
  }

  function warn(emoji, title, subtitle) {
    setModal({ visible: true, type: 'warn', emoji, title, subtitle, primaryLabel: 'Got it', onPrimary: () => setModal({ visible: false }) });
  }

  async function handlePost() {
    if (!fromLocation.trim())                               { warn('📍','Missing Location','Please enter your pickup location.'); return; }
    if (!toLocation.trim())                                 { warn('📍','Missing Location','Please enter the drop-off location.'); return; }
    if (!rideDate)                                          { warn('📅','Pick a Date','Please select a departure date.'); return; }
    if (!anyTime && !rideTime)                             { warn('⏰','Pick a Time','Please select a departure time.'); return; }
    if (!category)                                         { warn('🚗','Select Ride Type','Please choose a ride category.'); return; }
    if (category === 'university' && !university)          { warn('🎓','Select University','Please select your university.'); return; }
    if (category === 'university' && !universityDirection) { warn('🔄','Select Direction','Please select going to or from campus.'); return; }
    if (category === 'airport' && !airportDirection)       { warn('✈️','Select Direction','Please select going to or from the airport.'); return; }
    if (isLongRide && postType === 'offer' && !lrLuggage)  { warn('🧳','Luggage Space','Please indicate available luggage space.'); return; }

    let combinedDateTime = null;
    if (!anyTime) {
      combinedDateTime = new Date(rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate(), rideTime.getHours(), rideTime.getMinutes());
      if (combinedDateTime <= new Date()) { warn('⏰','Invalid Time','Please choose a future date and time.'); return; }
    }

    let finalNotes = notes.trim();
    if (isLongRide) {
      finalNotes = encodeLongRideNotes({
        stops:      lrStops,
        luggage:    postType === 'offer' ? lrLuggage : null,
        bags:       postType === 'request' ? lrBags : null,
        returnDate: lrIsRoundTrip && lrReturnDate ? lrReturnDate.toISOString().split('T')[0] : null,
        userNotes:  notes,
      });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await createRide({
        driver_id:       postType === 'offer'   ? user.id : null,
        requester_id:    postType === 'request' ? user.id : null,
        ride_type:       postType,
        from_location:   fromLocation.trim(),
        to_location:     toLocation.trim(),
        ride_date:       anyTime
          ? new Date(rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate(), 12, 0).toISOString()
          : combinedDateTime.toISOString(),
        any_time:        anyTime,
        seats_available: postType === 'offer' ? seats : peopleCount,
        category,
        university:      category === 'university' ? university : null,
        notes:           finalNotes,
        is_active:       true,
      });
      await awardPoints(user.id, 'share_ride');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModal({
        visible: true,
        type: 'success',
        emoji: postType === 'offer' ? (isLongRide ? '🗺️' : '🚗') : '🙋',
        title: postType === 'offer' ? (isLongRide ? 'Long Ride Posted!' : 'Ride Shared!') : 'Request Posted!',
        subtitle: postType === 'offer'
          ? 'Your ride is live in St. Louis.\n🏅 +10 community points earned!'
          : 'Your request is live. Drivers will contact you.',
        primaryLabel: 'Awesome!',
        onPrimary: () => { setModal({ visible: false }); navigation.goBack(); },
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Something went wrong', text2: 'Failed to post your ride. Please try again.' });
    } finally { setLoading(false); }
  }

  function selectCategory(catId) {
    setCategory(catId);
    setUniversity(null);
    setUniversityDirection(null);
    setAirportDirection(null);
    setFromLocation('');
    setToLocation('');
    setLrStops(''); setLrLuggage(null); setLrBags(null);
    setLrIsRoundTrip(false); setLrReturnDate(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function swapLocations() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tmp = fromLocation; setFromLocation(toLocation); setToLocation(tmp);
  }

  const directionResolved = (category !== 'university' || (university && universityDirection)) && (category !== 'airport' || airportDirection);
  const showRoute = !!category && (category !== 'university' || universityDirection) && (category !== 'airport' || airportDirection);
  const fromPrefilled = (category === 'university' && universityDirection === 'from') || (category === 'airport' && airportDirection === 'from');
  const toPrefilled   = (category === 'university' && universityDirection === 'to')   || (category === 'airport' && airportDirection === 'to');
  const canSubmit = !loading && !!postType && !!category && directionResolved && (isLongRide ? postType === 'request' || !!lrLuggage : true) && (postType === 'offer' ? driverAttested : true);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share a Ride</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 60 }]}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Who are you? ── */}
        <Section theme={theme}>
          <SLabel text="WHO ARE YOU?" required theme={theme} />
          <View style={styles.typeRow}>
            {[
              { id: 'offer',   emoji: '🚗', label: 'Offering a Seat', gradient: [OFFER_COLOR, '#007A5E'] },
              { id: 'request', emoji: '🙋', label: 'Need a Seat',     gradient: [REQUEST_COLOR, '#7B2FBE'] },
            ].map(opt => {
              const isActive = postType === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPostType(opt.id); }}
                  activeOpacity={0.85}
                  style={{ flex: 1 }}
                >
                  {isActive
                    ? <LinearGradient colors={opt.gradient} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.typeBtn}>
                        <Text style={styles.typeBtnEmoji}>{opt.emoji}</Text>
                        <Text style={[styles.typeBtnLabel, { color: '#fff' }]}>{opt.label}</Text>
                        <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.8)" />
                      </LinearGradient>
                    : <View style={[styles.typeBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border, borderWidth: 1.5 }]}>
                        <Text style={styles.typeBtnEmoji}>{opt.emoji}</Text>
                        <Text style={[styles.typeBtnLabel, { color: theme.textSecondary }]}>{opt.label}</Text>
                      </View>
                  }
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.communityBanner, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#0099FF" />
            <Text style={[styles.communityTxt, { color: theme.textSecondary }]}>Cost is discussed privately in chat — community carpool only, not a taxi or rideshare service</Text>
          </View>
          {postType === 'offer' && (
            <View style={[styles.communityBanner, { backgroundColor: theme.inputBackground, marginTop: 8 }]}>
              <Ionicons name="car-outline" size={13} color="#F4A833" />
              <Text style={[styles.communityTxt, { color: theme.textSecondary }]}>
                As a driver, make sure you hold a valid license and personal auto insurance. Carpooling is shared at your own risk — for-hire driving may not be covered by a personal policy.
              </Text>
            </View>
          )}
        </Section>

        {/* ── Ride Category ── */}
        <Section theme={theme}>
          <SLabel text="RIDE CATEGORY" required theme={theme} />
          <View style={styles.catGrid}>
            {CATEGORIES.map(cat => {
              const isActive  = category === cat.id;
              const chipColor = cat.id === 'longride' ? LONGRIDE_COLOR : accent;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => selectCategory(cat.id)}
                  activeOpacity={0.8}
                  style={{ width: '47%' }}
                >
                  {isActive
                    ? <LinearGradient colors={cat.id === 'longride' ? [LONGRIDE_COLOR,'#E68A00'] : postType === 'request' ? [REQUEST_COLOR,'#7B2FBE'] : [OFFER_COLOR,'#007A5E']} style={styles.catChip} start={{x:0,y:0}} end={{x:1,y:1}}>
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catLabel, { color: '#fff' }]}>{cat.label}</Text>
                        <Text style={[styles.catDesc, { color: 'rgba(255,255,255,0.7)' }]}>{cat.desc}</Text>
                      </LinearGradient>
                    : <View style={[styles.catChip, { backgroundColor: theme.inputBackground, borderColor: theme.border, borderWidth: 1.5 }]}>
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catLabel, { color: theme.textPrimary }]}>{cat.label}</Text>
                        <Text style={[styles.catDesc, { color: theme.textLight }]}>{cat.desc}</Text>
                      </View>
                  }
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* ── Long Ride Banner ── */}
        {isLongRide && (
          <LinearGradient colors={[LONGRIDE_COLOR + '20', LONGRIDE_COLOR + '05']} style={[styles.longRideBanner, { borderColor: LONGRIDE_COLOR + '40' }]}>
            <Text style={{ fontSize: 28 }}>🗺️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lrBannerTitle, { color: LONGRIDE_COLOR }]}>Long Ride Mode</Text>
              <Text style={[styles.lrBannerSub, { color: theme.textSecondary }]}>Intercity or out-of-state — add stops, luggage info & return trip details.</Text>
            </View>
          </LinearGradient>
        )}

        {/* ── University Picker ── */}
        {category === 'university' && (
          <Section theme={theme}>
            <SLabel text="SELECT UNIVERSITY" required theme={theme} />
            {UNIVERSITIES.map(uni => {
              const isActive = university === uni.id;
              return (
                <TouchableOpacity key={uni.id} onPress={() => { setUniversity(uni.id); setUniversityDirection(null); setFromLocation(''); setToLocation(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.uniRow, { backgroundColor: isActive ? uni.color + '10' : theme.inputBackground, borderColor: isActive ? uni.color : theme.border, borderWidth: isActive ? 2 : 1 }]} activeOpacity={0.8}>
                  <View style={[styles.uniLogoWrap, { backgroundColor: isActive ? uni.color + '20' : theme.card }]}>
                    <Image source={uni.logo} style={styles.uniLogo} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.uniName, { color: isActive ? uni.color : theme.textPrimary }]}>{uni.full}</Text>
                    <Text style={[styles.uniShort, { color: theme.textLight }]}>{uni.short}</Text>
                  </View>
                  {isActive ? <Ionicons name="checkmark-circle" size={20} color={uni.color} /> : <View style={[styles.radioCircle, { borderColor: theme.border }]} />}
                </TouchableOpacity>
              );
            })}
          </Section>
        )}

        {/* ── University Direction ── */}
        {category === 'university' && university && (() => {
          const uni = UNIVERSITIES.find(u => u.id === university);
          return (
            <Section theme={theme}>
              <SLabel text="DIRECTION" required theme={theme} />
              <DirCard active={universityDirection === 'from'} color={uni.color} icon="school-outline" title={`Leave ${uni.short}`} sub="Campus → Home" theme={theme} onPress={() => { setUniversityDirection('from'); setFromLocation(uni.short); setToLocation(''); }} />
              <DirCard active={universityDirection === 'to'} color={uni.color} icon="home-outline" title={`Go to ${uni.short}`} sub="Home → Campus" theme={theme} onPress={() => { setUniversityDirection('to'); setToLocation(uni.short); setFromLocation(''); }} />
            </Section>
          );
        })()}

        {/* ── Airport Direction ── */}
        {category === 'airport' && (
          <Section theme={theme}>
            <SLabel text="DIRECTION" required theme={theme} />
            <DirCard active={airportDirection === 'to'} color="#3498DB" icon="airplane-outline" title="To Airport" sub="Home → STL Lambert" theme={theme} onPress={() => { setAirportDirection('to'); setToLocation('STL Lambert Airport'); setFromLocation(''); }} />
            <DirCard active={airportDirection === 'from'} color="#3498DB" icon="home-outline" title="From Airport" sub="STL Lambert → Home" theme={theme} onPress={() => { setAirportDirection('from'); setFromLocation('STL Lambert Airport'); setToLocation(''); }} />
          </Section>
        )}

        {/* ── Route ── */}
        {showRoute && (
          <Section theme={theme}>
            <SLabel text="ROUTE" required theme={theme} />
            <View style={[styles.routeCard, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              {/* FROM */}
              <View style={styles.routeRow}>
                <View style={styles.routeDotCol}>
                  <LinearGradient colors={['#00C48C','#007A5E']} style={styles.routeDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeMeta, { color: theme.textLight }]}>FROM</Text>
                  {fromPrefilled
                    ? <Text style={[styles.routePrefilled, { color: accent }]}>{fromLocation}</Text>
                    : <StyledInput theme={theme} value={fromLocation} onChangeText={setFromLocation} placeholder={isLongRide ? 'e.g. St. Louis, MO' : 'e.g. Clayton, St. Louis'} />
                  }
                </View>
              </View>
              {/* Connector */}
              <View style={styles.routeConnector}>
                {[0,1,2,3].map(i => <View key={i} style={[styles.connDash, { backgroundColor: accent + '40' }]} />)}
                {!fromPrefilled && !toPrefilled && (
                  <TouchableOpacity style={[styles.swapBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={swapLocations}>
                    <Ionicons name="swap-vertical" size={15} color={theme.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              {/* TO */}
              <View style={styles.routeRow}>
                <View style={styles.routeDotCol}>
                  <View style={[styles.routeDotRing, { borderColor: '#FF6B6B' }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeMeta, { color: theme.textLight }]}>TO</Text>
                  {toPrefilled
                    ? <Text style={[styles.routePrefilled, { color: accent }]}>{toLocation}</Text>
                    : <StyledInput theme={theme} value={toLocation} onChangeText={setToLocation} placeholder={isLongRide ? 'e.g. Chicago, IL' : 'e.g. Chesterfield, St. Louis'} />
                  }
                </View>
              </View>
            </View>
            {/* Long Ride stops */}
            {isLongRide && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Intermediate Stops</Text>
                <StyledInput theme={theme} value={lrStops} onChangeText={setLrStops} placeholder="e.g. Springfield, IL; Bloomington, IL" />
                <Text style={[styles.hint, { color: theme.textLight }]}>Separate with semicolons</Text>
              </View>
            )}
          </Section>
        )}

        {/* ── When? ── */}
        {showRoute && (
          <Section theme={theme}>
            <View style={styles.whenHeader}>
              <SLabel text="WHEN?" required theme={theme} />
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAnyTime(!anyTime); if (!anyTime) setRideTime(null); }}
                style={[styles.anyTimeToggle, { backgroundColor: anyTime ? accent + '15' : theme.inputBackground, borderColor: anyTime ? accent : theme.border }]}
              >
                <View style={[styles.anyTimeDot, { backgroundColor: anyTime ? accent : theme.textLight }]} />
                <Text style={[styles.anyTimeLabel, { color: anyTime ? accent : theme.textSecondary }]}>Open to anytime</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateTimeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date</Text>
                <DatePicker value={rideDate} onChange={setRideDate} accentColor={accent} />
              </View>
              {!anyTime && (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Time</Text>
                  <TimePicker value={rideTime} onChange={setRideTime} accentColor={accent} />
                </View>
              )}
            </View>
            {anyTime && (
              <View style={[styles.anyTimeBadge, { backgroundColor: accent + '10', borderColor: accent + '30' }]}>
                <Ionicons name="time-outline" size={20} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.anyTimeBadgeTitle, { color: accent }]}>Time is Flexible</Text>
                  <Text style={[styles.anyTimeBadgeSub, { color: theme.textSecondary }]}>{postType === 'offer' ? 'Riders will reach out' : 'Drivers will reach out'} — coordinate in chat</Text>
                </View>
              </View>
            )}
            {/* Round Trip (Long Ride only) */}
            {isLongRide && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Trip Type</Text>
                <View style={styles.tripTypeRow}>
                  {[{ id: false, label: 'One Way', icon: 'arrow-forward-outline' }, { id: true, label: 'Round Trip', icon: 'repeat-outline' }].map(opt => {
                    const isActive = lrIsRoundTrip === opt.id;
                    return (
                      <TouchableOpacity key={String(opt.id)} onPress={() => { setLrIsRoundTrip(opt.id); if (!opt.id) setLrReturnDate(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.tripTypeBtn, { backgroundColor: isActive ? LONGRIDE_COLOR + '15' : theme.inputBackground, borderColor: isActive ? LONGRIDE_COLOR : theme.border, borderWidth: isActive ? 2 : 1 }]}>
                        <Ionicons name={opt.icon} size={17} color={isActive ? LONGRIDE_COLOR : theme.textLight} />
                        <Text style={[styles.tripTypeTxt, { color: isActive ? LONGRIDE_COLOR : theme.textSecondary, fontWeight: isActive ? '700' : '500' }]}>{opt.label}</Text>
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
          </Section>
        )}

        {/* ── Seats / People ── */}
        {showRoute && (
          <Section theme={theme}>
            <SLabel text={postType === 'offer' ? 'SEATS AVAILABLE' : 'PEOPLE JOINING'} required theme={theme} />
            <Stepper value={postType === 'offer' ? seats : peopleCount} onChange={postType === 'offer' ? setSeats : setPeopleCount} min={1} max={6} color={accent} />
            <Text style={[styles.seatsHint, { color: theme.textSecondary }]}>
              {postType === 'offer'
                ? `${seats} seat${seats !== 1 ? 's' : ''} available for riders`
                : `${peopleCount} person${peopleCount !== 1 ? 's' : ''} need${peopleCount === 1 ? 's' : ''} a seat`
              }
            </Text>
          </Section>
        )}

        {/* ── Luggage (Long Ride offer) ── */}
        {isLongRide && postType === 'offer' && showRoute && (
          <Section theme={theme}>
            <SLabel text="LUGGAGE SPACE" required theme={theme} />
            <View style={styles.luggageGrid}>
              {LUGGAGE_OPTIONS.map(opt => {
                const isActive = lrLuggage === opt.id;
                return (
                  <TouchableOpacity key={opt.id} onPress={() => { setLrLuggage(opt.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.8} style={[styles.luggageCard, { backgroundColor: isActive ? LONGRIDE_COLOR + '12' : theme.inputBackground, borderColor: isActive ? LONGRIDE_COLOR : theme.border, borderWidth: isActive ? 2 : 1 }]}>
                    <View style={[styles.luggageIconCircle, { backgroundColor: isActive ? LONGRIDE_COLOR + '20' : theme.card }]}>
                      <Ionicons name={opt.icon} size={22} color={isActive ? LONGRIDE_COLOR : theme.textLight} />
                    </View>
                    <Text style={[styles.luggageLabel, { color: isActive ? LONGRIDE_COLOR : theme.textPrimary }]}>{opt.label}</Text>
                    <Text style={[styles.luggageDesc, { color: theme.textLight }]}>{opt.desc}</Text>
                    {isActive && (
                      <View style={[styles.luggageCheck, { backgroundColor: LONGRIDE_COLOR }]}>
                        <Ionicons name="checkmark" size={8} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>
        )}

        {/* ── Passenger Bags (Long Ride request) ── */}
        {isLongRide && postType === 'request' && showRoute && (
          <Section theme={theme}>
            <SLabel text="YOUR LUGGAGE" theme={theme} />
            <View style={styles.bagsRow}>
              {PASSENGER_BAGS_OPTIONS.map(opt => {
                const isActive = lrBags === opt.id;
                return (
                  <TouchableOpacity key={opt.id} onPress={() => { setLrBags(opt.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.8} style={[styles.bagCard, { backgroundColor: isActive ? REQUEST_COLOR + '12' : theme.inputBackground, borderColor: isActive ? REQUEST_COLOR : theme.border, borderWidth: isActive ? 2 : 1 }]}>
                    <View style={[styles.bagIconCircle, { backgroundColor: isActive ? REQUEST_COLOR + '20' : theme.card }]}>
                      <Ionicons name={opt.icon} size={18} color={isActive ? REQUEST_COLOR : theme.textLight} />
                    </View>
                    <Text style={[styles.bagLabel, { color: isActive ? REQUEST_COLOR : theme.textPrimary }]}>{opt.label}</Text>
                    <Text style={[styles.bagDesc, { color: theme.textLight }]}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>
        )}

        {/* ── Notes ── */}
        {showRoute && (
          <Section theme={theme}>
            <View style={styles.notesHeader}>
              <SLabel text="NOTES" theme={theme} />
              <Text style={[styles.notesOptional, { color: theme.textLight }]}>optional</Text>
            </View>
            <StyledInput
              theme={theme}
              value={notes}
              onChangeText={text => { if (text.length <= 200) setNotes(text); }}
              placeholder={isLongRide ? 'Departure point, parking spot, special instructions…' : postType === 'offer' ? 'Anything else riders should know…' : 'Anything drivers should know…'}
              multiline
            />
            <Text style={[styles.charCount, { color: theme.textLight }]}>{notes.length}/200</Text>
            <View style={[styles.costBadge, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="lock-closed-outline" size={12} color="#0099FF" />
              <Text style={[styles.costBadgeTxt, { color: theme.textSecondary }]}>
                {postType === 'offer' ? 'Cost sharing is discussed privately with riders' : 'Cost sharing is discussed privately with the driver'}
              </Text>
            </View>
          </Section>
        )}

        {/* ── Driver attestation (offer posts only) ── */}
        {postType === 'offer' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDriverAttested(!driverAttested); }}
            style={[drvS.row, {
              backgroundColor: driverAttested ? '#00C48C12' : theme.card,
              borderColor: driverAttested ? '#00C48C' : theme.border,
            }]}
          >
            <View style={[drvS.box, {
              backgroundColor: driverAttested ? '#00C48C' : 'transparent',
              borderColor: driverAttested ? '#00C48C' : theme.border,
            }]}>
              {driverAttested && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[drvS.txt, { color: theme.textSecondary }]}>
              I hold a valid driver's licence and appropriate insurance, and I am sharing trip costs only — not operating for hire or profit.
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Submit ── */}
        <TouchableOpacity
          onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
          onPress={handlePost}
          disabled={!canSubmit}
          activeOpacity={1}
        >
          <Animated.View style={{ transform: [{ scale: btnScale }], opacity: canSubmit ? 1 : 0.38 }}>
            <LinearGradient
              colors={postType === 'request' ? [REQUEST_COLOR,'#7B2FBE'] : isLongRide ? [LONGRIDE_COLOR,'#E68A00'] : [OFFER_COLOR,'#007A5E']}
              start={{x:0,y:0}} end={{x:1,y:0}}
              style={styles.submitBtn}
            >
              {loading ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name={postType === 'offer' ? (isLongRide ? 'map' : 'car-sport') : 'hand-left'} size={18} color="#fff" />
                    <Text style={styles.submitTxt}>
                      {postType === 'offer' ? (isLongRide ? 'Post Long Ride' : 'Share My Ride') : (isLongRide ? 'Request Long Ride' : 'Request a Seat')}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </>
              }
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelTxt, { color: theme.textSecondary }]}>Maybe later</Text>
        </TouchableOpacity>
      </ScrollView>

      <AgeGateModal
        visible={showAgeGate}
        loading={ageGateLoading}
        onConfirm={handleAgeConfirmed}
        onDecline={() => navigation.goBack()}
      />
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
  header: { paddingHorizontal: spacing.md, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.md },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: { borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', gap: 6 },
  typeBtnEmoji: { fontSize: 26 },
  typeBtnLabel: { fontSize: fonts.sizes.sm, fontWeight: '700', textAlign: 'center' },
  communityBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 10 },
  communityTxt: { flex: 1, fontSize: fonts.sizes.xs, lineHeight: 18 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: { borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', gap: 4 },
  catEmoji: { fontSize: 26 },
  catLabel: { fontSize: fonts.sizes.sm, fontWeight: '700', textAlign: 'center' },
  catDesc: { fontSize: 10, textAlign: 'center' },

  longRideBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: borderRadius.lg, padding: 16, marginBottom: 12, borderWidth: 1 },
  lrBannerTitle: { fontSize: fonts.sizes.md, fontWeight: '800', marginBottom: 2 },
  lrBannerSub: { fontSize: fonts.sizes.sm, lineHeight: 18 },

  uniRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: borderRadius.lg, padding: 14, marginBottom: 8 },
  uniLogoWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  uniLogo: { width: 28, height: 28 },
  uniName: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  uniShort: { fontSize: fonts.sizes.xs },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },

  routeCard: { borderRadius: borderRadius.lg, borderWidth: 1.5, overflow: 'hidden' },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  routeDotCol: { alignItems: 'center', paddingTop: 18 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  routeDotRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  routeMeta: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  routePrefilled: { fontSize: fonts.sizes.md, fontWeight: '700', padding: 4 },
  routeConnector: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 28 },
  connDash: { width: 2, height: 8, borderRadius: 1 },
  swapBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  fieldLabel: { fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 11, marginTop: 5, lineHeight: 16 },

  whenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  anyTimeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  anyTimeDot: { width: 8, height: 8, borderRadius: 4 },
  anyTimeLabel: { fontSize: fonts.sizes.xs, fontWeight: '700' },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  anyTimeBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: borderRadius.md, padding: 12, borderWidth: 1, marginTop: 12 },
  anyTimeBadgeTitle: { fontSize: fonts.sizes.sm, fontWeight: '800', marginBottom: 2 },
  anyTimeBadgeSub: { fontSize: fonts.sizes.sm, lineHeight: 18 },
  tripTypeRow: { flexDirection: 'row', gap: 10 },
  tripTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: borderRadius.md, padding: 12 },
  tripTypeTxt: { fontSize: fonts.sizes.sm },

  seatsHint: { textAlign: 'center', fontSize: fonts.sizes.sm, marginTop: 12 },

  luggageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  luggageCard: { width: '47%', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', gap: 6, position: 'relative' },
  luggageIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  luggageLabel: { fontSize: fonts.sizes.sm, fontWeight: '700', textAlign: 'center' },
  luggageDesc: { fontSize: 11, textAlign: 'center' },
  luggageCheck: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  bagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bagCard: { width: '30%', borderRadius: borderRadius.lg, padding: 12, alignItems: 'center', gap: 5 },
  bagIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bagLabel: { fontSize: fonts.sizes.sm, fontWeight: '700', textAlign: 'center' },
  bagDesc: { fontSize: 10, textAlign: 'center' },

  notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notesOptional: { fontSize: 11, fontStyle: 'italic', marginBottom: 14 },
  charCount: { textAlign: 'right', fontSize: 11, marginTop: 4 },
  costBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, padding: 10, marginTop: 10 },
  costBadgeTxt: { flex: 1, fontSize: fonts.sizes.xs, lineHeight: 18 },

  submitBtn: { borderRadius: borderRadius.full, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.glow },
  submitTxt: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelTxt: { fontSize: fonts.sizes.md },
});

const drvS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: borderRadius.md, padding: 12, borderWidth: 1.5, marginBottom: 14 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  txt: { flex: 1, fontSize: 12, lineHeight: 18 },
});
