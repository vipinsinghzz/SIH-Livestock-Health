import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { INDIAN_LANGUAGES } from '../services/voiceService';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    role: 'farmer',
    email: '',
    phone: '',
    password: '',
    state: 'Madhya Pradesh',
    district: 'Sehore',
    village: 'Malegaon',
    preferredLanguage: 'hi',
    livestockTypes: 'Cattle & Buffalo',
    animalCount: 8
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'पंजीकरण विफल रहा। कृपया दोबारा प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-green-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-600/30 mb-3 border border-emerald-500/30">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">LIVESTOCK SAATHI</h2>
        <p className="mt-1 text-xs sm:text-sm text-emerald-300 font-indic">
          स्वस्थ पशु • समृद्ध किसान • नया किसान व पशु चिकित्सक पंजीकरण
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white/10 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/10 text-slate-100 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Name & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">पूरा नाम (Full Name) *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="उदा. रामलाल जी"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">भूमिका (Role Persona) *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="farmer">🌾 पशुपालक / किसान (Farmer)</option>
                  <option value="field_worker">🩺 पशु चिकित्सक (Field Vet)</option>
                  <option value="officer">🏛️ जिला अधिकारी (District Officer)</option>
                </select>
              </div>
            </div>

            {/* Mobile & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">मोबाइल नंबर (Mobile Phone) *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">ईमेल आईडी (Email Address) *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramlal@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">पासवर्ड (Password) *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Location: State, District, Village */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">राज्य (State) *</label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Madhya Pradesh">मध्य प्रदेश (MP)</option>
                  <option value="Maharashtra">महाराष्ट्र (MH)</option>
                  <option value="Uttar Pradesh">उत्तर प्रदेश (UP)</option>
                  <option value="Rajasthan">राजस्थान (RJ)</option>
                  <option value="Gujarat">गुजरात (GJ)</option>
                  <option value="Bihar">बिहार (BR)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">जिला (District) *</label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="सीहोर / पुणे"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">गांव (Village) *</label>
                <input
                  type="text"
                  required
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="मलेगांव / बिशनखेड़ी"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Preferred Language, Livestock Types & Animal Count */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">प्राथमिक भाषा (Language)</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {INDIAN_LANGUAGES.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">पशु प्रकार (Livestock)</label>
                <input
                  type="text"
                  value={formData.livestockTypes}
                  onChange={(e) => setFormData({ ...formData, livestockTypes: e.target.value })}
                  placeholder="गाय, भैंस, बकरी"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">पशुओं की संख्या (Count)</label>
                <input
                  type="number"
                  value={formData.animalCount}
                  onChange={(e) => setFormData({ ...formData, animalCount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              <span>{loading ? 'पंजीकरण हो रहा है...' : 'पंजीकरण पूर्ण करें (Complete Registration)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2">
            पहले से खाता है?{' '}
            <Link to="/login" className="text-emerald-400 hover:underline font-bold">
              लॉग इन करें
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
