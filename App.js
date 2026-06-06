// App.js
import 'expo-dev-client';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import Toast from 'react-native-toast-message';
import RootNavigator from './core/navigation';
import { ThemeProvider } from './core/theme/ThemeContext';
import { toastConfig } from './core/components/ToastNotification';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Fonts load async — app still renders; system font is fine fallback
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBar style="light" />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <Toast config={toastConfig} />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0F0A1E' },
  errorEmoji: { fontSize: 52, marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#F5F0FF', marginBottom: 10 },
  errorMessage: { fontSize: 14, color: '#B8ACCC', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  errorButton: { backgroundColor: '#F4A833', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  errorButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
