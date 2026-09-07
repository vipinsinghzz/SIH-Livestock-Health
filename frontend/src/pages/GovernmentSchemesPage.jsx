import React, { useState } from 'react';
import {
  Building2,
  Award,
  CheckCircle2,
  FileText,
  ArrowRight,
  Filter,
  DollarSign,
  ShieldCheck,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import governmentService, { GOVERNMENT_SCHEMES } from '../services/governmentService';

export default function GovernmentSchemesPage() {
  const { t } = useTranslation();
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedScheme, setExpandedScheme] = useState(null);

  const schemes = governmentService.getSchemes({
    species: selectedSpecies,
    category: selectedCategory
  });

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-green-950 text-white rounded-3xl p-6 sm:p-8 shadow-md">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
            Schemes & Subsidies
          </span>
          <h1 className="text-2xl sm:text-4xl font-black mt-1">
            {t('farmer_dash.govt_schemes')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-2 max-w-2xl leading-relaxed">
            Pashu Kisan Credit Card (PKCC), 50% Capital Subsidy, Free Vaccination & Livestock Insurance Programs.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-500 mr-1">{t('actions.filter')}:</span>
            {['All', 'Cattle', 'Buffalo', 'Goat', 'Sheep'].map((sp) => (
              <button
                key={sp}
                onClick={() => setSelectedSpecies(sp)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                  selectedSpecies === sp
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                }`}
              >
                {sp === 'All' ? 'सभी पशु (All)' : sp === 'Cattle' ? 'गाय' : sp === 'Buffalo' ? 'भैंस' : sp === 'Goat' ? 'बकरी' : 'भेड़'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-500 mr-1">प्रकार:</span>
            {['All', 'Concessional Loan', 'Capital Subsidy', 'Free Vaccination', 'Insurance'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                }`}
              >
                {cat === 'All'
                  ? 'सभी श्रेणियां'
                  : cat === 'Concessional Loan'
                  ? 'रियायती ऋण'
                  : cat === 'Capital Subsidy'
                  ? 'अनुदान (Subsidy)'
                  : cat === 'Free Vaccination'
                  ? 'निःशुल्क टीका'
                  : 'बीमा'}
              </button>
            ))}
          </div>
        </div>

        {/* Schemes List */}
        <div className="space-y-4">
          {schemes.map((scheme) => {
            const isExpanded = expandedScheme === scheme.id;

            return (
              <div
                key={scheme.id}
                className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                        {scheme.category}
                      </span>
                      <span className="text-xs text-slate-500">{scheme.ministry}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                      {scheme.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {scheme.summary}
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center sm:text-right shrink-0">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wide">
                      लाभ राशि / अनुदान:
                    </span>
                    <span className="text-sm sm:text-base font-black text-emerald-950 block">
                      {scheme.subsidyAmount}
                    </span>
                  </div>
                </div>

                {/* Benefits Bullet Points */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {scheme.benefits.map((b, idx) => (
                    <div key={idx} className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700 font-medium">{b}</span>
                    </div>
                  ))}
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="pt-4 border-t border-stone-200 space-y-3 text-xs">
                    <div>
                      <strong className="text-slate-800 block mb-1">आवश्यक दस्तावेज (Required Documents):</strong>
                      <div className="flex flex-wrap gap-2">
                        {scheme.documentsRequired.map((doc, idx) => (
                          <span key={idx} className="bg-stone-100 text-slate-700 px-2.5 py-1 rounded-lg border border-stone-200">
                            📄 {doc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <strong className="text-slate-800 block mb-1">आवेदन प्रक्रिया (How to Apply):</strong>
                      <p className="text-slate-600">{scheme.howToApply}</p>
                    </div>
                  </div>
                )}

                {/* Card Bottom Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <button
                    onClick={() => setExpandedScheme(isExpanded ? null : scheme.id)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'कम विवरण देखें' : 'विस्तृत पात्रता व दस्तावेज देखें'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <a
                    href="https://dahd.nic.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs"
                  >
                    <span>पोर्टल पर जाएं</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
