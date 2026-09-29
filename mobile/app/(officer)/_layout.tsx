/**
 * Livestock Saathi - Officer Stack Layout
 * File: mobile/app/(officer)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary';
import { useAppLanguage } from '../../src/services/i18n';

export const ErrorBoundary = RouteErrorBoundary;

export default function OfficerLayout() {
  const { t } = useAppLanguage();

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
          flex: 1,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('nav.officerCommand', 'Officer Command Center'),
        }}
      />
      <Stack.Screen
        name="surveillance/index"
        options={{
          title: t('nav.surveillance', 'Epidemic Surveillance'),
        }}
      />
      <Stack.Screen
        name="outbreaks/index"
        options={{
          title: t('nav.outbreaks', 'Outbreak Alerts'),
        }}
      />
      <Stack.Screen
        name="containment/index"
        options={{
          title: t('nav.containmentZones', 'Containment Zones'),
        }}
      />
      <Stack.Screen
        name="vaccination/index"
        options={{
          title: t('nav.camps', 'Mass Vaccination Camps'),
        }}
      />
      <Stack.Screen
        name="map/index"
        options={{
          title: t('nav.districtMap', 'District GIS Surveillance Map'),
        }}
      />
      <Stack.Screen
        name="advisories/index"
        options={{
          title: t('nav.advisories', 'Official Advisories'),
        }}
      />
      <Stack.Screen
        name="advisories/[id]"
        options={{
          title: t('nav.advisories', 'Advisory Detail'),
        }}
      />
      <Stack.Screen
        name="forewarning/index"
        options={{
          title: t('nav.forewarning', 'NADRES Forewarning & Alerts'),
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={{
          title: t('nav.officerProfile', 'Officer Profile & Settings'),
        }}
      />
    </Stack>
  );
}
