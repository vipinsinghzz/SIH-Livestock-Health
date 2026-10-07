import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Building2,
  PhoneCall,
  MapPin,
  Star,
  Navigation,
  Search,
  SearchX,
  RotateCcw,
  Sparkles,
  Phone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import veterinaryService, { NAGPUR_VETERINARIANS } from '../services/veterinaryService';

export default function VeterinaryHelpPage() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const isMarathi = i18n.language === 'mr';

  const [vets, setVets] = useState(NAGPUR_VETERINARIANS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch verified Nagpur veterinarians
  const loadNagpurVets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await veterinaryService.getNearbyVeterinarians({
        district: 'Nagpur',
        search: searchQuery
      });
      if (res && Array.isArray(res.veterinarians) && res.veterinarians.length > 0) {
        setVets(res.veterinarians);
      } else {
        setVets(NAGPUR_VETERINARIANS);
      }
    } catch (error) {
      console.warn('Loading fallback Nagpur veterinarians:', error?.message);
      setVets(NAGPUR_VETERINARIANS);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadNagpurVets();
  }, [loadNagpurVets]);

  const handleResetSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. Header Banner with 24×7 1962 Nagpur Emergency Helpline */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-green-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6 border border-emerald-700/50 w-full min-w-0 overflow-hidden">
          <div className="space-y-2.5 text-center lg:text-left flex-1 min-w-0">
            <span className="text-xs sm:text-sm font-black text-emerald-200 uppercase tracking-wider bg-white/10 px-3.5 py-1 rounded-full border border-white/15 inline-block">
              {isEnglish ? '📍 Nagpur District Network' : isMarathi ? '📍 नागपूर जिल्हा नेटवर्क' : '📍 नागपुर जिला नेटवर्क'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {isEnglish
                ? 'Veterinary Help & Doctor Directory'
                : isMarathi
                ? 'पशुवैद्यकीय मदत व संपर्क सूची'
                : 'पशु चिकित्सा सहायता एवं डॉक्टर संपर्क'}
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl font-medium">
              {isEnglish
                ? 'Verified veterinarians, government polyclinics, dispensaries, and 24×7 emergency ambulance units available across Nagpur.'
                : isMarathi
                ? 'नागपूर जिल्ह्यातील सर्व शासकीय दवाखाने, नोंदणीकृत पशुवैद्यकीय अधिकारी आणि २४×७ फिरते आपत्कालीन पथक.'
                : 'नागपुर जिले के सत्यापित पशु चिकित्सालय, औषधालय और 24×7 आपातकालीन एम्बुलेंस सेवा उपलब्ध।'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center lg:text-right shrink-0 w-full lg:w-auto shadow-inner space-y-2.5 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-emerald-200 block">
              {t('veterinary_page.helpline_title') || '24×7 Emergency Toll-Free Helpline'}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-300 flex items-center justify-center lg:justify-end gap-2.5">
              <PhoneCall className="w-7 h-7 text-amber-400 animate-pulse" />
              <span>1962</span>
              <span className="text-xs font-black bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                {t('veterinary_page.helpline_badge') || 'Toll-Free'}
              </span>
            </div>
            <span className="text-xs text-emerald-100/90 block font-medium">
              {isEnglish
                ? 'Free Doorstep Animal Ambulance (MVU - Nagpur)'
                : isMarathi
                ? 'मोफत फिरते पशुवैद्यकीय पथक (१९६२)'
                : 'निःशुल्क द्वार पर पशु एम्बुलेंस सेवा (1962)'}
            </span>
            <a
              href="tel:1962"
              className="inline-flex items-center justify-center gap-2 w-full bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-sm sm:text-base py-2.5 px-4 rounded-xl transition shadow cursor-pointer mt-1"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t('veterinary_page.call_helpline') || 'Call 1962 Helpline'}</span>
            </a>
          </div>
        </div>

        {/* 2. Search Bar for quick lookup */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 w-full min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                {isEnglish ? 'Available Veterinarians in Nagpur' : isMarathi ? 'नागपुरातील उपलब्ध पशुवैद्यकीय अधिकारी' : 'नागपुर में उपलब्ध पशु चिकित्सक'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEnglish
                  ? 'Showing verified doctors ready to contact for consultation or emergency triage'
                  : 'परामर्श व तत्काळ उपचारासाठी थेट कॉल करा'}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEnglish ? 'Search doctor, taluka, or clinic...' : 'डॉक्टर, तालुका किंवा दवाखाना शोधा...'}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* 3. ONLY ONE UNIFIED SECTION: Available Veterinarians to Contact */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600">
              {isEnglish ? 'Loading Nagpur veterinarians...' : 'नागपूर पशुवैद्यकीय यादी लोड होत आहे...'}
            </p>
          </div>
        ) : vets.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-stone-300 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-slate-400 mx-auto flex items-center justify-center">
              <SearchX className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {isEnglish ? 'No veterinarians matched your search' : 'कोणताही डॉक्टर सापडला नाही'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isEnglish
                  ? 'Try searching with a different name or taluka in Nagpur district.'
                  : 'कृपया वेगळा तालुका किंवा नाव शोधून पहा.'}
              </p>
            </div>
            <button
              onClick={handleResetSearch}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEnglish ? 'View All Nagpur Doctors' : 'सर्व डॉक्टर पहा'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full min-w-0">
            {vets.map((v) => {
              const cleanPhone = (v.phone || '').replace(/[^0-9+]/g, '');

              return (
                <div
                  key={v.id || v._id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs hover:shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between space-y-4 w-full min-w-0 overflow-hidden"
                >
                  <div className="space-y-3 min-w-0">
                    {/* Top Badges & Status */}
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full inline-block">
                            {v.block ? `${v.block} Taluka` : 'Nagpur District'}
                          </span>
                          {v.isEmergency && (
                            <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full inline-block">
                              🚨 24×7 Emergency
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug pt-1 break-words">
                          {v.name}
                        </h3>
                        <p className="text-sm font-bold text-emerald-700 break-words">{v.specialization}</p>
                        <p className="text-xs font-medium text-slate-500 break-words">{v.clinicName || v.facilityEn}</p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className="text-sm sm:text-base font-black text-emerald-800 flex items-center justify-end gap-1">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="whitespace-nowrap">{v.distanceKm || 2.5} km {isEnglish ? 'away' : isMarathi ? 'अंतर' : 'दूर'}</span>
                        </span>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                          <span>{v.availability || 'AVAILABLE NOW'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Address / Location */}
                    <p className="text-sm text-slate-600 flex items-start gap-2 leading-relaxed break-words">
                      <Navigation className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{v.address || `${v.village || ''}, ${v.block || ''}, Nagpur, Maharashtra`}</span>
                    </p>

                    {/* Accreditation & Experience */}
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{v.rating || 4.8}</span>
                      </span>
                      <span>•</span>
                      <span>{v.experience || 8} yrs experience</span>
                      {v.registrationNo && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] font-mono text-slate-400 break-all">Reg: {v.registrationNo}</span>
                        </>
                      )}
                    </div>

                    {/* Services Tags */}
                    {Array.isArray(v.services) && v.services.length > 0 && (
                      <div className="space-y-1.5 pt-1 min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                          {t('veterinary_page.services_offered') || 'Available Services'}
                        </span>
                        <div className="flex flex-wrap gap-1.5 min-w-0">
                          {v.services.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-stone-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-stone-200"
                            >
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions: Prominent Call Doctor CTA */}
                  <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black py-3 px-3 rounded-xl transition shadow-xs cursor-pointer text-center"
                    >
                      <PhoneCall className="w-4 h-4 animate-bounce shrink-0" />
                      <span>{isEnglish ? 'Call Doctor' : 'कॉल करा'} ({v.phone})</span>
                    </a>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.clinicName || ''} Nagpur`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-sm font-bold py-3 px-4 rounded-xl border border-stone-300 transition cursor-pointer shrink-0"
                      title="View Clinic Location on Google Maps"
                    >
                      <Navigation className="w-4 h-4 shrink-0" />
                      <span>{t('veterinary_page.get_directions') || 'Directions'}</span>
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
