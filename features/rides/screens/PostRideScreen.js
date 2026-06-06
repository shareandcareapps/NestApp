// features/rides/screens/PostRideScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Keyboard, Image,
  SafeAreaView, Platform,
} from 'react-native';
import AppModal from '../../../core/components/AppModal';
import { Ionicons } from '@expo/vector-icons';
import { createRide } from '../services/ridesService';
import useAppStore from '../../../core/store/index';
import { awardPoints } from '../../../core/services/pointsService';
import { DatePicker, TimePicker } from '../../../core/components/DateTimePicker';
import { useTheme } from '../../../core/theme/ThemeContext';
import {
  encodeLongRideNotes,
  LUGGAGE_OPTIONS,
  PASSENGER_BAGS_OPTIONS,
} from '../utils/longRideUtils';

const OFFER_COLOR    = '#1ABC9C';
const REQUEST_COLOR  = '#9B59B6';
const LONGRIDE_COLOR = '#E67E22';
const HEADER_BG      = '#1D3557';

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

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 2,
};

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

  const [lrStops,       setLrStops]       = useState('');
  const [lrLuggage,     setLrLuggage]     = useState(null);
  const [lrBags,        setLrBags]        = useState(null);
  const [lrIsRoundTrip, setLrIsRoundTrip] = useState(false);
  const [lrReturnDate,  setLrReturnDate]  = useState(null);
  const [anyTime,       setAnyTime]       = useState(false);

  const user      = useAppStore((state) => state.user);
  const colors    = useTheme();
  const isLongRide = category === 'longride';
  const accent     = postType === 'request' ? REQUEST_COLOR
    : (isLongRide ? LONGRIDE_COLOR : OFFER_COLOR);

  function warn(emoji, title, subtitle) {
    setModal({
      visible: true, type: 'warn', emoji, title, subtitle,
      primaryLabel: 'Got it',
      onPrimary: () => setModal({ visible: false }),
    });
  }

  async function handlePost() {
    if (!fromLocation.trim())                               { warn('📍', 'Missing Location',  'Please enter your pickup location.'); return; }
    if (!toLocation.trim())                                 { warn('📍', 'Missing Location',  'Please enter the drop-off location.'); return; }
    if (!rideDate)                                           { warn('📅', 'Pick a Date',       'Please select a departure date.'); return; }
    if (!anyTime && !rideTime)                              { warn('⏰', 'Pick a Time',       'Please select a departure time.'); return; }
    if (!category)                                          { warn('🚗', 'Select Ride Type',  'Please choose a ride category.'); return; }
    if (category === 'university' && !university)           { warn('🎓', 'Select University', 'Please select your university.'); return; }
    if (category === 'university' && !universityDirection)  { warn('🔄', 'Select Direction',  'Please select going to or from campus.'); return; }
    if (category === 'airport' && !airportDirection)        { warn('✈️', 'Select Direction',  'Please select going to or from the airport.'); return; }
    if (isLongRide && postType === 'offer' && !lrLuggage)   { warn('🧳', 'Luggage Space',     'Please indicate available luggage space.'); return; }

    let combinedDateTime = null;
    if (!anyTime) {
      combinedDateTime = new Date(
        rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate(),
        rideTime.getHours(), rideTime.getMinutes(),
      );
      if (combinedDateTime <= new Date()) {
        warn('⏰', 'Invalid Time', 'Please choose a future date and time.');
        return;
      }
    }

    let finalNotes = notes.trim();
    if (isLongRide) {
      finalNotes = encodeLongRideNotes({
        stops:      lrStops,
        luggage:    postType === 'offer' ? lrLuggage : null,
        bags:       postType === 'request' ? lrBags : null,
        returnDate: lrIsRoundTrip && lrReturnDate
          ? lrReturnDate.toISOString().split('T')[0]
          : null,
        userNotes: notes,
      });
    }

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
        seats_available: postType === 'offer' ? seats : peopleCount,
        category,
        university:      category === 'university' ? university : null,
        notes:           finalNotes,
        is_active:       true,
      });
      await awardPoints(user.id, 'share_ride');
      setModal({
        visible:      true,
        type:         'success',
        emoji:        postType === 'offer' ? (isLongRide ? '🗺️' : '🚗') : '🙋',
        title:        postType === 'offer' ? (isLongRide ? 'Long Ride Posted!' : 'Ride Shared!') : 'Request Posted!',
        subtitle:     postType === 'offer'
          ? 'Your ride is live in St. Louis.\n🏅 +10 community points earned!'
          : 'Your request is live. Drivers will contact you.',
        primaryLabel: 'Awesome!',
        onPrimary:    () => { setModal({ visible: false }); navigation.goBack(); },
      });
    } catch (err) {
      setModal({
        visible:      true,
        type:         'error',
        emoji:        '😕',
        title:        'Something went wrong',
        subtitle:     'Failed to post your ride. Please try again.',
        primaryLabel: 'Try Again',
        onPrimary:    () => setModal({ visible: false }),
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function selectCategory(catId) {
    setCategory(catId);
    setUniversity(null);
    setUniversityDirection(null);
    setAirportDirection(null);
    setFromLocation('');
    setToLocation('');
    setLrStops('');
    setLrLuggage(null);
    setLrBags(null);
    setLrIsRoundTrip(false);
    setLrReturnDate(null);
  }

  function swapLocations() {
    const tmp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(tmp);
  }

  const directionResolved =
    (category !== 'university' || (university && universityDirection)) &&
    (category !== 'airport'    || airportDirection);

  const showRoute =
    !!category &&
    (category !== 'university' || universityDirection) &&
    (category !== 'airport'    || airportDirection);

  const fromPrefilled =
    (category === 'university' && universityDirection === 'from') ||
    (category === 'airport'    && airportDirection    === 'from');

  const toPrefilled =
    (category === 'university' && universityDirection === 'to') ||
    (category === 'airport'    && airportDirection    === 'to');

  const canSubmit =
    !loading && !!postType && !!category && directionResolved &&
    (isLongRide ? postType === 'request' || !!lrLuggage : true);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>

      {/* ── COMPACT FIXED HEADER ── */}
      <SafeAreaView style={{ backgroundColor: HEADER_BG }}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.navCenter}>
            <Ionicons name="car-sport-outline" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.navTitle}>Share a Ride</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >

        {/* ── SECTION: Who are you? ── */}
        <CardSection>
          <SectionTitle text="WHO ARE YOU?" required />
          <View style={styles.typeToggleTrack}>
            {[
              { id: 'offer',   emoji: '🚗', label: 'Offering a Seat', color: OFFER_COLOR },
              { id: 'request', emoji: '🙋', label: 'Need a Seat',     color: REQUEST_COLOR },
            ].map((opt, idx) => {
              const active = postType === opt.id;
              return (
                <React.Fragment key={opt.id}>
                  <TouchableOpacity
                    style={[styles.typeToggleBtn, active && { backgroundColor: opt.color }]}
                    onPress={() => setPostType(opt.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.typeToggleEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.typeToggleLabel, { color: active ? '#fff' : '#666' }]}>
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={15} color="rgba(255,255,255,0.85)" />}
                  </TouchableOpacity>
                  {idx === 0 && (
                    <View style={styles.typeToggleDivider}>
                      <View style={styles.typeToggleDividerTop} />
                      <View style={styles.typeToggleDividerMid} />
                      <View style={styles.typeToggleDividerBot} />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.communityBanner}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#2980B9" />
            <Text style={styles.communityText}>
              Cost is discussed privately in chat — community carpool only
            </Text>
          </View>
        </CardSection>

        {/* ── SECTION: Ride Category ── */}
        <CardSection>
          <SectionTitle text="RIDE CATEGORY" required />
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const active    = category === cat.id;
              const chipColor = cat.id === 'longride' ? LONGRIDE_COLOR : accent;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, {
                    backgroundColor: active ? chipColor + '15' : '#F8F8F8',
                    borderColor:     active ? chipColor : '#EBEBEB',
                    borderWidth:     active ? 2 : 1,
                  }]}
                  onPress={() => selectCategory(cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catChipLabel, { color: active ? chipColor : '#333' }]}>
                    {cat.label}
                  </Text>
                  <Text style={styles.catChipDesc}>{cat.desc}</Text>
                  {active && (
                    <View style={[styles.catActiveBar, { backgroundColor: chipColor }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </CardSection>

        {/* ── Long Ride Banner ── */}
        {isLongRide && (
          <View style={styles.longRideBanner}>
            <Text style={styles.longRideBannerEmoji}>🗺️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.longRideBannerTitle, { color: LONGRIDE_COLOR }]}>Long Ride Mode</Text>
              <Text style={styles.longRideBannerSub}>Intercity or out-of-state — add stops, luggage info & return trip details.</Text>
            </View>
          </View>
        )}

        {/* ── University Picker ── */}
        {category === 'university' && (
          <CardSection>
            <SectionTitle text="SELECT UNIVERSITY" required />
            <View style={styles.uniList}>
              {UNIVERSITIES.map((uni) => {
                const active = university === uni.id;
                return (
                  <TouchableOpacity
                    key={uni.id}
                    style={[styles.uniRow, {
                      backgroundColor: active ? uni.color + '10' : '#F8F8F8',
                      borderColor:     active ? uni.color : '#EBEBEB',
                      borderWidth:     active ? 2 : 1,
                    }]}
                    onPress={() => {
                      setUniversity(uni.id);
                      setUniversityDirection(null);
                      setFromLocation('');
                      setToLocation('');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.uniLogoWrap, { backgroundColor: active ? uni.color + '18' : '#eee' }]}>
                      <Image source={uni.logo} style={styles.uniLogo} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.uniShort, { color: active ? uni.color : '#111' }]}>{uni.full}</Text>
                      <Text style={styles.uniTag}>{uni.short}</Text>
                    </View>
                    {active
                      ? <Ionicons name="checkmark-circle" size={20} color={uni.color} />
                      : <View style={styles.dirRadio} />
                    }
                  </TouchableOpacity>
                );
              })}
            </View>
          </CardSection>
        )}

        {/* ── University Direction ── */}
        {category === 'university' && university && (() => {
          const uni = UNIVERSITIES.find(u => u.id === university);
          return (
            <CardSection>
              <SectionTitle text="DIRECTION" required />
              <View style={styles.dirStack}>
                <DirCard
                  active={universityDirection === 'from'}
                  color={uni.color}
                  icon="school-outline"
                  title={`Leave ${uni.short}`}
                  sub="Campus → Home"
                  onPress={() => {
                    setUniversityDirection('from');
                    setFromLocation(uni.short);
                    setToLocation('');
                  }}
                />
                <DirCard
                  active={universityDirection === 'to'}
                  color={uni.color}
                  icon="home-outline"
                  title={`Go to ${uni.short}`}
                  sub="Home → Campus"
                  onPress={() => {
                    setUniversityDirection('to');
                    setToLocation(uni.short);
                    setFromLocation('');
                  }}
                />
              </View>
            </CardSection>
          );
        })()}

        {/* ── Airport Direction ── */}
        {category === 'airport' && (
          <CardSection>
            <SectionTitle text="DIRECTION" required />
            <View style={styles.dirStack}>
              <DirCard
                active={airportDirection === 'to'}
                color="#3498DB"
                icon="airplane-outline"
                title="To Airport"
                sub="Home → STL Lambert"
                onPress={() => {
                  setAirportDirection('to');
                  setToLocation('STL Lambert Airport');
                  setFromLocation('');
                }}
              />
              <DirCard
                active={airportDirection === 'from'}
                color="#3498DB"
                icon="home-outline"
                title="From Airport"
                sub="STL Lambert → Home"
                onPress={() => {
                  setAirportDirection('from');
                  setFromLocation('STL Lambert Airport');
                  setToLocation('');
                }}
              />
            </View>
          </CardSection>
        )}

        {/* ── ROUTE CARD ── */}
        {showRoute && (
          <CardSection>
            <SectionTitle text="ROUTE" required />
            <View style={styles.routeCard}>
              {/* FROM row */}
              <View style={styles.routeRow}>
                <View style={styles.routeDotCol}>
                  <View style={[styles.routeDot, { backgroundColor: '#2ECC71', borderColor: '#D5F5E3' }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeFieldMeta}>FROM</Text>
                  {fromPrefilled ? (
                    <Text style={styles.routePrefilledVal}>{fromLocation}</Text>
                  ) : (
                    <TextInput
                      style={[styles.routeInput, { color: colors.textPrimary || '#111' }]}
                      placeholder={isLongRide ? 'e.g. St. Louis, MO' : 'e.g. Clayton, St. Louis'}
                      placeholderTextColor="#C0C0C0"
                      value={fromLocation}
                      onChangeText={setFromLocation}
                    />
                  )}
                </View>
              </View>

              {/* Connector */}
              <View style={styles.routeConnector}>
                <View style={styles.routeConnectorLine}>
                  {[0,1,2,3].map(i => (
                    <View key={i} style={styles.routeConnectorDash} />
                  ))}
                </View>
                {!fromPrefilled && !toPrefilled && (
                  <TouchableOpacity style={styles.swapBtn} onPress={swapLocations} activeOpacity={0.7}>
                    <Ionicons name="swap-vertical" size={15} color="#888" />
                  </TouchableOpacity>
                )}
              </View>

              {/* TO row */}
              <View style={styles.routeRow}>
                <View style={styles.routeDotCol}>
                  <View style={[styles.routeDot, { backgroundColor: '#E74C3C', borderColor: '#FADBD8' }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeFieldMeta}>TO</Text>
                  {toPrefilled ? (
                    <Text style={styles.routePrefilledVal}>{toLocation}</Text>
                  ) : (
                    <TextInput
                      style={[styles.routeInput, { color: colors.textPrimary || '#111' }]}
                      placeholder={isLongRide ? 'e.g. Chicago, IL' : 'e.g. Chesterfield, St. Louis'}
                      placeholderTextColor="#C0C0C0"
                      value={toLocation}
                      onChangeText={setToLocation}
                    />
                  )}
                </View>
              </View>
            </View>

            {/* Long Ride: Stops */}
            {isLongRide && (
              <View style={{ marginTop: 14 }}>
                <FieldLabel text="Intermediate Stops" />
                <TextInput
                  style={[styles.inputBox, { color: colors.textPrimary || '#111' }]}
                  placeholder="e.g. Springfield, IL; Bloomington, IL"
                  placeholderTextColor="#C0C0C0"
                  value={lrStops}
                  onChangeText={setLrStops}
                />
                <Text style={styles.hint}>Separate with semicolons — riders near stops can find your ride</Text>
              </View>
            )}
          </CardSection>
        )}

        {/* ── WHEN? ── */}
        {showRoute && (
          <CardSection>
            <View style={styles.whenHeader}>
              <SectionTitle text="WHEN?" required />
              <TouchableOpacity
                style={[styles.anyTimeToggle, anyTime && { backgroundColor: accent + '15', borderColor: accent }]}
                onPress={() => {
                  setAnyTime(!anyTime);
                  if (!anyTime) { setRideTime(null); }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.anyTimeDot, { backgroundColor: anyTime ? accent : '#CCC' }]} />
                <Text style={[styles.anyTimeLabel, { color: anyTime ? accent : '#999' }]}>
                  Open to anytime
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dateTimeRow, { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <FieldLabel text="Date" />
                <DatePicker value={rideDate} onChange={setRideDate} accentColor={accent} />
              </View>
              {!anyTime && (
                <View style={{ flex: 1 }}>
                  <FieldLabel text="Time" />
                  <TimePicker value={rideTime} onChange={setRideTime} accentColor={accent} />
                </View>
              )}
            </View>
            {anyTime && (
              <View style={[styles.anyTimeBadge, { borderColor: accent + '30', backgroundColor: accent + '08' }]}>
                <Ionicons name="time-outline" size={20} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.anyTimeBadgeTitle, { color: accent }]}>Time is Flexible</Text>
                  <Text style={styles.anyTimeBadgeSub}>
                    {postType === 'offer'
                      ? 'Riders will reach out — coordinate the exact time in chat'
                      : 'Drivers will reach out — coordinate the exact time in chat'}
                  </Text>
                </View>
              </View>
            )}

            {/* Round Trip */}
            {isLongRide && (
              <View style={{ marginTop: 14 }}>
                <FieldLabel text="Trip Type" />
                <View style={styles.toggleRow}>
                  {[
                    { id: false, label: 'One Way',    icon: 'arrow-forward-outline' },
                    { id: true,  label: 'Round Trip', icon: 'repeat-outline' },
                  ].map((opt) => {
                    const active = lrIsRoundTrip === opt.id;
                    return (
                      <TouchableOpacity
                        key={String(opt.id)}
                        style={[styles.toggleBtn, {
                          backgroundColor: active ? LONGRIDE_COLOR + '15' : '#F9F9F9',
                          borderColor:     active ? LONGRIDE_COLOR : '#E0E0E0',
                          borderWidth:     active ? 2 : 1,
                        }]}
                        onPress={() => {
                          setLrIsRoundTrip(opt.id);
                          if (!opt.id) setLrReturnDate(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={opt.icon} size={17} color={active ? LONGRIDE_COLOR : '#999'} />
                        <Text style={[styles.toggleLabel, { color: active ? LONGRIDE_COLOR : '#555' }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {lrIsRoundTrip && (
                  <View style={{ marginTop: 12 }}>
                    <FieldLabel text="Return Date" />
                    <DatePicker value={lrReturnDate} onChange={setLrReturnDate} accentColor={LONGRIDE_COLOR} />
                    <Text style={styles.hint}>Passengers can join one or both legs — coordinate in chat</Text>
                  </View>
                )}
              </View>
            )}
          </CardSection>
        )}

        {/* ── SEATS / PEOPLE ── */}
        {showRoute && (
          <CardSection>
            <SectionTitle
              text={postType === 'offer' ? 'SEATS AVAILABLE' : 'PEOPLE JOINING'}
              required
            />
            <Stepper
              value={postType === 'offer' ? seats : peopleCount}
              onChange={postType === 'offer' ? setSeats : setPeopleCount}
              min={1}
              max={6}
              color={accent}
            />
            <Text style={[styles.hint, { textAlign: 'center', marginTop: 6 }]}>
              {postType === 'offer'
                ? seats === 1 ? '1 seat available for riders' : `${seats} seats available for riders`
                : peopleCount === 1 ? 'Just me — 1 person needs a seat' : `${peopleCount} people need seats`}
            </Text>
          </CardSection>
        )}

        {/* ── LUGGAGE (Long Ride offer only) ── */}
        {isLongRide && postType === 'offer' && showRoute && (
          <CardSection>
            <SectionTitle text="LUGGAGE SPACE" required />
            <View style={styles.luggageRow}>
              {LUGGAGE_OPTIONS.map((opt) => {
                const active = lrLuggage === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.luggageCard, {
                      backgroundColor: active ? LONGRIDE_COLOR + '12' : '#fff',
                      borderColor:     active ? LONGRIDE_COLOR : '#E8E8E8',
                      borderWidth:     active ? 2 : 1,
                    }]}
                    onPress={() => setLrLuggage(opt.id)}
                    activeOpacity={0.8}
                  >
                    {active && (
                      <View style={[styles.cardCheck, { backgroundColor: LONGRIDE_COLOR }]}>
                        <Ionicons name="checkmark" size={8} color="#fff" />
                      </View>
                    )}
                    <View style={[styles.luggageIconCircle, {
                      backgroundColor: active ? LONGRIDE_COLOR + '20' : '#F5F5F7',
                    }]}>
                      <Ionicons name={opt.icon} size={22} color={active ? LONGRIDE_COLOR : '#AAA'} />
                    </View>
                    <Text style={[styles.luggageLabel, { color: active ? LONGRIDE_COLOR : '#333' }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.luggageDesc}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </CardSection>
        )}

        {/* ── PASSENGER BAGS (Long Ride request only) ── */}
        {isLongRide && postType === 'request' && showRoute && (
          <CardSection>
            <SectionTitle text="YOUR LUGGAGE" />
            <Text style={styles.hint}>How many bags are you bringing?</Text>
            <View style={styles.bagsRow}>
              {PASSENGER_BAGS_OPTIONS.map((opt) => {
                const active = lrBags === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.bagsCard, {
                      backgroundColor: active ? REQUEST_COLOR + '12' : '#F8F8F8',
                      borderColor:     active ? REQUEST_COLOR : '#EBEBEB',
                      borderWidth:     active ? 2 : 1,
                    }]}
                    onPress={() => setLrBags(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.bagsIconCircle, {
                      backgroundColor: active ? REQUEST_COLOR + '20' : '#ECECEC',
                    }]}>
                      <Ionicons name={opt.icon} size={18} color={active ? REQUEST_COLOR : '#AAA'} />
                    </View>
                    <Text style={[styles.bagsLabel, { color: active ? REQUEST_COLOR : '#222' }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.bagsDesc}>{opt.desc}</Text>
                    {active && (
                      <View style={[styles.cardCheck, { backgroundColor: REQUEST_COLOR }]}>
                        <Ionicons name="checkmark" size={8} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </CardSection>
        )}

        {/* ── NOTES ── */}
        {showRoute && (
          <CardSection>
            <View style={styles.notesHeader}>
              <View style={styles.notesIconCircle}>
                <Ionicons name="create-outline" size={15} color="#888" />
              </View>
              <Text style={styles.notesTitleText}>NOTES</Text>
              <Text style={styles.notesOptional}>optional</Text>
            </View>

            <View style={styles.notesInputWrap}>
              <TextInput
                style={[styles.notesInput, { color: colors.textPrimary || '#111' }]}
                placeholder={
                  isLongRide
                    ? 'Departure point, parking spot, special instructions…'
                    : postType === 'offer'
                      ? 'Anything else riders should know…'
                      : 'Anything drivers should know — luggage, flexibility…'
                }
                placeholderTextColor="#C8C8C8"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.charCount}>{notes.length}/200</Text>
            </View>

            <View style={styles.costNotice}>
              <Ionicons name="lock-closed-outline" size={12} color="#2980B9" />
              <Text style={styles.costNoticeText}>
                {postType === 'offer'
                  ? 'Cost sharing is discussed privately with riders in chat'
                  : 'Cost sharing is discussed privately with the driver in chat'}
              </Text>
            </View>
          </CardSection>
        )}

        {/* ── SUBMIT ── */}
        <View style={styles.submitWrap}>
          <TouchableOpacity
            style={[styles.submitBtn, {
              backgroundColor: accent,
              opacity: canSubmit ? 1 : 0.38,
              shadowColor: accent,
            }]}
            onPress={handlePost}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.submitInner}>
                <Ionicons
                  name={postType === 'offer' ? (isLongRide ? 'map' : 'car-sport') : 'hand-left'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.submitBtnText}>
                  {postType === 'offer'
                    ? (isLongRide ? 'Post Long Ride' : 'Share My Ride')
                    : (isLongRide ? 'Request Long Ride' : 'Request a Seat')}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Maybe later</Text>
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
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CardSection({ children }) {
  return (
    <View style={[styles.cardSection, SHADOW]}>
      {children}
    </View>
  );
}

function SectionTitle({ text, required }) {
  return (
    <Text style={styles.sectionTitle}>
      {text}
      {required && <Text style={{ color: '#E63946' }}>  ●</Text>}
    </Text>
  );
}

function FieldLabel({ text }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}


function DirCard({ active, color, icon, title, sub, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.dirCard, {
        backgroundColor: active ? color + '10' : '#F8F8F8',
        borderColor:     active ? color : '#EBEBEB',
        borderWidth:     active ? 2 : 1,
      }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.dirIconCircle, { backgroundColor: active ? color + '20' : '#ECECEC' }]}>
        <Ionicons name={icon} size={18} color={active ? color : '#AAA'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.dirTitle, { color: active ? color : '#222' }]}>{title}</Text>
        <Text style={styles.dirSub}>{sub}</Text>
      </View>
      {active
        ? <Ionicons name="checkmark-circle" size={18} color={color} />
        : <View style={styles.dirRadio} />
      }
    </TouchableOpacity>
  );
}

function Stepper({ value, onChange, min, max, color }) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: value <= min ? '#DDD' : color + '60' }]}
        onPress={() => { if (value > min) onChange(value - 1); }}
        disabled={value <= min}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={22} color={value <= min ? '#CCC' : color} />
      </TouchableOpacity>

      <View style={styles.stepperVal}>
        <Text style={[styles.stepperNum, { color }]}>{value}</Text>
      </View>

      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: value >= max ? '#DDD' : color + '60' }]}
        onPress={() => { if (value < max) onChange(value + 1); }}
        disabled={value >= max}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={22} color={value >= max ? '#CCC' : color} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Compact fixed header
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 8,
  },
  navBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingBottom: 64, paddingTop: 12, gap: 12 },

  // Card section
  cardSection: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', color: '#BBBBBB',
    letterSpacing: 1.4, marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: '#888',
    letterSpacing: 0.3, marginBottom: 7, marginTop: 2,
  },
  hint: { fontSize: 11, color: '#BBB', lineHeight: 15, marginTop: 5 },

  // Community banner
  communityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EBF5FB', borderRadius: 10, padding: 10, marginTop: 12,
  },
  communityText: { flex: 1, fontSize: 11, color: '#2980B9', lineHeight: 15 },

  // Type toggle (horizontal segmented control)
  typeToggleTrack: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 14, padding: 4, gap: 0,
  },
  typeToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 10,
  },
  typeToggleEmoji: { fontSize: 16 },
  typeToggleLabel: { fontSize: 13, fontWeight: '700' },
  // thin gradient-style vertical divider (transparent → solid → transparent)
  typeToggleDivider: {
    width: 1, alignSelf: 'stretch', marginHorizontal: 2,
  },
  typeToggleDividerTop: { flex: 1, backgroundColor: 'transparent',
    borderRightWidth: 1, borderRightColor: 'rgba(180,180,180,0)' },
  typeToggleDividerMid: { flex: 2,
    borderRightWidth: 1, borderRightColor: 'rgba(180,180,180,0.55)' },
  typeToggleDividerBot: { flex: 1, backgroundColor: 'transparent',
    borderRightWidth: 1, borderRightColor: 'rgba(180,180,180,0)' },

  // Category grid (wrapping, all visible)
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    alignItems: 'center', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 10,
    width: '30%', position: 'relative', overflow: 'hidden',
    minWidth: 90,
  },
  catChipEmoji: { fontSize: 22, marginBottom: 4 },
  catChipLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  catChipDesc: { fontSize: 9, color: '#BBB', marginTop: 2, textAlign: 'center' },
  catActiveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
  },

  // Shared check badge (used by luggage cards)
  cardCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Long ride banner
  longRideBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: LONGRIDE_COLOR + '12',
    borderRadius: 18, padding: 15,
    borderLeftWidth: 4, borderLeftColor: LONGRIDE_COLOR,
  },
  longRideBannerEmoji: { fontSize: 26 },
  longRideBannerTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  longRideBannerSub: { fontSize: 11, color: '#777', lineHeight: 16 },

  // University list rows
  uniList: { gap: 8 },
  uniRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 12,
  },
  uniLogoWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  uniLogo: { width: 26, height: 26 },
  uniShort: { fontSize: 13, fontWeight: '700' },
  uniTag: { fontSize: 10, color: '#AAA', marginTop: 1 },

  // Direction list rows
  dirStack: { gap: 8 },
  dirCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 12,
  },
  dirIconCircle: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dirTitle: { fontSize: 13, fontWeight: '700' },
  dirSub: { fontSize: 10, color: '#AAA', marginTop: 2 },
  dirRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#DDD',
  },

  // Route card
  routeCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#EDEDED',
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDotCol: { width: 20, alignItems: 'center', paddingTop: 18 },
  routeDot: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 3,
  },
  routeFieldMeta: {
    fontSize: 9, fontWeight: '800', color: '#BBBBBB',
    letterSpacing: 1.2, marginBottom: 3,
  },
  routeInput: {
    fontSize: 15, fontWeight: '500', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#EAEAEA',
  },
  routePrefilledVal: {
    fontSize: 15, fontWeight: '700', color: '#27AE60', paddingVertical: 8,
  },
  routeConnector: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 8, marginVertical: 4,
  },
  routeConnectorLine: { flexDirection: 'column', gap: 3, width: 12, alignItems: 'center' },
  routeConnectorDash: { width: 2, height: 5, borderRadius: 1, backgroundColor: '#CCC' },
  swapBtn: {
    marginLeft: 'auto', width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EFEFEF', alignItems: 'center', justifyContent: 'center',
  },

  // Date/time
  dateTimeRow: { flexDirection: 'row', gap: 10 },

  // Toggle (one-way / round trip)
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  toggleLabel: { fontSize: 13, fontWeight: '700' },

  // Input / textarea
  inputBox: {
    backgroundColor: '#F9F9FB', borderRadius: 12,
    padding: 13, fontSize: 14, borderWidth: 1, borderColor: '#EAEAEA',
  },
  // WHEN — anytime toggle
  whenHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 0,
  },
  anyTimeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#F8F8F8',
  },
  anyTimeDot: { width: 7, height: 7, borderRadius: 3.5 },
  anyTimeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  anyTimeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1,
    padding: 14, marginTop: 12,
  },
  anyTimeBadgeTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  anyTimeBadgeSub: { fontSize: 11, color: '#888', lineHeight: 16 },

  // Passenger bags
  bagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  bagsCard: {
    width: '47%', borderRadius: 14, padding: 12, alignItems: 'center',
    gap: 5, position: 'relative',
  },
  bagsIconCircle: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  bagsLabel: { fontSize: 13, fontWeight: '700' },
  bagsDesc:  { fontSize: 10, color: '#AAA', textAlign: 'center', lineHeight: 13 },

  // NOTES
  notesHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  notesIconCircle: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  notesTitleText: {
    fontSize: 10, fontWeight: '800', color: '#BBBBBB', letterSpacing: 1.4, flex: 1,
  },
  notesOptional: { fontSize: 10, color: '#CCC', fontStyle: 'italic' },
  notesInputWrap: {
    backgroundColor: '#F9F9FB', borderRadius: 14,
    borderWidth: 1, borderColor: '#EAEAEA', padding: 12,
  },
  notesInput: {
    fontSize: 14, lineHeight: 20, minHeight: 72, textAlignVertical: 'top',
  },
  charCount: { fontSize: 10, color: '#CCC', textAlign: 'right', marginTop: 6 },
  costNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EBF5FB', borderRadius: 10, padding: 10, marginTop: 12,
  },
  costNoticeText: { flex: 1, fontSize: 11, color: '#2980B9', lineHeight: 15 },

  // Stepper
  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 0, marginTop: 4,
  },
  stepperBtn: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  stepperVal: { width: 88, alignItems: 'center' },
  stepperNum: { fontSize: 48, fontWeight: '800', letterSpacing: -3 },

  // Luggage
  luggageRow: { flexDirection: 'row', gap: 8 },
  luggageCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center',
    gap: 6, position: 'relative', ...SHADOW,
  },
  luggageIconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  luggageLabel: { fontSize: 12, fontWeight: '700' },
  luggageDesc: { fontSize: 10, color: '#AAA', textAlign: 'center', lineHeight: 13 },

  // Submit
  submitWrap: { gap: 10, marginTop: 8 },
  submitBtn: {
    borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  submitInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  submitBtnText: {
    color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.1,
  },
  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: '#BBB', fontWeight: '500' },
});
