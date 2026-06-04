// core/auth/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../../database/index';
import useAppStore from '../../store/index';
import { useTheme } from '../../theme/ThemeContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAppStore((state) => state.setUser);
  const setSession = useAppStore((state) => state.setSession);
  const colors = useTheme();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
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
      <View style={styles.inner}>
        <View style={styles.logoArea}>
          <Text style={[styles.appName, { color: colors.secondary }]}>NestApp</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Your Indian community in St. Louis
          </Text>
        </View>
        <View style={[styles.form, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.textPrimary,
            }]}
            placeholder="Enter your email"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.textPrimary,
            }]}
            placeholder="Enter your password"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={[styles.signupLinkText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
              <Text style={[styles.signupLinkBold, { color: colors.primary }]}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  appName: { fontSize: 36, fontWeight: 'bold' },
  tagline: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  form: { borderRadius: 16, padding: 20, borderWidth: 0.5 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 0.5 },
  loginButton: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signupLink: { alignItems: 'center', marginTop: 16 },
  signupLinkText: { fontSize: 13 },
  signupLinkBold: { fontWeight: '600' },
});