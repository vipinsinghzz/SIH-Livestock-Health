/**
 * Livestock Saathi - Leaflet + OpenStreetMap GIS WebView Component
 * File: mobile/src/components/LeafletGisWebView.tsx
 * 
 * Production-ready mobile GIS map powered by Leaflet.js and OpenStreetMap tiles
 * running inside react-native-webview.
 * 
 * Eliminates proprietary Google Maps API key dependency while matching the
 * website's Leaflet implementation with full layer toggles, quarantine perimeters,
 * DBSCAN transmission clusters, and clinical case points.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ContainmentZone, OutbreakCluster } from '../types/containment';
import { DiseaseCase } from '../types/case';
import { colors, typography } from '../theme';

export interface LeafletGisWebViewProps {
  containmentZones: ContainmentZone[];
  clusters: OutbreakCluster[];
  cases: DiseaseCase[];
  activeLayers: {
    containment: boolean;
    clusters: boolean;
    cases: boolean;
  };
  center: {
    latitude: number;
    longitude: number;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  selectedEntity: {
    type: 'zone' | 'cluster' | 'case';
    data: ContainmentZone | OutbreakCluster | DiseaseCase;
  } | null;
  onSelectEntity: (
    entity:
      | { type: 'zone'; data: ContainmentZone }
      | { type: 'cluster'; data: OutbreakCluster }
      | { type: 'case'; data: DiseaseCase }
      | null
  ) => void;
  loadingText?: string;
}

export const LeafletGisWebView: React.FC<LeafletGisWebViewProps> = ({
  containmentZones,
  clusters,
  cases,
  activeLayers,
  center,
  userLocation,
  selectedEntity,
  onSelectEntity,
  loadingText = 'Loading outbreak map...',
}) => {
  const webViewRef = useRef<WebView>(null);
  const isMapReadyRef = useRef<boolean>(false);

  // Map entities indexed by ID for instantaneous lookup on tap
  const entitiesMap = useMemo(() => {
    const map = new Map<string, { type: 'zone' | 'cluster' | 'case'; data: any }>();
    containmentZones.forEach((z) => {
      const id = z.id || z.zoneId || String(z.centerLat || Math.random());
      map.set(`zone_${id}`, { type: 'zone', data: z });
    });
    clusters.forEach((cl, idx) => {
      const id = cl.clusterId || String(cl.centroidLat || idx);
      map.set(`cluster_${id}`, { type: 'cluster', data: cl });
    });
    cases.forEach((c) => {
      const id = c.id || c.caseId || String(Math.random());
      map.set(`case_${id}`, { type: 'case', data: c });
    });
    return map;
  }, [containmentZones, clusters, cases]);

  // Clean GeoJSON/Payload serializable items
  const sanitizedData = useMemo(() => {
    const validZones = containmentZones
      .map((z) => {
        const lat = z.center?.lat ?? z.centerLat;
        const lng = z.center?.lng ?? z.centerLng;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
        return {
          id: `zone_${z.id || z.zoneId}`,
          lat,
          lng,
          radiusMeters: (z.radiusKm || 5.0) * 1000,
          disease: z.disease || 'Livestock Disease',
          status: z.status || 'ACTIVE',
          radiusKm: z.radiusKm || 5,
          village: z.village || '',
          district: z.district || '',
        };
      })
      .filter(Boolean);

    const validClusters = clusters
      .map((cl, idx) => {
        const lat = cl.centroidLat;
        const lng = cl.centroidLng;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
        return {
          id: `cluster_${cl.clusterId || idx}`,
          lat,
          lng,
          disease: cl.disease || 'Disease Cluster',
          count: cl.count || cl.caseCount || 2,
          risk: cl.risk || 'High',
          isOutbreak: Boolean(cl.isOutbreak),
          radiusMeters: 5000, // DBSCAN spatial outbreak perimeter (5km)
        };
      })
      .filter(Boolean);

    const validCases = cases
      .map((c) => {
        const lat = c.coordinates?.lat ?? (c as any).latitude;
        const lng = c.coordinates?.lng ?? (c as any).longitude;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
        return {
          id: `case_${c.id || c.caseId}`,
          caseId: c.caseId || 'CASE',
          lat,
          lng,
          disease: c.disease || 'Suspected Disease',
          species: c.species || 'Livestock',
          status: c.status || 'New',
          risk: c.risk || 'Moderate',
          village: c.farmerLocation?.village || '',
        };
      })
      .filter(Boolean);

    return {
      zones: validZones,
      clusters: validClusters,
      cases: validCases,
      center,
      userLocation: userLocation || null,
      activeLayers,
    };
  }, [containmentZones, clusters, cases, center, userLocation, activeLayers]);

  // Handle postMessage from Leaflet inside WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'MAP_READY') {
          isMapReadyRef.current = true;
          // Synchronize initial layer data
          pushDataToMap();
        } else if (msg.type === 'SELECT_ENTITY') {
          const found = entitiesMap.get(msg.id);
          if (found) {
            onSelectEntity(found);
          }
        } else if (msg.type === 'DESELECT') {
          onSelectEntity(null);
        }
      } catch (err) {
        console.warn('[LeafletGisWebView] Failed to parse message from WebView:', err);
      }
    },
    [entitiesMap, onSelectEntity]
  );

  // Send update to Leaflet without reloading the HTML
  const pushDataToMap = useCallback(() => {
    if (!webViewRef.current) return;
    const js = `
      if (window.updateGisMap) {
        window.updateGisMap(${JSON.stringify(sanitizedData)});
      }
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  }, [sanitizedData]);

  // Trigger data update whenever datasets or layer toggles change
  useEffect(() => {
    if (isMapReadyRef.current) {
      pushDataToMap();
    }
  }, [pushDataToMap]);

  // HTML content with embedded Leaflet engine
  const htmlContent = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .custom-div-icon {
      background: transparent !important;
      border: none !important;
    }
    /* Zone Center Shield Marker */
    .zone-shield-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border-width: 2.5px;
      border-style: solid;
      box-shadow: 0 4px 8px rgba(0,0,0,0.25);
      cursor: pointer;
    }
    /* Cluster Count Badge Marker */
    .cluster-badge-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      cursor: pointer;
    }
    .cluster-critical {
      background: #dc2626;
      animation: pulse-cluster 1.8s infinite;
    }
    .cluster-warning {
      background: #d97706;
    }
    @keyframes pulse-cluster {
      0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
      70% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
      100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
    }
    /* Clinical Case Pin */
    .case-pin-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border-width: 2px;
      border-style: solid;
      box-shadow: 0 3px 6px rgba(0,0,0,0.22);
      cursor: pointer;
    }
    /* User Location Pin */
    .user-beacon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #0284c7;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.35);
    }
    /* Popup styling */
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      padding: 2px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    }
    .leaflet-popup-content {
      margin: 10px 14px;
      font-size: 12px;
      line-height: 1.4;
      color: #1e293b;
    }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15) !important;
      border-radius: 8px !important;
      overflow: hidden;
    }
    .leaflet-control-zoom a {
      background: #ffffff !important;
      color: #334155 !important;
      font-weight: bold !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    var map;
    var zonesLayerGroup;
    var clustersLayerGroup;
    var casesLayerGroup;
    var userLocationMarker;

    function sendToRN(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function initMap() {
      var initialCenter = [${center.latitude}, ${center.longitude}];
      map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
      }).setView(initialCenter, 11);

      // Add Zoom Control to bottom-right so top header is clear
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tiles Layer
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
      }).addTo(map);

      // Initialize Layer Groups
      zonesLayerGroup = L.layerGroup().addTo(map);
      clustersLayerGroup = L.layerGroup().addTo(map);
      casesLayerGroup = L.layerGroup().addTo(map);

      // Tap on empty map space triggers deselect
      map.on('click', function(e) {
        sendToRN({ type: 'DESELECT' });
      });

      // Signal ready to React Native
      sendToRN({ type: 'MAP_READY' });
    }

    // Dynamic Layer Update without full page reload
    window.updateGisMap = function(data) {
      if (!map) return;

      // 1. Update User Location
      if (data.userLocation && data.userLocation.latitude && data.userLocation.longitude) {
        var userPos = [data.userLocation.latitude, data.userLocation.longitude];
        if (userLocationMarker) {
          userLocationMarker.setLatLng(userPos);
        } else {
          var userIcon = L.divIcon({
            html: '<div class="user-beacon"></div>',
            className: 'custom-div-icon',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          userLocationMarker = L.marker(userPos, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        }
      }

      // 2. Containment Zones Layer
      zonesLayerGroup.clearLayers();
      if (data.activeLayers && data.activeLayers.containment && Array.isArray(data.zones)) {
        data.zones.forEach(function(zone) {
          var isLifted = zone.status === 'LIFTED';
          var isContained = zone.status === 'CONTAINED';

          var fillColor = isLifted ? 'rgba(16, 185, 129, 0.16)' : (isContained ? 'rgba(245, 158, 11, 0.20)' : 'rgba(239, 68, 68, 0.22)');
          var strokeColor = isLifted ? '#059669' : (isContained ? '#D97706' : '#DC2626');

          // Quarantine Buffer Circle
          var circle = L.circle([zone.lat, zone.lng], {
            radius: zone.radiusMeters || 5000,
            fillColor: fillColor,
            color: strokeColor,
            weight: 2,
            fillOpacity: 0.22,
          });

          circle.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            sendToRN({ type: 'SELECT_ENTITY', id: zone.id });
          });
          zonesLayerGroup.addLayer(circle);

          // Center Shield Icon
          var shieldIcon = L.divIcon({
            html: '<div class="zone-shield-icon" style="border-color:' + strokeColor + '">🛡️</div>',
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          var shieldMarker = L.marker([zone.lat, zone.lng], { icon: shieldIcon, zIndexOffset: 500 });
          shieldMarker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            sendToRN({ type: 'SELECT_ENTITY', id: zone.id });
          });
          zonesLayerGroup.addLayer(shieldMarker);
        });
      }

      // 3. Outbreak Clusters Layer (<= 5km hotspot buffer)
      clustersLayerGroup.clearLayers();
      if (data.activeLayers && data.activeLayers.clusters && Array.isArray(data.clusters)) {
        data.clusters.forEach(function(cl) {
          var isCritical = cl.risk === 'Critical' || cl.isOutbreak;

          // 5km Transmission Buffer Ring
          var clusterRing = L.circle([cl.lat, cl.lng], {
            radius: cl.radiusMeters || 5000,
            color: isCritical ? '#dc2626' : '#d97706',
            fillColor: isCritical ? '#ef4444' : '#f59e0b',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '5, 5'
          });
          clusterRing.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            sendToRN({ type: 'SELECT_ENTITY', id: cl.id });
          });
          clustersLayerGroup.addLayer(clusterRing);

          // Centroid Case Count Badge
          var badgeClass = isCritical ? 'cluster-badge-icon cluster-critical' : 'cluster-badge-icon cluster-warning';
          var clusterIcon = L.divIcon({
            html: '<div class="' + badgeClass + '">' + (cl.count || '!') + '</div>',
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          var clusterMarker = L.marker([cl.lat, cl.lng], { icon: clusterIcon, zIndexOffset: 700 });
          clusterMarker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            sendToRN({ type: 'SELECT_ENTITY', id: cl.id });
          });
          clustersLayerGroup.addLayer(clusterMarker);
        });
      }

      // 4. Clinical Disease Cases Layer
      casesLayerGroup.clearLayers();
      if (data.activeLayers && data.activeLayers.cases && Array.isArray(data.cases)) {
        data.cases.forEach(function(c) {
          var isCritical = c.risk === 'Critical' || c.status === 'Confirmed' || c.status === 'Containment';
          var borderColor = isCritical ? '#dc2626' : '#0284c7';

          var caseIcon = L.divIcon({
            html: '<div class="case-pin-icon" style="border-color:' + borderColor + '">📍</div>',
            className: 'custom-div-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          var caseMarker = L.marker([c.lat, c.lng], { icon: caseIcon, zIndexOffset: 300 });
          caseMarker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            sendToRN({ type: 'SELECT_ENTITY', id: c.id });
          });
          casesLayerGroup.addLayer(caseMarker);
        });
      }
    };

    window.onload = initMap;
  </script>
</body>
</html>
    `;
  }, [center.latitude, center.longitude]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        onMessage={handleMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.light.primary} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
});
