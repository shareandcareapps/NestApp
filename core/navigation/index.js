// core/navigation/index.js
// CORE FILE — DO NOT MODIFY STRUCTURE

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import LoginScreen from '../auth/screens/LoginScreen';
import SignupScreen from '../auth/screens/SignupScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ClassifiedsNavigator from '../../features/classifieds/index';
import RidesNavigator from '../../features/rides/index';
import NewsNavigator from '../../features/news/index';
import MessagesNavigator from '../../features/messages/index';

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
};

// ─── Avatar Button ─────────────────────────────
function AvatarButton({ onPress, name }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarColors = [
    '#E63946', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12',
  ];
  const colorIndex = name ? name.charCodeAt(0) % avatarColors.length : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        marginRight: 14,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: avatarColors[colorIndex],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
        {initials}
      </Text>
    </TouchableOpacity>
  );
}

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
function MainTabs({ navigation }) {
  const user = useAppStore((state) => state.user);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    loadProfileName();
  }, []);

  async function loadProfileName() {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    if (data?.full_name) setProfileName(data.full_name);
  }

  function openSettings() {
    navigation.navigate('Settings');
  }

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
        headerRight: () => (
          <AvatarButton
            onPress={openSettings}
            name={profileName}
          />
        ),
      })}
    ><Tab.Screen
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
  component={MessagesNavigator}
  options={{ headerShown: false }}
/>
    </Tab.Navigator>
  );
}

// ─── Main App Stack (includes Settings) ───────
function MainApp() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Tabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
  name="Settings"
  component={SettingsScreen}
  options={({ navigation }) => ({
    title: 'Profile & Settings',
    headerStyle: { backgroundColor: '#1D3557' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '500' },
  })}
/>
    </Stack.Navigator>
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setSession(session);
      }
      setLoading(false);
    });

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
        <Stack.Screen name="Main" component={MainApp} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}