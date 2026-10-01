/**
 * Livestock Saathi - Auth Stack Layout
 * File: mobile/app/(auth)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary';

import { useAppLanguage } from '../../src/services/i18n';

export const ErrorBoundary = RouteErrorBoundary;

export default function AuthLayout() {
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
        name="login"
        options={{
          title: t('common.signIn'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: t('common.createAccount'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: t('nav.passwordRecovery'),
        }}
      />
    </Stack>
  );
}
