import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../database/index';
import { fonts, spacing, borderRadius, shadows } from '../theme/index';

const STATUS_COLORS = {
  pending:   '#F4A833',
  reviewed:  '#0099FF',
  resolved:  '#00C48C',
  dismissed: '#8E8E93',
};

function ReportCard({ report, onAction }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, shadows.small]}
      onPress={() => setExpanded(p => !p)}
      activeOpacity={0.85}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[report.status] }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.reasonTxt, { color: theme.textPrimary }]} numberOfLines={1}>{report.reason}</Text>
          <Text style={[styles.metaTxt, { color: theme.textLight }]}>
            {report.reported_user_id ? `User: ${report.reported_profile?.username || '—'}` : ''}
            {report.ride_id ? '  ·  Ride report' : ''}
            {report.listing_id ? '  ·  Listing report' : ''}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[report.status] + '22', borderColor: STATUS_COLORS[report.status] + '55' }]}>
          <Text style={[styles.badgeTxt, { color: STATUS_COLORS[report.status] }]}>{report.status}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandBody}>
          <Text style={[styles.fieldLabel, { color: theme.textLight }]}>Reporter</Text>
          <Text style={[styles.fieldVal, { color: theme.textSecondary }]}>{report.reporter_profile?.username || report.reporter_id}</Text>

          {report.notes ? (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textLight }]}>Notes</Text>
              <Text style={[styles.fieldVal, { color: theme.textSecondary }]}>{report.notes}</Text>
            </>
          ) : null}

          <Text style={[styles.fieldLabel, { color: theme.textLight }]}>Submitted</Text>
          <Text style={[styles.fieldVal, { color: theme.textSecondary }]}>
            {new Date(report.created_at).toLocaleDateString()}
          </Text>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {report.reported_user_id && report.status !== 'resolved' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B3040' }]}
                onPress={() => onAction('suspend', report)}
              >
                <Ionicons name="ban-outline" size={14} color="#FF3B30" />
                <Text style={[styles.actionTxt, { color: '#FF3B30' }]}>Suspend User</Text>
              </TouchableOpacity>
            )}
            {report.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#00C48C15', borderColor: '#00C48C40' }]}
                  onPress={() => onAction('resolve', report)}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color="#00C48C" />
                  <Text style={[styles.actionTxt, { color: '#00C48C' }]}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => onAction('dismiss', report)}
                >
                  <Ionicons name="close-circle-outline" size={14} color={theme.textLight} />
                  <Text style={[styles.actionTxt, { color: theme.textLight }]}>Dismiss</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AdminPanelScreen({ navigation }) {
  const theme = useTheme();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (tab === 'reports') {
        let q = supabase
          .from('reports')
          .select(`
            *,
            reporter_profile:profiles!reports_reporter_id_fkey(username),
            reported_profile:profiles!reports_reported_user_id_fkey(username)
          `)
          .order('created_at', { ascending: false });
        if (filter !== 'all') q = q.eq('status', filter);
        const { data, error } = await q;
        if (error) throw error;
        setReports(data || []);
      } else {
        const { data, error } = await supabase
          .from('feedback')
          .select('*, user_profile:profiles!feedback_user_id_fkey(username)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setFeedback(data || []);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(type, report) {
    if (type === 'suspend') {
      Alert.alert(
        'Suspend User',
        `Suspend @${report.reported_profile?.username || 'this user'}? They will be unable to use the app.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Suspend', style: 'destructive',
            onPress: async () => {
              await supabase.from('profiles').update({ suspended: true }).eq('id', report.reported_user_id);
              await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
              load(true);
            },
          },
        ]
      );
    } else {
      const newStatus = type === 'resolve' ? 'resolved' : 'dismissed';
      await supabase.from('reports').update({ status: newStatus }).eq('id', report.id);
      load(true);
    }
  }

  const FILTERS = ['pending', 'reviewed', 'resolved', 'dismissed', 'all'];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Moderation Panel</Text>
        <View style={[styles.adminBadge, { backgroundColor: '#9B59B620' }]}>
          <Text style={[styles.adminBadgeTxt, { color: '#9B59B6' }]}>ADMIN</Text>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
        {['reports', 'feedback'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: '#9B59B6', borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabTxt, { color: tab === t ? '#9B59B6' : theme.textLight }]}>
              {t === 'reports' ? 'Reports' : 'Feedback'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status filters (reports only) */}
      {tab === 'reports' && (
        <View style={[styles.filterRow, { borderBottomColor: theme.border }]}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && { borderBottomColor: '#9B59B6', borderBottomWidth: 2 }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTxt, { color: filter === f ? '#9B59B6' : theme.textLight }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#9B59B6" />
      ) : tab === 'reports' ? (
        <FlatList
          data={reports}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#9B59B6" />}
          renderItem={({ item }) => <ReportCard report={item} onAction={handleAction} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.textLight} />
              <Text style={[styles.emptyTxt, { color: theme.textLight }]}>No {filter === 'all' ? '' : filter} reports</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={feedback}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#9B59B6" />}
          renderItem={({ item }) => {
            const topicColors = { bug: '#FF3B30', feature: '#0099FF', content: '#00C48C', other: '#9B59B6' };
            const color = topicColors[item.topic] || '#9B59B6';
            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reasonTxt, { color: theme.textPrimary }]}>{item.topic}</Text>
                    <Text style={[styles.metaTxt, { color: theme.textLight }]}>@{item.user_profile?.username || 'anonymous'} · {new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                <Text style={[{ color: theme.textSecondary, fontSize: fonts.sizes.sm, marginTop: 10, lineHeight: 20 }]}>{item.message}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.textLight} />
              <Text style={[styles.emptyTxt, { color: theme.textLight }]}>No feedback yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: fonts.sizes.lg, fontWeight: '700' },
  adminBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  adminBadgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 12, marginRight: 8 },
  tabTxt: { fontSize: fonts.sizes.sm, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  filterTxt: { fontSize: fonts.sizes.xs, fontWeight: '600' },
  card: {
    borderRadius: borderRadius.md, borderWidth: StyleSheet.hairlineWidth,
    padding: 14, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  reasonTxt: { fontSize: fonts.sizes.sm, fontWeight: '600' },
  metaTxt: { fontSize: 11, marginTop: 2 },
  badge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: borderRadius.sm, borderWidth: 1,
  },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  expandBody: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA', gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  fieldVal: { fontSize: fonts.sizes.sm },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  actionTxt: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTxt: { fontSize: fonts.sizes.md },
});
