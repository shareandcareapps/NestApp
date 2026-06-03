// core/navigation/index.js
// CORE FILE — DO NOT MODIFY STRUCTURE
// Handles two states:
// 1. User not logged in → show Auth screens
// 2. User logged in → show Main app tabs
import RidesNavigator from '../../features/rides/index';
import NewsNavigator from '../../features/news/index';
import ClassifiedsNavigator from '../../features/classifieds/index';
import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import LoginScreen from '../auth/screens/LoginScreen';
import SignupScreen from '../auth/screens/SignupScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Colors ───────────────────────────────────
const colors = {
  primary: '#E63946',
  secondary: '#1D3557',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textLight: '#999999',
  textWhite: '#FFFFFF',
  textSecondary: '#666666',
  classifieds: '#E63946',
  rides: '#2ECC71',
  news: '#3498DB',
  messages: '#9B59B6',
};

// ─── Placeholder Screens ──────────────────────
function PlaceholderScreen({ title, color }) {
  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: color || colors.primary,
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
      }}>
        Coming soon...
      </Text>
    </View>
  );
}

// ─── Feature Screens (placeholders for now) ───
const MessagesScreen = () =>
  <PlaceholderScreen title="Messages" color={colors.messages} />;

// ─── Tab Icon ─────────────────────────────────
function TabIcon({ name }) {
  const icons = {
    Classifieds: '🏠',
    Rides: '🚗',
    News: '📰',
    Messages: '💬',
  };
  return <Text style={{ fontSize: 20 }}>{icons[name]}</Text>;
}

// ─── Main App Tabs ────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: () => <TabIcon name={route.name} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.secondary,
        },
        headerTintColor: colors.textWhite,
        headerTitleStyle: {
          fontWeight: '500',
          fontSize: 17,
        },
      })}
    >
      <Tab.Screen
  name="Classifieds"
  component={ClassifiedsNavigator}
  options={{ headerShown: false }}
/>
      <Tab.Screen
  name="Rides"
  component={RidesNavigator}
  options={{ headerShown: false }}
/>
      <Tab.Screen
  name="News"
  component={NewsNavigator}
  options={{ headerShown: false }}
/>
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
      />
    </Tab.Navigator>
  );
}

// ─── Auth Stack ───────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// ─── Loading Screen ───────────────────────────
function LoadingScreen() {
  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1D3557',
    }}>
      <Text style={{
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
      }}>
        NestApp
      </Text>
      <ActivityIndicator color="#E63946" size="large" />
    </View>
  );
}

// ─── Root Navigator ───────────────────────────
export default function RootNavigator() {
  const { isAuthenticated, setUser, setSession, clearAuth } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setSession(session);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user);
          setSession(session);
        } else {
          clearAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}