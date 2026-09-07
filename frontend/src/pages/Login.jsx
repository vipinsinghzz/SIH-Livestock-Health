import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowRight, UserCheck, PhoneCall } from 'lucide-react';

export default function Login() {
  const { login, loginAsPersona } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'अमान्य ईमेल या पासवर्ड');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    setLoading(true);
    try {
      await loginAsPersona(role);
      navigate('/');
    } catch (err) {
      setError('त्वरित लॉगिन विफल: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-green-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-600/30 mb-4 border border-emerald-500/30">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-black tracking-tight">LIVESTOCK SAATHI</h2>
        <p className="mt-1 text-sm text-emerald-300 font-indic">स्वस्थ पशु • समृद्ध किसान</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/10 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/10 text-slate-100 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-medium">
              {error}
            </div>
          )}

          {/* 1-Click Instant Demo Personas */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <UserCheck className="w-4 h-4" /> 1-क्लिक टेस्ट पर्सोना (Demo Logins)
            </div>
            <p className="text-[11px] text-slate-400">
              किसी भी भूमिका पर क्लिक करके पूर्व-निर्धारित डेटा के साथ टेस्ट करें:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickDemo('farmer_ramesh')}
                className="px-3 py-2 rounded-xl bg-emerald-700/60 hover:bg-emerald-600 border border-emerald-500/50 text-white text-xs font-bold transition flex items-center justify-between shadow-sm cursor-pointer"
              >
                <span>🌾 रमेश पाटिल</span>
                <span className="text-[10px] text-emerald-300">बारामती (3 पशु)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('farmer_santosh')}
                className="px-3 py-2 rounded-xl bg-emerald-800/60 hover:bg-emerald-700 border border-emerald-500/50 text-white text-xs font-bold transition flex items-center justify-between shadow-sm cursor-pointer"
              >
                <span>🌾 संतोष शिंदे</span>
                <span className="text-[10px] text-emerald-300">शिरूर (2 पशु)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('field_worker')}
                className="px-3 py-2 rounded-xl bg-blue-700/60 hover:bg-blue-600 border border-blue-500/50 text-white text-xs font-bold transition flex items-center justify-between shadow-sm cursor-pointer"
              >
                <span>🩺 डॉ. अनन्या</span>
                <span className="text-[10px] text-blue-300">Field Vet</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('officer')}
                className="px-3 py-2 rounded-xl bg-purple-700/60 hover:bg-purple-600 border border-purple-500/50 text-white text-xs font-bold transition flex items-center justify-between shadow-sm cursor-pointer"
              >
                <span>🏛️ डॉ. सुरेश</span>
                <span className="text-[10px] text-purple-300">District Officer</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase font-semibold">
              या ईमेल द्वारा प्रवेश करें
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ईमेल आईडी (Email)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@pashurakshak.in"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">पासवर्ड (Password)</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'सत्यापित किया जा रहा है...' : 'लॉग इन करें (Sign In)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-400">
            खाता नहीं है?{' '}
            <Link to="/register" className="text-emerald-400 hover:underline font-bold">
              नया पंजीकरण करें (Register)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
