// features/classifieds/index.js
// CLASSIFIEDS FEATURE — Entry point
// GOLDEN RULE 1: This is the ONLY file other parts of app import from
// Core navigation imports this file — nothing else from classifieds

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BrowseListingsScreen from './screens/BrowseListingsScreen';
import PostListingScreen from './screens/PostListingScreen';
import ListingDetailScreen from './screens/ListingDetailScreen';

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
        options={{ title: 'Classifieds' }}
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
    </Stack.Navigator>
  );
}