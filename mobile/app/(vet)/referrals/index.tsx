/**
 * Livestock Saathi - Vet: Referrals Queue
 * File: mobile/app/(vet)/referrals/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function VetReferralsScreen() {
  return (
    <PlaceholderScreen
      title="Incoming Vet Referrals"
      role="vet"
      routePath="/(vet)/referrals"
      description="Farmer and field worker consultation requests prioritized by AI risk severity."
      icon="📥"
    />
  );
}
