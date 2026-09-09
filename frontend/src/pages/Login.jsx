import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Stethoscope,
  Building2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const { login, loginAsPersona } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEnglish = i18n.language?.startsWith('en');
  const isMarathi = i18n.language?.startsWith('mr');

  const [activeTab, setActiveTab] = useState('farmer'); // 'farmer' | 'vet' | 'officer'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isEnglish ? 'Invalid mobile/email or password.' : 'अमान्य मोबाइल नंबर/ईमेल या पासवर्ड।')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (personaKey) => {
    setLoading(true);
    setError('');
    try {
      await loginAsPersona(personaKey);
      navigate('/');
    } catch (err) {
      setError(
        (isEnglish ? 'Demo login failed: ' : 'त्वरित लॉगिन विफल: ') +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-sm shadow-emerald-700/20 mb-3 border border-emerald-800">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          LIVESTOCK SAATHI
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-bold text-emerald-800 font-indic">
          स्वस्थ पशु • समृद्ध किसान
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {isEnglish ? 'Livestock Health & Disease Surveillance Portal' : 'पशु स्वास्थ्य व रोग निगरानी पोर्टल'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xs rounded-3xl border border-stone-200/80 space-y-6">
          {/* Role Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              {isEnglish ? 'Select Your Role' : 'अपनी भूमिका चुनें'}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setActiveTab('farmer')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                  activeTab === 'farmer'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌾</span>
                <span>{isEnglish ? 'Farmer' : 'पशुपालक'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vet')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                  activeTab === 'vet'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🩺</span>
                <span>{isEnglish ? 'Veterinarian' : 'चिकित्सक'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('officer')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                  activeTab === 'officer'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏛️</span>
                <span>{isEnglish ? 'Officer' : 'अधिकारी'}</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Instant Demo Login Buttons tailored to selected tab */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {isEnglish ? '1-Click Quick Demo Login' : '1-क्लिक टेस्ट लॉगिन'}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Instant Access
              </span>
            </div>

            {activeTab === 'farmer' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('farmer_ramesh')}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group"
                >
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                    🌾 Ramesh Patil
                  </div>
                  <div className="text-[10px] text-slate-500">Baramati (3 cows)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('farmer_santosh')}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group"
                >
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                    🌾 Santosh Shinde
                  </div>
                  <div className="text-[10px] text-slate-500">Shirur (2 cows)</div>
                </button>
              </div>
            )}

            {activeTab === 'vet' && (
              <button
                type="button"
                onClick={() => handleQuickDemo('field_worker')}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                    🩺 Dr. Ananya Deshmukh
                  </div>
                  <div className="text-[10px] text-slate-500">Veterinary Medical Officer (Surveillance Queue)</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
              </button>
            )}

            {activeTab === 'officer' && (
              <button
                type="button"
                onClick={() => handleQuickDemo('officer')}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                    🏛️ Dr. Suresh Kulkarni
                  </div>
                  <div className="text-[10px] text-slate-500">District Animal Husbandry Officer (Command Portal)</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-stone-200" />
            <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase font-bold tracking-wider">
              {isEnglish ? 'or sign in manually' : 'या क्रेडेंशियल दर्ज करें'}
            </span>
            <div className="flex-grow border-t border-stone-200" />
          </div>

          {/* Main Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {activeTab === 'farmer'
                  ? (isEnglish ? 'Mobile Number or Email' : 'मोबाइल नंबर या ईमेल आईडी')
                  : (isEnglish ? 'Official Email or Mobile' : 'ईमेल आईडी या मोबाइल नंबर')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    activeTab === 'farmer'
                      ? (isEnglish ? 'e.g. 9876543210 or farmer@pashurakshak.in' : 'उदा. 9876543210 या ईमेल')
                      : (isEnglish ? 'vet@pashurakshak.in or phone' : 'ईमेल या मोबाइल')
                  }
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs transition"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {identifier.includes('@') ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {isEnglish ? 'Password' : 'पासवर्ड'}
                </label>
                <span className="text-[11px] text-emerald-700 font-semibold cursor-pointer hover:underline">
                  {isEnglish ? 'Forgot?' : 'पासवर्ड भूल गए?'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs transition"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? (isEnglish ? 'Verifying...' : 'सत्यापित हो रहा है...') : (isEnglish ? 'Sign In' : 'लॉग इन करें')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="text-center text-xs text-slate-500 pt-1">
            {isEnglish ? "Don't have an account?" : isMarathi ? 'खाते नाही?' : 'खाता नहीं है?'}{' '}
            <Link to="/select-language?redirect=/register" className="text-emerald-700 hover:underline font-bold">
              {isEnglish ? 'Register New Account' : isMarathi ? 'नवीन नोंदणी करा' : 'नया पंजीकरण करें'} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
