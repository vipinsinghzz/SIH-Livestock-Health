import React, { useState } from 'react';
import {
  X,
  HeartPulse,
  Syringe,
  History,
  TrendingUp,
  Pill,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import animalService from '../services/animalService';

export default function AnimalDetailModal({ animal, onClose, onUpdate }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [newMilkYield, setNewMilkYield] = useState('');
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineType, setNewTimelineType] = useState('Health Check');
  const [newTimelineNotes, setNewTimelineNotes] = useState('');

  if (!animal) return null;

  const handleAddTimeline = async (e) => {
    e.preventDefault();
    if (!newTimelineTitle) return;

    const event = {
      type: newTimelineType,
      title: newTimelineTitle,
      date: new Date().toLocaleDateString('en-GB'),
      doctor: 'Registered Doctor / Self',
      notes: newTimelineNotes
    };

    await animalService.addTimelineEvent(animal._id, event);
    if (onUpdate) onUpdate();
    setNewTimelineTitle('');
    setNewTimelineNotes('');
  };

  const handleUpdateMilk = async (e) => {
    e.preventDefault();
    if (!newMilkYield) return;

    await animalService.updateAnimal(animal._id, { milkYieldDaily: `${newMilkYield} L` });
    if (onUpdate) onUpdate();
    setNewMilkYield('');
  };

  const tabs = [
    { key: 'overview', label: t('farmer_dash.health_overview'), icon: HeartPulse },
    { key: 'health', label: t('farmer_dash.view_details'), icon: FileCheck },
    { key: 'vaccination', label: t('farmer_dash.vaccine_track'), icon: Syringe },
    { key: 'diseaseHistory', label: t('dashboard.top_diseases'), icon: History },
    { key: 'milkProduction', label: t('farmer_dash.milk_yield'), icon: TrendingUp },
    { key: 'treatments', label: t('wizard.recommended_action'), icon: Pill }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header with Photo & Basic Info */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-100 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-amber-100 border-2 border-white/20 flex items-center justify-center text-4xl shadow-md">
              {animal.species === 'Buffalo' ? '🦬' : animal.species === 'Goat' ? '🐐' : '🐄'}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h2 className="text-2xl font-black text-white">{animal.name}</h2>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    animal.healthStatus === 'Healthy'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400'
                      : animal.healthStatus === 'Needs Attention'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400'
                      : 'bg-red-500/20 text-red-200 border-red-400'
                  }`}
                >
                  ● {animal.healthStatus || 'Healthy'}
                </span>
              </div>
              <p className="text-sm text-emerald-200/90 mt-1 font-mono">
                टैग संख्या: {animal.tagId} • {animal.species} ({animal.breed}) • {animal.age} वर्ष आयु
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 pt-6 mt-2 border-t border-emerald-700/60 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    activeTab === tab.key
                      ? 'bg-white text-emerald-950 shadow-sm'
                      : 'text-emerald-100/80 hover:bg-emerald-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">प्रजाति व नस्ल</span>
                  <span className="text-base font-bold text-slate-900">{animal.species}</span>
                  <span className="text-xs text-slate-600 block">{animal.breed}</span>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">आयु व लिंग</span>
                  <span className="text-base font-bold text-slate-900">{animal.age} वर्ष</span>
                  <span className="text-xs text-slate-600 block">{animal.gender || 'मादा'}</span>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">दैनिक दूध क्षमता</span>
                  <span className="text-base font-bold text-slate-900">{animal.milkYieldDaily || '12.0 L'}</span>
                  <span className="text-xs text-emerald-600 font-semibold block">औसत रिकॉर्ड</span>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">अंतिम स्वास्थ्य जांच</span>
                  <span className="text-base font-bold text-slate-900">{animal.lastCheckup || '28 Aug 2026'}</span>
                  <span className="text-xs text-slate-500 block">डॉक्टर प्रमाणित</span>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-700" />
                    जीवन चक्र एवं स्वास्थ्य समय-रेखा (Timeline)
                  </h3>
                </div>

                <div className="relative pl-6 border-l-2 border-emerald-500/30 space-y-6">
                  {(animal.timeline || []).map((t, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {t.type}
                          </span>
                          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {t.date}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-2">{t.title}</h4>
                        {t.doctor && <p className="text-xs text-slate-600 mt-0.5">जांचकर्ता: {t.doctor}</p>}
                        {t.notes && <p className="text-xs text-slate-500 mt-1 italic">{t.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add Timeline Event Form */}
                <form onSubmit={handleAddTimeline} className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/60 space-y-3">
                  <span className="text-xs font-bold text-emerald-900 block">नया रिकॉर्ड जोड़ें (Add Event)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={newTimelineType}
                      onChange={(e) => setNewTimelineType(e.target.value)}
                      className="bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="Health Check">स्वास्थ्य जांच (Health Check)</option>
                      <option value="Vaccination">टीकाकरण (Vaccination)</option>
                      <option value="Treatment">उपचार (Treatment)</option>
                      <option value="Deworming">कृमिनाशक (Deworming)</option>
                      <option value="Milk Production">दूध रिकॉर्ड (Milk)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="शीर्षक (Title, e.g. पेट दर्द दवा दी)"
                      value={newTimelineTitle}
                      onChange={(e) => setNewTimelineTitle(e.target.value)}
                      className="bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="टिप्पणी (Notes)"
                      value={newTimelineNotes}
                      onChange={(e) => setNewTimelineNotes(e.target.value)}
                      className="bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> सुरक्षित करें
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: HEALTH */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-sm">वर्तमान स्वास्थ्य स्थिति: {animal.healthStatus}</h4>
                    <p className="text-xs text-emerald-800 mt-1">
                      कोई तीव्र संक्रामक बीमारी के लक्षण दर्ज नहीं हैं। तापमान व जुगाली की प्रक्रिया सामान्य है।
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">रुमेन गतिशीलता (Rumen Motility)</span>
                  <p className="text-sm font-semibold text-slate-900">2-3 संकुचन प्रति 2 मिनट (सामान्य)</p>
                </div>
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">थूथन व त्वचा स्थिति</span>
                  <p className="text-sm font-semibold text-slate-900">नम थूथन, गांठ रहित चमकदार त्वचा</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VACCINATION */}
          {activeTab === 'vaccination' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-900 text-sm">टीकाकरण रिकॉर्ड (Vaccination History)</h4>
              <div className="space-y-3">
                {(animal.vaccinations || []).map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    <div>
                      <h5 className="font-extrabold text-slate-900 text-sm">{v.name}</h5>
                      <span className="text-xs text-slate-500">दिया गया: {v.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        {v.status || 'पूर्ण'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1">अगला नियत: {v.nextDue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DISEASE HISTORY */}
          {activeTab === 'diseaseHistory' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-900 text-sm">पिछली बीमारियों का इतिहास</h4>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-sm text-slate-600">
                <p>• मई 2025: सामान्य अपच (Tympanites) - हिंग्वाष्टक चूर्ण व मीठा तेल द्वारा 24 घंटे में सुधार।</p>
                <p className="mt-2">• नवंबर 2024: मौसमी खांसी - डॉक्टर द्वारा कफ सिरप व एंटीबायोटिक खुराक से पूर्ण स्वस्थ।</p>
              </div>
            </div>
          )}

          {/* TAB 5: MILK PRODUCTION */}
          {activeTab === 'milkProduction' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">दैनिक दूध रिकॉर्ड (Milk Yield)</h4>
                  <p className="text-xs text-slate-500">वर्तमान दैनिक औसत: {animal.milkYieldDaily || '14.5 L'}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateMilk} className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="नया दूध माप (उदा. 15.2 L)"
                  value={newMilkYield}
                  onChange={(e) => setNewMilkYield(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-4 py-2 text-sm w-48"
                />
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  अपडेट करें
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: TREATMENTS */}
          {activeTab === 'treatments' && (
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm">दवाइयां एवं चालू उपचार</h4>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <span className="font-bold text-slate-900">मिनरल मिक्स्चर (पोषक तत्व)</span>
                  <span className="text-emerald-700 font-semibold">50 ग्राम दैनिक चारा में</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">कृमिनाशक (Deworming Albendazole)</span>
                  <span className="text-slate-500">हर 6 माह पर अनुशंसित</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
