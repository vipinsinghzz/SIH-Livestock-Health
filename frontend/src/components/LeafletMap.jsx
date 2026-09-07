import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import RiskBadge from './RiskBadge';
import StatusBadge from './StatusBadge';
import { ShieldAlert, Wind, CloudRain, Layers, Eye } from 'lucide-react';

// Custom SVG Icons for colored risk pins
const createRiskIcon = (riskLevel, isOutbreak = false) => {
  const colors = {
    Low: '#10b981',      // Emerald green
    Moderate: '#f59e0b', // Amber
    High: '#f97316',     // Orange
    Critical: '#ef4444'  // Red
  };

  const pinColor = colors[riskLevel] || '#10b981';
  const pulseClass = (riskLevel === 'Critical' || isOutbreak) ? 'risk-pulse-critical' : '';

  const svgHtml = `
    <div class="relative flex items-center justify-center ${pulseClass}" style="width: 32px; height: 32px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
      ${isOutbreak ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></span>' : ''}
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export default function LeafletMap({ reports = [], height = '500px' }) {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);
  const [showHeatCircles, setShowHeatCircles] = useState(true);

  // Default Center: Pune Rural District
  const defaultCenter = [18.5204, 74.2000];

  const filteredReports = reports.filter((r) => {
    if (!r.location || !r.location.lat || !r.location.lng) return false;
    if (selectedRiskFilter === 'All') return true;
    return r.triageResult?.riskLevel?.toLowerCase() === selectedRiskFilter.toLowerCase();
  });

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      {/* Map Header / Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-md border border-slate-200 text-xs">
        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" /> Filter:
          </span>
          {['All', 'Critical', 'High', 'Moderate', 'Low'].map((level) => (
            <button
              key={level}
              onClick={() => setSelectedRiskFilter(level)}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                selectedRiskFilter === level
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Toggle Overlays */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatCircles(!showHeatCircles)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium border transition ${
              showHeatCircles
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Outbreak Buffer</span>
          </button>

          <button
            onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium border transition ${
              showWeatherOverlay
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Weather Risk</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div style={{ height }}>
        <MapContainer center={defaultCenter} zoom={9} scrollWheelZoom={false} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Outbreak buffer circles around critical / clustered cases */}
          {showHeatCircles &&
            filteredReports
              .filter((r) => r.triageResult?.outbreakFlag || r.triageResult?.riskLevel === 'Critical')
              .map((r) => (
                <Circle
                  key={`circle-${r._id}`}
                  center={[r.location.lat, r.location.lng]}
                  radius={5000} // 5 km containment zone
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: '4, 4'
                  }}
                />
              ))}

          {/* Agro-meteorological Weather Overlay Zones (High vector transmission humidity zone) */}
          {showWeatherOverlay && (
            <Circle
              center={[18.1517, 74.5772]} // Baramati river basin
              radius={15000}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#60a5fa',
                fillOpacity: 0.18,
                weight: 1
              }}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <div className="font-bold text-blue-700 flex items-center gap-1">
                    <CloudRain className="w-4 h-4" /> Agro-Met Advisory Zone
                  </div>
                  <p className="mt-1 text-slate-600">
                    High relative humidity (84%) and water stagnation. Heightened risk of vector-borne Lumpy Skin Disease & HS.
                  </p>
                </div>
              </Popup>
            </Circle>
          )}

          {/* Markers for Reports */}
          {filteredReports.map((report) => {
            const riskLevel = report.triageResult?.riskLevel || 'Low';
            const isOutbreak = report.triageResult?.outbreakFlag || false;
            const topDisease = report.triageResult?.suspectedDiseases?.[0];

            return (
              <Marker
                key={report._id}
                position={[report.location.lat, report.location.lng]}
                icon={createRiskIcon(riskLevel, isOutbreak)}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[240px] text-xs font-sans">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
                      <span className="font-mono font-bold text-slate-800">{report.caseId}</span>
                      <StatusBadge status={report.status} size="sm" />
                    </div>

                    <div className="mb-2">
                      <RiskBadge riskLevel={riskLevel} showAiTag={false} size="sm" />
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">Species:</span> {report.species}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Location:</span> {report.location.village}, {report.location.block}
                      </div>
                      {topDisease && (
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                          <span className="font-semibold text-slate-800">Suspected:</span> {topDisease.name}
                          <div className="text-[10px] text-emerald-700 font-medium">
                            Confidence: {Math.round(topDisease.confidenceScore * 100)}%
                          </div>
                        </div>
                      )}
                      {isOutbreak && (
                        <div className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Outbreak Flag Active
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex justify-end">
                      <Link
                        to={`/reports/${report._id}`}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Case Details
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Footer Legend */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-700">Legend:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Low Risk
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500" /> Moderate
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500" /> High
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-600" /> Critical / Outbreak
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Showing {filteredReports.length} cases plotted in Pune District
        </div>
      </div>
    </div>
  );
}
