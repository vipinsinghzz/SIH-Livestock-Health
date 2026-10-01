/**
 * Livestock Saathi - Farmer Stack Layout
 * File: mobile/app/(farmer)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary';

import { useAppLanguage } from '../../src/services/i18n';

export const ErrorBoundary = RouteErrorBoundary;

export default function FarmerLayout() {
  const { t } = useAppLanguage();
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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="animals/index"
        options={{
          title: t('nav.myLivestock'),
        }}
      />
      <Stack.Screen
        name="animals/add"
        options={{
          title: t('nav.registerAnimal'),
        }}
      />
      <Stack.Screen
        name="animals/[id]"
        options={{
          title: t('nav.animalProfile'),
        }}
      />
      <Stack.Screen
        name="animals/edit/[id]"
        options={{
          title: t('nav.editAnimal'),
        }}
      />
      <Stack.Screen
        name="cases/index"
        options={{
          title: t('nav.healthCases'),
        }}
      />
      <Stack.Screen
        name="cases/[id]"
        options={{
          title: t('nav.caseDetails'),
        }}
      />
      <Stack.Screen
        name="ai-scan/index"
        options={{
          title: t('nav.aiDiseaseScreening'),
        }}
      />
      <Stack.Screen
        name="ai-scan/result"
        options={{
          title: t('nav.screeningResult'),
        }}
      />
      <Stack.Screen
        name="vaccination/index"
        options={{
          title: t('nav.vaccinationSchedules'),
        }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{
          title: t('nav.alertsAdvisories'),
        }}
      />
      <Stack.Screen
        name="kisan-saathi/index"
        options={{
          title: t('nav.kisanSaathi'),
        }}
      />
      <Stack.Screen
        name="map/index"
        options={{
          title: t('nav.nearbyVets'),
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={{
          title: t('nav.profileSettings'),
        }}
      />
    </Stack>
  );
}
