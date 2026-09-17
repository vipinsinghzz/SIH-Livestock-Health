/**
 * Livestock Saathi - Vet: Clinical Cases
 * File: mobile/app/(vet)/cases/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function VetCasesScreen() {
  return (
    <PlaceholderScreen
      title="Clinical Cases & Prescriptions"
      role="vet"
      routePath="/(vet)/cases"
      description="Active diagnosed cases, treatment courses, farmer contact records, and follow-up schedules."
      icon="🩺"
    />
  );
}
