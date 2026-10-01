/**
 * PashuCare - Officer Stack Layout
 * File: mobile/app/(officer)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary';
import { useAppLanguage } from '../../src/services/i18n';

export const ErrorBoundary = RouteErrorBoundary;

export default function OfficerLayout() {
  const { t } = useAppLanguage();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1E1B4B',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '800',
        },
        contentStyle: {
          backgroundColor: '#F8FAFC',
          flex: 1,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="surveillance/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="outbreaks/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="containment/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="vaccination/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="map/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="advisories/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="advisories/[id]"
        options={{
          title: t('nav.advisories', 'Advisory Detail'),
          headerBackTitle: t('common.back', 'Back'),
        }}
      />
      <Stack.Screen
        name="forewarning/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
