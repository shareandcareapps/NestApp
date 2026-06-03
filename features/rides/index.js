// features/rides/index.js
// RIDES FEATURE — Entry point
// GOLDEN RULE 1: This is the ONLY file other parts of app import from
// Core navigation imports this file — nothing else from rides

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BrowseRidesScreen from './screens/BrowseRidesScreen';
import PostRideScreen from './screens/PostRideScreen';
import RideDetailScreen from './screens/RideDetailScreen';

const Stack = createStackNavigator();

export default function RidesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1D3557' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '500' },
      }}
    >
      <Stack.Screen
        name="BrowseRides"
        component={BrowseRidesScreen}
        options={{ title: 'Shared Rides' }}
      />
      <Stack.Screen
        name="PostRide"
        component={PostRideScreen}
        options={{ title: 'Post a Ride' }}
      />
      <Stack.Screen
        name="RideDetail"
        component={RideDetailScreen}
        options={{ title: 'Ride Details' }}
      />
    </Stack.Navigator>
  );
}