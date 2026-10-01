/**
 * PashuCare - Veterinarian Stack Layout
 * File: mobile/app/(vet)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary';
import { useAppLanguage } from '../../src/services/i18n';

export const ErrorBoundary = RouteErrorBoundary;

export default function VetLayout() {
  const { t } = useAppLanguage();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0F5132',
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
        name="referrals/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="referrals/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="cases/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="labs/index"
        options={{
          title: t('nav.diagnosticLabs', 'Diagnostic Lab Tests'),
          headerBackTitle: t('common.back', 'Back'),
        }}
      />
      <Stack.Screen
        name="labs/[id]"
        options={{
          title: t('nav.labReferral', 'Diagnostic Lab Referral'),
          headerBackTitle: t('common.back', 'Back'),
        }}
      />
      <Stack.Screen
        name="map/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="containment/index"
        options={{
          title: t('nav.containmentDrives', 'Containment & Ring Drives'),
          headerBackTitle: t('common.back', 'Back'),
        }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
