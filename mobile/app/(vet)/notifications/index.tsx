/**
 * Livestock Saathi - Vet: Clinical Alerts
 * File: mobile/app/(vet)/notifications/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function VetNotificationsScreen() {
  return (
    <PlaceholderScreen
      title="Clinical Alerts & Reminders"
      role="vet"
      routePath="/(vet)/notifications"
      description="Urgent referrals, critical lab test readiness alerts, and high-priority triage pings."
      icon="🚨"
    />
  );
}
