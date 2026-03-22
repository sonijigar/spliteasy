import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';

import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import SettleScreen from '../screens/SettleScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, focused }) {
  const icons = { Home: '🏠', Friends: '👥', Settle: '💸' };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 18 }}>{icons[label] || '📋'}</Text>
      <Text style={{ fontSize: 10, color: focused ? colors.primary : colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a14',
          borderTopColor: colors.border,
          paddingTop: 8,
          height: 85,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} /> }} />
      <Tab.Screen name="Friends" component={FriendsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Friends" focused={focused} /> }} />
      <Tab.Screen name="Settle" component={SettleScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Settle" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen}
          options={{ title: 'Add Expense', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
