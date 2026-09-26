/**
 * Livestock Saathi - Farmer Stack Layout
 * File: mobile/app/(farmer)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

export default function FarmerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.light.primary,
        },
        headerTintColor: colors.light.textInverse,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: colors.light.background,
          flex: 1,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Farmer Home',
        }}
      />
      <Stack.Screen
        name="animals/index"
        options={{
          title: 'My Livestock',
        }}
      />
      <Stack.Screen
        name="animals/add"
        options={{
          title: 'Register Animal',
        }}
      />
      <Stack.Screen
        name="animals/[id]"
        options={{
          title: 'Animal Profile',
        }}
      />
      <Stack.Screen
        name="animals/edit/[id]"
        options={{
          title: 'Edit Animal',
        }}
      />
      <Stack.Screen
        name="cases/index"
        options={{
          title: 'Health Cases',
        }}
      />
      <Stack.Screen
        name="cases/[id]"
        options={{
          title: 'Case Details',
        }}
      />
      <Stack.Screen
        name="ai-scan/index"
        options={{
          title: 'AI Disease Screening',
        }}
      />
      <Stack.Screen
        name="ai-scan/result"
        options={{
          title: 'Screening Result',
        }}
      />
      <Stack.Screen
        name="vaccination/index"
        options={{
          title: 'Vaccination Schedules',
        }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{
          title: 'Alerts & Advisories',
        }}
      />
      <Stack.Screen
        name="kisan-saathi/index"
        options={{
          title: 'Kisan Saathi AI Chat',
        }}
      />
      <Stack.Screen
        name="map/index"
        options={{
          title: 'Nearby Veterinarians',
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={{
          title: 'Profile & Settings',
        }}
      />
    </Stack>
  );
}
