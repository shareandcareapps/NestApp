// core/auth/screens/SignupScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../../database/index';
import useAppStore from '../../store/index';
import { useTheme } from '../../theme/ThemeContext';

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAppStore((state) => state.setUser);
  const setSession = useAppStore((state) => state.setSession);
  const colors = useTheme();

  async function handleSignup() {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert('Signup Failed', error.message);
      return;
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, full_name: fullName, phone, city: 'St. Louis', is_verified: false });
    setLoading(false);
    if (profileError) {
      Alert.alert('Error', 'Account created but profile setup failed.');
      return;
    }
    setUser(data.user);
    setSession(data.session);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.logoArea}>
          <Text style={[styles.appName, { color: colors.secondary }]}>NestApp</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Join the St. Louis Indian community
          </Text>
        </View>
        <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { label: 'Full Name *', value: fullName, onChange: setFullName, placeholder: 'Enter your full name' },
            { label: 'Email *', value: email, onChange: setEmail, placeholder: 'Enter your email', keyboard: 'email-address', caps: 'none' },
            { label: 'Phone (optional)', value: phone, onChange: setPhone, placeholder: 'Enter your phone number', keyboard: 'phone-pad' },
            { label: 'Password *', value: password, onChange: setPassword, placeholder: 'Minimum 6 characters', secure: true },
            { label: 'Confirm Password *', value: confirmPassword, onChange: setConfirmPassword, placeholder: 'Re-enter your password', secure: true },
          ].map((field) => (
            <View key={field.label}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{field.label}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textLight}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType={field.keyboard || 'default'}
                autoCapitalize={field.caps || 'sentences'}
                secureTextEntry={field.secure || false}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={[styles.loginLinkBold, { color: colors.primary }]}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 30 },
  appName: { fontSize: 32, fontWeight: 'bold' },
  tagline: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  form: { borderRadius: 16, padding: 20, borderWidth: 0.5 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginLinkText: { fontSize: 13 },
  loginLinkBold: { fontWeight: '600' },
});