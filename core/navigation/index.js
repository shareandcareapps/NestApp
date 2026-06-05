// core/navigation/index.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../database/index';
import useAppStore from '../store/index';
import { useTheme } from '../theme/ThemeContext';
import LoginScreen from '../auth/screens/LoginScreen';
import SignupScreen from '../auth/screens/SignupScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import MyRidesScreen from '../screens/MyRidesScreen';
import HomeScreen from '../screens/HomeScreen';
import ListingDetailScreen from '../../features/classifieds/screens/ListingDetailScreen';
import EditListingScreen from '../../features/classifieds/screens/EditListingScreen';
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
        tabBarInactiveTintColor: theme.textLight,
        tabBarStyle: {
          backgroundColor: theme.tabBackground,
          borderTopColor: theme.border,
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
        options={{ ...sharedHeaderOptions, title: 'NestApp', headerTitleAlign: 'center' }}
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
        options={{
          title: 'Profile & Settings',
          headerStyle: { backgroundColor: '#1D3557' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '500' },
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerStyle: { backgroundColor: '#1D3557' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '500' },
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{
          title: 'My Listings',
          headerStyle: { backgroundColor: '#1D3557' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '500' },
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="MyRides"
        component={MyRidesScreen}
        options={{
          title: 'My Carpools',
          headerStyle: { backgroundColor: '#1D3557' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '500' },
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{
          title: 'Listing Details',
          headerStyle: { backgroundColor: '#1D3557' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '500' },
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{
          title: 'Edit Listing',
          headerStyle: { backgroundColor: '#1D3557' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '500' },
          headerBackTitleVisible: false,
        }}
      />
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); setSession(session); }
      setLoading(false);
    });
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