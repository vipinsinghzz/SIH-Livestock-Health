import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import animalService from '../services/animalService';
import LeafletMap from '../components/LeafletMap';
import {
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  MapPin,
  Compass,
  Clock,
  Search,
  Filter,
  Syringe,
  AlertTriangle,
  HeartPulse,
  PlusCircle,
  X,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Volume2
} from 'lucide-react';

// Haversine formula to compute distance in km
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

// Relative time formatting
function formatRelativeTime(dateString, isEnglish, isMarathi) {
  if (!dateString) return isEnglish ? 'Recently' : isMarathi ? 'नुकतेच' : 'हाल ही में';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return isEnglish ? 'Just now' : isMarathi ? 'आत्ताच' : 'अभी-अभी';
  }
  if (diffHours < 24) {
    if (isEnglish) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (isMarathi) return `${diffHours} तासांपूर्वी`;
    return `${diffHours} घंटे पहले`;
  }
  if (diffDays === 1) {
    return isEnglish ? 'Yesterday' : isMarathi ? 'काल' : 'कल';
  }
  if (diffDays < 7) {
    if (isEnglish) return `${diffDays} days ago`;
    if (isMarathi) return `${diffDays} दिवसांपूर्वी`;
    return `${diffDays} दिन पहले`;
  }
  if (isEnglish) return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (isMarathi) return date.toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
  return date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
}

