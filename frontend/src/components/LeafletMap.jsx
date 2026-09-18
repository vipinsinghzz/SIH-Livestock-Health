import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  CloudRain,
  Layers,
  Eye,
  Compass,
  Activity,
  CheckCircle,
  AlertTriangle,
  Syringe,
  FileText,
  Wifi,
  Clock,
  Filter
} from 'lucide-react';
import realtimeService from '../services/realtimeService';

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
const createRiskIcon = (riskLevel, isOutbreak = false, isCase = false) => {
  const colors = {
    Safe: '#10b981',     // 🟢 Safe
    Low: '#eab308',      // 🟡 Low
    Medium: '#f97316',   // 🟠 Medium
    Moderate: '#f97316', // 🟠 Medium / Moderate
    High: '#ef4444',     // 🔴 High
    Critical: '#b91c1c'  // 🔴 Critical Dark Red
  };

  const pinColor = colors[riskLevel] || '#f97316';
  const isHighRisk = riskLevel === 'Critical' || riskLevel === 'High' || isOutbreak;
  const pulseClass = isHighRisk ? 'risk-pulse-critical' : '';

  const svgHtml = `
    <div class="relative flex items-center justify-center ${pulseClass}" style="width: 34px; height: 34px;">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="${pinColor}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3.2" fill="#ffffff"></circle>
      </svg>
      ${
        isCase
          ? '<span class="absolute -top-1 -left-1 w-3.5 h-3.5 bg-indigo-600 text-[8px] font-black text-white rounded-full flex items-center justify-center border-2 border-white">C</span>'
          : ''
      }
      ${
        isOutbreak
          ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white animate-ping"></span>'
          : ''
      }
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-div-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });
};

// User location pin
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

// Robust coordinate extractors supporting both Supabase and Mongo shapes
export const extractCaseCoords = (c) => {
  if (!c) return null;
  const lat = c.coordinates?.lat ?? c.latitude ?? c.lat;
  const lng = c.coordinates?.lng ?? c.longitude ?? c.lng;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
    return [parsedLat, parsedLng];
  }
  return null;
};

export const extractZoneCoords = (zone) => {
  if (!zone) return null;
  const lat = zone.center?.lat ?? zone.centerLat ?? zone.latitude ?? zone.lat;
  const lng = zone.center?.lng ?? zone.centerLng ?? zone.longitude ?? zone.lng;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
    return [parsedLat, parsedLng];
  }
  return null;
};

export const extractClusterCoords = (cluster) => {
  if (!cluster) return null;
  const lat = cluster.center?.lat ?? cluster.centroidLat ?? cluster.latitude ?? cluster.lat;
  const lng = cluster.center?.lng ?? cluster.centroidLng ?? cluster.longitude ?? cluster.lng;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
    return [parsedLat, parsedLng];
  }
  return null;
};

export const extractReportCoords = (report) => {
  if (!report) return null;
  const lat = report.location?.lat ?? report.latitude ?? report.lat;
  const lng = report.location?.lng ?? report.longitude ?? report.lng;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
    return [parsedLat, parsedLng];
  }
  return null;
};

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[MapErrorBoundary] Leaflet internal rendering error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[350px] bg-stone-50 rounded-xl p-6 text-center text-slate-600 space-y-3 border border-stone-200">
          <span className="text-3xl">🗺️</span>
          <div className="font-bold text-sm text-slate-800">Map Interface Reloading</div>
          <div className="text-xs text-slate-500 max-w-sm">
            Live telemetry data is safely rendered in the district registries below.
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition cursor-pointer shadow-xs"
          >
            Reload Map Canvas
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LeafletMap({
  reports = [],
  cases = [],
  clusters = [],
  containmentZones = [],
  height = '500px',
  isFarmerView = false,
  userLocation = null,
  onViewAdvisory = null,
  onSelectCase = null,
  onSelectZone = null,
  radiusKm = 20,
  district = 'Pune',
  enableRealtime = true,
  lang = 'hi'
}) {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('All');
  const [selectedDiseaseFilter, setSelectedDiseaseFilter] = useState('All');
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);
  const [showContainmentZones, setShowContainmentZones] = useState(true);
  const [showClusterPerimeters, setShowClusterPerimeters] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Live state merged with props
  const [liveCases, setLiveCases] = useState(cases || []);
  const [liveContainmentZones, setLiveContainmentZones] = useState(containmentZones || []);
  const [liveClusters, setLiveClusters] = useState(clusters || []);

  // Synchronize when parent props change
  useEffect(() => {
    setLiveCases(cases || []);
  }, [cases]);

  useEffect(() => {
    setLiveContainmentZones(containmentZones || []);
  }, [containmentZones]);

  useEffect(() => {
    setLiveClusters(clusters || []);
  }, [clusters]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!enableRealtime) return;

    let unsubscribe = null;
    try {
      setIsRealtimeConnected(true);
      unsubscribe = realtimeService.subscribeToDistrictCases(district, (event) => {
        if (!event || !event.type) return;

        if (event.type === 'case:new') {
          setLiveCases((prev) => {
            const matchId = event._id || event.caseId;
            if (prev.some((c) => (c._id || c.caseId) === matchId)) return prev;
            return [event, ...prev];
          });
        } else if (event.type === 'case:status_changed') {
          setLiveCases((prev) =>
            prev.map((c) => {
              const matchId = event._id || event.caseId;
              if ((c._id || c.caseId) === matchId) {
                return { ...c, ...event };
              }
              return c;
            })
          );
        } else if (event.type === 'containment:new') {
          setLiveContainmentZones((prev) => {
            const matchId = event._id || event.zoneId;
            if (prev.some((z) => (z._id || z.zoneId) === matchId)) return prev;
            return [event, ...prev];
          });
        } else if (event.type === 'containment:status_changed') {
          setLiveContainmentZones((prev) =>
            prev.map((z) => {
              const matchId = event._id || event.zoneId;
              if ((z._id || z.zoneId) === matchId) {
                return { ...z, ...event };
              }
              return z;
            })
          );
        }
      });
    } catch (err) {
      console.warn('[LeafletMap] Realtime subscription init skipped:', err);
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        try { unsubscribe(); } catch (e) {}
      }
      setIsRealtimeConnected(false);
    };
  }, [district, enableRealtime]);

  // Unique disease options for filter
  const diseaseOptions = useMemo(() => {
    const set = new Set();
    (liveCases || []).forEach((c) => { if (c && c.disease) set.add(c.disease); });
    (reports || []).forEach((r) => {
      const d = r && r.triageResult?.suspectedDiseases?.[0]?.name;
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [liveCases, reports]);

  // Language flags
  const isEnglish = lang === 'en' || lang.startsWith('en');
  const isMarathi = lang === 'mr' || lang.startsWith('mr');

  // Center calculation with safe fallbacks
  const validUserLocation =
    userLocation &&
    userLocation[0] !== undefined &&
    userLocation[1] !== undefined &&
    !isNaN(parseFloat(userLocation[0])) &&
    !isNaN(parseFloat(userLocation[1]))
      ? [parseFloat(userLocation[0]), parseFloat(userLocation[1])]
      : null;

  let defaultCenter = [18.5204, 73.8567]; // Pune District Default
  if (validUserLocation) {
    defaultCenter = validUserLocation;
  } else if (liveCases.length > 0) {
    const coords = extractCaseCoords(liveCases[0]);
    if (coords) defaultCenter = coords;
  } else if (reports.length > 0) {
    const coords = extractReportCoords(reports[0]);
    if (coords) defaultCenter = coords;
  }

  const normalizeRisk = (level) => {
    if (!level) return 'Low';
    const l = level.toLowerCase();
    if (l === 'critical') return 'Critical';
    if (l === 'high') return 'High';
    if (l === 'moderate' || l === 'medium') return 'Medium';
    if (l === 'low') return 'Low';
    if (l === 'safe') return 'Safe';
    return level;
  };

  // Time filter helper
  const matchesTimeWindow = (dateStr) => {
    if (selectedTimeFilter === 'All') return true;
    if (!dateStr) return true;
    const itemDate = new Date(dateStr).getTime();
    if (isNaN(itemDate)) return true;
    const now = Date.now();
    if (selectedTimeFilter === '24h') return now - itemDate <= 24 * 60 * 60 * 1000;
    if (selectedTimeFilter === '7d') return now - itemDate <= 7 * 24 * 60 * 60 * 1000;
    if (selectedTimeFilter === '30d') return now - itemDate <= 30 * 24 * 60 * 60 * 1000;
    return true;
  };

  // Filter cases by risk, time, and disease safely
  const filteredCases = liveCases.filter((c) => {
    const coords = extractCaseCoords(c);
    if (!coords) return false;
    if (selectedRiskFilter !== 'All') {
      const r = normalizeRisk(c.risk);
      if (r.toLowerCase() !== selectedRiskFilter.toLowerCase()) return false;
    }
    if (selectedDiseaseFilter !== 'All' && c.disease !== selectedDiseaseFilter) {
      return false;
    }
    if (!matchesTimeWindow(c.createdAt)) return false;
    return true;
  });

  // Filter reports by risk, time, and disease safely
  const filteredReports = reports.filter((r) => {
    const coords = extractReportCoords(r);
    if (!coords) return false;
    if (selectedRiskFilter !== 'All') {
      const rRisk = normalizeRisk(r.triageResult?.riskLevel);
      if (rRisk.toLowerCase() !== selectedRiskFilter.toLowerCase()) return false;
    }
    if (selectedDiseaseFilter !== 'All') {
      const topDisease = r.triageResult?.suspectedDiseases?.[0]?.name;
      if (topDisease !== selectedDiseaseFilter) return false;
    }
    if (!matchesTimeWindow(r.createdAt)) return false;
    return true;
  });

  const getRiskBadgeClasses = (risk) => {
    const norm = normalizeRisk(risk);
    if (norm === 'Safe') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (norm === 'Low') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (norm === 'Medium') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (norm === 'Critical') return 'bg-red-700 text-white border-red-800 font-extrabold';
    return 'bg-red-100 text-red-800 border-red-300 font-bold';
  };

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'New':
      case 'OPEN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Investigating':
      case 'ACCEPTED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Confirmed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Containment':
      case 'IN_TREATMENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Resolved':
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-stone-100 text-slate-700 border-stone-200';
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-white">
      {/* Map Header / Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-md border border-stone-200 text-xs">
        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            {isEnglish ? 'Risk:' : isMarathi ? 'जोखीम:' : 'जोखिम:'}
          </span>
          {[
            { id: 'All', label: isEnglish ? 'All' : isMarathi ? 'सर्व' : 'सभी' },
            { id: 'Critical', label: `🔴 ${isEnglish ? 'Critical' : 'गंभीर'}` },
            { id: 'High', label: `🔴 ${isEnglish ? 'High' : 'उच्च'}` },
            { id: 'Medium', label: `🟠 ${isEnglish ? 'Medium' : 'मध्यम'}` },
            { id: 'Low', label: `🟡 ${isEnglish ? 'Low' : 'कमी'}` }
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

        {/* Time Window Filter */}
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedTimeFilter}
            onChange={(e) => setSelectedTimeFilter(e.target.value)}
            className="bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All">All Time</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Disease Filter (if multiple diseases present) */}
        {diseaseOptions.length > 1 && (
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedDiseaseFilter}
              onChange={(e) => setSelectedDiseaseFilter(e.target.value)}
              className="bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[130px] truncate"
            >
              <option value="All">All Diseases</option>
              {diseaseOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle Overlays & Realtime Indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          {enableRealtime && isRealtimeConnected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3 h-3 text-emerald-600" />
              <span>Live Realtime</span>
            </div>
          )}

          <button
            onClick={() => setShowContainmentZones(!showContainmentZones)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border transition ${
              showContainmentZones
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isEnglish ? 'Containment' : 'नियंत्रण'}</span>
          </button>

          {liveClusters.length > 0 && (
            <button
              onClick={() => setShowClusterPerimeters(!showClusterPerimeters)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border transition ${
                showClusterPerimeters
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Clusters (≤5km)</span>
            </button>
          )}

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
              <span>Weather</span>
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div style={{ height }}>
        <MapErrorBoundary>
          <MapContainer center={defaultCenter} zoom={isFarmerView ? 11 : 9} scrollWheelZoom={false} className="w-full h-full">
            <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Location Marker & Surveillance Radius */}
          {userLocation && userLocation[0] && userLocation[1] && (
            <>
              <Marker position={[userLocation[0], userLocation[1]]} icon={createUserLocationIcon()}>
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[200px] text-xs font-sans">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-1.5 mb-1.5 font-bold text-blue-800">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <span>{isEnglish ? 'Your Location' : 'आपकी स्थिति'}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Surveillance perimeter: {radiusKm} km radius.
                    </p>
                  </div>
                </Popup>
              </Marker>

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

          {/* Active Containment Zones */}
          {showContainmentZones &&
            liveContainmentZones.map((zone) => {
              const coords = extractZoneCoords(zone);
              if (!coords) return null;
              const isActive = zone.status === 'ACTIVE';
              const isContained = zone.status === 'CONTAINED';
              const color = isActive ? '#dc2626' : isContained ? '#f59e0b' : '#64748b';

              return (
                <Circle
                  key={`zone-${zone._id || zone.zoneId || zone.id}`}
                  center={coords}
                  radius={(zone.radiusKm || 5.0) * 1000}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: isActive ? 0.16 : 0.08,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-2.5 min-w-[240px] text-xs font-sans space-y-2">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="font-extrabold text-red-700 text-sm flex items-center gap-1">
                          <ShieldAlert className="w-4 h-4" />
                          {zone.zoneId || 'ZONE-CONTAINMENT'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isActive ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {zone.status || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="text-slate-700 space-y-1">
                        <div><strong>Target Disease:</strong> {zone.disease}</div>
                        <div><strong>Radius:</strong> {zone.radiusKm || 5} km containment buffer</div>
                        <div><strong>Location:</strong> {zone.village ? `${zone.village}, ` : ''}{zone.district}</div>
                        <div><strong>Declared By:</strong> Dr. {zone.creatorName || 'Veterinary Official'}</div>
                      </div>
                      {zone.enforcedRules && zone.enforcedRules.length > 0 && (
                        <div className="pt-1 border-t text-[11px] text-slate-600">
                          <span className="font-semibold">Key Enforcements:</span>
                          <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                            {zone.enforcedRules.slice(0, 2).map((r, idx) => (
                              <li key={idx} className="truncate">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {onSelectZone && (
                        <button
                          type="button"
                          onClick={() => onSelectZone(zone)}
                          className="w-full mt-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Manage Containment Zone
                        </button>
                      )}
                    </div>
                  </Popup>
                </Circle>
              );
            })}

          {/* Spatial Outbreak Clusters (<= 5km) */}
          {showClusterPerimeters &&
            liveClusters
              .filter((cl) => cl.isOutbreak)
              .map((cluster) => {
                const coords = extractClusterCoords(cluster);
                if (!coords) return null;
                const risk = cluster.risk || cluster.riskTier || 'High';

                return (
                  <Circle
                    key={`cluster-${cluster.clusterId || cluster.id || Math.random()}`}
                    center={coords}
                    radius={(cluster.radiusKm || 5.0) * 1000}
                    pathOptions={{
                      color: risk === 'Critical' ? '#b91c1c' : '#d97706',
                      fillColor: risk === 'Critical' ? '#ef4444' : '#f59e0b',
                      fillOpacity: 0.12,
                      weight: 2,
                      dashArray: '4, 4'
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-2 min-w-[220px] text-xs font-sans space-y-1.5">
                        <div className="flex items-center justify-between border-b pb-1 font-bold text-amber-900">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Outbreak Cluster (≤ 5km)
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-bold">
                            {risk}
                          </span>
                        </div>
                        <div className="text-slate-700 text-[11px] space-y-0.5">
                          <div><strong>Disease:</strong> {cluster.disease}</div>
                          <div><strong>Total Cases:</strong> {cluster.caseCount} reports</div>
                          <div><strong>Affected Animals:</strong> {cluster.totalAffected} livestock</div>
                          <div><strong>Cluster Radius:</strong> {cluster.radiusKm || 5} km</div>
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

          {/* DiseaseCase Markers (PS128 Referral Cases) */}
          {filteredCases.map((c) => {
            const riskLevel = normalizeRisk(c.risk);
            const isOutbreak = c.status === 'Containment' || riskLevel === 'Critical';

            const coords = extractCaseCoords(c);
            if (!coords) return null;
            let [lat, lng] = coords;

            // Coordinate privacy for farmers: fuzz non-own case coordinates if not already fuzzed
            if (isFarmerView && !c.isOwnCase) {
              if (!c.fuzzed && lat && lng) {
                const hash = Math.sin((lat * 1000) + (lng * 1000)) * 10000;
                lat = lat + ((hash - Math.floor(hash)) - 0.5) * 0.02;
                lng = lng + (((hash * 1.5) - Math.floor(hash * 1.5)) - 0.5) * 0.02;
              }
            }

            return (
              <Marker
                key={`case-${c._id || c.caseId || c.id}`}
                position={[lat, lng]}
                icon={createRiskIcon(riskLevel, isOutbreak, true)}
              >
                <Popup className="custom-popup">
                  <div className="p-2.5 min-w-[260px] text-xs font-sans space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-1.5 border-b pb-1.5">
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <span>{c.disease}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeClasses(riskLevel)}`}>
                        {riskLevel}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1 text-slate-700 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Case ID:</span>
                        <span className="font-mono font-bold text-slate-800">{c.caseId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Species / Count:</span>
                        <span className="font-semibold text-slate-900">
                          {c.species || 'Cattle'} ({c.affectedCount || 1} affected)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClasses(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Location:</span>
                        <span className="text-slate-800 font-medium">
                          {isFarmerView && !c.isOwnCase
                            ? `${c.districtId || 'District'} (Vicinity ~1.5km)`
                            : (c.farmerLocation?.village || c.farmerLocation?.block || c.districtId)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Reported Date:</span>
                        <span className="text-slate-600">
                          {new Date(c.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">AI Confidence:</span>
                        <span className="text-emerald-700 font-bold">{c.confidence || 88}%</span>
                      </div>
                    </div>

                    {/* Lesion image thumbnail if present (concealed in farmer view for other farmers' animals) */}
                    {c.image && (!isFarmerView || c.isOwnCase) && (
                      <div className="rounded-lg overflow-hidden border border-stone-200 h-24 bg-stone-100">
                        <img
                          src={c.image}
                          alt={c.disease}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t flex items-center gap-2">
                      {onSelectCase ? (
                        <button
                          type="button"
                          onClick={() => onSelectCase(c)}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-center text-xs flex items-center justify-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View / Manage Case</span>
                        </button>
                      ) : (
                        <Link
                          to={`/cases/${c._id}`}
                          className="w-full py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-800 font-bold text-center text-xs flex items-center justify-center gap-1 transition border border-stone-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Case Details</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Standard Reports Markers (if reports passed) */}
          {filteredReports.map((report) => {
            const coords = extractReportCoords(report);
            if (!coords) return null;
            const [lat, lng] = coords;
            const riskLevel = normalizeRisk(report.triageResult?.riskLevel);
            const isOutbreak = report.triageResult?.outbreakFlag || false;
            const topDisease = report.triageResult?.suspectedDiseases?.[0];
            const distance =
              userLocation && userLocation[0] && userLocation[1]
                ? calculateDistance(userLocation[0], userLocation[1], lat, lng)
                : null;

            return (
              <Marker
                key={report._id || report.id}
                position={[lat, lng]}
                icon={createRiskIcon(riskLevel, isOutbreak, false)}
              >
                <Popup className="custom-popup">
                  <div className="p-2.5 min-w-[240px] text-xs font-sans space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-1.5">
                      <span className="font-bold text-slate-900 text-sm">
                        {topDisease ? topDisease.name : 'Suspected Outbreak'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRiskBadgeClasses(riskLevel)}`}>
                        {riskLevel}
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-600 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">Location:</span>{' '}
                        {report.location?.village || ''}, {report.location?.block || ''}
                      </div>
                      {distance !== null && (
                        <div className="text-emerald-700 font-bold flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5" />
                          <span>{distance} km away from farm</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-stone-100">
                      {onViewAdvisory ? (
                        <button
                          type="button"
                          onClick={() => onViewAdvisory(report)}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-center text-xs flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Advisory</span>
                        </button>
                      ) : (
                        <Link
                          to={`/reports/${report._id}`}
                          className="w-full py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-emerald-50 text-slate-800 font-bold text-center text-xs flex items-center justify-center gap-1 border border-stone-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Case</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          </MapContainer>
        </MapErrorBoundary>
      </div>

      {/* Map Footer Legend */}
      <div className="bg-stone-50 border-t border-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-800">Legend:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-700 ring-2 ring-red-200" />
            <span>🔴 Critical</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200" />
            <span>🔴 High</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-200" />
            <span>🟠 Moderate</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            <span>🟡 Low</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border border-red-600 bg-red-100" />
            <span>🛡️ Containment Zone</span>
          </span>
        </div>
        <div className="text-[11px] font-semibold text-slate-500">
          {filteredCases.length > 0
            ? `${filteredCases.length} active referral cases plotted`
            : `${filteredReports.length} alert markers plotted`}
        </div>
      </div>
    </div>
  );
}
