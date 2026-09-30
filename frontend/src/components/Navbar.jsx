import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Globe,
  LogOut,
  UserCheck,
  Menu,
  X,
  Wifi,
  WifiOff,
  Mic,
  Stethoscope,
  Building2,
  AlertTriangle,
  Camera,
  Activity,
  Users,
  FileText
} from 'lucide-react';
import { INDIAN_LANGUAGES } from '../services/voiceService';
import LivestockSaathiLogo from './LivestockSaathiLogo';

export default function Navbar() {
  const { user, logout, loginAsPersona } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);

  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'hi';

  const handlePersonaChange = async (role) => {
    const loggedUser = await loginAsPersona(role);
    if (loggedUser?.preferredLanguage) {
      const langKey = loggedUser.preferredLanguage.split('-')[0];
      i18n.changeLanguage(langKey);
      try {
        localStorage.setItem('i18nextLng', langKey);
      } catch (e) {}
    }
    setPersonaDropdownOpen(false);
    navigate('/');
  };

  const handleLanguageChange = (e) => {
    const langKey = e.target.value.split('-')[0];
    i18n.changeLanguage(langKey);
    try {
      localStorage.setItem('i18nextLng', langKey);
      if (user) {
        const updatedUser = { ...user, preferredLanguage: langKey };
        localStorage.setItem('pashurakshak_user', JSON.stringify(updatedUser));
      }
    } catch (e) {}
  };

  const isFarmer = !user || user.role === 'farmer';
  const isVet = user?.role === 'field_worker' || user?.role === 'veterinarian';

  let navLinks = [];
  if (isFarmer) {
    navLinks = [
      { to: '/', label: t('nav.home') },
      { to: '/animals', label: t('nav.animals') },
      { to: '/kisan-saathi', label: t('nav.kisan_saathi') },
      { to: '/report-sick', label: t('nav.report_sick') },
      { to: '/veterinary-help', label: t('nav.veterinary_help') },
      { to: '/government-schemes', label: t('nav.government_schemes') }
    ];
  } else if (isVet) {
    const isEn = i18n.language?.startsWith('en');
    const isMr = i18n.language?.startsWith('mr');
    navLinks = [
      {
        to: '/vet/command-center',
        label: isEn ? 'Command Center' : isMr ? 'कमांड सेंटर' : 'कमांड सेंटर'
      },
      {
        to: '/vet/cases',
        label: isEn ? 'Cases' : isMr ? 'केसेस (Cases)' : 'मामले (Cases)'
      },
      {
        to: '/vet/outbreaks',
        label: isEn ? 'Outbreaks' : isMr ? 'प्रकोप (Outbreaks)' : 'प्रकोप (Outbreaks)'
      },
      {
        to: '/vet/surveillance',
        label: isEn ? 'Active Surveillance' : isMr ? 'सक्रिय पाळत' : 'सक्रिय निगरानी'
      },
      {
        to: '/vet/zoonotic-diseases',
        label: isEn ? 'Zoonotic Diseases' : isMr ? 'झुनोटिक आजार' : 'जूनोटिक रोग'
      },
      {
        to: '/vet/diagnostic-lab',
        label: isEn ? 'Diagnostic Lab' : isMr ? 'निदान प्रयोगशाळा' : 'निदान प्रयोगशाला'
      },
      {
        to: '/vet/containment-vaccination',
        label: isEn ? 'Containment & Vaccination' : isMr ? 'नियंत्रण व लसीकरण' : 'नियंत्रण व टीकाकरण'
      }
    ];
  } else {
    navLinks = [
      { to: '/', label: t('nav.dashboard') },
      { to: '/reports', label: t('nav.reports') },
      { to: '/advisories', label: t('nav.advisories') },
      { to: '/vaccination', label: t('nav.vaccination') }
    ];
  }

  const isLinkActive = (to) => {
    if (isVet) {
      if (to === '/vet/command-center') {
        return (
          location.pathname === '/vet/command-center' ||
          location.pathname === '/vet' ||
          location.pathname === '/dashboard' ||
          location.pathname === '/'
        );
      }
      return location.pathname === to || location.pathname.startsWith(to + '/');
    }
    return location.pathname === to;
  };

  return (
    <nav className="app-nav bg-white/95 backdrop-blur-md border-b border-stone-200/90 sticky top-0 z-40 shadow-xs w-full">
      {/* Full-width responsive container with consistent 24-40px horizontal padding */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex justify-between h-[74px] sm:h-[78px] items-center gap-3 sm:gap-4">
          {/* 1. Brand Logo & Tagline (Anchored to Left with Consistent Padding) */}
          <Link to={isVet ? "/vet/command-center" : "/"} className="flex items-center group shrink-0">
            <LivestockSaathiLogo
              variant="horizontal"
              size="md"
              showSubtitle={true}
              showTagline={true}
              tagline={t('tagline')}
              className="group-hover:opacity-95 transition"
            />
          </Link>

          {/* 2. Modern Desktop Navigation Links (Evenly distributed across available space) */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-2 mx-1 xl:mx-2">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-bold transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'text-emerald-950 bg-emerald-100/90 font-black border border-emerald-200 relative after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:bg-emerald-800 after:rounded-full'
                      : 'text-slate-700 hover:text-emerald-950 hover:bg-emerald-50 font-bold'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* 3. Right Utilities: Emergency SOS, Online pill, Language, Persona, Auth (Anchored to Right) */}
          <div className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 shrink-0">
            {/* Emergency SOS Button (Always Prominent on the Right) */}
            <Link
              to="/emergency-sos"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 xl:px-4 py-2 rounded-lg text-sm font-black text-white bg-red-700 hover:bg-red-800 transition-all duration-200 shadow-xs hover:shadow-md border border-red-800 shrink-0"
              title={isVet ? "24×7 Emergency Veterinary Helpline (Dial 1962)" : "24×7 Emergency Veterinary SOS"}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{isVet ? 'Emergency 1962' : t('nav.emergency_sos')}</span>
            </Link>

            {/* Minimalist Online/Offline indicator */}
            {!isOnline && (
              <span className="hidden xl:inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" /> {t('nav.offline')} ({pendingCount})
              </span>
            )}

            {/* Language Selector: Hindi, English, Marathi */}
            <div className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-emerald-300 rounded-xl px-2.5 py-1.5 h-10 transition">
              <Link
                to="/select-language"
                title="भाषा चुनें / Choose Language"
                className="text-emerald-700 hover:text-emerald-900 flex items-center transition"
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
              </Link>
              <select
                value={currentLang}
                onChange={handleLanguageChange}
                aria-label="Select Language"
                className="bg-transparent text-slate-800 text-xs sm:text-sm font-bold focus:outline-none cursor-pointer pr-1"
              >
                {INDIAN_LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Persona Switcher (For demonstration) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
                  className="flex items-center gap-2 px-3 sm:px-3.5 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs sm:text-sm font-bold text-slate-800 transition cursor-pointer"
                  title={t('nav.switch_role')}
                >
                  <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="hidden md:inline font-bold">
                    {user.name || (user.role === 'farmer' ? t('roles.farmer') : user.role === 'field_worker' ? t('roles.field_worker') : t('roles.officer'))}
                  </span>
                </button>

                {personaDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 py-2.5 z-50 text-xs sm:text-sm space-y-1">
                    <div className="px-3.5 py-1 text-xs font-black text-slate-400 uppercase tracking-wider">
                      {t('nav.switch_role')}
                    </div>

                    <div className="px-3.5 py-1 text-xs font-bold text-emerald-900 bg-emerald-50">
                      {currentLang === 'en' ? '🌾 Registered Farmers:' : currentLang === 'mr' ? '🌾 नोंदणीकृत शेतकरी:' : '🌾 पंजीकृत किसान:'}
                    </div>
                    <button
                      onClick={() => handlePersonaChange('farmer_ramesh')}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between ${
                        user.email === 'farmer@pashurakshak.in' ? 'font-black text-emerald-700 bg-emerald-50/50' : 'text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{currentLang === 'en' ? 'Ramesh Patil' : 'रमेश पाटिल'}</div>
                        <div className="text-xs text-slate-500 font-medium">{currentLang === 'en' ? 'Baramati • 3 Animals' : currentLang === 'mr' ? 'बारामती • ३ जनावरे' : 'बारामती • 3 पशु'}</div>
                      </div>
                      {user.email === 'farmer@pashurakshak.in' && <span className="text-emerald-700 font-black">✓</span>}
                    </button>
                    <button
                      onClick={() => handlePersonaChange('farmer_santosh')}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between ${
                        user.email === 'santosh@pashurakshak.in' ? 'font-black text-emerald-700 bg-emerald-50/50' : 'text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{currentLang === 'en' ? 'Santosh Shinde' : 'संतोष शिंदे'}</div>
                        <div className="text-xs text-slate-500 font-medium">{currentLang === 'en' ? 'Shirur • 2 Animals' : currentLang === 'mr' ? 'शिरूर • २ जनावरे' : 'शिरूर • 2 पशु'}</div>
                      </div>
                      {user.email === 'santosh@pashurakshak.in' && <span className="text-emerald-700 font-black">✓</span>}
                    </button>
                    <button
                      onClick={() => handlePersonaChange('farmer_sunita')}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between ${
                        user.email === 'sunita@pashurakshak.in' ? 'font-black text-emerald-700 bg-emerald-50/50' : 'text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{currentLang === 'en' ? 'Sunita Gaikwad' : 'सुनीता गायकवाड़'}</div>
                        <div className="text-xs text-slate-500 font-medium">{currentLang === 'en' ? 'Khed • 1 Animal' : currentLang === 'mr' ? 'खेड • १ जनावर' : 'खेड • 1 पशु'}</div>
                      </div>
                      {user.email === 'sunita@pashurakshak.in' && <span className="text-emerald-700 font-black">✓</span>}
                    </button>

                    <div className="border-t border-stone-100 my-1.5" />

                    <div className="px-3.5 py-1 text-xs font-black text-slate-400 uppercase tracking-wider">
                      {currentLang === 'en' ? 'Veterinarians & Officers:' : currentLang === 'mr' ? 'पशुवैद्यक व अधिकारी:' : 'अधिकारी व डॉक्टर:'}
                    </div>
                    <button
                      onClick={() => handlePersonaChange('field_worker')}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between ${
                        user.role === 'field_worker' ? 'font-black text-blue-700 bg-blue-50/50' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-bold">🩺 {t('roles.field_worker')} — {currentLang === 'en' ? 'Dr. Ananya Deshmukh' : 'डॉ. अनन्या देशमुख'}</span>
                      {user.role === 'field_worker' && <span className="text-blue-700 font-black">✓</span>}
                    </button>
                    <button
                      onClick={() => handlePersonaChange('officer')}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between ${
                        user.role === 'officer' ? 'font-black text-purple-700 bg-purple-50/50' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-bold">🏛️ {t('roles.officer')} — {currentLang === 'en' ? 'Dr. Suresh Kulkarni' : 'डॉ. सुरेश कुलकर्णी'}</span>
                      {user.role === 'officer' && <span className="text-purple-700 font-black">✓</span>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Logout or Login/Register */}
            {user ? (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                title={t('nav.logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="h-10 px-4 flex items-center justify-center rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition shadow-xs"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/select-language?redirect=/register"
                  className="hidden sm:flex h-10 px-4 items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-sm font-bold transition border border-stone-200"
                >
                  {currentLang === 'en' ? 'Register' : currentLang === 'mr' ? 'नोंदणी करा' : 'पंजीकरण'}
                </Link>
              </div>
            )}

            {/* Mobile/Tablet Emergency SOS Icon Button (visible when sm:hidden) */}
            <Link
              to="/emergency-sos"
              className="sm:hidden w-10 h-10 flex items-center justify-center rounded-xl text-white bg-red-600 hover:bg-red-700 transition shadow-xs animate-pulse"
              title={t('nav.emergency_sos')}
            >
              <AlertTriangle className="w-5 h-5" />
            </Link>

            {/* Mobile menu trigger */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-stone-100 rounded-xl cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-6 py-5 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
          {/* Mobile Brand Header */}
          <div className="pb-3 mb-2 border-b border-stone-100 flex items-center justify-between">
            <LivestockSaathiLogo variant="horizontal" size="sm" showSubtitle={true} showTagline={false} />
          </div>

          {/* Emergency SOS Callout in Mobile Drawer */}
          <Link
            to="/emergency-sos"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-3 rounded-xl text-base font-black text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border border-red-500 shadow-xs text-center animate-pulse"
          >
            {isVet ? '🚨 Emergency 1962' : `🚨 24×7 ${t('nav.emergency_sos')}`}
          </Link>

          {/* Mobile Language Selector */}
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
            <Link
              to="/select-language"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-emerald-800 flex items-center gap-1.5 hover:underline"
            >
              <Globe className="w-4 h-4 text-emerald-700" /> भाषा / Language:
            </Link>
            <select
              value={currentLang}
              onChange={handleLanguageChange}
              aria-label="Select Language"
              className="bg-white border border-stone-200 text-slate-800 text-xs sm:text-sm font-bold px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
            >
              {INDIAN_LANGUAGES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Navigation Links */}
          <div className="space-y-1 pt-1">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-base font-bold transition ${
                    isActive
                      ? 'text-emerald-950 bg-emerald-100/90 font-black border border-emerald-300/70'
                      : 'text-slate-800 hover:bg-stone-100'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
