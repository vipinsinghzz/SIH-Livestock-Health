/**
 * Livestock Saathi - Vet: Field Cases GIS Map
 * File: mobile/app/(vet)/map/index.tsx
 */

import React from 'react';
import { PlaceholderScreen } from '../../../src/components/PlaceholderScreen';

export default function VetMapScreen() {
  return (
    <PlaceholderScreen
      title="Field Cases GIS Map"
      role="vet"
      routePath="/(vet)/map"
      description="Geospatial distribution of reported infections, quarantine perimeters, and cluster analysis."
      icon="🗺️"
    />
  );
}
