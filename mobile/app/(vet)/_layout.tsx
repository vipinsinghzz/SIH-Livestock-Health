/**
 * Livestock Saathi - Veterinarian Stack Layout
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
          backgroundColor: colors.light.vetBadge,
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
          title: t('nav.vetWorkspace', 'Veterinarian Workspace'),
        }}
      />
      <Stack.Screen
        name="referrals/index"
        options={{
          title: t('nav.incomingReferrals', 'Incoming Referrals'),
          headerBackTitle: t('common.back', 'Back'),
        }}
      />
      <Stack.Screen
        name="referrals/[id]"
        options={{
          title: t('nav.referralDetails', 'Referral Details'),
          headerBackTitle: t('common.back', 'Back'),
        }}
      />
      <Stack.Screen
        name="cases/index"
        options={{
          title: t('nav.clinicalCases', 'Clinical Cases'),
          headerBackTitle: t('common.back', 'Back'),
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
          title: t('nav.fieldMap', 'Field Cases GIS Map'),
          headerBackTitle: t('common.back', 'Back'),
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
          title: t('nav.clinicalAlerts', 'Clinical Alerts'),
          headerBackTitle: t('common.back', 'Back'),
        }}
      />
    </Stack>
  );
}
