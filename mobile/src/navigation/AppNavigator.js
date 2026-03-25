import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import SettleScreen from '../screens/SettleScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home:    { active: 'home',    inactive: 'home-outline' },
  Friends: { active: 'people',  inactive: 'people-outline' },
  Groups:  { active: 'albums',  inactive: 'albums-outline' },
  Settle:  { active: 'cash',    inactive: 'cash-outline' },
};

function TabIcon({ label, focused }) {
  const icon = TAB_ICONS[label];
  return (
    <View style={{ alignItems: 'center', minWidth: 56 }}>
      <Ionicons
        name={focused ? icon.active : icon.inactive}
        size={22}
        color={focused ? colors.primary : colors.textMuted}
      />
      <Text
        numberOfLines={1}
        style={{ fontSize: 10, color: focused ? colors.primary : colors.textMuted, marginTop: 2 }}
      >
        {label}
      </Text>
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
          borderTopColor: 'rgba(255,255,255,0.08)',
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} /> }} />
      <Tab.Screen name="Friends" component={FriendsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Friends" focused={focused} /> }} />
      <Tab.Screen name="Groups" component={GroupsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Groups" focused={focused} /> }} />
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
        <Stack.Screen name="GroupDetail" component={GroupDetailScreen}
          options={({ route }) => ({ title: route.params?.groupName || 'Group' })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
