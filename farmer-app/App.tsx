import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import MyAnimalsScreen from './src/screens/MyAnimalsScreen';
import ScreenNowScreen from './src/screens/ScreenNowScreen';
import AlertsScreen from './src/screens/AlertsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = 'help';
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'My Animals') iconName = focused ? 'paw' : 'paw-outline';
            else if (route.name === 'Screen Now') iconName = focused ? 'scan-circle' : 'scan-circle-outline';
            else if (route.name === 'Alerts') iconName = focused ? 'notifications' : 'notifications-outline';

            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: { paddingBottom: 10, height: 70 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="My Animals" component={MyAnimalsScreen} />
        {/* The center action button should stand out in a real app, here we just use a tab */}
        <Tab.Screen name="Screen Now" component={ScreenNowScreen} 
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="scan-circle" size={40} color={'#3B82F6'} style={{ marginTop: -10 }} />
            ),
            tabBarLabel: 'Screen Now'
          }} 
        />
        <Tab.Screen name="Alerts" component={AlertsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
