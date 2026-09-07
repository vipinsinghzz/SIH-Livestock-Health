import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import {
  Syringe,
  PlusCircle,
  CheckCircle,
  TrendingUp,
  MapPin,
  X,
  Calendar
} from 'lucide-react';

export default function VaccinationPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [incrementCount, setIncrementCount] = useState(50);

  // New Drive Form
  const [formData, setFormData] = useState({
    vaccine: 'FMD (Foot and Mouth Disease)',
    targetSpecies: 'Cattle & Buffalo',
    village: 'Baramati Rural',
    block: 'Baramati',
    targetCount: 3000
  });

  const loadDrives = async () => {
    try {
      const res = await api.get('/vaccination-drives');
      setDrives(res.data.drives || []);
    } catch (err) {
      console.error('Error fetching drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrives();
  }, []);

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vaccination-drives', formData);
      setModalOpen(false);
      loadDrives();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create drive.');
    }
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    if (!selectedDrive) return;
    try {
      await api.patch(`/vaccination-drives/${selectedDrive._id}`, {
        incrementCoveredBy: parseInt(incrementCount, 10)
      });
      setUpdateModalOpen(false);
      setSelectedDrive(null);
      loadDrives();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update progress.');
    }
  };

  const isOfficerOrVet = ['field_worker', 'officer', 'admin'].includes(user?.role);

  const totalTarget = drives.reduce((acc, d) => acc + (d.targetCount || 0), 0);
  const totalCovered = drives.reduce((acc, d) => acc + (d.coveredCount || 0), 0);
  const overallCoverage = totalTarget > 0 ? Math.round((totalCovered / totalTarget) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            {isEnglish ? 'Herd Immunity & Preventive Health' : 'सामूहिक रोग प्रतिरोधक निगरानी • Herd Immunity'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
            {isEnglish ? 'Vaccination Drives' : 'टीकाकरण अभियान (Vaccination Drives)'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEnglish ? 'Block and village-level immunization campaigns & coverage monitoring' : 'ब्लॉक एवं ग्राम स्तर पर निवारक टीकाकरण एवं सामूहिक सुरक्षा निगरानी'}
          </p>
        </div>

        {isOfficerOrVet && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isEnglish ? 'Launch Drive' : 'नया अभियान शुरू करें (Launch Drive)'}</span>
          </button>
        )}
      </div>

      {/* Aggregate Coverage Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isEnglish ? 'District Coverage' : 'कुल जिला कवरेज (District Coverage)'}
          </span>
          <div className="text-3xl font-black text-emerald-700 mt-1">
            {overallCoverage}%
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-700"
              style={{ width: `${overallCoverage}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isEnglish ? 'Vaccinated Livestock' : 'टीकाकृत पशु (Vaccinated Livestock)'}
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {totalCovered.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">{isEnglish ? 'Doses administered' : 'कुल दी गई खुराकें (Doses administered)'}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isEnglish ? 'Target Population' : 'लक्षित पशु आबादी (Target Population)'}
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {totalTarget.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">{isEnglish ? 'Susceptible cohort' : 'संवेदनशील पशु संख्या (Susceptible cohort)'}</p>
        </div>
      </div>

      {/* Drives List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
        </div>
      ) : drives.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-stone-200 p-8">
          वर्तमान में कोई सक्रिय टीकाकरण अभियान पंजीकृत नहीं है।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drives.map((drive) => {
            const pct = drive.coveragePercentage || 0;
            return (
              <div
                key={drive._id}
                className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4 hover:border-emerald-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Syringe className="w-4 h-4" />
                      </span>
                      <h3 className="font-black text-slate-900 text-sm">{drive.vaccine}</h3>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {drive.village}, {drive.block} ({drive.district})
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      drive.status === 'Completed'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {drive.status === 'Completed' ? 'पूर्ण (Completed)' : 'सक्रिय (Active)'}
                  </span>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">टीकाकरण प्रगति (Progress)</span>
                    <span className="text-emerald-700 font-mono">
                      {drive.coveredCount} / {drive.targetCount} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-700 ${
                        pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-slate-500 font-medium">लक्षित: {drive.targetSpecies}</span>

                  {isOfficerOrVet && (
                    <button
                      onClick={() => {
                        setSelectedDrive(drive);
                        setUpdateModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-800 font-bold transition border border-stone-200"
                    >
                      + संख्या दर्ज करें (Update)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Launch Drive Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">नया टीकाकरण अभियान बनाएं</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">टीका (Vaccine Type)</label>
                <select
                  value={formData.vaccine}
                  onChange={(e) => setFormData({ ...formData, vaccine: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                >
                  <option value="FMD (Foot and Mouth Disease)">FMD (खुरपका-मुंहपका)</option>
                  <option value="Lumpy Skin Disease (LSD)">LSD (लंपी स्किन रोग)</option>
                  <option value="Haemorrhagic Septicaemia (HS)">HS (गलघोंटू)</option>
                  <option value="Blackleg (BQ)">BQ (लंगड़ा बुखार)</option>
                  <option value="Brucellosis">ब्रूसीलोसिस (Brucellosis)</option>
                  <option value="PPR (Goat Plague)">PPR (बकरी प्लेग)</option>
                  <option value="Rabies">रेबीज (Rabies)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ग्राम (Village)</label>
                  <input
                    type="text"
                    required
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ब्लॉक / तहसील</label>
                  <input
                    type="text"
                    required
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">लक्षित पशु संख्या (Target Animals)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.targetCount}
                  onChange={(e) => setFormData({ ...formData, targetCount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-slate-700 font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold"
                >
                  अभियान शुरू करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Increment Progress Modal */}
      {updateModalOpen && selectedDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                टीकाकरण खुराकें दर्ज करें
              </h3>
              <button onClick={() => setUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgress} className="space-y-3 text-xs">
              <p className="text-slate-600">
                अभियान: <span className="font-bold text-slate-900">{selectedDrive.vaccine}</span> ({selectedDrive.village})
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">आज दी गई कुल खुराकें</label>
                <input
                  type="number"
                  min="1"
                  value={incrementCount}
                  onChange={(e) => setIncrementCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold text-emerald-800 bg-stone-50"
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 100, 250].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setIncrementCount(inc)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 text-[11px] font-bold text-slate-700 border border-stone-200"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-slate-700 font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold"
                >
                  सुरक्षित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
