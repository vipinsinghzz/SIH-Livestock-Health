import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { ShieldAlert, CloudRain, Layers, Eye, Compass } from 'lucide-react';

// Distance calculation helper (Haversine formula in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Custom SVG Icons for 4-color coded risk pins (🟢 Safe, 🟡 Low, 🟠 Medium, 🔴 High)
const createRiskIcon = (riskLevel, isOutbreak = false) => {
  const colors = {
    Safe: '#10b981',     // 🟢 Safe
    Low: '#eab308',      // 🟡 Low
    Medium: '#f97316',   // 🟠 Medium
    Moderate: '#f97316', // 🟠 Medium / Moderate
    High: '#ef4444',     // 🔴 High
    Critical: '#ef4444'  // 🔴 High / Critical
  };

  const pinColor = colors[riskLevel] || '#10b981';
  const isHighRisk = riskLevel === 'Critical' || riskLevel === 'High' || isOutbreak;
  const pulseClass = isHighRisk ? 'risk-pulse-critical' : '';

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

// Farmer / User location pin
const createUserLocationIcon = () => {
  const svgHtml = `
    <div class="relative flex items-center justify-center user-pulse-location" style="width: 36px; height: 36px;">
      <div style="background-color: #2563eb; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(37,99,235,0.4);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-div-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

export default function LeafletMap({
  reports = [],
  height = '500px',
  isFarmerView = false,
  userLocation = null,
  onViewAdvisory = null,
  radiusKm = 20,
  lang = 'hi'
}) {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);
  const [showHeatCircles, setShowHeatCircles] = useState(true);

  // Normalized language flags
  const isEnglish = lang === 'en' || lang.startsWith('en');
  const isMarathi = lang === 'mr' || lang.startsWith('mr');

  // Default Center: User location or Pune/Baramati rural cluster
  const defaultCenter = userLocation && userLocation[0] && userLocation[1]
    ? [userLocation[0], userLocation[1]]
    : [18.1517, 74.5772];

  const mapCenter = userLocation && userLocation[0] && userLocation[1]
    ? [userLocation[0], userLocation[1]]
    : defaultCenter;

  const normalizeRisk = (level) => {
    if (!level) return 'Low';
    const l = level.toLowerCase();
    if (l === 'critical' || l === 'high') return 'High';
    if (l === 'moderate' || l === 'medium') return 'Medium';
    if (l === 'low') return 'Low';
    if (l === 'safe') return 'Safe';
    return level;
  };

  const filteredReports = reports.filter((r) => {
    if (!r.location || !r.location.lat || !r.location.lng) return false;
    if (selectedRiskFilter === 'All') return true;
    const rRisk = normalizeRisk(r.triageResult?.riskLevel);
    return rRisk.toLowerCase() === selectedRiskFilter.toLowerCase();
  });

  // Localized risk labels
  const getRiskText = (risk) => {
    const norm = normalizeRisk(risk);
    if (isEnglish) {
      if (norm === 'Safe') return 'Safe';
      if (norm === 'Low') return 'Low';
      if (norm === 'Medium') return 'Medium';
      return 'High';
    } else if (isMarathi) {
      if (norm === 'Safe') return 'सुरक्षित';
      if (norm === 'Low') return 'कमी';
      if (norm === 'Medium') return 'मध्यम';
      return 'उच्च';
    } else {
      if (norm === 'Safe') return 'सुरक्षित';
      if (norm === 'Low') return 'निम्न';
      if (norm === 'Medium') return 'मध्यम';
      return 'उच्च';
    }
  };

  const getRiskBadgeClasses = (risk) => {
    const norm = normalizeRisk(risk);
    if (norm === 'Safe') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (norm === 'Low') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (norm === 'Medium') return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300 font-bold';
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-white">
      {/* Map Header / Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-md border border-stone-200 text-xs">
        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            {isEnglish ? 'Filter:' : isMarathi ? 'फिल्टर:' : 'फिल्टर:'}
          </span>
          {[
            { id: 'All', label: isEnglish ? 'All' : isMarathi ? 'सर्व' : 'सभी' },
            { id: 'High', label: `🔴 ${isEnglish ? 'High' : isMarathi ? 'उच्च' : 'उच्च'}` },
            { id: 'Medium', label: `🟠 ${isEnglish ? 'Medium' : isMarathi ? 'मध्यम' : 'मध्यम'}` },
            { id: 'Low', label: `🟡 ${isEnglish ? 'Low' : isMarathi ? 'कमी' : 'निम्न'}` },
            { id: 'Safe', label: `🟢 ${isEnglish ? 'Safe' : isMarathi ? 'सुरक्षित' : 'सुरक्षित'}` }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedRiskFilter(item.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                selectedRiskFilter === item.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Toggle Overlays */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatCircles(!showHeatCircles)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border transition ${
              showHeatCircles
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isEnglish ? 'Containment Zone' : isMarathi ? 'नियंत्रण क्षेत्र' : 'नियंत्रण क्षेत्र'}</span>
          </button>

          {!isFarmerView && (
            <button
              onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border transition ${
                showWeatherOverlay
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>Weather Risk</span>
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div style={{ height }}>
        <MapContainer center={mapCenter} zoom={isFarmerView ? 11 : 9} scrollWheelZoom={false} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Location Marker & 20 km Surveillance Radius */}
          {userLocation && userLocation[0] && userLocation[1] && (
            <>
              <Marker position={[userLocation[0], userLocation[1]]} icon={createUserLocationIcon()}>
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[200px] text-xs font-sans">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-1.5 mb-1.5 font-bold text-blue-800">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <span>
                        {isEnglish ? 'Your Location (Farm)' : isMarathi ? 'आपले स्थान (शेत)' : 'आपकी स्थिति (फार्म)'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      {isEnglish
                        ? `Active disease monitoring perimeter: ${radiusKm} km radius.`
                        : isMarathi
                        ? `सक्रिय रोग पाळत क्षेत्र: ${radiusKm} किमी परिघ.`
                        : `सक्रिय रोग निगरानी परिधि: ${radiusKm} किमी का दायरा।`}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* 20 km Surveillance Boundary Circle */}
              <Circle
                center={[userLocation[0], userLocation[1]]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.04,
                  weight: 1.5,
                  dashArray: '6, 6'
                }}
              />
            </>
          )}

          {/* Containment zone circles around High / Critical cases */}
          {showHeatCircles &&
            filteredReports
              .filter((r) => {
                const risk = normalizeRisk(r.triageResult?.riskLevel);
                return r.triageResult?.outbreakFlag || risk === 'High';
              })
              .map((r) => (
                <Circle
                  key={`circle-${r._id}`}
                  center={[r.location.lat, r.location.lng]}
                  radius={5000} // 5 km quarantine buffer
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.14,
                    weight: 1.5,
                    dashArray: '4, 4'
                  }}
                />
              ))}

          {/* Markers for Reports */}
          {filteredReports.map((report) => {
            const riskLevel = normalizeRisk(report.triageResult?.riskLevel);
            const isOutbreak = report.triageResult?.outbreakFlag || false;
            const topDisease = report.triageResult?.suspectedDiseases?.[0];
            const distance = userLocation && userLocation[0] && userLocation[1]
              ? calculateDistance(userLocation[0], userLocation[1], report.location.lat, report.location.lng)
              : null;

            return (
              <Marker
                key={report._id}
                position={[report.location.lat, report.location.lng]}
                icon={createRiskIcon(riskLevel, isOutbreak)}
              >
                <Popup className="custom-popup">
                  <div className="p-2.5 min-w-[240px] text-xs font-sans space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-1.5">
                      <span className="font-bold text-slate-900 text-sm">
                        {topDisease ? topDisease.name : (isEnglish ? 'Suspected Outbreak' : 'संदिग्ध प्रकोप')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRiskBadgeClasses(riskLevel)}`}>
                        {getRiskText(riskLevel)}
                      </span>
                    </div>

                    {/* Location & Distance */}
                    <div className="space-y-1 text-slate-600 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">
                          {isEnglish ? 'Location:' : isMarathi ? 'स्थान:' : 'स्थान:'}
                        </span>{' '}
                        {report.location.village}, {report.location.block}
                      </div>

                      {distance !== null && (
                        <div className="text-emerald-700 font-bold flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5" />
                          <span>
                            {distance} km {isEnglish ? 'away from your farm' : isMarathi ? 'आपल्या शेतापासून दूर' : 'आपके फार्म से दूर'}
                          </span>
                        </div>
                      )}

                      {isOutbreak && (
                        <div className="text-[11px] font-bold text-red-600 flex items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-200">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>
                            {isEnglish ? 'Active Outbreak Alert (5 km Buffer)' : isMarathi ? 'सक्रिय प्रादुर्भाव (५ किमी बफर)' : 'सक्रिय प्रकोप अलर्ट (5 किमी बफर)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      {onViewAdvisory ? (
                        <button
                          type="button"
                          onClick={() => onViewAdvisory(report)}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-center text-xs flex items-center justify-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isEnglish ? 'View Advisory' : isMarathi ? 'सल्ला पहा' : 'एडवाइजरी देखें'}</span>
                        </button>
                      ) : (
                        <Link
                          to={`/reports/${report._id}`}
                          className="w-full py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-800 font-bold text-center text-xs flex items-center justify-center gap-1 transition border border-stone-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isEnglish ? 'View Case' : 'विवरण देखें'}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Footer Legend */}
      <div className="bg-stone-50 border-t border-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-800">
            {isEnglish ? 'Risk Legend:' : isMarathi ? 'धोका सूची:' : 'जोखिम सूची:'}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            <span>🟢 {isEnglish ? 'Safe' : isMarathi ? 'सुरक्षित' : 'सुरक्षित'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            <span>🟡 {isEnglish ? 'Low' : isMarathi ? 'कमी' : 'निम्न'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-200" />
            <span>🟠 {isEnglish ? 'Medium' : isMarathi ? 'मध्यम' : 'मध्यम'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-200" />
            <span>🔴 {isEnglish ? 'High' : isMarathi ? 'उच्च' : 'उच्च'}</span>
          </span>
          {userLocation && (
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-200" />
              <span>📍 {isEnglish ? 'Your Location' : isMarathi ? 'आपले स्थान' : 'आपकी स्थिति'}</span>
            </span>
          )}
        </div>
        <div className="text-[11px] font-semibold text-slate-500">
          {isEnglish
            ? `${filteredReports.length} alert markers plotted`
            : isMarathi
            ? `${filteredReports.length} अलर्ट मार्कर नकाशावर`
            : `${filteredReports.length} अलर्ट मार्कर मैप पर प्रदर्शित`}
        </div>
      </div>
    </div>
  );
}
