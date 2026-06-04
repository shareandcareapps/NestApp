// features/rides/index.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BrowseRidesScreen from './screens/BrowseRidesScreen';
import PostRideScreen from './screens/PostRideScreen';
import RideDetailScreen from './screens/RideDetailScreen';
import EditRideScreen from './screens/EditRideScreen';

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
        options={{ headerShown: false }}
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
      <Stack.Screen
        name="EditRide"
        component={EditRideScreen}
        options={{ title: 'Edit Ride' }}
      />
    </Stack.Navigator>
  );
}