/**
 * Livestock Saathi - Auth Stack Layout
 * File: mobile/app/(auth)/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

export default function AuthLayout() {
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
          title: 'Sign In',
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Password Recovery',
        }}
      />
    </Stack>
  );
}
