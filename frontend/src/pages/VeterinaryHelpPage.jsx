import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Building2,
  PhoneCall,
  MapPin,
  Clock,
  ShieldCheck,
  Star,
  Navigation,
  CheckCircle2,
  Filter,
  AlertOctagon,
  Search,
  SearchX,
  RotateCcw,
  LocateFixed,
  Radio,
  Sparkles,
  Award,
  ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import veterinaryService from '../services/veterinaryService';

// All 36 Districts of Maharashtra for quick fallback selection
const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Chhatrapati Sambhajinagar', 'Beed', 'Bhandara',
  'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
  'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban',
  'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Dharashiv', 'Palghar',
  'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
  'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
];

export default function VeterinaryHelpPage() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const isMarathi = i18n.language === 'mr';

  // State
  const [nearestVets, setNearestVets] = useState([]);
  const [allVets, setAllVets] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  // Geolocation & Fallback
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('CHECKING'); // 'CHECKING' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE'
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    try {
      const storedUser = localStorage.getItem('pashurakshak_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.district && MAHARASHTRA_DISTRICTS.includes(u.district)) {
          return u.district;
        }
      }
    } catch (e) {}
    return 'Nagpur';
  });

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Detect Live GPS Location on Mount
  const detectLiveGps = useCallback(() => {
    setLoading(true);
    setGpsStatus('CHECKING');

    if (!navigator.geolocation) {
      setGpsStatus('UNAVAILABLE');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsStatus('GRANTED');
      },
      (err) => {
        console.warn('Geolocation denied or unavailable, using district fallback:', err.message);
        setGpsStatus('DENIED');
        setGpsCoords(null);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    detectLiveGps();
  }, [detectLiveGps]);

  // 2. Fetch Nearby Vets from Database via GPS or District Fallback
  const loadNearbyVets = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = {
        category: selectedCategory,
        emergencyOnly,
        search: searchQuery
      };

      if (gpsStatus === 'GRANTED' && gpsCoords) {
        queryParams.lat = gpsCoords.lat;
        queryParams.lng = gpsCoords.lng;
        // When GPS is active, we don't restrict strictly to district unless user explicitly searched
        if (selectedDistrict && selectedDistrict !== 'All') {
          queryParams.district = selectedDistrict;
        }
      } else {
        queryParams.district = selectedDistrict;
      }

      const res = await veterinaryService.getNearbyVeterinarians(queryParams);
      setNearestVets(res.nearestVets || []);
      setAllVets(res.veterinarians || []);
      setMeta(res.meta || {});
    } catch (error) {
      console.error('Failed to load nearby veterinarians:', error);
    } finally {
      setLoading(false);
    }
  }, [gpsCoords, gpsStatus, selectedDistrict, selectedCategory, emergencyOnly, searchQuery]);

  useEffect(() => {
    loadNearbyVets();
  }, [loadNearbyVets]);

  const categories = [
    { key: 'All', label: t('veterinary_page.filter_all') },
    { key: 'Government', label: t('veterinary_page.filter_govt') },
    { key: 'Private', label: t('veterinary_page.filter_private') },
    { key: 'Diagnostic', label: t('veterinary_page.filter_diagnostic') },
    { key: 'Camp', label: t('veterinary_page.filter_mobile') }
  ];

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setEmergencyOnly(false);
    setSearchQuery('');
    setSelectedDistrict('Nagpur');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. Header Banner with 24×7 1962 Helpline */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-green-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6 border border-emerald-700/50">
          <div className="space-y-2.5 text-center lg:text-left flex-1">
            <span className="text-xs sm:text-sm font-black text-emerald-200 uppercase tracking-wider bg-white/10 px-3.5 py-1 rounded-full border border-white/15 inline-block">
              {t('veterinary_page.network_badge')}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {t('veterinary_page.title')}
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl font-medium">
              {t('veterinary_page.subtitle')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center lg:text-right shrink-0 w-full lg:w-auto shadow-inner space-y-2.5">
            <span className="text-xs sm:text-sm font-bold text-emerald-200 block">
              {t('veterinary_page.helpline_title')}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-300 flex items-center justify-center lg:justify-end gap-2.5">
              <PhoneCall className="w-7 h-7 text-amber-400 animate-pulse" />
              <span>{t('veterinary_page.helpline_phone')}</span>
              <span className="text-xs font-black bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                {t('veterinary_page.helpline_badge')}
              </span>
            </div>
            <span className="text-xs text-emerald-100/90 block font-medium">
              {t('veterinary_page.helpline_sub')}
            </span>
            <a
              href="tel:1962"
              className="inline-flex items-center justify-center gap-2 w-full bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-sm sm:text-base py-2.5 px-4 rounded-xl transition shadow cursor-pointer mt-1"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t('veterinary_page.call_helpline')}</span>
            </a>
          </div>
        </div>

        {/* 2. GPS Status & Live Proximity Control Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              gpsStatus === 'GRANTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <LocateFixed className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {gpsStatus === 'GRANTED'
                    ? (isEnglish ? 'Live GPS Proximity Active' : isMarathi ? 'थेट जीपीएस अंतर सक्रिय' : 'लाइव जीपीएस सक्रिय')
                    : (isEnglish ? 'District Proximity Fallback' : isMarathi ? 'जिल्हा अंतर पर्याय' : 'जिला आधारित दूरी')}
                </span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  gpsStatus === 'GRANTED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {gpsStatus === 'GRANTED' ? 'GPS Active' : 'Fallback'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {gpsStatus === 'GRANTED' && gpsCoords
                  ? `Lat: ${gpsCoords.lat.toFixed(4)}, Lng: ${gpsCoords.lng.toFixed(4)} • Calculating exact Haversine distance`
                  : (isEnglish
                      ? `Browsing registered district: ${selectedDistrict}. Enable GPS for pinpoint accuracy.`
                      : isMarathi
                      ? `नोंदणीकृत जिल्हा: ${selectedDistrict}. अचूक अंतरासाठी जीपीएस सुरू करा.`
                      : `पंजीकृत जिला: ${selectedDistrict}. सटीक दूरी के लिए जीपीएस ऑन करें.`)}
              </p>
            </div>
          </div>

          {/* District Selector & GPS Button */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-slate-800 text-sm font-bold rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                title="Select District"
              >
                {MAHARASHTRA_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    📍 {dist}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={detectLiveGps}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer shrink-0"
              title="Detect live GPS location"
            >
              <LocateFixed className="w-4 h-4 text-emerald-600" />
              <span>{t('veterinary_page.detect_gps') || 'Refresh GPS'}</span>
            </button>
          </div>
        </div>

        {/* 3. Highlighted Section: TOP 3 NEAREST VETERINARIANS */}
        {nearestVets.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {t('veterinary_page.nearest_3_title') || 'Nearest 3 Available Veterinarians'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {t('veterinary_page.nearest_3_sub') || 'Calculated in real-time via Haversine distance for immediate response'}
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
                ⚡ Instant Triage Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nearestVets.map((v, index) => {
                const rankLabels = ['#1 Nearest Doctor', '#2 Nearest Doctor', '#3 Nearest Doctor'];
                const rankBadges = [
                  'bg-emerald-600 text-white border-emerald-700',
                  'bg-teal-600 text-white border-teal-700',
                  'bg-slate-700 text-white border-slate-800'
                ];

                return (
                  <div
                    key={v.id || v._id}
                    className="bg-white rounded-2xl p-5 border-2 border-emerald-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    {/* Top Rank Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border shadow-xs ${rankBadges[index] || rankBadges[2]}`}>
                        {rankLabels[index]}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        {v.availability || 'AVAILABLE'}
                      </span>
                    </div>

                    {/* Vet Details */}
                    <div className="space-y-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                          {v.name}
                        </h3>
                        <p className="text-xs text-emerald-700 font-bold mt-0.5">
                          {v.specialization}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{v.distanceKm} km {t('veterinary_page.km_away') || 'away'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">{v.area || `${v.block}, ${v.district}`}</span>
                        </div>

                        <p className="text-slate-500 flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{v.clinicName || v.facilityEn}</span>
                        </p>

                        <div className="flex items-center gap-2 text-amber-700 font-bold pt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{v.rating || 4.8}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-medium">{v.experience || 6} yrs experience</span>
                        </div>
                      </div>

                      {v.isDummy && (
                        <div className="text-[11px] font-semibold text-slate-400 bg-stone-50 px-2 py-1 rounded-md border border-stone-200 inline-block">
                          Verified Demo Vet (SIH PS-128)
                        </div>
                      )}
                    </div>

                    {/* Call & Direct Contact Actions */}
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <a
                        href={`tel:${v.phone.replace(/[^0-9+]/g, '')}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black py-2.5 px-3 rounded-xl transition shadow-xs cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Call Doctor ({v.phone})</span>
                      </a>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.clinicName || ''} ${v.area || v.district}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 transition cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('veterinary_page.get_directions')}</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Filters & Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto no-scrollbar pb-1 lg:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`text-sm font-bold px-4 py-2.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.key
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emergency Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer whitespace-nowrap bg-stone-50 px-3.5 py-2.5 rounded-xl border border-stone-200 w-full sm:w-auto justify-center sm:justify-start">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>{t('veterinary_page.emergency_only')}</span>
            </label>

            <div className="relative w-full sm:w-68">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('veterinary_page.search_placeholder')}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* 5. Complete Veterinarian Directory Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">
              {isEnglish
                ? `All Available Veterinarians in ${selectedDistrict} (${allVets.length})`
                : isMarathi
                ? `${selectedDistrict} मधील सर्व पशुवैद्यकीय अधिकारी (${allVets.length})`
                : `${selectedDistrict} में सभी उपलब्ध पशु चिकित्सक (${allVets.length})`}
            </h3>
            <span className="text-xs font-bold text-slate-500">
              Sorted by nearest distance
            </span>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600">
                Finding closest active veterinarians...
              </p>
            </div>
          ) : allVets.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-stone-300 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 text-slate-400 mx-auto flex items-center justify-center">
                <SearchX className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {t('veterinary_page.no_centers_found')}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t('veterinary_page.no_centers_sub')}
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('veterinary_page.reset_filters')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {allVets.map((c) => (
                <div
                  key={c.id || c._id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs hover:shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Badges & Distance */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full inline-block">
                          {c.department || 'Government Veterinarian'}
                        </span>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug pt-1">
                          {c.name}
                        </h3>
                        <p className="text-sm font-bold text-emerald-700">{c.specialization}</p>
                        <p className="text-xs font-medium text-slate-500">{c.clinicName || c.facilityEn}</p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className="text-sm sm:text-base font-black text-emerald-800 flex items-center justify-end gap-1">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span>{c.distanceKm} {isEnglish ? 'km away' : isMarathi ? 'किमी अंतर' : 'किमी दूर'}</span>
                        </span>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
                          {c.availability || 'AVAILABLE'}
                        </span>
                      </div>
                    </div>

                    {/* Address / Area */}
                    <p className="text-sm text-slate-600 flex items-start gap-2 leading-relaxed">
                      <Navigation className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{c.village ? `${c.village}, ${c.block}, ${c.district}` : c.area}</span>
                    </p>

                    {/* Accreditation & Experience */}
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{c.rating || 4.8}</span>
                      </span>
                      <span>•</span>
                      <span>{c.experience || 6} yrs experience</span>
                      {c.isDummy && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] font-bold text-slate-400">Demo Data (SIH)</span>
                        </>
                      )}
                    </div>

                    {/* Services Tags */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        {t('veterinary_page.services_offered')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(c.services || ['Clinical Triage', 'Emergency Treatment', 'Vaccination']).map((s, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-stone-100 text-slate-700 font-semibold px-3 py-1 rounded-lg border border-stone-200"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                    <a
                      href={`tel:${c.phone.replace(/[^0-9+]/g, '')}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black py-3 px-3 rounded-xl transition shadow-xs cursor-pointer text-center"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>{t('veterinary_page.call_now')} ({c.phone})</span>
                    </a>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${c.clinicName || ''} ${c.district}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-sm font-bold py-3 px-4 rounded-xl border border-stone-300 transition cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>{t('veterinary_page.get_directions')}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
