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
import LivestockSaathiLogo from '../components/LivestockSaathiLogo';

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
        <Link to="/" className="inline-block hover:opacity-95 transition">
          <LivestockSaathiLogo
            variant="stacked"
            size="lg"
            showSubtitle={true}
            showTagline={true}
            tagline={isEnglish ? 'Healthy Animals • Prosperous Farmers' : 'स्वस्थ पशु • समृद्ध किसान'}
          />
        </Link>
        <p className="text-xs text-slate-500 mt-1">
          {isEnglish ? 'Livestock Health & Disease Surveillance Portal' : 'पशु स्वास्थ्य व रोग निगरानी पोर्टल'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xs rounded-3xl border border-stone-200/80 space-y-6">
          {/* Role Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              {isEnglish ? 'Select Your Role' : 'अपनी भूमिका चुनें'}
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setActiveTab('farmer')}
                className={`py-2.5 px-2 text-center rounded-xl text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'farmer'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">🌾</span>
                <span>{isEnglish ? 'Farmer' : 'पशुपालक'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vet')}
                className={`py-2.5 px-2 text-center rounded-xl text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'vet'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">🩺</span>
                <span>{isEnglish ? 'Veterinarian' : 'चिकित्सक'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('officer')}
                className={`py-2.5 px-2 text-center rounded-xl text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'officer'
                    ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">🏛️</span>
                <span>{isEnglish ? 'Officer' : 'अधिकारी'}</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-bold flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Instant Demo Login Buttons tailored to selected tab */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                {isEnglish ? '1-Click Quick Demo Login' : '1-क्लिक टेस्ट लॉगिन'}
              </span>
              <span className="text-xs text-emerald-700 font-black bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Instant Access
              </span>
            </div>

            {activeTab === 'farmer' && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('farmer_suresh')}
                  className="p-3 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group cursor-pointer"
                >
                  <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                    🌾 Suresh Patil
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Saoner, Nagpur (6 cattle)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('farmer_sunita')}
                  className="p-3 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group cursor-pointer"
                >
                  <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                    🌾 Sunita Meshram
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Kamptee, Nagpur (5 goats)</div>
                </button>
              </div>
            )}

            {activeTab === 'vet' && (
              <button
                type="button"
                onClick={() => handleQuickDemo('field_worker')}
                className="w-full p-3 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                    🩺 Dr. Amit Deshmukh
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Veterinary Medical Officer (Saoner & Kamptee)</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
              </button>
            )}

            {activeTab === 'officer' && (
              <button
                type="button"
                onClick={() => handleQuickDemo('officer')}
                className="w-full p-3 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 text-left transition shadow-2xs group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                    🏛️ Dr. Vivek Joshi
                  </div>
                  <div className="text-xs text-slate-500 font-medium">District Animal Husbandry Officer (Nagpur)</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-stone-200" />
            <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase font-bold tracking-wider">
              {isEnglish ? 'or sign in manually' : 'या क्रेडेंशियल दर्ज करें'}
            </span>
            <div className="flex-grow border-t border-stone-200" />
          </div>

          {/* Main Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white text-sm sm:text-base transition"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {identifier.includes('@') ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700">
                  {isEnglish ? 'Password' : 'पासवर्ड'}
                </label>
                <span className="text-xs text-emerald-700 font-bold cursor-pointer hover:underline">
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
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-stone-50 border border-stone-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white text-sm sm:text-base transition"
                />
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm sm:text-base transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
