/**
 * Livestock Saathi - Farmer: Veterinary Help Map
 * File: mobile/app/(farmer)/map/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function FarmerMapScreen() {
  return (
    <PlaceholderScreen
      title="Veterinary Help Centers Map"
      role="farmer"
      routePath="/(farmer)/map"
      description="Interactive GIS map showing veterinary hospitals, mobile dispensaries, and contact information."
      icon="📍"
    />
  );
}
