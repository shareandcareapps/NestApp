// features/news/index.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { premiumTransition } from '../../core/navigation/transitions';
import NewsFeedScreen from './screens/NewsFeedScreen';
import NewsDetailScreen from './screens/NewsDetailScreen';
import PostNewsScreen from './screens/PostNewsScreen';

const Stack = createStackNavigator();

export default function NewsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...premiumTransition, headerStyle: { backgroundColor: '#1D3557' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '500' }, headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="NewsFeed"
        component={NewsFeedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NewsDetail"
        component={NewsDetailScreen}
        options={{ title: 'Article' }}
      />
      <Stack.Screen
        name="PostNews"
        component={PostNewsScreen}
        options={{ title: 'Post News' }}
      />
    </Stack.Navigator>
  );
}