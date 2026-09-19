/**
 * Livestock Saathi - Veterinarian Stack Layout
 * File: mobile/app/(vet)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function VetLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.light.vetBadge,
        },
        headerTintColor: colors.light.textInverse,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: colors.light.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Veterinarian Workspace',
        }}
      />
      <Stack.Screen
        name="referrals/index"
        options={{
          title: 'Incoming Referrals',
        }}
      />
      <Stack.Screen
        name="referrals/[id]"
        options={{
          title: 'Referral Details',
        }}
      />
      <Stack.Screen
        name="cases/index"
        options={{
          title: 'Clinical Cases',
        }}
      />
      <Stack.Screen
        name="labs/index"
        options={{
          title: 'Diagnostic Lab Tests',
        }}
      />
      <Stack.Screen
        name="labs/[id]"
        options={{
          title: 'Diagnostic Lab Referral',
        }}
      />
      <Stack.Screen
        name="map/index"
        options={{
          title: 'Field Cases GIS Map',
        }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{
          title: 'Clinical Alerts',
        }}
      />
    </Stack>
  );
}
