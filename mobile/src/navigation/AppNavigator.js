import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../utils/theme';

import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import SettleScreen from '../screens/SettleScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { Home: '🏠', Friends: '👥', Settle: '💸' };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 18 }}>{icons[label] || '📋'}</Text>
      <Text style={{ fontSize: 10, color: focused ? colors.primary : colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          tabBarStyle: {
            backgroundColor: '#0a0a14',
            borderTopColor: colors.border,
            paddingTop: 8,
            height: 85,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Friends"
          component={FriendsScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon label="Friends" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settle"
          component={SettleScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon label="Settle" focused={focused} />,
          }}
        />
        {/* Hidden screen — no tab bar button, navigated to programmatically */}
        <Tab.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{
            title: 'Add Expense',
            headerShown: true,
            tabBarButton: () => null,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
