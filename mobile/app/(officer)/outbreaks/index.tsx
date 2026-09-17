/**
 * Livestock Saathi - Officer: Outbreak Alerts
 * File: mobile/app/(officer)/outbreaks/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function OfficerOutbreaksScreen() {
  return (
    <PlaceholderScreen
      title="Outbreak Alerts & Alarms"
      role="officer"
      routePath="/(officer)/outbreaks"
      description="Automated cluster detection, disease spike thresholds, and district alert dispatch."
      icon="⚠️"
    />
  );
}
