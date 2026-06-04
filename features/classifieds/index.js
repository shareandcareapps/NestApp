// features/classifieds/index.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BrowseListingsScreen from './screens/BrowseListingsScreen';
import PostListingScreen from './screens/PostListingScreen';
import ListingDetailScreen from './screens/ListingDetailScreen';
import EditListingScreen from './screens/EditListingScreen';

const Stack = createStackNavigator();

export default function ClassifiedsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1D3557' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '500' },
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
        options={{ title: 'Post a Listing' }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Listing Details' }}
      />
      <Stack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{ title: 'Edit Listing' }}
      />
    </Stack.Navigator>
  );
}