// core/screens/MyRidesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';

export default function MyRidesScreen({ navigation }) {
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchMyRides(); }, []);

  async function fetchMyRides() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .or(`driver_id.eq.${user.id},requester_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchMyRides();
    setRefreshing(false);
  }

  async function handleDelete(id) {
    Alert.alert(
      'Delete Ride',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('rides').delete().eq('id', id);
              setRides((prev) => prev.filter((r) => r.id !== id));
            } catch (error) {
              Alert.alert('Error', 'Could not delete ride.');
            }
          },
        },
      ]
    );
  }

  const categoryEmojis = { airport: '✈️', university: '🎓', temple: '🛕', general: '🚗' };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No rides yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your posted rides and requests will appear here
          </Text>
          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: '#2ECC71' }]}
            onPress={() => navigation.navigate('Rides')}
          >
            <Text style={styles.postButtonText}>+ Post a Ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2ECC71" />
          }
          renderItem={({ item }) => {
            const isRequest = item.ride_type === 'request';
            const rideDate = new Date(item.ride_date);
            return (
              <View style={[styles.card, {
                backgroundColor: colors.card,
                borderColor: isRequest ? '#9B59B630' : colors.border,
              }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, {
                    backgroundColor: isRequest ? '#9B59B620' : '#2ECC7120',
                  }]}>
                    <Text style={[styles.typeBadgeText, {
                      color: isRequest ? '#9B59B6' : '#27AE60',
                    }]}>
                      {isRequest ? '🙋 Request' : '🚗 Offer'} · {categoryEmojis[item.category]} {item.category}
                    </Text>
                  </View>
                  {item.cost_share && (
                    <Text style={[styles.cost, { color: '#27AE60' }]}>
                      ${item.cost_share}/person
                    </Text>
                  )}
                </View>
                <View style={styles.routeRow}>
                  <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.from_location}
                  </Text>
                  <Text style={[styles.routeArrow, { color: colors.textLight }]}>→</Text>
                  <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.to_location}
                  </Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  📅 {rideDate.toLocaleDateString()} · 🕐 {rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={[styles.cardActions, { borderTopColor: colors.borderLight }]}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.infoBackground, borderColor: colors.info }]}
                    onPress={() => navigation.navigate('Rides', {
                      screen: 'EditRide',
                      params: { ride: item },
                    })}
                  >
                    <Text style={[styles.editButtonText, { color: colors.info }]}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  postButton: { borderRadius: 12, padding: 14, paddingHorizontal: 24, marginTop: 20 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  cost: { fontSize: 15, fontWeight: '700' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  routeText: { flex: 1, fontSize: 14, fontWeight: '600' },
  routeArrow: { fontSize: 16 },
  dateText: { fontSize: 12, marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 0.5 },
  editButton: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5 },
  editButtonText: { fontSize: 13, fontWeight: '600' },
  deleteButton: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5 },
  deleteButtonText: { fontSize: 13, fontWeight: '600' },
});