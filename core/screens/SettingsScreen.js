// core/screens/SettingsScreen.js
// CORE SCREEN — Settings, Profile and Logout
// Accessible from every tab via the avatar button

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const user = useAppStore((state) => state.user);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const colors = useTheme();
  const [profile, setProfile] = useState(null);
  const systemTheme = useColorScheme();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!error) setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }

  const name = profile?.full_name || user?.email || 'User';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarColors = [
    '#E63946', '#1D3557', '#2ECC71',
    '#3498DB', '#9B59B6', '#F39C12',
  ];
  const colorIndex = name.charCodeAt(0) % avatarColors.length;

  return (
    <ScrollView
      key={themeMode}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.navBackground }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColors[colorIndex] }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {profile?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Account Section */}
      <View style={[styles.section, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        <Text style={[styles.sectionTitle, { color: colors.textLight }]}>ACCOUNT</Text>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          onPress={() => Alert.alert('Coming Soon', 'Edit profile will be available soon!')}
        >
          <Text style={styles.menuItemEmoji}>👤</Text>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textLight }]}>Name, phone number</Text>
          </View>
          <Text style={[styles.menuItemArrow, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          onPress={() => Alert.alert('Coming Soon', 'My Listings will be available soon!')}
        >
          <Text style={styles.menuItemEmoji}>🏠</Text>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>My Listings</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textLight }]}>View and manage your posts</Text>
          </View>
          <Text style={[styles.menuItemArrow, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          onPress={() => Alert.alert('Coming Soon', 'My Rides will be available soon!')}
        >
          <Text style={styles.menuItemEmoji}>🚗</Text>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>My Rides</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textLight }]}>View and manage your rides</Text>
          </View>
          <Text style={[styles.menuItemArrow, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Appearance Section */}
      <View style={[styles.section, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        <Text style={[styles.sectionTitle, { color: colors.textLight }]}>APPEARANCE</Text>
        <View style={styles.themeContainer}>
          {['light', 'dark', 'auto'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.themeButton,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
                themeMode === t && {
                  borderColor: colors.navBackground,
                  borderWidth: 2,
                  backgroundColor: colors.infoBackground,
                },
              ]}
              onPress={() => setThemeMode(t)}
            >
              <Text style={styles.themeEmoji}>
                {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '⚙️'}
              </Text>
              <Text style={[
                styles.themeLabel,
                { color: colors.textSecondary },
                themeMode === t && { color: colors.textPrimary, fontWeight: '700' },
              ]}>
                {t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'Auto'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {themeMode === 'auto' && (
          <Text style={[styles.themeNote, { color: colors.textLight }]}>
            Currently following {systemTheme} mode
          </Text>
        )}
      </View>

      {/* App Info Section */}
      <View style={[styles.section, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        <Text style={[styles.sectionTitle, { color: colors.textLight }]}>APP</Text>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be added before launch.')}
        >
          <Text style={styles.menuItemEmoji}>📋</Text>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
          </View>
          <Text style={[styles.menuItemArrow, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          onPress={() => Alert.alert('Terms & Conditions', 'Terms will be added before launch.')}
        >
          <Text style={styles.menuItemEmoji}>📄</Text>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Terms & Conditions</Text>
          </View>
          <Text style={[styles.menuItemArrow, { color: colors.border }]}>›</Text>
        </TouchableOpacity>
        <View style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
          <Text style={styles.menuItemEmoji}>ℹ️</Text>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Version</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textLight }]}>1.0.0 (Beta)</Text>
          </View>
        </View>
      </View>

      {/* Location Section */}
      <View style={[styles.section, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        <Text style={[styles.sectionTitle, { color: colors.textLight }]}>LOCATION</Text>
        <View style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
          <Text style={styles.menuItemEmoji}>📍</Text>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Current City</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textLight }]}>St. Louis, Missouri</Text>
          </View>
          <View style={[styles.lockedBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.lockedText, { color: colors.textLight }]}>v1</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={[styles.section, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        <TouchableOpacity
          style={[styles.logoutButton, {
            backgroundColor: colors.errorBackground,
            borderColor: colors.error + '44',
          }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { color: colors.error }]}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textLight }]}>
          Made with ❤️ for the Indian community in St. Louis
        </Text>
        <Text style={[styles.footerSubText, { color: colors.textLight }]}>
          Taru Labs
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#2ECC71',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  menuItemEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItemArrow: {
    fontSize: 20,
    fontWeight: '300',
  },
  themeContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  themeButton: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    gap: 4,
  },
  themeEmoji: {
    fontSize: 22,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  themeNote: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  lockedBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logoutButton: {
    margin: 16,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 0.5,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 12,
    fontWeight: '500',
  },
});