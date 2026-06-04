// core/screens/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';

export default function EditProfileScreen({ navigation }) {
  const user = useAppStore((state) => state.user);
  const colors = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

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
      if (!error && data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!username) {
      Alert.alert('Error', 'Username is required');
      return;
    }
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers and underscores');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.toLowerCase(),
          full_name: fullName,
          phone,
          bio,
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Username taken', 'This username is already in use. Please choose another.');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Could not save profile. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>

        {/* Privacy Notice */}
        <View style={[styles.privacyBox, { backgroundColor: colors.infoBackground }]}>
          <Text style={[styles.privacyTitle, { color: colors.info }]}>
            🔒 Your Privacy Matters
          </Text>
          <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
            Your username is shown publicly on listings and rides. Your real name is kept private and never shown to other users.
          </Text>
        </View>

        {/* Username */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Username * (public)
        </Text>
        <View style={[styles.usernameContainer, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }]}>
          <Text style={[styles.usernamePrefix, { color: colors.textLight }]}>@</Text>
          <TextInput
            style={[styles.usernameInput, { color: colors.textPrimary }]}
            placeholder="e.g. stl_student"
            placeholderTextColor={colors.textLight}
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            autoCapitalize="none"
            maxLength={30}
          />
        </View>
        <Text style={[styles.hint, { color: colors.textLight }]}>
          This is shown publicly on your listings and rides. Choose something you're comfortable sharing.
        </Text>

        {/* Full Name */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Full Name (private)
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="Your real name"
          placeholderTextColor={colors.textLight}
          value={fullName}
          onChangeText={setFullName}
        />
        <Text style={[styles.hint, { color: colors.textLight }]}>
          Never shown to other users. Used only for account purposes.
        </Text>

        {/* Phone */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Phone Number (private, optional)
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="e.g. +1 314 555 0000"
          placeholderTextColor={colors.textLight}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={[styles.hint, { color: colors.textLight }]}>
          Never shown publicly. You can choose to share it privately in messages.
        </Text>

        {/* Bio */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Bio (optional)
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="A short intro about yourself..."
          placeholderTextColor={colors.textLight}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={150}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 20, paddingBottom: 40 },
  privacyBox: { borderRadius: 12, padding: 16, marginBottom: 8 },
  privacyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  privacyText: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 20 },
  hint: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 0.5,
    paddingHorizontal: 12,
  },
  usernamePrefix: { fontSize: 18, fontWeight: '600', marginRight: 4 },
  usernameInput: { flex: 1, padding: 12, fontSize: 15 },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 28 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 15 },
});