// core/screens/MyRidesScreen.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import EmptyState from '../components/EmptyState';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';

const JADE = '#00C48C';

const TABS = [
  { id: 'upcoming', label: 'Upcoming', icon: 'flash-outline' },
  { id: 'past',     label: 'Past',     icon: 'time-outline' },
];

function RideCard({ item, onEdit, onDelete, theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const isRequest = item.ride_type === 'request';
  const rideDate  = new Date(item.ride_date);
  const isPast    = rideDate < new Date();
  const typeColor = isRequest ? '#9B59B6' : JADE;
  const dateStr   = rideDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr   = rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      activeOpacity={1}
    >
      <Animated.View style={[cardS.card, { backgroundColor: theme.card, transform: [{ scale }], opacity: isPast ? 0.75 : 1 }, shadows.small]}>
        {/* Top accent bar */}
        <LinearGradient colors={isRequest ? ['#9B59B6','#6C3483'] : [JADE,'#007A5E']} style={cardS.accentBar} start={{x:0,y:0}} end={{x:1,y:0}} />

        <View style={cardS.body}>
          {/* Header */}
          <View style={cardS.headerRow}>
            <View style={[cardS.typeBadge, { backgroundColor: typeColor + '18' }]}>
              <Ionicons name={isRequest ? 'person-outline' : 'car-outline'} size={12} color={typeColor} />
              <Text style={[cardS.typeTxt, { color: typeColor }]}>{isRequest ? 'Requesting Ride' : 'Offering Ride'}</Text>
            </View>
            {item.cost_share && (
              <View style={cardS.priceBadge}>
                <Text style={[cardS.priceTxt, { color: JADE }]}>${item.cost_share}/person</Text>
              </View>
            )}
          </View>

          {/* Route */}
          <View style={cardS.routeRow}>
            <View style={cardS.routeCol}>
              <View style={[cardS.routeDot, { backgroundColor: JADE }]} />
              <Text style={[cardS.routeTxt, { color: theme.textPrimary }]} numberOfLines={1}>{item.from_location}</Text>
            </View>
            <View style={cardS.routeLine}>
              {[0,1,2].map(i => <View key={i} style={[cardS.routeDash, { backgroundColor: theme.border }]} />)}
            </View>
            <Ionicons name="arrow-forward" size={14} color={JADE} />
            <View style={cardS.routeCol}>
              <View style={[cardS.routeDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={[cardS.routeTxt, { color: theme.textPrimary }]} numberOfLines={1}>{item.to_location}</Text>
            </View>
          </View>

          {/* Meta chips */}
          <View style={cardS.metaRow}>
            <View style={[cardS.metaChip, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="calendar-outline" size={12} color={JADE} />
              <Text style={[cardS.metaTxt, { color: theme.textSecondary }]}>{dateStr}</Text>
            </View>
            <View style={[cardS.metaChip, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="time-outline" size={12} color={JADE} />
              <Text style={[cardS.metaTxt, { color: theme.textSecondary }]}>{timeStr}</Text>
            </View>
            {item.seats_available != null && (
              <View style={[cardS.metaChip, { backgroundColor: theme.inputBackground }]}>
                <Ionicons name="person-outline" size={12} color={JADE} />
                <Text style={[cardS.metaTxt, { color: theme.textSecondary }]}>{item.seats_available} seat{item.seats_available !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        {!isPast && (
          <View style={[cardS.actions, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={[cardS.btn, { backgroundColor: '#0099FF18', borderColor: '#0099FF', flex: 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(item); }}>
              <Ionicons name="pencil-outline" size={14} color="#0099FF" />
              <Text style={[cardS.btnTxt, { color: '#0099FF' }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cardS.btnIcon, { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(item.id); }}>
              <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const cardS = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, marginHorizontal: spacing.md, marginBottom: 14, overflow: 'hidden' },
  accentBar: { height: 4 },
  body: { padding: 14, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  typeTxt: { fontSize: 11, fontWeight: '700' },
  priceBadge: {},
  priceTxt: { fontSize: fonts.sizes.md, fontWeight: '800' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeTxt: { flex: 1, fontSize: fonts.sizes.sm, fontWeight: '700' },
  routeLine: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  routeDash: { width: 4, height: 2, borderRadius: 1 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  metaTxt: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10, borderTopWidth: 0.5 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  btnTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  btnIcon: { width: 38, height: 38, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

export default function MyRidesScreen({ navigation }) {
  const user   = useAppStore(s => s.user);
  const theme  = useTheme();
  const insets = useSafeAreaInsets();

  const [rides,      setRides]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState('upcoming');

  const fetchMyRides = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase.from('rides').select('*')
        .or(`driver_id.eq.${user.id},requester_id.eq.${user.id}`)
        .order('ride_date', { ascending: false });
      if (error) throw error;
      setRides(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchMyRides(); }, [fetchMyRides]));

  async function handleRefresh() { setRefreshing(true); await fetchMyRides(); setRefreshing(false); }

  async function handleDelete(id) {
    Alert.alert('Delete Ride', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await supabase.from('rides').delete().eq('id', id); setRides(p => p.filter(r => r.id !== id)); }
          catch { Alert.alert('Error', 'Could not delete ride.'); }
        }
      },
    ]);
  }

  const now     = new Date();
  const visible = rides.filter(r => tab === 'upcoming' ? new Date(r.ride_date) >= now : new Date(r.ride_date) < now);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator size="large" color={JADE} /></View>;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#2D1B69','#1A0F3D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Rides</Text>
          <View style={{ width: 40 }} />
        </View>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(t => {
            const active = tab === t.id;
            const count  = rides.filter(r => t.id === 'upcoming' ? new Date(r.ride_date) >= now : new Date(r.ride_date) < now).length;
            return (
              <TouchableOpacity key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.id); }}>
                <Ionicons name={t.icon} size={14} color={active ? '#2D1B69' : 'rgba(255,255,255,0.65)'} />
                <Text style={[styles.tabTxt, { color: active ? '#2D1B69' : 'rgba(255,255,255,0.65)' }]}>{t.label}</Text>
                {count > 0 && <View style={[styles.tabBadge, { backgroundColor: active ? '#2D1B6930' : 'rgba(255,255,255,0.2)' }]}><Text style={[styles.tabBadgeTxt, { color: active ? '#2D1B69' : '#fff' }]}>{count}</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {visible.length === 0 ? (
        <EmptyState
          type="rides"
          title={tab === 'upcoming' ? 'No upcoming rides' : 'No past rides'}
          body={tab === 'upcoming' ? 'Your upcoming carpool posts will appear here.' : 'Completed rides will appear here.'}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <RideCard
              item={item} theme={theme}
              onEdit={r => navigation.navigate('Carpool', { screen: 'EditRide', params: { ride: r } })}
              onDelete={handleDelete}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={JADE} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: fonts.sizes.lg, fontWeight: '800' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: borderRadius.full, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.12)' },
  tabActive: { backgroundColor: '#fff' },
  tabTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  tabBadge: { borderRadius: borderRadius.full, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeTxt: { fontSize: 11, fontWeight: '700' },
});
