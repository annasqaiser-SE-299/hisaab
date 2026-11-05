import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shopping',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'cart' : 'cart-outline'}
              size={24}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={24}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={24}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 74,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabBarLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    marginTop: 2,
  },
});
