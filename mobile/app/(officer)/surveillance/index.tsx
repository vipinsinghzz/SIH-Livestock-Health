/**
 * Livestock Saathi - Officer: Epidemic Surveillance
 * File: mobile/app/(officer)/surveillance/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function OfficerSurveillanceScreen() {
  return (
    <PlaceholderScreen
      title="Epidemic Surveillance"
      role="officer"
      routePath="/(officer)/surveillance"
      description="Real-time disease incidence metrics, block-level risk scores, and NADRES surveillance sync."
      icon="📊"
    />
  );
}
