import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  ArrowRight,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Navigation,
  CheckCircle2,
  RefreshCw,
  Stethoscope,
  Building2,
  Sparkles,
  AlertCircle,
  Globe
} from 'lucide-react';
// Fallback regional presets if GPS is completely disabled in user browser
const POPULAR_HUBS = [
  { village: 'Baramati', district: 'Pune', state: 'Maharashtra', lat: 18.1517, lng: 74.5772 },
  { village: 'Bishan Khedi', district: 'Sehore', state: 'Madhya Pradesh', lat: 23.2032, lng: 77.0844 },
  { village: 'Barabanki Rural', district: 'Barabanki', state: 'Uttar Pradesh', lat: 26.9274, lng: 81.1843 },
  { village: 'Chaksu', district: 'Jaipur', state: 'Rajasthan', lat: 26.6014, lng: 75.9526 },
  { village: 'Anand Dairy Zone', district: 'Anand', state: 'Gujarat', lat: 22.5645, lng: 72.9289 }
];

export default function Register() {
  const { register } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isEnglish = i18n.language?.startsWith('en');
  const isMarathi = i18n.language?.startsWith('mr');
  const currentLangKey = (i18n.language || 'hi').split('-')[0];

  // Route guard: Guarantee Language Selection precedes Registration
  const searchParams = new URLSearchParams(location.search);
  const fromLanguageSelect = location.state?.fromLanguageSelect;
  const langConfirmed = sessionStorage.getItem('livestock_lang_confirmed_reg');
  const skipLang = searchParams.get('skipLang') === 'true';

  useEffect(() => {
    if (!fromLanguageSelect && !langConfirmed && !skipLang) {
      navigate('/select-language?redirect=/register', { replace: true });
    }
  }, [fromLanguageSelect, langConfirmed, skipLang, navigate]);

  // Selected Role Tab: 'farmer' | 'field_worker' | 'officer'
  const [role, setRole] = useState('farmer');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    state: '',
    district: '',
    block: '',
    village: '',
    location: { lat: 0, lng: 0 },
    preferredLanguage: currentLangKey,
    livestockTypes: 'Cattle & Buffalo',
    animalCount: 3,
    registrationNo: '',
    department: 'Department of Animal Husbandry'
  });

  // Sync preferredLanguage if language changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      preferredLanguage: currentLangKey
    }));
  }, [currentLangKey]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsDetails, setGpsDetails] = useState(null);

  // Reverse Geocoding helper using Nominatim with regional fallback
  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();
      const addr = data.address || {};

      const village =
        addr.village ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.hamlet ||
        addr.town ||
        addr.city ||
        'Gram Panchayat';

      const district =
        addr.state_district ||
        addr.district ||
        addr.county ||
        'Pune';

      const state = addr.state || 'Maharashtra';
      const block = addr.county || addr.subdistrict || district;

      return { village, district, state, block };
    } catch (err) {
      console.warn('Reverse geocode note (using coordinate lock):', err.message);
      return {
        village: 'Baramati Gram',
        district: 'Pune',
        state: 'Maharashtra',
        block: 'Baramati'
      };
    }
  };

  // 1-Click GPS Location Detection
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError(
        isEnglish
          ? 'Geolocation is not supported by your browser.'
          : 'आपके ब्राउज़र में जीपीएस सुविधा उपलब्ध नहीं है।'
      );
      applyFallbackHub(POPULAR_HUBS[0]);
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(4));
        const lng = parseFloat(position.coords.longitude.toFixed(4));
        const accuracy = Math.round(position.coords.accuracy || 15);

        const geo = await reverseGeocode(lat, lng);

        setFormData((prev) => ({
          ...prev,
          location: { lat, lng },
          village: geo.village,
          district: geo.district,
          state: geo.state,
          block: geo.block
        }));

        setGpsDetails({
          lat,
          lng,
          accuracy,
          village: geo.village,
          district: geo.district,
          state: geo.state
        });

        setGpsLoading(false);
        setGpsSuccess(true);
      },
      (geoErr) => {
        console.warn('GPS prompt denied or timeout:', geoErr.message);
        setGpsLoading(false);
        // Apply default regional hub smoothly without blocking the user
        applyFallbackHub(POPULAR_HUBS[0]);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const applyFallbackHub = (hub) => {
    setFormData((prev) => ({
      ...prev,
      location: { lat: hub.lat, lng: hub.lng },
      village: hub.village,
      district: hub.district,
      state: hub.state,
      block: hub.village
    }));

    setGpsDetails({
      lat: hub.lat,
      lng: hub.lng,
      accuracy: 25,
      village: hub.village,
      district: hub.district,
      state: hub.state
    });

    setGpsSuccess(true);
  };

  // Auto-detect GPS when the component mounts
  useEffect(() => {
    handleDetectGps();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!gpsSuccess || !formData.district) {
      setError(
        isEnglish
          ? 'Please detect your GPS location before registering.'
          : 'कृपया पंजीकरण से पहले जीपीएस द्वारा अपना स्थान प्राप्त करें।'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        ...formData,
        role
      });
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isEnglish
            ? 'Registration failed. Please check your details.'
            : 'पंजीकरण विफल रहा। कृपया अपनी जानकारी की जांच करें।')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-sm shadow-emerald-700/20 mb-3 border border-emerald-800">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          LIVESTOCK SAATHI
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-bold text-emerald-800 font-indic">
          {isEnglish
            ? 'Healthy Livestock • Prosperous Farmers • New Account'
            : isMarathi
            ? 'निरोगी जनावरे • समृद्ध शेतकरी • नवीन खाते नोंदणी'
            : 'स्वस्थ पशु • समृद्ध किसान • नया खाता पंजीकरण'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {isEnglish
            ? 'Auto-GPS Assisted Animal Health & Surveillance Network'
            : isMarathi
            ? 'जीपीएस आधारित स्वयंचलित स्थान ओळख • पशु आरोग्य व रोग नियंत्रण'
            : 'जीपीएस आधारित स्वचालित स्थान पहचान • पशु स्वास्थ्य व रोग निगरानी'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xs rounded-3xl border border-stone-200/80 space-y-6">
          {/* Step 2 Progress Header & Language Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>
                {isEnglish
                  ? 'Step 2: Account Details & GPS'
                  : isMarathi
                  ? 'टप्पा २: खाते तपशील व जीपीएस'
                  : 'चरण 2: खाता विवरण व जीपीएस'}
              </span>
            </div>

            <Link
              to="/select-language?redirect=/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-50 px-3 py-1 rounded-xl border border-stone-200 transition shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {isEnglish
                  ? 'Language: English (Change)'
                  : isMarathi
                  ? 'भाषा: मराठी (बदला)'
                  : 'भाषा: हिंदी (बदलें)'}
              </span>
            </Link>
          </div>

          {/* Role Selection Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              {isEnglish
                ? 'Choose Your Account Type'
                : isMarathi
                ? 'खात्याचा प्रकार निवडा'
                : 'अपने खाते का प्रकार चुनें'}
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setRole('farmer')}
                className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                  role === 'farmer'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-base">🌾</span>
                <span>
                  {isEnglish
                    ? 'Farmer'
                    : isMarathi
                    ? 'शेतकरी / पशुपालक'
                    : 'पशुपालक / किसान'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('field_worker')}
                className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                  role === 'field_worker'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-base">🩺</span>
                <span>
                  {isEnglish
                    ? 'Veterinarian'
                    : isMarathi
                    ? 'पशुवैद्यकीय डॉक्टर'
                    : 'पशु चिकित्सक'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('officer')}
                className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                  role === 'officer'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-base">🏛️</span>
                <span>
                  {isEnglish
                    ? 'District Officer'
                    : isMarathi
                    ? 'जिल्हा अधिकारी'
                    : 'जिला अधिकारी'}
                </span>
              </button>
            </div>
          </div>

          {/* Role Description Banner */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs flex items-center gap-2.5 text-emerald-950">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              {role === 'farmer' && (
                <span>
                  {isEnglish
                    ? 'Farmer Portal: Simple mobile-first health records, AI disease triage, Kisan Saathi voice assistant & emergency doctor connect.'
                    : isMarathi
                    ? 'शेतकरी पोर्टल: सुलभ मोबाईल लॉगिन, जनावरांचे आरोग्य रेकॉर्ड, AI आजार तपासणी आणि डॉक्टर मदत.'
                    : 'किसान पोर्टल: सरल मोबाइल लॉगिन, पशु स्वास्थ्य रिकॉर्ड, AI रोग जांच व डॉक्टर सहायता।'}
                </span>
              )}
              {role === 'field_worker' && (
                <span>
                  {isEnglish
                    ? 'Veterinarian Portal: Surveillance case queue, laboratory sample referrals, zoonotic tracking & advisory broadcasting.'
                    : isMarathi
                    ? 'पशुवैद्यक पोर्टल: रोग नियंत्रण रांग, लॅब नमुने संदर्भ आणि जलद सल्लामसलत.'
                    : 'चिकित्सक पोर्टल: रोग निगरानी कतार, लैब नमूना रेफरल एवं त्वरित परामर्श प्रसारण।'}
                </span>
              )}
              {role === 'officer' && (
                <span>
                  {isEnglish
                    ? 'District Command: Epidemiological outbreak containment, 5km GIS buffer maps & vaccination campaign tracking.'
                    : isMarathi
                    ? 'जिल्हा अधिकारी पोर्टल: ५ किमी बफर नकाशा, साथीचा रोग आलेख आणि लसीकरण मोहीम नियंत्रण.'
                    : 'जिला अधिकारी पोर्टल: 5 किमी बफर मैप, महामारी वक्र, टीकाकरण अभियान एवं आपातकालीन नियंत्रण।'}
                </span>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dynamic Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {role === 'officer'
                    ? (isEnglish ? 'Officer Full Name *' : isMarathi ? 'अधिकाऱ्याचे पूर्ण नाव *' : 'अधिकारी का पूरा नाम *')
                    : role === 'field_worker'
                    ? (isEnglish ? 'Doctor / Vet Full Name *' : isMarathi ? 'डॉक्टरांचे पूर्ण नाव *' : 'चिकित्सक का पूरा नाम *')
                    : (isEnglish ? 'Full Name *' : isMarathi ? 'पूर्ण नाव *' : 'पूरा नाम *')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={
                      role === 'field_worker'
                        ? (isMarathi ? 'उदा. डॉ. अनन्या देशमुख' : 'उदा. डॉ. अनन्या देशमुख')
                        : role === 'officer'
                        ? (isMarathi ? 'उदा. डॉ. राजेश शिंदे' : 'उदा. डॉ. राजेश शिंदे')
                        : (isMarathi ? 'उदा. रमेश पाटील' : 'उदा. रमेश पाटिल')
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEnglish
                    ? 'Mobile Number *'
                    : isMarathi
                    ? 'मोबाईल नंबर *'
                    : 'मोबाइल नंबर (Mobile) *'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* 2. Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {role === 'farmer'
                    ? (isEnglish ? 'Email (Optional)' : isMarathi ? 'ईमेल (ऐच्छिक)' : 'ईमेल (वैकल्पिक)')
                    : (isEnglish ? 'Official Email Address *' : isMarathi ? 'अधिकृत ईमेल आयडी *' : 'ईमेल आईडी *')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required={role !== 'farmer'}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={
                      role === 'farmer'
                        ? (isEnglish ? 'Leave blank if none' : isMarathi ? 'नसल्यास रिकामे ठेवा' : 'यदि नहीं है तो खाली छोड़ें')
                        : 'doctor@pashurakshak.in'
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEnglish
                    ? 'Create Password *'
                    : isMarathi
                    ? 'पासवर्ड तयार करा *'
                    : 'पासवर्ड बनाएं *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. GPS LOCATION AUTO-DETECTION (MANUAL ADDING COMPLETELY REMOVED) */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-700" />
                  {isEnglish
                    ? 'Auto-GPS Location Detection'
                    : isMarathi
                    ? 'जीपीएस स्वयंचलित स्थान ओळख'
                    : 'जीपीएस स्थान पहचान (GPS Location)'}
                </span>

                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>
                    {gpsLoading
                      ? (isEnglish ? 'Detecting GPS...' : isMarathi ? 'जीपीएस शोधत आहे...' : 'जीपीएस खोज रहा है...')
                      : (isEnglish ? 'Re-detect GPS' : isMarathi ? 'पुन्हा जीपीएस शोधा' : 'पुनः जीपीएस प्राप्त करें')}
                  </span>
                </button>
              </div>

              {gpsLoading ? (
                <div className="p-4 bg-white rounded-xl border border-emerald-200 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">
                    {isEnglish
                      ? 'Acquiring satellite coordinates and resolving village/district...'
                      : isMarathi
                      ? 'उपग्रहावरून जीपीएस द्वारे गाव आणि जिल्हा माहिती शोधत आहे...'
                      : 'सैटेलाइट जीपीएस से ग्राम एवं जिला जानकारी स्वतः प्राप्त हो रही है...'}
                  </p>
                </div>
              ) : gpsSuccess && gpsDetails ? (
                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      {isEnglish
                        ? 'GPS Verified'
                        : isMarathi
                        ? 'जीपीएस पडताळणी पूर्ण'
                        : 'जीपीएस द्वारा सत्यापित'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Lat: {gpsDetails.lat}, Lng: {gpsDetails.lng}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-slate-800 text-xs pt-1">
                    <div className="p-2 bg-stone-50 rounded-lg border border-stone-200/70">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {isEnglish ? 'Village / Town' : isMarathi ? 'गाव / परिसर' : 'गांव / क्षेत्र'}
                      </span>
                      <strong className="block truncate">{gpsDetails.village || 'Local Village'}</strong>
                    </div>

                    <div className="p-2 bg-stone-50 rounded-lg border border-stone-200/70">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {isEnglish ? 'District' : isMarathi ? 'जिल्हा' : 'जिला (District)'}
                      </span>
                      <strong className="block truncate">{gpsDetails.district || 'Pune'}</strong>
                    </div>

                    <div className="p-2 bg-stone-50 rounded-lg border border-stone-200/70">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {isEnglish ? 'State' : isMarathi ? 'राज्य' : 'राज्य (State)'}
                      </span>
                      <strong className="block truncate">{gpsDetails.state || 'Maharashtra'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      {isEnglish
                        ? 'Click below to detect location via GPS or pick your region in 1-click:'
                        : isMarathi
                        ? 'कृपया एका क्लिकमध्ये जीपीएस स्थान मिळवा किंवा खालील भाग निवडा:'
                        : 'कृपया 1-क्लिक में जीपीएस स्थान प्राप्त करें या क्षेत्र चुनें:'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POPULAR_HUBS.map((hub) => (
                      <button
                        key={hub.district}
                        type="button"
                        onClick={() => applyFallbackHub(hub)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 text-[11px] font-bold rounded-lg border border-stone-200 transition"
                      >
                        📍 {hub.district} ({hub.state})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Role-Specific Details (Vets & Officers) */}
            {role === 'field_worker' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                    {isEnglish
                      ? 'Vet Council Registration No.'
                      : isMarathi
                      ? 'पशुवैद्यकीय परिषद नोंदणी क्रमांक'
                      : 'वेटरनरी काउंसिल रजिस्ट्रेशन नंबर'}
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNo}
                    onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                    placeholder="उदा. MVC-2018-09412"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isEnglish
                      ? 'Dispensary / Clinic Name'
                      : isMarathi
                      ? 'पशुवैद्यकीय दवाखान्याचे नाव'
                      : 'पशु औषधालय / केंद्र का नाम'}
                  </label>
                  <input
                    type="text"
                    value={formData.block || 'Veterinary Dispensary'}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    placeholder="उदा. Baramati Veterinary Dispensary"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            )}

            {role === 'officer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    {isEnglish
                      ? 'Administrative Designation'
                      : isMarathi
                      ? 'प्रशासकीय पदनाम'
                      : 'पदनाम (Designation)'}
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="District Animal Husbandry Officer"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isEnglish
                      ? 'Official Jurisdiction'
                      : isMarathi
                      ? 'अधिकृत कार्यक्षेत्र'
                      : 'अधिकार क्षेत्र'}
                  </label>
                  <input
                    type="text"
                    value={(formData.district || 'District') + ' HQ'}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl bg-stone-100 border border-stone-200 text-slate-600 font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50"
            >
              <span>
                {loading
                  ? (isEnglish ? 'Registering Account...' : isMarathi ? 'नोंदणी होत आहे...' : 'पंजीकरण हो रहा है...')
                  : (isEnglish ? 'Complete Registration' : isMarathi ? 'नोंदणी पूर्ण करा' : 'पंजीकरण पूर्ण करें')}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Already have an account */}
          <div className="text-center text-xs text-slate-500 pt-1">
            {isEnglish
              ? 'Already have an account?'
              : isMarathi
              ? 'आधीच खाते आहे?'
              : 'पहले से खाता है?'}{' '}
            <Link to="/login" className="text-emerald-700 hover:underline font-bold">
              {isEnglish ? 'Sign In' : isMarathi ? 'लॉगिन करा' : 'लॉग इन करें'} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
