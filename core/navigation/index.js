// core/navigation/index.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity, StyleSheet,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const colors = {
  primary: '#E63946',
  secondary: '#1D3557',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textLight: '#999999',
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
    headerStyle: { backgroundColor: colors.secondary },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '500', fontSize: 17 },
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: {
          backgroundColor: theme.secondary,
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderTopWidth: 0.5,
          height: 84,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Classifieds: focused ? 'grid' : 'grid-outline',
            Carpool: focused ? 'car' : 'car-outline',
            News: focused ? 'newspaper' : 'newspaper-outline',
            Messages: focused ? 'chatbubble' : 'chatbubble-outline',
          };
          return (
            <Ionicons
              name={icons[route.name]}
              size={22}
              color={color}
              style={{ opacity: focused ? 1 : 0.55 }}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: route.name }] }));
            }
          },
        })}
      />
      <Tab.Screen
        name="Classifieds"
        component={ClassifiedsNavigator}
        options={{ headerShown: false }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: route.name }] }));
            }
          },
        })}
      />
      <Tab.Screen
        name="Carpool"
        component={RidesNavigator}
        options={{ headerShown: false }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: route.name }] }));
            }
          },
        })}
      />
      <Tab.Screen
        name="News"
        component={NewsNavigator}
        options={{ headerShown: false }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: route.name }] }));
            }
          },
        })}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesNavigator}
        options={{ headerShown: false, tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: route.name }] }));
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}

function MainApp() {
  const sharedScreenOptions = {
    ...TransitionPresets.SlideFromRightIOS,
    headerStyle: { backgroundColor: '#1D3557' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '500' },
    headerBackTitleVisible: false,
  };
  return (
    <Stack.Navigator screenOptions={{ ...TransitionPresets.SlideFromRightIOS }}>
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={{
      flex: 1, alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#1D3557',
    }}>
      <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 20 }}>
        NestApp
      </Text>
      <ActivityIndicator color="#E63946" size="large" />
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, setUser, setSession, clearAuth } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) { setUser(session.user); setSession(session); }
      })
      .catch(err => console.error('getSession error:', err))
      .finally(() => setLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) { setUser(session.user); setSession(session); }
        else { clearAuth(); }
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