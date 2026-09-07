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
  Bell,
  PhoneCall,
  Activity,
  Plus
} from 'lucide-react';
import animalService from '../services/animalService';
import weatherService from '../services/weatherService';
import notificationService from '../services/notificationService';
import AnimalDetailModal from '../components/AnimalDetailModal';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const farmerName = user?.name || (i18n.language.startsWith('en') ? 'Ramlal Ji' : 'रामलाल जी');
  const locationText = `${user?.village || 'मलेगांव'}, ${user?.district || 'सीहोर'}, ${user?.state || 'मध्य प्रदेश'}`;

  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [weather] = useState(weatherService.getWeatherData());
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [animList, notifs] = await Promise.all([
        animalService.getAnimals(),
        notificationService.getNotifications()
      ]);
      setAnimals(animList);
      setNotifications(notifs);
    } catch (err) {
      console.error('Error loading farmer dashboard:', err);
    }
  };

  const totalCount = animals.length || 8;
  const healthyCount = animals.filter((a) => a.healthStatus === 'Healthy').length || 6;
  const attentionCount = animals.filter((a) => a.healthStatus === 'Needs Attention').length || 1;
  const criticalCount = animals.filter((a) => a.healthStatus === 'Critical').length || 1;

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
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl border border-stone-200 text-slate-600 hover:bg-stone-50 transition relative"
              title="सूचनाएं"
            >
              <Bell className="w-4 h-4" />
              {notifications.some((n) => n.unread) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-50 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="font-bold text-slate-900">सूचनाएं</span>
                  <button
                    onClick={() => {
                      notificationService.markAllAsRead();
                      setNotifications(notificationService.getNotifications());
                    }}
                    className="text-[11px] text-emerald-700 font-bold hover:underline"
                  >
                    सभी पढ़ी गईं
                  </button>
                </div>
                <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-2 space-y-0.5">
                      <div className="font-bold text-slate-800">{n.titleHi}</div>
                      <p className="text-slate-500 text-[11px]">{n.messageHi}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 1962 Helpline */}
          <a
            href="tel:1962"
            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
            <span>हेल्पलाइन 1962</span>
          </a>
        </div>
      </div>

      {/* 2. Weather & Seasonal Advice Strip */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CloudSun className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{weather.temperature}°C</span>
              <span className="text-slate-500 font-medium">{t('farmer_dash.humidity')}: {weather.humidity}%</span>
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                {t('farmer_dash.weather_title')}: {weather.heatStressLevel}
              </span>
            </div>
            <p className="text-slate-600 mt-0.5">
              {i18n.language.startsWith('en') ? weather.alertEn : weather.alertHi}
            </p>
          </div>
        </div>
      </div>

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

      {/* 4. Clean Area Alert Notice */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <span className="font-bold text-amber-900 block">{t('nav.advisories')}:</span>
            <p className="text-slate-700 mt-0.5">
              {i18n.language.startsWith('en')
                ? 'Regional disease alert: ensure shaded stalls, ample fresh water and inspect livestock daily.'
                : 'आपके क्षेत्र में पशु रोग की सूचना है। पशुओं को पर्याप्त छाया व स्वच्छ पानी दें।'}
            </p>
          </div>
        </div>
        <Link
          to="/reports"
          className="text-xs font-bold text-amber-900 hover:underline whitespace-nowrap"
        >
          {t('actions.details')} →
        </Link>
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
            <span>{t('dashboard.view_all', 'सभी देखें')} ({animals.length})</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {animals.slice(0, 3).map((a) => (
            <div
              key={a._id}
              className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">
                    {a.species === 'Buffalo' ? '🦬' : a.species === 'Goat' ? '🐐' : '🐄'}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{a.name}</h3>
                    <p className="text-[11px] text-slate-500">{a.species} • {a.age} {t('farmer_dash.years')}</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200">
                  {a.healthStatus}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 flex justify-between border-t border-stone-200/60 pt-2">
                <span>Tag: {a.tagId}</span>
                <span>{t('farmer_dash.milk_yield')}: {a.milkYieldDaily}</span>
              </div>

              <button
                onClick={() => setSelectedAnimal(a)}
                className="w-full text-center bg-white hover:bg-stone-100 text-slate-800 text-xs font-semibold py-1.5 rounded-lg border border-stone-300 transition"
              >
                {t('farmer_dash.view_details')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Animal Detail Modal */}
      {selectedAnimal && (
        <AnimalDetailModal
          animal={selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
          onUpdate={loadDashboardData}
        />
      )}
    </div>
  );
}
