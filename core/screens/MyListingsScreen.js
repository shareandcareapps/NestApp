// core/screens/MyListingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';

const categoryColors = { accommodation: '#E63946', jobs: '#2ECC71', buysell: '#3498DB', food: '#F39C12' };
const categoryEmojis = { accommodation: '🏠', jobs: '💼', buysell: '🛍️', food: '🍱' };

export default function MyListingsScreen({ navigation }) {
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchMyListings(); }, []);

  async function fetchMyListings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchMyListings();
    setRefreshing(false);
  }

  async function handleDelete(id) {
    Alert.alert(
      'Delete Listing',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('listings').delete().eq('id', id);
              setListings((prev) => prev.filter((l) => l.id !== id));
            } catch (error) {
              Alert.alert('Error', 'Could not delete listing.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No listings yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your posted listings will appear here
          </Text>
          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Classifieds')}
          >
            <Text style={styles.postButtonText}>+ Post a Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.categoryBadge, {
                  backgroundColor: categoryColors[item.category] + '20',
                }]}>
                  <Text style={styles.categoryEmoji}>{categoryEmojis[item.category]}</Text>
                  <Text style={[styles.categoryText, { color: categoryColors[item.category] }]}>
                    {item.category}
                  </Text>
                </View>
                {item.price && (
                  <Text style={[styles.price, { color: categoryColors[item.category] }]}>
                    ${item.price}
                  </Text>
                )}
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <Text style={[styles.cardDate, { color: colors.textLight }]}>
                Posted {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <View style={[styles.cardActions, { borderTopColor: colors.borderLight }]}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: colors.infoBackground, borderColor: colors.info }]}
                  onPress={() => navigation.navigate('Classifieds', {
                    screen: 'EditListing',
                    params: { listing: item },
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
          )}
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
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  categoryEmoji: { fontSize: 14 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  price: { fontSize: 16, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardDescription: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardDate: { fontSize: 11, marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 0.5 },
  editButton: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5 },
  editButtonText: { fontSize: 13, fontWeight: '600' },
  deleteButton: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5 },
  deleteButtonText: { fontSize: 13, fontWeight: '600' },
});