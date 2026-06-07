// core/navigation/index.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { premiumTransition, withFadeOnFocus } from './transitions';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import FloatingTabBar from '../components/FloatingTabBar';
import LoginScreen from '../auth/screens/LoginScreen';
import SignupScreen from '../auth/screens/SignupScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsScreen from '../screens/TermsScreen';
import DisclaimerScreen from '../screens/DisclaimerScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import MyRidesScreen from '../screens/MyRidesScreen';
import HomeScreen from '../screens/HomeScreen';
import ListingDetailScreen from '../../features/classifieds/screens/ListingDetailScreen';
import EditListingScreen from '../../features/classifieds/screens/EditListingScreen';
import BrowseListingsScreen from '../../features/classifieds/screens/BrowseListingsScreen';
import PostListingScreen from '../../features/classifieds/screens/PostListingScreen';
import PostRideScreen from '../../features/rides/screens/PostRideScreen';
import ClassifiedsNavigator from '../../features/classifieds/index';
import RidesNavigator from '../../features/rides/index';
import NewsNavigator from '../../features/news/index';
import MessagesNavigator from '../../features/messages/index';
import OnboardingScreen from '../screens/OnboardingScreen';

const FadedHomeScreen = withFadeOnFocus(HomeScreen);
const FadedClassifiedsNavigator = withFadeOnFocus(ClassifiedsNavigator);
const FadedRidesNavigator = withFadeOnFocus(RidesNavigator);
const FadedNewsNavigator = withFadeOnFocus(NewsNavigator);
const FadedMessagesNavigator = withFadeOnFocus(MessagesNavigator);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const NAV_COLORS = {
  primary: '#F4A833',
  secondary: '#2D1B69',
  surface: '#FFFFFF',
  border: '#E8DFD0',
  textLight: '#9B8FAD',
};

function AvatarButton({ onPress, name }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const avatarColors = ['#E63946', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12'];
  const colorIndex = name ? name.charCodeAt(0) % avatarColors.length : 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Open profile settings"
      style={[navStyles.avatarBtn, { backgroundColor: avatarColors[colorIndex] }]}
    >
      <Text style={navStyles.avatarText}>{initials}</Text>
    </TouchableOpacity>
  );
}

function MainTabs({ navigation }) {
  const user = useAppStore((state) => state.user);
  const unreadMessages = useAppStore((state) => state.unreadConversationIds.length);
  const [profileName, setProfileName] = useState('');
  const theme = useTheme();

  useEffect(() => { loadProfileName(); }, [user]);

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

  const sharedHeaderOptions = {
    headerStyle: { backgroundColor: NAV_COLORS.secondary },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  };

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} unreadMessages={unreadMessages} />}
      screenOptions={{
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={FadedHomeScreen}
        options={{ headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Home');
          },
        })}
      />
      <Tab.Screen
        name="Classifieds"
        component={FadedClassifiedsNavigator}
        options={{ headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Classifieds', { screen: 'BrowseListings' });
          },
        })}
      />
      <Tab.Screen
        name="Carpool"
        component={FadedRidesNavigator}
        options={{ headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Carpool', { screen: 'BrowseRides' });
          },
        })}
      />
      <Tab.Screen
        name="News"
        component={FadedNewsNavigator}
        options={{ headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('News', { screen: 'NewsFeed' });
          },
        })}
      />
      <Tab.Screen
        name="Messages"
        component={FadedMessagesNavigator}
        options={{ headerShown: false, tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Messages', { screen: 'Conversations' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

function MainApp() {
  const sharedScreenOptions = {
    ...premiumTransition,
    headerStyle: { backgroundColor: '#2D1B69' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' },
    headerBackTitleVisible: false,
  };
  return (
    <Stack.Navigator screenOptions={{ ...premiumTransition }}>
      <Stack.Screen
        name="Tabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ ...sharedScreenOptions, title: 'Profile & Settings' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ ...sharedScreenOptions, title: 'Edit Profile' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ ...sharedScreenOptions, title: 'Privacy Policy' }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ ...sharedScreenOptions, title: 'Terms & Conditions' }} />
      <Stack.Screen name="Disclaimer" component={DisclaimerScreen} options={{ ...sharedScreenOptions, title: 'Disclaimer' }} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ ...sharedScreenOptions, title: 'My Listings' }} />
      <Stack.Screen name="MyRides" component={MyRidesScreen} options={{ ...sharedScreenOptions, title: 'My Carpools' }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ ...sharedScreenOptions, title: 'Listing Details' }} />
      <Stack.Screen name="EditListing" component={EditListingScreen} options={{ ...sharedScreenOptions, title: 'Edit Listing' }} />
      <Stack.Screen name="PostListing" component={PostListingScreen} options={{ ...sharedScreenOptions, headerShown: false }} />
      <Stack.Screen name="PostRide" component={PostRideScreen} options={{ ...sharedScreenOptions, headerShown: false }} />
      <Stack.Screen name="BrowseListingsByCategory" component={BrowseListingsScreen} options={{ ...sharedScreenOptions, title: 'Browse Listings' }} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...premiumTransition, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <LinearGradient
      colors={['#0F0A1E', '#2D1B69', '#4A2D9C']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 42, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: 1 }}>
        NestApp
      </Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 36, letterSpacing: 2 }}>
        WHERE CULTURE MEETS COMMUNITY
      </Text>
      <ActivityIndicator color="#F4A833" size="large" />
    </LinearGradient>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, setUser, setSession, clearAuth } = useAppStore();
  const [loading,      setLoading]      = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) { setUser(session.user); setSession(session); }
      }).catch(err => console.error('getSession error:', err)),
      AsyncStorage.getItem('@nest_onboarded').then(v => setHasOnboarded(!!v)).catch(() => setHasOnboarded(false)),
    ]).finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) { setUser(session.user); setSession(session); }
        else { clearAuth(); }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  if (!hasOnboarded) {
    return (
      <Stack.Navigator screenOptions={{ ...premiumTransition, headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainApp} />
        <Stack.Screen name="Auth" component={AuthStack} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ ...premiumTransition, headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainApp} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const navStyles = StyleSheet.create({
  avatarBtn: {
    marginRight: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});