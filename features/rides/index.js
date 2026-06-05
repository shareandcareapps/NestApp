// features/rides/index.js
import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import BrowseRidesScreen from './screens/BrowseRidesScreen';
import PostRideScreen from './screens/PostRideScreen';
import RideDetailScreen from './screens/RideDetailScreen';
import EditRideScreen from './screens/EditRideScreen';

const Stack = createStackNavigator();

export default function RidesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...TransitionPresets.SlideFromRightIOS, headerStyle: { backgroundColor: '#1D3557' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '500' }, headerBackTitleVisible: false,
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
        options={{ title: 'Share a Ride' }}
      />
      <Stack.Screen
        name="RideDetail"
        component={RideDetailScreen}
        options={{ title: 'Carpool Details' }}
      />
      <Stack.Screen
        name="EditRide"
        component={EditRideScreen}
        options={{ title: 'Edit Carpool' }}
      />
    </Stack.Navigator>
  );
}