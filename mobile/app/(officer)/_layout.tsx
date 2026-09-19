/**
 * Livestock Saathi - Officer Stack Layout
 * File: mobile/app/(officer)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function OfficerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.light.officerBadge,
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
          title: 'Officer Command Center',
        }}
      />
      <Stack.Screen
        name="surveillance/index"
        options={{
          title: 'Epidemic Surveillance',
        }}
      />
      <Stack.Screen
        name="outbreaks/index"
        options={{
          title: 'Outbreak Alerts',
        }}
      />
      <Stack.Screen
        name="containment/index"
        options={{
          title: 'Containment Zones',
        }}
      />
      <Stack.Screen
        name="vaccination/index"
        options={{
          title: 'Mass Vaccination Camps',
        }}
      />
      <Stack.Screen
        name="map/index"
        options={{
          title: 'District GIS Surveillance Map',
        }}
      />
      <Stack.Screen
        name="advisories/index"
        options={{
          title: 'Official Advisories',
        }}
      />
      <Stack.Screen
        name="advisories/[id]"
        options={{
          title: 'Advisory Detail',
        }}
      />
      <Stack.Screen
        name="forewarning/index"
        options={{
          title: 'NADRES Forewarning & Alerts',
        }}
      />
    </Stack>
  );
}
