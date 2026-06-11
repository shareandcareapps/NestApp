// features/classifieds/index.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { premiumTransition } from '../../core/navigation/transitions';
import BrowseListingsScreen from './screens/BrowseListingsScreen';
import PostListingScreen from './screens/PostListingScreen';
import ListingDetailScreen from './screens/ListingDetailScreen';
import EditListingScreen from './screens/EditListingScreen';
import ChatScreen from '../messages/screens/ChatScreen';

const Stack = createStackNavigator();

export default function ClassifiedsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...premiumTransition, headerStyle: { backgroundColor: '#1D3557' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '500' }, headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="BrowseListings"
        component={BrowseListingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostListing"
        component={PostListingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Listing Details' }}
      />
      <Stack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}