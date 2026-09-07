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
    await loginAsPersona(role);
    setPersonaDropdownOpen(false);
    navigate('/');
  };

  const handleLanguageChange = (e) => {
    const langKey = e.target.value.split('-')[0];
    i18n.changeLanguage(langKey);
    try {
      localStorage.setItem('i18nextLng', langKey);
    } catch (e) {}
  };

  const isFarmer = !user || user.role === 'farmer';
  const isVet = user?.role === 'field_worker';

  let navLinks = [];
  if (isFarmer) {
    navLinks = [
      { to: '/', label: t('nav.home') },
      { to: '/animals', label: t('nav.animals') },
      { to: '/kisan-saathi', label: t('nav.kisan_saathi') },
      { to: '/report-sick', label: t('nav.report_sick') },
      { to: '/veterinary-help', label: t('nav.veterinary_help') },
      { to: '/government-schemes', label: t('nav.government_schemes') },
      { to: '/emergency-sos', label: t('nav.emergency_sos'), emergency: true }
    ];
  } else if (isVet) {
    navLinks = [
      { to: '/', label: t('nav.command_center') },
      { to: '/reports', label: t('nav.reports') },
      { to: '/report-sick', label: t('nav.report_new') },
      { to: '/veterinary-help', label: t('nav.veterinary_help') },
      { to: '/vaccination', label: t('nav.vaccination') }
    ];
  } else {
    navLinks = [
      { to: '/', label: t('nav.dashboard') },
      { to: '/reports', label: t('nav.reports') },
      { to: '/advisories', label: t('nav.advisories') },
      { to: '/vaccination', label: t('nav.vaccination') }
    ];
  }

  return (
    <nav className="bg-white border-b border-stone-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Clean Subtitle */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                LIVESTOCK <span className="text-emerald-700">SAATHI</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-800 font-indic mt-0.5">
                {t('tagline')}
              </p>
            </div>
          </Link>

          {/* Clean Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;

              if (link.emergency) {
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition ml-2 border border-red-200"
                  >
                    🚨 {link.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'text-emerald-800 bg-emerald-50/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-stone-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Utilities: Online pill, Language, Persona, Auth */}
          <div className="flex items-center gap-2">
            {/* Minimalist Online/Offline indicator */}
            {!isOnline && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <WifiOff className="w-3 h-3 text-amber-600" /> {t('nav.offline')} ({pendingCount})
              </span>
            )}

            {/* Language Selector: All 11 Indian Languages */}
            <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
              <Globe className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
              <select
                value={currentLang}
                onChange={handleLanguageChange}
                aria-label="Select Language"
                className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-slate-700 transition"
                  title={t('nav.switch_role')}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">
                    {user.role === 'farmer' ? t('roles.farmer') : user.role === 'field_worker' ? t('roles.field_worker') : t('roles.officer')}
                  </span>
                </button>

                {personaDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                      {t('nav.switch_role')}
                    </div>
                    <button
                      onClick={() => handlePersonaChange('farmer')}
                      className={`w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between ${
                        user.role === 'farmer' ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>🌾 {t('roles.farmer')}</span>
                      {user.role === 'farmer' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => handlePersonaChange('field_worker')}
                      className={`w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between ${
                        user.role === 'field_worker' ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>🩺 {t('roles.field_worker')}</span>
                      {user.role === 'field_worker' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => handlePersonaChange('officer')}
                      className={`w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between ${
                        user.role === 'officer' ? 'font-bold text-purple-700 bg-purple-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>🏛️ {t('roles.officer')}</span>
                      {user.role === 'officer' && <span>✓</span>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Logout or Login */}
            {user ? (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-stone-100 rounded-lg transition"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
              >
                {t('nav.login')}
              </Link>
            )}

            {/* Mobile menu trigger */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-slate-600 hover:bg-stone-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-2">
          {/* Mobile Language Selector */}
          <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-700" /> भाषा / Language:
            </span>
            <select
              value={currentLang}
              onChange={handleLanguageChange}
              aria-label="Select Language"
              className="bg-white border border-stone-200 text-slate-800 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {INDIAN_LANGUAGES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-stone-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
