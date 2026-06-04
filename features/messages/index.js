// features/messages/index.js
// MESSAGES FEATURE — Entry point
// GOLDEN RULE 1: This is the ONLY file other parts of app import from
// Core navigation imports this file — nothing else from messages

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ConversationsScreen from './screens/ConversationsScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();

export default function MessagesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1D3557' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '500' },
      }}
    >
      <Stack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: '' }}
      />
    </Stack.Navigator>
  );
}