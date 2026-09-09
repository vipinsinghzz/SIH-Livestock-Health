import React, { useState, useEffect } from 'react';
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
  RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import veterinaryService from '../services/veterinaryService';

export default function VeterinaryHelpPage() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const isMarathi = i18n.language === 'mr';

  const [centers, setCenters] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCenters();
  }, [selectedCategory, emergencyOnly]);

  const loadCenters = async () => {
    const data = await veterinaryService.getNearbyCenters({
      category: selectedCategory,
      emergencyOnly
    });
    setCenters(data);
  };

  const filteredCenters = centers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
      (c.nameHi && c.nameHi.includes(q)) ||
      (c.nameMr && c.nameMr.includes(q)) ||
      (c.facilityEn && c.facilityEn.toLowerCase().includes(q)) ||
      (c.facilityHi && c.facilityHi.includes(q)) ||
      (c.facilityMr && c.facilityMr.includes(q)) ||
      (c.addressEn && c.addressEn.toLowerCase().includes(q)) ||
      (c.addressHi && c.addressHi.includes(q)) ||
      (c.addressMr && c.addressMr.includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

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
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. Header Banner with 24×7 1962 Helpline */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-3xl p-6 sm:p-7 text-white shadow-md flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left flex-1">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full border border-white/15 inline-block">
              {t('veterinary_page.network_badge')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t('veterinary_page.title')}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
              {t('veterinary_page.subtitle')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-4 sm:p-5 text-center lg:text-right shrink-0 w-full lg:w-auto shadow-inner space-y-2">
            <span className="text-xs font-semibold text-emerald-200 block">
              {t('veterinary_page.helpline_title')}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 flex items-center justify-center lg:justify-end gap-2">
              <PhoneCall className="w-6 h-6 text-amber-400 animate-pulse" />
              <span>{t('veterinary_page.helpline_phone')}</span>
              <span className="text-xs font-extrabold bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30">
                {t('veterinary_page.helpline_badge')}
              </span>
            </div>
            <span className="text-[11px] text-emerald-100/90 block">
              {t('veterinary_page.helpline_sub')}
            </span>
            <a
              href="tel:1962"
              className="inline-flex items-center justify-center gap-1.5 w-full bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs py-2 px-4 rounded-xl transition shadow-xs cursor-pointer mt-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{t('veterinary_page.call_helpline')}</span>
            </a>
          </div>
        </div>

        {/* 2. Filters & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto no-scrollbar pb-1 lg:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
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
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 w-full sm:w-auto justify-center sm:justify-start">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>{t('veterinary_page.emergency_only')}</span>
            </label>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('veterinary_page.search_placeholder')}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* 3. Empty State */}
        {filteredCenters.length === 0 ? (
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
          /* 4. Centers List Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCenters.map((c) => {
              const displayName = isEnglish ? c.nameEn : isMarathi ? c.nameMr : c.nameHi;
              const displayCategory = isEnglish ? c.categoryEn : isMarathi ? c.categoryMr : c.categoryHi;
              const displayFacility = isEnglish ? c.facilityEn : isMarathi ? c.facilityMr : c.facilityHi;
              const displayAddress = isEnglish ? c.addressEn : isMarathi ? c.addressMr : c.addressHi;
              const displayAvailability = isEnglish ? c.availabilityEn : isMarathi ? c.availabilityMr : c.availabilityHi;
              const displayExperience = isEnglish ? c.experienceEn : isMarathi ? c.experienceMr : c.experienceHi;
              const servicesList = (isEnglish ? c.servicesEn : isMarathi ? c.servicesMr : c.servicesHi) || [];

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-400 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Badges & Distance */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                          {displayCategory}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug pt-1">
                          {displayName}
                        </h3>
                        <p className="text-xs font-medium text-slate-500">{displayFacility}</p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className="text-xs sm:text-sm font-black text-emerald-800 flex items-center justify-end gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{c.distanceKm} {isEnglish ? 'km away' : isMarathi ? 'किमी अंतर' : 'किमी दूर'}</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-block">
                          {displayAvailability}
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    <p className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                      <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{displayAddress}</span>
                    </p>

                    {/* Accreditation & Experience */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{c.rating}</span>
                      </span>
                      <span>•</span>
                      <span>{displayExperience}</span>
                    </div>

                    {/* Services Tags */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {t('veterinary_page.services_offered')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {servicesList.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-stone-100 text-slate-700 font-medium px-2.5 py-0.5 rounded-lg border border-stone-200/60"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2.5">
                    <a
                      href={`tel:${c.phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition shadow-xs cursor-pointer text-center"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{t('veterinary_page.call_now')} ({c.phone})</span>
                    </a>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName + ' ' + displayAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl border border-stone-300 transition cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{t('veterinary_page.get_directions')}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