export default function ReportsList() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const isEnglish = i18n.language?.startsWith('en');
  const isMarathi = i18n.language?.startsWith('mr');

  // Reports & animals state
  const [reports, setReports] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Farmer GPS / fallback coordinates (Default Baramati rural cluster center)
  const defaultUserLat = user?.location?.lat && user.location.lat !== 0 ? user.location.lat : 18.1517;
  const defaultUserLng = user?.location?.lng && user.location.lng !== 0 ? user.location.lng : 74.5772;
  const [userCoords, setUserCoords] = useState([defaultUserLat, defaultUserLng]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [radiusFilter, setRadiusFilter] = useState(20); // default 20 km radius
  const [riskFilter, setRiskFilter] = useState('All');

  // Modals
  const [selectedAdvisoryAlert, setSelectedAdvisoryAlert] = useState(null);
  const [showVetModal, setShowVetModal] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [registeredCamps, setRegisteredCamps] = useState({});
  const [campSuccessToast, setCampSuccessToast] = useState('');

  // Sample upcoming vaccination camps data
  const vaccinationCamps = [
    {
      id: 'camp-1',
      titleEn: 'NADCP Foot and Mouth Disease (FMD) Free Ring Vaccination Drive',
      titleHi: 'राष्ट्रीय एफएमडी खुरपका-मुंहपका निःशुल्क रिंग टीकाकरण शिविर',
      titleMr: 'राष्ट्रीय एफएमडी लाळ-खुरकूत मोफत रिंग लसीकरण मोहीम',
      dateEn: '12 Sept 2026 • 10:00 AM - 04:00 PM',
      dateHi: '12 सितम्बर 2026 • सुबह 10:00 से शाम 04:00',
      dateMr: '१२ सप्टेंबर २०२६ • सकाळी १०:०० ते दुपारी ०४:००',
      location: 'Primary Veterinary Dispensary, Malegaon Bk',
      village: 'Malegaon Bk',
      block: 'Baramati',
      lat: 18.1517,
      lng: 74.5772,
      targetEn: 'Cattle & Buffaloes',
      targetHi: 'गाय एवं भैंस',
      targetMr: 'गाय आणि म्हैस',
      organizerEn: 'Dept of Animal Husbandry, Govt of Maharashtra',
      organizerHi: 'पशुपालन विभाग, महाराष्ट्र शासन',
      organizerMr: 'पशुसंवर्धन विभाग, महाराष्ट्र शासन'
    },
    {
      id: 'camp-2',
      titleEn: 'Pre-Monsoon Hemorrhagic Septicemia (HS) & BQ Vaccination Camp',
      titleHi: 'मानसून पूर्व गलघोंटू एवं लंगड़ा बुखार सुरक्षा टीकाकरण शिविर',
      titleMr: 'पावसाळापूर्व घटसर्प आणि फऱ्या प्रतिबंधक लसीकरण शिबीर',
      dateEn: '16 Sept 2026 • 09:00 AM - 03:00 PM',
      dateHi: '16 सितम्बर 2026 • सुबह 09:00 से दोपहर 03:00',
      dateMr: '१६ सप्टेंबर २०२६ • सकाळी ०९:०० ते दुपारी ०३:००',
      location: 'Gram Panchayat Veterinary Centre, Kathephal',
      village: 'Kathephal',
      block: 'Baramati',
      lat: 18.1632,
      lng: 74.5885,
      targetEn: 'Cattle, Buffalo, Sheep & Goat',
      targetHi: 'गाय, भैंस, भेड़ एवं बकरी',
      targetMr: 'गाय, म्हैस, मेंढी आणि शेळी',
      organizerEn: 'District Veterinary Polyclinic',
      organizerHi: 'जिला पशु चिकित्सालय',
      organizerMr: 'जिल्हा पशुवैद्यकीय रुग्णालय'
    },
    {
      id: 'camp-3',
      titleEn: 'Lumpy Skin Disease (LSD) Emergency Ring Vaccination Drive',
      titleHi: 'लम्पी त्वचा रोग आपातकालीन रिंग टीकाकरण अभियान',
      titleMr: 'लंपी त्वचा रोग आपत्कालीन रिंग लसीकरण मोहीम',
      dateEn: '20 Sept 2026 • 09:30 AM - 02:00 PM',
      dateHi: '20 सितम्बर 2026 • सुबह 09:30 से दोपहर 02:00',
      dateMr: '२० सप्टेंबर २०२६ • सकाळी ०९:३० ते दुपारी ०२:००',
      location: 'Veterinary Sub-Centre, Jalochi',
      village: 'Jalochi',
      block: 'Baramati',
      lat: 18.1401,
      lng: 74.561,
      targetEn: 'Cattle & Calves',
      targetHi: 'गोवंश एवं बछड़े',
      targetMr: 'गोवंश आणि वासरे',
      organizerEn: 'National Livestock Mission (NLM)',
      organizerHi: 'राष्ट्रीय पशुधन मिशन',
      organizerMr: 'राष्ट्रीय पशुधन मिशन'
    }
  ];

  // Fetch reports and user animals
  useEffect(() => {
    fetchAlertReports();
    fetchUserAnimals();

    // Check browser geolocation if user allows
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos.coords.latitude && pos.coords.longitude) {
            setUserCoords([pos.coords.latitude, pos.coords.longitude]);
          }
        },
        (err) => {
          // Gracefully fallback to default Baramati coords
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const fetchAlertReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports?nearbyAlerts=true&limit=100');
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Error fetching nearby alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnimals = async () => {
    try {
      const res = await animalService.getAnimals();
      setAnimals(res.data?.animals || []);
    } catch (e) {}
  };

  // Normalize risk levels: 'Critical' | 'High' -> 'High', 'Moderate' | 'Medium' -> 'Medium', 'Low' -> 'Low', 'Safe' -> 'Safe'
  const normalizeRisk = (level) => {
    if (!level) return 'Low';
    const l = level.toLowerCase();
    if (l === 'critical' || l === 'high') return 'High';
    if (l === 'moderate' || l === 'medium') return 'Medium';
    if (l === 'low') return 'Low';
    if (l === 'safe') return 'Safe';
    return 'Low';
  };

  // Compute distances and augment reports
  const processedReports = reports.map((r) => {
    const lat = r.location?.lat;
    const lng = r.location?.lng;
    const distanceKm = calculateDistance(userCoords[0], userCoords[1], lat, lng);
    const riskLevel = normalizeRisk(r.triageResult?.riskLevel);
    const topDisease = r.triageResult?.suspectedDiseases?.[0]?.name || (isEnglish ? 'Unclassified Infection' : isMarathi ? 'अवर्गीकृत संसर्ग' : 'अवर्गीकृत संक्रमण');

    return {
      ...r,
      distanceKm: distanceKm !== null ? distanceKm : 999,
      normalizedRisk: riskLevel,
      topDiseaseName: topDisease
    };
  });

  // Filter alerts by radius, risk level, and search term
  const filteredAlerts = processedReports.filter((item) => {
    // Radius filter (default 20 km)
    if (radiusFilter !== 'all' && item.distanceKm > Number(radiusFilter)) {
      return false;
    }

    // Risk level filter
    if (riskFilter !== 'All' && item.normalizedRisk.toLowerCase() !== riskFilter.toLowerCase()) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const village = item.location?.village?.toLowerCase() || '';
      const block = item.location?.block?.toLowerCase() || '';
      const disease = item.topDiseaseName.toLowerCase();
      const species = item.species?.toLowerCase() || '';
      return village.includes(term) || block.includes(term) || disease.includes(term) || species.includes(term);
    }

    return true;
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  // Localized Risk Badge helper
  const renderRiskBadge = (risk) => {
    const norm = normalizeRisk(risk);
    if (norm === 'High') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span>🔴 {isEnglish ? 'High Risk' : isMarathi ? 'उच्च धोका' : 'उच्च जोखिम'}</span>
        </span>
      );
    }
    if (norm === 'Medium') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>🟠 {isEnglish ? 'Medium Risk' : isMarathi ? 'मध्यम धोका' : 'मध्यम जोखिम'}</span>
        </span>
      );
    }
    if (norm === 'Low') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>🟡 {isEnglish ? 'Low Risk' : isMarathi ? 'कमी धोका' : 'निम्न जोखिम'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>🟢 {isEnglish ? 'Safe Zone' : isMarathi ? 'सुरक्षित क्षेत्र' : 'सुरक्षित क्षेत्र'}</span>
      </span>
    );
  };

  // Localized disease name helper
  const getLocalizedDisease = (name) => {
    if (!name) return isEnglish ? 'Infectious Disease' : isMarathi ? 'संसर्गजन्य रोग' : 'संक्रामक रोग';
    const n = name.toLowerCase();
    if (n.includes('foot and mouth') || n.includes('fmd')) {
      return isEnglish ? 'Foot and Mouth Disease (FMD)' : isMarathi ? 'लाळ-खुरकूत' : 'खुरपका-मुंहपका';
    }
    if (n.includes('lumpy') || n.includes('lsd')) {
      return isEnglish ? 'Lumpy Skin Disease (LSD)' : isMarathi ? 'लंपी त्वचा रोग' : 'लम्पी त्वचा रोग';
    }
    if (n.includes('haemorrhagic') || n.includes('hemorrhagic') || n.includes('hs')) {
      return isEnglish ? 'Hemorrhagic Septicemia (HS)' : isMarathi ? 'घटसर्प' : 'गलघोंटू';
    }
    if (n.includes('black quarter') || n.includes('bq')) {
      return isEnglish ? 'Black Quarter (BQ)' : isMarathi ? 'फऱ्या' : 'लंगड़ा बुखार';
    }
    if (n.includes('anthrax')) {
      return isEnglish ? 'Anthrax' : isMarathi ? 'फरांडी' : 'गिल्टी रोग (एंथ्रेक्स)';
    }
    if (n.includes('brucellosis')) {
      return isEnglish ? 'Brucellosis' : isMarathi ? 'ब्रुसेलोसिस' : 'ब्रुसेलोसिस';
    }
    if (n.includes('mastitis')) {
      return isEnglish ? 'Bovine Mastitis' : isMarathi ? 'स्तनदाह' : 'थनैला रोग';
    }
    return name;
  };

  // Localized species helper
  const getSpeciesLabel = (species) => {
    const s = (species || '').toLowerCase();
    if (s.includes('cattle') || s.includes('cow')) return isEnglish ? '🐄 Cattle' : isMarathi ? '🐄 गोवंश' : '🐄 गोवंश';
    if (s.includes('buffalo')) return isEnglish ? '🦬 Buffalo' : isMarathi ? '🦬 म्हैस' : '🦬 भैंस';
    if (s.includes('goat')) return isEnglish ? '🐐 Goat' : isMarathi ? '🐐 शेळी' : '🐐 बकरी';
    if (s.includes('sheep')) return isEnglish ? '🐑 Sheep' : isMarathi ? '🐑 मेंढी' : '🐑 भेड़';
    return species;
  };

  // Register for camp handler
  const handleRegisterCamp = (camp) => {
    setRegisteredCamps((prev) => ({
      ...prev,
      [camp.id]: {
        registeredAt: new Date().toLocaleTimeString(),
        token: `CAMP-${Math.floor(1000 + Math.random() * 9000)}`
      }
    }));
    setSelectedCamp(null);
    const msg = isEnglish
      ? `Registration confirmed for ${camp.titleEn}! An SMS with your appointment token has been dispatched.`
      : isMarathi
      ? `${camp.titleMr} साठी तुमची नोंदणी यशस्वी झाली आहे! टोकन एसएमएसद्वारे पाठवले आहे.`
      : `${camp.titleHi} के लिए आपका पंजीकरण सफल हो गया है! टोकन आपके मोबाइल पर एसएमएस द्वारा भेजा गया है।`;
    setCampSuccessToast(msg);
    setTimeout(() => setCampSuccessToast(''), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24 lg:pb-16 font-sans">
      {/* Toast Notification */}
      {campSuccessToast && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-800 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-emerald-600 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{campSuccessToast}</div>
          <button onClick={() => setCampSuccessToast('')} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Page Header (Farmer-Friendly SIH PS-128) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              <span>
                {isEnglish
                  ? 'SIH PS-128 • Real-time Community Animal Health Surveillance'
                  : isMarathi
                  ? 'स्मार्ट इंडिया हॅकाथॉन PS-128 • थेट समुदाय पशु आरोग्य पाळत'
                  : 'स्मार्ट इंडिया हैकाथॉन PS-128 • लाइव सामुदायिक पशु स्वास्थ्य निगरानी'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {isEnglish
                ? 'Nearby Disease Alerts'
                : isMarathi
                ? 'स्थानिक रोग प्रादुर्भाव अलर्ट'
                : 'स्थानीय रोग प्रकोप अलर्ट'}
            </h1>

            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
              {isEnglish
                ? 'Active outbreak detection within your perimeter, color-coded containment maps, upcoming vaccination camps, and automated AI preventive protocols.'
                : isMarathi
                ? 'आपल्या परिसरातील सक्रिय रोगांचे अलर्ट, रंग-कोडेड नियंत्रण नकाशा, नजीकची लसीकरण शिबिरे आणि प्रतिबंधात्मक एआय सल्ला.'
                : 'आपके क्षेत्र में सक्रिय रोग प्रकोप सूचनाएं, रंग-कोडित नियंत्रण मैप, आगामी टीकाकरण शिविर एवं स्वचालित एआई निवारक प्रोटोकॉल।'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Quick Contact Nearby Vet Button */}
            <button
              type="button"
              onClick={() => setShowVetModal(true)}
              className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-amber-600/20 active:scale-95 transition"
            >
              <PhoneCall className="w-4 h-4" />
              <span>
                {isEnglish
                  ? 'Contact Nearby Vet'
                  : isMarathi
                  ? 'पशुवैद्यकांशी संपर्क साधा'
                  : 'पशु चिकित्सक से संपर्क करें'}
              </span>
            </button>

            {/* Report Sick Animal */}
            <Link
              to="/report-sick"
              className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {isEnglish
                  ? 'Report Disease'
                  : isMarathi
                  ? 'रोग लक्षण नोंदवा'
                  : 'रोग लक्षण दर्ज करें'}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Interactive Outbreak Map Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>🗺️</span>
              <span>
                {isEnglish
                  ? 'Live Outbreak Map'
                  : isMarathi
                  ? 'थेट रोग प्रादुर्भाव नकाशा'
                  : 'लाइव रोग प्रकोप मैप'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEnglish
                ? 'Interactive containment zones & color-coded risk markers (🟢 Safe, 🟡 Low, 🟠 Medium, 🔴 High)'
                : isMarathi
                ? 'परस्परसंवादी नियंत्रण क्षेत्र आणि रंग-कोडेड जोखीम मार्कर (🟢 सुरक्षित, 🟡 कमी, 🟠 मध्यम, 🔴 उच्च)'
                : 'इंटरैक्टिव नियंत्रण क्षेत्र एवं रंग-कोडित जोखिम मार्कर (🟢 सुरक्षित, 🟡 निम्न, 🟠 मध्यम, 🔴 उच्च)'}
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {isEnglish
                ? `Center: ${user?.village || 'Baramati'}, ${user?.district || 'Pune'}`
                : isMarathi
                ? `स्थान: ${user?.village || 'बारामती'}, ${user?.district || 'पुणे'}`
                : `केंद्र: ${user?.village || 'बारामती'}, ${user?.district || 'पुणे'}`}
            </span>
          </div>
        </div>

        {/* Map Canvas */}
        <LeafletMap
          reports={reports}
          height="460px"
          isFarmerView={true}
          userLocation={userCoords}
          radiusKm={radiusFilter === 'all' ? 50 : Number(radiusFilter)}
          lang={i18n.language}
          onViewAdvisory={(alert) => setSelectedAdvisoryAlert(alert)}
        />
      </div>

      {/* 3. Nearby Disease Alerts Header & Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>
                {isEnglish
                  ? `Nearby Disease Alerts (${filteredAlerts.length})`
                  : isMarathi
                  ? `स्थानिक रोग अलर्ट (${filteredAlerts.length})`
                  : `स्थानीय रोग अलर्ट (${filteredAlerts.length})`}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEnglish
                ? 'Real-time epidemiological cluster reports sorted by distance from your farm'
                : isMarathi
                ? 'आपल्या शेतापासून अंतराच्या क्रमाने मांडलेले थेट प्रादुर्भाव अहवाल'
                : 'आपके फार्म से दूरी के क्रम में व्यवस्थित वास्तविक समय के रोग प्रकोप मामले'}
            </p>
          </div>

          {/* Radius Selector Pills */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs">
            <span className="text-slate-500 font-bold px-2 py-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              <span>{isEnglish ? 'Radius:' : isMarathi ? 'त्रिज्या:' : 'दायरा:'}</span>
            </span>
            {[
              { val: 5, label: isEnglish ? '5 km' : isMarathi ? '५ किमी' : '5 किमी' },
              { val: 10, label: isEnglish ? '10 km' : isMarathi ? '१० किमी' : '10 किमी' },
              { val: 20, label: isEnglish ? '20 km' : isMarathi ? '२० किमी' : '20 किमी' },
              { val: 'all', label: isEnglish ? 'All' : isMarathi ? 'सर्व' : 'सभी' }
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setRadiusFilter(item.val)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  radiusFilter === item.val
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Risk Level Filter Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                isEnglish
                  ? 'Search by disease name or village...'
                  : isMarathi
                  ? 'रोगाचे नाव किंवा गावाने शोधा...'
                  : 'बीमारी या गांव के नाम से खोजें...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="All">{isEnglish ? 'All Risk Levels' : isMarathi ? 'सर्व धोका पातळी' : 'सभी जोखिम स्तर'}</option>
              <option value="High">🔴 {isEnglish ? 'High Risk' : isMarathi ? 'उच्च धोका' : 'उच्च जोखिम'}</option>
              <option value="Medium">🟠 {isEnglish ? 'Medium Risk' : isMarathi ? 'मध्यम धोका' : 'मध्यम जोखिम'}</option>
              <option value="Low">🟡 {isEnglish ? 'Low Risk' : isMarathi ? 'कमी धोका' : 'निम्न जोखिम'}</option>
              <option value="Safe">🟢 {isEnglish ? 'Safe Zone' : isMarathi ? 'सुरक्षित क्षेत्र' : 'सुरक्षित क्षेत्र'}</option>
            </select>
          </div>
        </div>

        {/* 4. Disease Alert Cards Grid / Empty State */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
            <p className="text-xs font-bold text-slate-500">
              {isEnglish
                ? 'Scanning nearby disease surveillance networks...'
                : isMarathi
                ? 'नजीकच्या रोग पाळत ठेवणाऱ्या नेटवर्कची तपासणी करत आहे...'
                : 'निकटवर्ती रोग निगरानी नेटवर्क की जांच हो रही है...'}
            </p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          /* Empty State Requirement: If no outbreaks exist, display: "No disease outbreaks reported within 20 km." */
          <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200 p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-black text-emerald-950">
                {isEnglish
                  ? 'No disease outbreaks reported within 20 km.'
                  : isMarathi
                  ? '२० किमी अंतरामध्ये कोणताही रोग प्रादुर्भाव नोंदवलेला नाही.'
                  : '20 किमी के भीतर कोई रोग प्रकोप दर्ज नहीं है।'}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 max-w-lg mx-auto leading-relaxed">
                {isEnglish
                  ? 'Your livestock perimeter is currently safe. Maintain periodic biosecurity disinfection and keep all animal vaccinations up to date.'
                  : isMarathi
                  ? 'आपला पशुधन परिसर सध्या सुरक्षित आहे. गोठ्याची नियमित स्वच्छता ठेवा आणि जनावरांचे वेळच्या वेळी लसीकरण पूर्ण करा.'
                  : 'आपका पशुधन क्षेत्र इस समय पूरी तरह सुरक्षित है। बाड़े की नियमित स्वच्छता बनाए रखें और सभी पशुओं का समय पर टीकाकरण पूरा रखें।'}
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setRadiusFilter('all');
                  setRiskFilter('All');
                  setSearchTerm('');
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition"
              >
                {isEnglish ? 'View All Regional Alerts' : isMarathi ? 'सर्व प्रादेशिक अलर्ट पहा' : 'सभी क्षेत्रीय अलर्ट देखें'}
              </button>
            </div>
          </div>
        ) : (
          /* Alert Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlerts.map((alert) => {
              const diseaseTitle = getLocalizedDisease(alert.topDiseaseName);
              const isOutbreak = alert.triageResult?.outbreakFlag;

              return (
                <div
                  key={alert._id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between space-y-4"
                >
                  {/* Top Row: Disease Title & Risk Badge */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {diseaseTitle}
                      </h3>
                      {renderRiskBadge(alert.normalizedRisk)}
                    </div>

                    {/* Species & Outbreak Indicator */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-stone-100 text-slate-700 text-[11px] font-bold">
                        {getSpeciesLabel(alert.species)}
                      </span>
                      {isOutbreak && (
                        <span className="px-2 py-0.5 rounded-lg bg-red-50 text-red-700 text-[11px] font-bold flex items-center gap-1 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{isEnglish ? 'Active Cluster' : isMarathi ? 'सक्रिय क्लस्टर' : 'सक्रिय क्लस्टर'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Details: Location, Distance, Last Updated */}
                  <div className="space-y-2 text-xs text-slate-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isEnglish ? 'Location:' : isMarathi ? 'स्थान:' : 'स्थान:'}</span>
                      </span>
                      <span className="font-bold text-slate-800 text-right">
                        {alert.location?.village}, {alert.location?.block}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isEnglish ? 'Distance:' : isMarathi ? 'अंतर:' : 'दूरी:'}</span>
                      </span>
                      <span className="font-extrabold text-emerald-700">
                        {alert.distanceKm < 999
                          ? `${alert.distanceKm} km ${isEnglish ? 'away' : isMarathi ? 'दूर' : 'दूर'}`
                          : (isEnglish ? 'In district' : 'जिले में')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isEnglish ? 'Last Updated:' : isMarathi ? 'शेवटचे अपडेट:' : 'अंतिम अपडेट:'}</span>
                      </span>
                      <span className="font-medium text-slate-700">
                        {formatRelativeTime(alert.createdAt, isEnglish, isMarathi)}
                      </span>
                    </div>
                  </div>

                  {/* Recommendation Preview */}
                  {alert.triageResult?.recommendedAction && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                      "{alert.triageResult.recommendedAction}"
                    </p>
                  )}

                  {/* Action Button: View Advisory */}
                  <button
                    type="button"
                    onClick={() => setSelectedAdvisoryAlert(alert)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                  >
                    <span>{isEnglish ? 'View Advisory' : isMarathi ? 'सल्ला पहा' : 'एडवाइजरी देखें'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. AI Advisory Section (Preventive Actions) */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-lg">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {isEnglish
                ? 'Automated Epidemiological AI Protocol'
                : isMarathi
                ? 'स्वयंचलित महामारी विज्ञान एआय प्रोटोकॉल'
                : 'स्वचालित महामारी विज्ञान एआई प्रोटोकॉल'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isEnglish
              ? 'AI Preventive Disease Advisory'
              : isMarathi
              ? 'एआय रोग प्रतिबंधक सल्लागार'
              : 'एआई रोग रोकथाम एडवाइजरी'}
          </h2>

          <p className="text-emerald-100/80 text-xs sm:text-sm max-w-3xl leading-relaxed">
            {isEnglish
              ? 'Immediate bio-security and herd protection measures recommended when contagious disease outbreaks are active within your regional perimeter.'
              : isMarathi
              ? 'आपल्या परिसरात संसर्गजन्य रोगाचा प्रादुर्भाव असताना जनावरांच्या सुरक्षेसाठी तातडीने करायचे जैव-सुरक्षा उपाय.'
              : 'आपके क्षेत्र में संक्रामक रोग प्रकोप के दौरान पशुधन को सुरक्षित रखने के लिए अनुशंसित तत्काल जैव-सुरक्षा उपाय।'}
          </p>
        </div>

        {/* 4 Preventive Actions Grid (Vaccinate, Isolate, Avoid Movement, Contact Vet) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Vaccinate */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center ring-1 ring-emerald-400/30">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                {isEnglish ? 'Action 1 • Immediate' : isMarathi ? 'उपाय १ • तातडीने' : 'उपाय 1 • तत्काल'}
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {isEnglish
                  ? 'Vaccinate Unexposed Animals'
                  : isMarathi
                  ? 'निरोगी जनावरांचे लसीकरण करा'
                  : 'अप्रभावित पशुओं का टीकाकरण कराएं'}
              </h4>
            </div>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              {isEnglish
                ? 'Administer emergency ring or booster vaccinations to all healthy cattle and buffaloes against the active circulating strain immediately.'
                : isMarathi
                ? 'कळपातील सर्व निरोगी जनावरांना सक्रिय रोगाविरुद्ध तातडीने रिंग किंवा बूस्टर लसीकरण करून घ्या.'
                : 'झुंड के सभी स्वस्थ पशुओं को सक्रिय रोग स्ट्रेन के खिलाफ तत्काल रिंग या बूस्टर टीकाकरण लगवाएं।'}
            </p>
          </div>

          {/* Action 2: Isolate Infected Animals */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center ring-1 ring-amber-400/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                {isEnglish ? 'Action 2 • Quarantine' : isMarathi ? 'उपाय २ • विलगीकरण' : 'उपाय 2 • क्वारंटीन'}
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {isEnglish
                  ? 'Isolate Infected Animals'
                  : isMarathi
                  ? 'बाधित जनावरांना वेगळे ठेवा'
                  : 'संक्रमित पशुओं को तुरंत अलग रखें'}
              </h4>
            </div>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              {isEnglish
                ? 'Quarantine any animal exhibiting fever, mouth/hoof blisters, or discharge in a separate dry shelter at least 15 meters away.'
                : isMarathi
                ? 'ताप, तोंड किंवा खुरांचे फोड असलेल्या जनावरांना लगेच किमान १५ मीटर दूर कोरड्या गोठ्यात वेगळे ठेवा.'
                : 'बुखार, मुंह या खुर में छाले अथवा लार बहने वाले पशुओं को तुरंत कम से कम 15 मीटर दूर अलग बाड़े में रखें।'}
            </p>
          </div>

          {/* Action 3: Avoid Animal Movement */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center ring-1 ring-red-400/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-300">
                {isEnglish ? 'Action 3 • Restriction' : isMarathi ? 'उपाय ३ • निर्बंध' : 'उपाय 3 • रोक'}
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {isEnglish
                  ? 'Avoid Animal Movement'
                  : isMarathi
                  ? 'जनावरांची हालचाल थांबवा'
                  : 'पशुओं की आवाजाही रोकें'}
              </h4>
            </div>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              {isEnglish
                ? 'Halt grazing in shared community pastures and prohibit buying, selling, or transporting livestock from affected villages.'
                : isMarathi
                ? 'सार्वजनिक कुरणांवर जनावरे चारणे बंद करा आणि बाधित भागातून जनावरांची खरेदी-विक्री किंवा वाहतूक थांबवा.'
                : 'सार्वजनिक चरागाहों में पशु चराना बंद करें तथा प्रभावित गांवों से पशुओं की खरीद-फरोख्त व परिवहन पर रोक लगाएं।'}
            </p>
          </div>

          {/* Action 4: Contact Nearby Vet */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center ring-1 ring-blue-400/30">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                {isEnglish ? 'Action 4 • Expert Help' : isMarathi ? 'उपाय ४ • मदत' : 'उपाय 4 • सहायता'}
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {isEnglish
                  ? 'Contact Nearby Vet'
                  : isMarathi
                  ? 'पशुवैद्यकांशी संपर्क साधा'
                  : 'पशु चिकित्सक से संपर्क करें'}
              </h4>
            </div>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              {isEnglish
                ? 'Alert the local government dispensary or dial Toll-Free 1962 for immediate on-site veterinary inspection and drug administration.'
                : isMarathi
                ? 'लक्षणे दिसल्यास तातडीने जवळच्या पशुवैद्यकीय दवाखान्याशी किंवा १९६२ या टोल-फ्री क्रमांकावर संपर्क साधा.'
                : 'लक्षण दिखने पर निकटतम पशु चिकित्सालय को सूचित करें या टोल-फ्री 1962 पर कॉल करके मौके पर जांच कराएं।'}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Upcoming Nearby Vaccination Camps Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Syringe className="w-5 h-5 text-emerald-700" />
              <span>
                {isEnglish
                  ? 'Upcoming Nearby Vaccination Camps'
                  : isMarathi
                  ? 'नजीकची आगामी लसीकरण शिबिरे'
                  : 'आगामी नजदीकी टीकाकरण शिविर'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEnglish
                ? 'Free government livestock vaccination camps organized within your block/district'
                : isMarathi
                ? 'आपल्या तालुक्यातील मोफत शासकीय पशु लसीकरण शिबिरे'
                : 'आपके ब्लॉक व जिले में आयोजित निःशुल्क सरकारी पशु टीकाकरण शिविर'}
            </p>
          </div>

          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            {isEnglish ? '100% Free Government Service' : isMarathi ? '१००% मोफत शासकीय सेवा' : '100% निःशुल्क सरकारी सेवा'}
          </div>
        </div>

        {/* Camps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vaccinationCamps.map((camp) => {
            const distance = calculateDistance(userCoords[0], userCoords[1], camp.lat, camp.lng);
            const isRegistered = !!registeredCamps[camp.id];

            return (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {camp.organizerEn.split(',')[0]}
                    </span>
                    {distance !== null && (
                      <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5" />
                        <span>{distance} km</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">
                    {isEnglish ? camp.titleEn : isMarathi ? camp.titleMr : camp.titleHi}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{isEnglish ? camp.dateEn : isMarathi ? camp.dateMr : camp.dateHi}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{camp.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-stone-200/60">
                      <span className="font-bold">{isEnglish ? 'Target Animals:' : isMarathi ? 'पात्र जनावरे:' : 'पात्र पशु:'}</span>
                      <span>{isEnglish ? camp.targetEn : isMarathi ? camp.targetMr : camp.targetHi}</span>
                    </div>
                  </div>
                </div>

                {/* Register Button */}
                {isRegistered ? (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {isEnglish
                        ? `Registered (${registeredCamps[camp.id].token})`
                        : isMarathi
                        ? `नोंदणी पूर्ण (${registeredCamps[camp.id].token})`
                        : `पंजीकृत (${registeredCamps[camp.id].token})`}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedCamp(camp)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                  >
                    <Syringe className="w-3.5 h-3.5" />
                    <span>
                      {isEnglish ? 'Register for Camp' : isMarathi ? 'शिबिरासाठी नोंदणी करा' : 'शिविर के लिए पंजीकरण करें'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Advisory Details Modal */}
      {selectedAdvisoryAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  {isEnglish ? 'AI Outbreak Advisory' : isMarathi ? 'एआय प्रादुर्भाव सल्ला' : 'एआई प्रकोप एडवाइजरी'}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {getLocalizedDisease(selectedAdvisoryAlert.topDiseaseName)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAdvisoryAlert(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Location & Status Info */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
              <div>
                <span className="text-slate-400 block font-medium">
                  {isEnglish ? 'Reported Village' : isMarathi ? 'बाधित गाव' : 'संक्रमित गांव'}
                </span>
                <span className="font-bold text-slate-800">
                  {selectedAdvisoryAlert.location?.village}, {selectedAdvisoryAlert.location?.block}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  {isEnglish ? 'Distance' : isMarathi ? 'अंतर' : 'दूरी'}
                </span>
                <span className="font-extrabold text-emerald-700">
                  {selectedAdvisoryAlert.distanceKm < 999 ? `${selectedAdvisoryAlert.distanceKm} km away` : 'In Region'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  {isEnglish ? 'Risk Assessment' : isMarathi ? 'धोका पातळी' : 'जोखिम स्तर'}
                </span>
                <div className="mt-1">{renderRiskBadge(selectedAdvisoryAlert.normalizedRisk)}</div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  {isEnglish ? 'Affected Species' : isMarathi ? 'बाधित प्रजाती' : 'प्रभावित प्रजाति'}
                </span>
                <span className="font-bold text-slate-800 mt-1 block">
                  {getSpeciesLabel(selectedAdvisoryAlert.species)}
                </span>
              </div>
            </div>

            {/* Official Preventive Recommendations */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>
                  {isEnglish ? 'Recommended Bio-Security Steps' : isMarathi ? 'शिफारस केलेले जैव-सुरक्षा उपाय' : 'अनुशंसित जैव-सुरक्षा उपाय'}
                </span>
              </h4>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5">
                  <span className="text-emerald-700 font-bold shrink-0">1.</span>
                  <div>
                    <strong className="block text-emerald-950 font-bold">
                      {isEnglish ? 'Disinfection & Shed Hygiene' : isMarathi ? 'गोठ्याची निर्जंतुकीकरण व स्वच्छता' : 'बाड़े की स्वच्छता एवं कीटाणुशोधन'}
                    </strong>
                    <span>
                      {isEnglish
                        ? 'Spray cattle shed floors with 4% washing soda (sodium carbonate) or 1% potassium permanganate solution.'
                        : isMarathi
                        ? 'गोठ्याची जमीन ४% धुण्याच्या सोड्याने किंवा १% पोटॅशियम परमँगनेट द्रावणाने स्वच्छ धुऊन घ्या.'
                        : 'पशु बाड़े की फर्श को 4% कपड़े धोने के सोडे या 1% पोटेशियम परमैंगनेट घोल से अच्छी तरह धोएं।'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
                  <span className="text-amber-700 font-bold shrink-0">2.</span>
                  <div>
                    <strong className="block text-amber-950 font-bold">
                      {isEnglish ? 'Strict Herd Quarantine' : isMarathi ? 'कठोर विलगीकरण' : 'सख्त क्वारंटीन'}
                    </strong>
                    <span>
                      {isEnglish
                        ? 'Keep affected animals isolated in a dedicated shelter for at least 21 days until all scabs and ulcers heal completely.'
                        : isMarathi
                        ? 'बाधित जनावरांना इतर जनावरांपासून किमान २१ दिवस वेगळे ठेवा जोपर्यंत सर्व जखमा पूर्ण बऱ्या होत नाहीत.'
                        : 'प्रभावित पशुओं को अन्य पशुओं से कम से कम 21 दिनों तक अलग रखें जब तक कि घाव पूरी तरह ठीक न हो जाएं।'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-2.5">
                  <span className="text-blue-700 font-bold shrink-0">3.</span>
                  <div>
                    <strong className="block text-blue-950 font-bold">
                      {isEnglish ? 'Supportive Care & Soft Feed' : isMarathi ? 'सुलभ आहार आणि काळजी' : 'सुपाच्य आहार एवं देखभाल'}
                    </strong>
                    <span>
                      {isEnglish
                        ? 'Provide boiled soft gruel (dalia), clean lukewarm drinking water, and mineral mixtures to speed recovery.'
                        : isMarathi
                        ? 'पचायला हलका आहार, कोमट स्वच्छ पाणी आणि खनिज मिश्रण देऊन जनावरांची काळजी घ्या.'
                        : 'पशुओं को उबला हुआ सुपाच्य दलिया, गुनगुना साफ पानी और मिनरल मिक्सचर दें ताकि कमजोरी दूर हो सके।'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedAdvisoryAlert(null);
                  setShowVetModal(true);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{isEnglish ? 'Call Doctor' : isMarathi ? 'डॉक्टरांना कॉल करा' : 'डॉक्टर को कॉल करें'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAdvisoryAlert(null)}
                className="py-2.5 px-5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
              >
                {isEnglish ? 'Close' : isMarathi ? 'बंद करा' : 'बंद करें'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Contact Nearby Vet Modal */}
      {showVetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {isEnglish ? 'Emergency Vet Contacts' : isMarathi ? 'पशुवैद्यकीय आपत्कालीन संपर्क' : 'पशु चिकित्सा आपातकालीन संपर्क'}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isEnglish ? '24×7 Government Helpline & Local Doctors' : isMarathi ? '२४×७ शासकीय हेल्पलाइन व स्थानिक डॉक्टर' : '24×7 सरकारी हेल्पलाइन एवं स्थानीय डॉक्टर'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowVetModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* National Animal Helpline Card */}
            <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-4 rounded-2xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-100">
                  {isEnglish ? 'Toll-Free National Helpline' : isMarathi ? 'टोल-फ्री राष्ट्रीय हेल्पलाइन' : 'टोल-फ्री राष्ट्रीय पशु हेल्पलाइन'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold">24×7 FREE</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black tracking-wide">1962</div>
                  <div className="text-[11px] text-red-100">
                    {isEnglish ? 'National Animal Health Helpline' : isMarathi ? 'पशु आरोग्य राष्ट्रीय हेल्पलाइन' : 'पशु स्वास्थ्य एवं चिकित्सा कॉल सेंटर'}
                  </div>
                </div>
                <a
                  href="tel:1962"
                  className="px-4 py-2 rounded-xl bg-white text-red-700 font-black text-xs hover:bg-red-50 transition shadow-xs"
                >
                  {isEnglish ? 'Call Now' : isMarathi ? 'कॉल करा' : 'कॉल करें'}
                </a>
              </div>
            </div>

            {/* Local Veterinary Dispensary */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-sm">
                {isEnglish ? 'Baramati Taluka Veterinary Polyclinic' : isMarathi ? 'बारामती तालुका पशुवैद्यकीय दवाखाना' : 'बारामती ब्लॉक पशु चिकित्सालय'}
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Malegaon Road, Baramati (2.4 km away)</span>
              </div>
              <div className="text-slate-600">
                <strong className="text-slate-800 font-semibold">{isEnglish ? 'On-Call Officer:' : isMarathi ? 'पशुवैद्यक अधिकारी:' : 'चिकित्सा अधिकारी:'}</strong> Dr. R. K. Shinde (LDO)
              </div>
              <div className="pt-2 flex gap-2">
                <a
                  href="tel:02112224411"
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-center text-xs transition"
                >
                  📞 02112-224411
                </a>
                <Link
                  to="/veterinary-help"
                  onClick={() => setShowVetModal(false)}
                  className="py-2 px-3 rounded-xl bg-white border border-stone-300 text-slate-700 font-bold text-xs hover:bg-stone-100 transition"
                >
                  {isEnglish ? 'View All Vets' : isMarathi ? 'सर्व यादी' : 'पूरी सूची'}
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowVetModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
            >
              {isEnglish ? 'Close' : isMarathi ? 'बंद करा' : 'बंद करें'}
            </button>
          </div>
        </div>
      )}

      {/* 9. Vaccination Camp Registration Modal */}
      {selectedCamp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  {isEnglish ? 'Camp Registration' : isMarathi ? 'शिबीर नोंदणी' : 'शिविर पंजीकरण'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {isEnglish ? selectedCamp.titleEn : isMarathi ? selectedCamp.titleMr : selectedCamp.titleHi}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCamp(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>{isEnglish ? selectedCamp.dateEn : isMarathi ? selectedCamp.dateMr : selectedCamp.dateHi}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{selectedCamp.location}</span>
              </div>
            </div>

            {/* Farmer Registered Herd Info */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800">
                {isEnglish
                  ? `Select Livestock from Herd (${animals.length} registered)`
                  : isMarathi
                  ? `कळपातील जनावरे निवडा (${animals.length} नोंदणीकृत)`
                  : `झुंड से पशु चुनें (${animals.length} पंजीकृत)`}
              </span>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-slate-600">
                {isEnglish
                  ? 'All eligible cattle and buffaloes in your registered profile will automatically be issued vaccination entry passes.'
                  : isMarathi
                  ? 'आपल्या प्रोफाइलमधील सर्व पात्र जनावरांसाठी मोफत लसीकरण प्रवेश पास जारी केला जाईल.'
                  : 'आपके प्रोफाइल में पंजीकृत सभी पात्र पशुओं के लिए निःशुल्क टीकाकरण पास जारी कर दिया जाएगा।'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleRegisterCamp(selectedCamp)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEnglish ? 'Confirm Registration' : isMarathi ? 'नोंदणीची पुष्टी करा' : 'पंजीकरण की पुष्टि करें'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCamp(null)}
                className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
              >
                {isEnglish ? 'Cancel' : isMarathi ? 'रद्द करा' : 'रद्द करें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

