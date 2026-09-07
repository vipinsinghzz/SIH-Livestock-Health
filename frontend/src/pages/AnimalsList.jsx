import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Search,
  Filter,
  HeartPulse,
  Syringe,
  Calendar,
  X,
  Plus,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import animalService from '../services/animalService';
import AnimalDetailModal from '../components/AnimalDetailModal';

export default function AnimalsList() {
  const { t } = useTranslation();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [selectedHealth, setSelectedHealth] = useState('All');
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // New Animal Form
  const [formData, setFormData] = useState({
    name: '',
    species: 'Cattle',
    breed: 'Gir Cow',
    age: 3,
    gender: 'Female',
    healthStatus: 'Healthy',
    milkYieldDaily: '12.0 L'
  });

  useEffect(() => {
    loadAnimals();
  }, []);

  const handleModalUpdate = async (updatedAnimal) => {
    if (updatedAnimal) {
      setSelectedAnimal(updatedAnimal);
      setAnimals((prev) =>
        prev.map((a) =>
          (a._id === updatedAnimal._id || a.id === updatedAnimal.id || a.tagId === updatedAnimal.tagId)
            ? updatedAnimal
            : a
        )
      );
    }
    await loadAnimals(updatedAnimal?._id || selectedAnimal?._id);
  };

  const loadAnimals = async (targetId) => {
    try {
      setLoading(false);
      const data = await animalService.getAnimals();
      setAnimals(data || []);
      const activeId = targetId || selectedAnimal?._id || selectedAnimal?.id;
      if (activeId && data) {
        const found = data.find((a) => a._id === activeId || a.id === activeId || a.tagId === activeId);
        if (found) setSelectedAnimal(found);
      }
    } catch (err) {
      console.error('Error fetching animals:', err);
    }
  };

  const handleCreateAnimal = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    await animalService.createAnimal(formData);
    setModalOpen(false);
    setFormData({
      name: '',
      species: 'Cattle',
      breed: 'Gir Cow',
      age: 3,
      gender: 'Female',
      healthStatus: 'Healthy',
      milkYieldDaily: '12.0 L'
    });
    loadAnimals();
  };

  const filteredAnimals = animals.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.breed?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecies = selectedSpecies === 'All' || a.species === selectedSpecies;
    const matchesHealth = selectedHealth === 'All' || a.healthStatus === selectedHealth;
    return matchesSearch && matchesSpecies && matchesHealth;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            Digital Animal Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
            {t('farmer_dash.registered_animals')}
          </h1>
          <p className="text-xs text-slate-500">
            {t('farmer_dash.health_overview')}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('farmer_dash.add_animal')}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-400 mr-1">{t('actions.filter')}:</span>
          {['All', 'Cattle', 'Buffalo', 'Goat', 'Sheep'].map((sp) => (
            <button
              key={sp}
              onClick={() => setSelectedSpecies(sp)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                selectedSpecies === sp
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
              }`}
            >
              {sp === 'All' ? t('dashboard.view_all') : sp}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">{t('dashboard.view_all')} (Health)</option>
            <option value="Healthy">🟢 {t('farmer_dash.healthy')}</option>
            <option value="Needs Attention">🟡 {t('farmer_dash.needs_attention')}</option>
            <option value="Critical">🔴 {t('farmer_dash.critical')}</option>
          </select>

          <div className="relative flex-grow sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('actions.search') + "..."}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Animals Grid or Empty State */}
      {filteredAnimals.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
          <span className="text-4xl block">🐄</span>
          <h3 className="font-black text-slate-800 text-base">कोई पशु नहीं मिला (No Animals Found)</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            आपके खाते में कोई पंजीकृत पशु नहीं है। नीचे दिए गए बटन से अपने पशु को जोड़ें।
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> नया पशु पंजीकृत करें (Add Animal)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnimals.map((animal) => (
            <div
              key={animal._id}
              className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shadow-inner">
                      {animal.species === 'Buffalo' ? '🦬' : animal.species === 'Goat' ? '🐐' : '🐄'}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{animal.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {animal.species} • {animal.breed}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                      animal.healthStatus === 'Healthy'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : animal.healthStatus === 'Needs Attention'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-red-50 text-red-800 border-red-300'
                    }`}
                  >
                    ● {animal.healthStatus}
                  </span>
                </div>

                <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/70 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tag ID:</span>
                    <span className="font-mono font-bold text-slate-900">{animal.tagId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('farmer_dash.age_gender')}:</span>
                    <span className="font-semibold text-slate-800">
                      {animal.age} {t('farmer_dash.years')} • {animal.gender === 'Female' ? t('farmer_dash.female') : t('farmer_dash.male')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('farmer_dash.milk_yield')}:</span>
                    <span className="font-bold text-emerald-700">{animal.milkYieldDaily || '12.0 L'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex gap-2">
                <button
                  onClick={() => setSelectedAnimal(animal)}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {t('farmer_dash.view_details')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Animal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">नया पशु पंजीकृत करें</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnimal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">पशु का नाम (Name)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. लक्ष्मी / Gauri"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">प्रजाति (Species)</label>
                  <select
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                  >
                    <option value="Cattle">गाय (Cattle)</option>
                    <option value="Buffalo">भैंस (Buffalo)</option>
                    <option value="Goat">बकरी (Goat)</option>
                    <option value="Sheep">भेड़ (Sheep)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">नस्ल (Breed)</label>
                  <input
                    type="text"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="Gir / Murrah / Sirohi"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">आयु (वर्ष)</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">दैनिक दूध (Liters)</label>
                  <input
                    type="text"
                    value={formData.milkYieldDaily}
                    onChange={(e) => setFormData({ ...formData, milkYieldDaily: e.target.value })}
                    placeholder="12.5 L"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-slate-700 font-bold text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs"
                >
                  सुरक्षित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedAnimal && (
        <AnimalDetailModal
          animal={selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
          onUpdate={handleModalUpdate}
        />
      )}
    </div>
  );
}
