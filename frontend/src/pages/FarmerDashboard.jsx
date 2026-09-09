import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  Camera,
  HeartPulse,
  Syringe,
  Stethoscope,
  MapPin,
  AlertTriangle,
  Building2,
  CloudSun,
  Droplets,
  Thermometer,
  ShieldAlert,
  ChevronRight,
  PhoneCall,
  Activity,
  Plus,
  RefreshCw,
  CheckCircle2,
  Shield,
  Eye,
  Info,
  Clock,
  X
} from 'lucide-react';
import animalService from '../services/animalService';
import weatherService from '../services/weatherService';
import nadresService from '../services/nadresService';
import AnimalDetailModal from '../components/AnimalDetailModal';
import { getCleanLang, getSpeciesDisplayName, getBreedDisplayName } from '../constants/livestockData';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');
  const isMarathi = i18n.language?.startsWith('mr');
  const farmerName = user?.name || (isEnglish ? 'Kisan Saathi' : isMarathi ? 'शेतकरी मित्र' : 'किसान साथी');
  const locationParts = [user?.village, user?.block, user?.district || 'Nagpur'].filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(', ') : (isEnglish ? 'Nagpur, Maharashtra' : 'नागपुर, महाराष्ट्र');

  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  
  // Real live weather state
  const [weather, setWeather] = useState({
    temperature: 26,
    humidity: 80,
    thiScore: 76,
    heatStressLevel: 'Mild Heat Stress',
    alertEn: 'Live agrometeorological feed. Weather is favorable for livestock.',
    alertHi: 'मौसम अनुकूल है। स्वच्छ पीने का पानी और सामान्य दिनचर्या बनाए रखें।',
    alertMr: 'हवामान जनावरांसाठी अनुकूल आहे. स्वच्छ पाणी उपलब्ध ठेवा.',
    isLive: false
  });
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Village Disease Alert state
  const [villageAlerts, setVillageAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [activeAlertModal, setActiveAlertModal] = useState(null); // null | 'symptoms'
  const [selectedAlertDisease, setSelectedAlertDisease] = useState(null);

  useEffect(() => {
    loadDashboardData();
    loadLiveWeather();
    loadVillageAlerts();
  }, [user]);

  const loadLiveWeather = async () => {
    setWeatherLoading(true);
    try {
      const data = await weatherService.getLiveWeather({
        district: user?.district || 'Baramati',
        state: user?.state || 'Maharashtra',
        lat: user?.location?.lat,
        lng: user?.location?.lng
      });
      if (data) setWeather(data);
    } catch (err) {
      console.warn('Weather load error:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const loadVillageAlerts = async () => {
    setAlertsLoading(true);
    try {
      const data = await nadresService.getVillageAlerts({
        district: user?.district || 'Pune',
        state: user?.state || 'Maharashtra',
        village: user?.village || 'Rui',
        block: user?.block || 'Baramati',
        lat: user?.location?.lat,
        lng: user?.location?.lng
      });
      if (data && Array.isArray(data.alerts)) {
        setVillageAlerts(data.alerts);
      } else {
        setVillageAlerts([]);
      }
    } catch (err) {
      console.warn('Village alerts load error:', err);
      setVillageAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleModalUpdate = async (updatedAnimal) => {
    if (updatedAnimal) {
      setSelectedAnimal(updatedAnimal);
      setAnimals((prev) =>
        prev.map((a) =>
          (a._id === updatedAnimal._id || a.id === updatedAnimal.id || a.tagId === updatedAnimal.tagId)
            ? updatedAnimal
            : a
        )
      );
    }
    await loadDashboardData(updatedAnimal?._id || selectedAnimal?._id);
  };

  const loadDashboardData = async (targetId) => {
    try {
      const animList = await animalService.getAnimals();
      setAnimals(animList || []);
      const activeId = targetId || selectedAnimal?._id || selectedAnimal?.id;
      if (activeId && animList) {
        const found = animList.find((a) => a._id === activeId || a.id === activeId || a.tagId === activeId);
        if (found) setSelectedAnimal(found);
      }
    } catch (err) {
      console.error('Error loading farmer dashboard:', err);
    }
  };

  const totalCount = animals.length;
  const healthyCount = animals.filter((a) => a.healthStatus === 'Healthy').length;
  const attentionCount = animals.filter((a) => a.healthStatus === 'Needs Attention').length;
  const criticalCount = animals.filter((a) => a.healthStatus === 'Critical').length;

  // Compute Vaccination Reminders due within 7 days or overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingVaccinationReminders = [];

  (animals || []).forEach((animal) => {
    const allVaccs = [
      ...(animal.vaccinations || []),
      ...(animal.vaccinationHistory || [])
    ];

    allVaccs.forEach((v) => {
      if (!v.nextDue) return;
      const nextDate = new Date(v.nextDue);
      if (isNaN(nextDate.getTime())) return;

      nextDate.setHours(0, 0, 0, 0);
      const diffMs = nextDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Display only when due within 7 days (including overdue)
      if (diffDays <= 7) {
        const isOverdue = diffDays < 0;
        const overdueDays = Math.abs(diffDays);

        upcomingVaccinationReminders.push({
          animalId: animal._id || animal.id || animal.tagId,
          animalName: animal.name || animal.tagId,
          tagId: animal.tagId,
          species: animal.species,
          vaccineName: v.vaccine || v.name || (isEnglish ? 'Vaccine' : 'लस / टीका'),
          dueDate: nextDate.toLocaleDateString('en-GB'),
          diffDays,
          isOverdue,
          daysRemainingText: isOverdue
            ? (isEnglish ? `${overdueDays} days overdue` : isMarathi ? `${overdueDays} दिवस थकबाकी` : `${overdueDays} दिन अतिदेय`)
            : diffDays === 0
            ? (isEnglish ? 'Due Today' : isMarathi ? 'आज देय' : 'आज देय')
            : (isEnglish ? `${diffDays} days remaining` : isMarathi ? `${diffDays} दिवस शिल्लक` : `${diffDays} दिन शेष`),
          badgeText: isOverdue
            ? (isEnglish ? '● Overdue' : isMarathi ? '● थकबाकी' : '● अतिदेय')
            : (isEnglish ? '● Due Soon' : isMarathi ? '● लवकरच देय' : '● शीघ्र देय'),
          badgeClass: isOverdue
            ? 'bg-red-50 text-red-700 border-red-200 font-extrabold'
            : 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          fullAnimal: animal
        });
      }
    });
  });

  // Sort: overdue first, then soonest due
  upcomingVaccinationReminders.sort((a, b) => a.diffDays - b.diffDays);

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-24 lg:pb-12 px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
      {/* 1. Clean Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">
              {t('farmer_dash.greeting')} {farmerName} 👋
            </h1>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span>📍 {locationText}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* 1962 Helpline */}
          <a
            href="tel:1962"
            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-2xs"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isEnglish ? 'Helpline 1962' : isMarathi ? 'हेल्पलाईन १९६२' : 'हेल्पलाइन 1962'}</span>
          </a>
        </div>
      </div>

      {/* 2. Weather & Bovine Heat Stress (Live Open-Meteo & IMD) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <CloudSun className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-slate-900 text-sm">
                {weather?.temperature ?? 26}°C
              </span>
              <span className="text-slate-500 font-medium">
                {t('farmer_dash.humidity')}: {weather?.humidity ?? 78}%
              </span>
              {weather?.windSpeed && (
                <span className="text-slate-400 text-[11px] font-medium">
                  • {isEnglish ? 'Wind' : isMarathi ? 'वारा' : 'हवा'}: {weather.windSpeed} km/h
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  weather?.thiScore >= 84
                    ? 'text-red-800 bg-red-50 border-red-200'
                    : weather?.thiScore >= 78
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                }`}
              >
                THI {weather?.thiScore ?? 76}: {weather?.heatStressLevel || 'Normal'}
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Weather
              </span>
            </div>
            <p className="text-slate-600 mt-1 leading-relaxed">
              {isEnglish
                ? weather?.alertEn
                : isMarathi
                ? (weather?.alertMr || weather?.alertHi)
                : weather?.alertHi}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadLiveWeather}
          disabled={weatherLoading}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-emerald-800 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
          title="अपडेट करें (Refresh Weather)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>{weatherLoading ? (isEnglish ? 'Updating...' : 'अपडेट हो रहा...') : (isEnglish ? 'Refresh' : 'अपडेट')}</span>
        </button>
      </div>

      {/* Vaccination Reminder Card (Displays ONLY when a vaccine is due within 7 days or overdue) */}
      {upcomingVaccinationReminders.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-2xs space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Syringe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{isEnglish ? 'Vaccination Reminders' : isMarathi ? 'लसीकरण आठवण' : 'टीकाकरण अनुस्मारक'}</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    {upcomingVaccinationReminders.length} {isEnglish ? 'Action Needed' : isMarathi ? 'आवश्यक' : 'आवश्यक'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  {isEnglish
                    ? 'Vaccines due within the next 7 days or overdue for your herd'
                    : isMarathi
                    ? 'तुमच्या कळपातील पुढील ७ दिवसांत देय किंवा थकबाकी असलेल्या लसी'
                    : 'आपके पशुओं के लिए अगले 7 दिनों में देय अथवा अतिदेय टीके'}
                </p>
              </div>
            </div>

            <Link
              to="/vaccination"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              <span>{isEnglish ? 'View Full Schedule' : isMarathi ? 'संपूर्ण वेळापत्रक पहा' : 'पूरी समय-सारणी देखें'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingVaccinationReminders.map((rem, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedAnimal(rem.fullAnimal)}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 cursor-pointer hover:shadow-xs ${
                  rem.isOverdue
                    ? 'bg-red-50/40 border-red-200 hover:border-red-400'
                    : 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {rem.species === 'Buffalo' ? '🐃' : rem.species === 'Goat' ? '🐐' : rem.species === 'Sheep' ? '🐑' : '🐄'}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                        {rem.animalName}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {rem.tagId}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md border whitespace-nowrap shadow-2xs ${rem.badgeClass}`}>
                    {rem.badgeText}
                  </span>
                </div>

                <div className="space-y-1 bg-white/80 p-2 rounded-lg border border-stone-200/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isEnglish ? 'Vaccine:' : isMarathi ? 'लस:' : 'टीका:'}
                    </span>
                    <span className="font-black text-slate-900 text-right">{rem.vaccineName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isEnglish ? 'Due Date:' : isMarathi ? 'देय तारीख:' : 'नियत तारीख:'}
                    </span>
                    <span className="font-mono font-semibold text-slate-800">{rem.dueDate}</span>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 border-t border-stone-100">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isEnglish ? 'Time Left:' : isMarathi ? 'शिल्लक वेळ:' : 'समय शेष:'}
                    </span>
                    <span
                      className={`font-black text-[11px] ${
                        rem.isOverdue ? 'text-red-700 font-extrabold' : 'text-amber-800 font-bold'
                      }`}
                    >
                      {rem.daysRemainingText}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnimal(rem.fullAnimal);
                  }}
                  className="w-full text-center bg-white hover:bg-stone-50 text-slate-800 text-[11px] font-bold py-1.5 rounded-lg border border-stone-200 transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Syringe className="w-3 h-3 text-emerald-700" />
                  <span>{isEnglish ? 'Update / Log Vaccine' : isMarathi ? 'लस नोंदवा' : 'टीका दर्ज करें'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Clean Health Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">{t('farmer_dash.total_livestock')}</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <span className="text-[11px] text-slate-400">Total Registered</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t('farmer_dash.healthy')}
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{healthyCount}</div>
          <span className="text-[11px] text-slate-400">Healthy</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> {t('farmer_dash.needs_attention')}
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">{attentionCount}</div>
          <span className="text-[11px] text-slate-400">Mild Symptoms</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> {t('farmer_dash.critical')}
          </span>
          <div className="text-2xl font-black text-red-600 mt-1">{criticalCount}</div>
          <span className="text-[11px] text-slate-400">Doctor Assigned</span>
        </div>
      </div>

      {/* 4. Village Disease Alert for Your Area (SIH PS-128) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl" role="img" aria-label="shield">🛡️</span>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              {t('village_disease_alert.title', 'Disease Alert for Your Area')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {t(
              'village_disease_alert.subtitle',
              'Based on government surveillance, weather conditions, nearby disease reports, and AI analysis.'
            )}
          </p>
        </div>

        {/* Dynamic Alerts State */}
        {alertsLoading ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-2">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>{t('village_disease_alert.loading_alerts', 'Checking live disease surveillance for your village...')}</p>
          </div>
        ) : villageAlerts.length === 0 ? (
          /* Empty State: Green Card */
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm sm:text-base font-black text-emerald-950">
                {t('village_disease_alert.no_active_alerts', 'No active disease outbreaks reported near your village.')}
              </h3>
              <p className="text-xs text-emerald-800/80 leading-relaxed">
                {t(
                  'village_disease_alert.no_active_alerts_sub',
                  'Your area is currently in the safe zone. Maintain routine wellness care, biosecurity, and shed hygiene.'
                )}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-200 shrink-0">
              {isEnglish ? '🟢 Safe Zone' : isMarathi ? '🟢 सुरक्षित क्षेत्र' : '🟢 सुरक्षित क्षेत्र'}
            </span>
          </div>
        ) : (
          /* Active Alerts Cards Grid (High -> Medium) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {villageAlerts.map((alert) => {
              const isHighRisk = alert.riskLevel === 'high';
              const cardStyles = isHighRisk
                ? {
                    cardBg: 'bg-red-50/70 border-red-200 hover:border-red-300',
                    badge: 'bg-red-100 text-red-800 border-red-200',
                    dot: 'bg-red-600',
                    btn: 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                  }
                : {
                    cardBg: 'bg-orange-50/70 border-orange-200 hover:border-orange-300',
                    badge: 'bg-orange-100 text-orange-800 border-orange-200',
                    dot: 'bg-orange-500',
                    btn: 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
                  };

              const diseaseDisplayName = isEnglish ? alert.nameEn : isMarathi ? alert.nameMr : alert.nameHi;
              const riskBadgeText = isEnglish ? alert.riskBadgeEn : isMarathi ? alert.riskBadgeMr : alert.riskBadgeHi;
              const locationText = isEnglish ? alert.locationEn : isMarathi ? alert.locationMr : alert.locationHi;
              const updatedText = isEnglish ? alert.lastUpdatedTextEn : isMarathi ? alert.lastUpdatedTextMr : alert.lastUpdatedTextHi;
              const aiRecText = isEnglish ? alert.aiRecommendationEn : isMarathi ? alert.aiRecommendationMr : alert.aiRecommendationHi;
              const sourceText = isEnglish ? alert.dataSourceEn : isMarathi ? alert.dataSourceMr : alert.dataSourceHi;

              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-4 transition ${cardStyles.cardBg}`}
                >
                  <div className="space-y-3">
                    {/* 1. Header: Disease Name & Risk Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cardStyles.dot} shrink-0`} />
                        <span>{diseaseDisplayName}</span>
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[11px] shrink-0 ${cardStyles.badge}`}>
                        {riskBadgeText}
                      </span>
                    </div>

                    {/* 2. Location & Last Updated */}
                    <div className="space-y-1 text-xs">
                      <div className="text-slate-800 font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{locationText}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 pl-5">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{updatedText}</span>
                      </div>
                    </div>

                    {/* 3. AI Recommendation */}
                    <div className="bg-white/90 rounded-xl p-3 border border-stone-200/90 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <span>💡 {t('village_disease_alert.ai_recommendation', 'AI Recommendation')}</span>
                        </div>
                        {alert.aiModel?.includes('gemini') ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                            <span>✨</span>
                            <span>Gemini LLM</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-slate-600 border border-stone-200 flex items-center gap-1">
                            <span>🩺</span>
                            <span>Clinical Protocol</span>
                          </span>
                        )}
                      </div>

                      {alert.weatherContext?.tempC && (
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap bg-stone-50/80 px-2 py-1 rounded-md border border-stone-200/60">
                          <span>🌤️ {alert.weatherContext.tempC}°C</span>
                          <span>•</span>
                          <span>💧 {alert.weatherContext.humidityPct}% Hum</span>
                          {alert.weatherContext.thi && (
                            <>
                              <span>•</span>
                              <span>THI {alert.weatherContext.thi}</span>
                            </>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {aiRecText}
                      </p>
                    </div>

                    {/* 4. Data Source */}
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <span>🏛️ {sourceText}</span>
                    </div>
                  </div>

                  {/* 5. Single Action Button per card */}
                  <div className="pt-2">
                    {isHighRisk ? (
                      <Link
                        to="/vaccination"
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${cardStyles.btn}`}
                      >
                        <Syringe className="w-3.5 h-3.5" />
                        <span>{t('village_disease_alert.find_vaccination_camp', 'Find Vaccination Camp')}</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAlertDisease(alert);
                          setActiveAlertModal('symptoms');
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${cardStyles.btn}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('village_disease_alert.know_symptoms', 'Know Symptoms')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* 5. Clean 8-Action Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          {t('farmer_dash.quick_actions')}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Kisan Saathi */}
          <Link
            to="/kisan-saathi"
            className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">AI Voice Assistant</span>
              <h3 className="text-sm font-bold text-slate-900">🎤 {t('farmer_dash.voice_assistant')}</h3>
            </div>
          </Link>

          {/* 2. Disease Detection */}
          <Link
            to="/report-sick"
            className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Early Diagnosis</span>
              <h3 className="text-sm font-bold text-slate-900">📷 {t('farmer_dash.scan_disease')}</h3>
            </div>
          </Link>

          {/* 3. My Animals */}
          <Link
            to="/animals"
            className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-slate-700 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Health Records</span>
              <h3 className="text-sm font-bold text-slate-900">🐄 {t('farmer_dash.my_herd')}</h3>
            </div>
          </Link>

          {/* 4. Vaccination */}
          <Link
            to="/vaccination"
            className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Immunization</span>
              <h3 className="text-sm font-bold text-slate-900">💉 {t('farmer_dash.vaccine_track')}</h3>
            </div>
          </Link>

          {/* 5. Find Veterinarian */}
          <Link
            to="/veterinary-help"
            className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Doctor Directory</span>
              <h3 className="text-sm font-bold text-slate-900">👨‍⚕️ {t('farmer_dash.doctor')}</h3>
            </div>
          </Link>

          {/* 6. Disease Map */}
          <Link
            to="/reports"
            className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Outbreak Cluster</span>
              <h3 className="text-sm font-bold text-slate-900">🗺️ {t('farmer_dash.outbreak_map')}</h3>
            </div>
          </Link>

          {/* 7. Emergency Help */}
          <Link
            to="/emergency-sos"
            className="p-4 rounded-2xl bg-red-50/70 border border-red-200 hover:border-red-400 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-red-700 font-bold block">24×7 Rapid Response</span>
              <h3 className="text-sm font-bold text-red-950">🚨 {t('farmer_dash.sos_emergency')}</h3>
            </div>
          </Link>

          {/* 8. Government Schemes */}
          <Link
            to="/government-schemes"
            className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition flex flex-col justify-between h-32"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Subsidies &amp; Loans</span>
              <h3 className="text-sm font-bold text-slate-900">🏛️ {t('farmer_dash.govt_schemes')}</h3>
            </div>
          </Link>
        </div>
      </div>

      {/* 6. Animal Cards Preview */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {t('farmer_dash.registered_animals')}
            </h2>
            <p className="text-xs text-slate-500">{t('farmer_dash.health_overview')}</p>
          </div>
          <Link
            to="/animals"
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>{t('dashboard.view_all', isEnglish ? 'View All' : isMarathi ? 'सर्व पहा' : 'सभी देखें')} ({animals.length})</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {animals.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-3">
            <span className="text-4xl block">🐄</span>
            <h3 className="font-bold text-slate-800 text-sm">
              {isEnglish ? 'No animals registered in your herd yet' : 'आपके खाते में अभी कोई पशु पंजीकृत नहीं है'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isEnglish
                ? 'Register your cattle, buffalo, goats or sheep to monitor individual health and vaccination dates.'
                : 'स्वास्थ्य व टीकाकरण ट्रैकिंग के लिए अपने पशुओं को जोड़ें।'}
            </p>
            <Link
              to="/animals"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {isEnglish ? 'Register First Animal' : isMarathi ? 'पहिले जनावर नोंदवा' : 'पहला पशु जोड़ें'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {animals.slice(0, 3).map((a) => {
              const currentLang = getCleanLang(i18n.language);
              const speciesText = getSpeciesDisplayName(a.species, currentLang);
              const breedText = getBreedDisplayName(a.breed, a.species, currentLang);
              const statusText =
                a.healthStatus === 'Healthy'
                  ? t('animal_form.status_healthy', 'Healthy')
                  : a.healthStatus === 'Needs Attention'
                  ? t('animal_form.status_attention', 'Needs Attention')
                  : t('animal_form.status_critical', 'Critical');

              return (
                <div
                  key={a._id}
                  className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">
                        {a.species === 'Buffalo' ? '🐃' : a.species === 'Goat' ? '🐐' : a.species === 'Sheep' ? '🐑' : '🐄'}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{a.name}</h3>
                        <p className="text-[11px] text-slate-500">
                          {speciesText}{breedText ? ` • ${breedText}` : ''} • {a.age} {t('farmer_dash.years')}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200">
                      {statusText}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex justify-between border-t border-stone-200/60 pt-2">
                    <span>{t('animal_form.tag_id', 'Tag')}: {a.tagId}</span>
                    <span>{a.gender === 'Male' ? (isEnglish ? 'Male' : isMarathi ? 'नर' : 'नर') : (isEnglish ? 'Female' : isMarathi ? 'मादी' : 'मादा')}</span>
                  </div>

                  <button
                    onClick={() => setSelectedAnimal(a)}
                    className="w-full text-center bg-white hover:bg-stone-100 text-slate-800 text-xs font-semibold py-1.5 rounded-lg border border-stone-300 transition cursor-pointer"
                  >
                    {t('farmer_dash.view_details')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animal Detail Modal */}
      {selectedAnimal && (
        <AnimalDetailModal
          animal={selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
          onUpdate={handleModalUpdate}
        />
      )}

      {/* Modal 1: Disease Symptoms Checklist Modal */}
      {activeAlertModal === 'symptoms' && selectedAlertDisease && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isEnglish ? 'Symptoms Checklist' : isMarathi ? 'लक्षणे तपासणी सूची' : 'लक्षण जांच सूची'}: {isEnglish ? selectedAlertDisease.nameEn : isMarathi ? selectedAlertDisease.nameMr : selectedAlertDisease.nameHi}
                  </h3>
                  <span className="text-xs text-orange-800 font-bold">
                    {isEnglish ? selectedAlertDisease.riskBadgeEn : isMarathi ? selectedAlertDisease.riskBadgeMr : selectedAlertDisease.riskBadgeHi} • {isEnglish ? selectedAlertDisease.locationEn : isMarathi ? selectedAlertDisease.locationMr : selectedAlertDisease.locationHi}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveAlertModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-orange-50 rounded-2xl p-3.5 border border-orange-200/80">
                <div className="font-bold text-orange-950 mb-2">
                  {isEnglish ? 'Key Signs to Inspect in Your Animals:' : isMarathi ? 'जनावरांमध्ये तपासण्याची मुख्य लक्षणे:' : 'पशुओं में जांचने योग्य मुख्य लक्षण:'}
                </div>
                <ul className="space-y-1.5 text-slate-800">
                  {((isEnglish ? selectedAlertDisease.symptomsEn : isMarathi ? selectedAlertDisease.symptomsMr : selectedAlertDisease.symptomsHi) || []).map((symptom, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                <div className="font-bold text-slate-900 mb-2">
                  {isEnglish ? 'Immediate Precautionary Steps:' : isMarathi ? 'तातडीने करावयाची खबरदारी:' : 'तत्काल सावधानियां:'}
                </div>
                <ul className="space-y-1.5 text-slate-700">
                  {((isEnglish ? selectedAlertDisease.preventionsEn : isMarathi ? selectedAlertDisease.preventionsMr : selectedAlertDisease.preventionsHi) || []).map((prev, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{prev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Link
                to="/report-sick"
                onClick={() => setActiveAlertModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-slate-800 text-white font-black text-xs text-center flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{isEnglish ? 'Scan Animal with AI' : isMarathi ? 'एआय द्वारे जनावराची तपासणी करा' : 'एआई से पशु की जांच करें'}</span>
              </Link>
              <button
                type="button"
                onClick={() => setActiveAlertModal(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
              >
                {isEnglish ? 'Close' : isMarathi ? 'बंद करा' : 'बंद करें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
