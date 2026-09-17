/**
 * Livestock Saathi - Officer: Containment Zones
 * File: mobile/app/(officer)/containment/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function OfficerContainmentScreen() {
  return (
    <PlaceholderScreen
      title="Containment & Quarantine Zones"
      role="officer"
      routePath="/(officer)/containment"
      description="Quarantine perimeter definitions, livestock transport restrictions, and ring-vaccination corridors."
      icon="🛡️"
    />
  );
}
