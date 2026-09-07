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
  Search
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import veterinaryService from '../services/veterinaryService';

export default function VeterinaryHelpPage() {
  const { t } = useTranslation();
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

  const filteredCenters = centers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.facility.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Toll-free 1962 Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
              Veterinary Network
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              {t('nav.veterinary_help')}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100">
              Government Polyclinics, Registered Veterinarians, Diagnostic Labs & Mobile Dispensaries.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center sm:text-right shrink-0">
            <span className="text-xs text-emerald-200 block">24×7 1962 Helpline:</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 flex items-center justify-center sm:justify-end gap-2 mt-0.5">
              <PhoneCall className="w-6 h-6 animate-pulse" />
              <span>1962 (टोल-फ्री)</span>
            </div>
            <span className="text-[10px] text-emerald-100/80 block mt-0.5">द्वार पर निःशुल्क पशु चिकित्सा</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
            {['All', 'Government', 'Private', 'Diagnostic', 'Camp'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                }`}
              >
                {cat === 'All'
                  ? 'सभी केंद्र (All)'
                  : cat === 'Government'
                  ? '🏛️ सरकारी अस्पताल'
                  : cat === 'Private'
                  ? '🩺 प्राइवेट क्लिनिक'
                  : cat === 'Diagnostic'
                  ? '🔬 प्रयोगशाला'
                  : '🚐 मोबाइल कैंप'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
              />
              <span>केवल 24/7 आपातकाल</span>
            </label>

            <div className="relative flex-grow sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="नाम या स्थान खोजें..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Centers List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCenters.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {c.category}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2">{c.name}</h3>
                    <p className="text-xs text-slate-500">{c.facility}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-slate-900 flex items-center justify-end gap-1">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      {c.distanceKm} km दूर
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                      {c.availability}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 flex items-start gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{c.address}</span>
                </p>

                {/* Available Services Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.services.map((s, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-stone-100 text-slate-700 font-medium px-2 py-0.5 rounded-md"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                <a
                  href={`tel:${c.phone}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  कॉल करें ({c.phone})
                </a>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' ' + c.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-stone-300 transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  रास्ता देखें
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
