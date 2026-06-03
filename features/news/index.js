// features/news/index.js
// NEWS FEATURE — Entry point
// GOLDEN RULE 1: This is the ONLY file other parts of app import from
// Core navigation imports this file — nothing else from news

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NewsFeedScreen from './screens/NewsFeedScreen';
import NewsDetailScreen from './screens/NewsDetailScreen';
import PostNewsScreen from './screens/PostNewsScreen';

const Stack = createStackNavigator();

export default function NewsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1D3557' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '500' },
      }}
    >
      <Stack.Screen
        name="NewsFeed"
        component={NewsFeedScreen}
        options={{ title: 'Community News' }}
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