import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  X,
  Plus,
  HeartPulse,
  Syringe,
  Calendar,
  AlertTriangle,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import animalService from '../services/animalService';
import AnimalDetailModal from '../components/AnimalDetailModal';
import {
  getCleanLang,
  getSpeciesOptions,
  getBreedsForSpecies,
  getSpeciesDisplayName,
  getBreedDisplayName
} from '../constants/livestockData';
import { getAnimalAiScan } from '../utils/aiScanStorage';

export default function AnimalsList() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const currentLang = getCleanLang(i18n.language);
  const isEnglish = currentLang === 'en';
  const isMarathi = currentLang === 'mr';
  const isHindi = currentLang === 'hi';

  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [selectedHealth, setSelectedHealth] = useState('All');
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [openAiRecForAnimal, setOpenAiRecForAnimal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomBreed, setIsCustomBreed] = useState(false);
  const [formError, setFormError] = useState(null);

  // New Animal Form
  const [formData, setFormData] = useState({
    name: '',
    species: 'Cattle',
    breed: 'Gir',
    customBreed: '',
    age: 3,
    gender: 'Female',
    healthStatus: 'Healthy',
    milkYieldDaily: '12.0 L'
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = params.get('openAnimal');
    loadAnimals(openId);
  }, [location.search]);

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

  const handleSpeciesChange = (newSpecies) => {
    const breeds = getBreedsForSpecies(newSpecies, currentLang);
    const defaultBreed = breeds.length > 0 ? breeds[0].id : 'Other';
    setFormData((prev) => ({
      ...prev,
      species: newSpecies,
      breed: defaultBreed,
      customBreed: ''
    }));
    setIsCustomBreed(defaultBreed === 'Other');
  };

  const handleBreedChange = (newBreed) => {
    const isOther = newBreed === 'Other';
    setIsCustomBreed(isOther);
    setFormData((prev) => ({
      ...prev,
      breed: newBreed,
      customBreed: isOther ? prev.customBreed : ''
    }));
  };

  const openAddModal = () => {
    const initialBreeds = getBreedsForSpecies('Cattle', currentLang);
    const defaultBreed = initialBreeds.length > 0 ? initialBreeds[0].id : 'Gir';
    setFormError(null);
    setFormData({
      name: '',
      species: 'Cattle',
      breed: defaultBreed,
      customBreed: '',
      age: 3,
      gender: 'Female',
      healthStatus: 'Healthy',
      milkYieldDaily: '12.0 L'
    });
    setIsCustomBreed(false);
    setModalOpen(true);
  };

  const handleCreateAnimal = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const finalBreed = isCustomBreed && formData.customBreed.trim()
        ? formData.customBreed.trim()
        : formData.breed;

      await animalService.createAnimal({
        ...formData,
        name: formData.name.trim(),
        breed: finalBreed
      });

      setModalOpen(false);
      setFormData({
        name: '',
        species: 'Cattle',
        breed: 'Gir',
        customBreed: '',
        age: 3,
        gender: 'Female',
        healthStatus: 'Healthy',
        milkYieldDaily: '12.0 L'
      });
      setIsCustomBreed(false);
      await loadAnimals();
    } catch (err) {
      console.error('Error creating animal:', err);
      setFormError(err.message || 'Failed to register animal. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnimal = async (animal, e) => {
    if (e) e.stopPropagation();
    const animalId = animal._id || animal.id || animal.tagId;
    const confirmMsg = isEnglish
      ? `Are you sure you want to delete ${animal.name} (${animal.tagId})?`
      : isMarathi
      ? `खात्री आहे का? तुम्ही ${animal.name} (${animal.tagId}) हे जनावर कायमचे हटवू इच्छिता?`
      : `क्या आप वाकई ${animal.name} (${animal.tagId}) को हटाना चाहते हैं?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await animalService.deleteAnimal(animalId);
      if (selectedAnimal && (selectedAnimal._id === animalId || selectedAnimal.id === animalId || selectedAnimal.tagId === animalId)) {
        setSelectedAnimal(null);
      }
      await loadAnimals();
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Unknown error'));
    }
  };

  const effectiveAnimals = animals.map((a) => {
    try {
      const aiScan = getAnimalAiScan(a, currentLang);
      const conf = Number(aiScan?.confidence || aiScan?.confidenceScore || 0);
      if (aiScan && conf > 85 && (aiScan.healthStatus === 'Critical' || aiScan.healthStatus === 'Needs Attention')) {
        if (a.healthStatus === 'Healthy' || !a.healthStatus) {
          return {
            ...a,
            healthStatus: aiScan.healthStatus
          };
        }
      }
    } catch (e) {}
    return a;
  });

  const filteredAnimals = effectiveAnimals.filter((a) => {
    const matchesSearch =
      (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.tagId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.breed || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecies = selectedSpecies === 'All' || a.species === selectedSpecies;
    const matchesHealth = selectedHealth === 'All' || a.healthStatus === selectedHealth;
    return matchesSearch && matchesSpecies && matchesHealth;
  });

  const speciesOptions = getSpeciesOptions(currentLang);
  const currentBreeds = getBreedsForSpecies(formData.species, currentLang);

  const speciesFilterTabs = [
    { id: 'All', label: t('animal_form.filter_all', 'All') },
    ...speciesOptions.map((sp) => ({ id: sp.id, label: sp.shortLabel }))
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            Livestock Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
            {t('farmer_dash.registered_animals')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            {t('farmer_dash.health_overview')}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm sm:text-base flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t('animal_form.register_title', t('farmer_dash.add_animal'))}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <span className="text-sm font-black text-slate-500 mr-1">{t('actions.filter')}:</span>
          {speciesFilterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSpecies(tab.id)}
              className={`text-sm font-bold px-3.5 py-2 rounded-xl transition cursor-pointer ${
                selectedSpecies === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">{t('animal_form.all_health', 'All Health')}</option>
            <option value="Healthy">🟢 {t('animal_form.status_healthy', 'Healthy')}</option>
            <option value="Needs Attention">🟡 {t('animal_form.status_attention', 'Needs Attention')}</option>
            <option value="Critical">🔴 {t('animal_form.status_critical', 'Critical')}</option>
          </select>

          <div className="relative flex-grow sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('actions.search') + "..."}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Animals Grid or Empty State */}
      {filteredAnimals.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-4">
          <span className="text-5xl block">🐄</span>
          <h3 className="font-black text-slate-900 text-lg sm:text-xl">
            {t('animal_form.no_animals_title')}
          </h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            {t('animal_form.no_animals_desc')}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t('animal_form.add_animal_btn')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnimals.map((animal) => {
            const speciesLabel = getSpeciesDisplayName(animal.species, currentLang);
            const breedLabel = getBreedDisplayName(animal.breed, animal.species, currentLang);
            const statusLabel =
              animal.healthStatus === 'Healthy'
                ? t('animal_form.status_healthy', 'Healthy')
                : animal.healthStatus === 'Needs Attention'
                ? t('animal_form.status_attention', 'Needs Attention')
                : t('animal_form.status_critical', 'Critical');

            return (
              <div
                key={animal._id || animal.id || animal.tagId}
                className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shadow-inner shrink-0">
                        {animal.species === 'Buffalo' ? '🐃' : animal.species === 'Goat' ? '🐐' : animal.species === 'Sheep' ? '🐑' : '🐄'}
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900">{animal.name}</h3>
                        <p className="text-sm text-slate-500 font-semibold">
                          {speciesLabel} • {breedLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full border ${
                          animal.healthStatus === 'Healthy'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : animal.healthStatus === 'Needs Attention'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}
                      >
                        ● {statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAnimal(animal, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title={isEnglish ? 'Delete Animal' : 'जनावर हटवा'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/70 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">{t('animal_form.tag_id')}:</span>
                      <span className="font-mono font-bold text-slate-900">{animal.tagId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">{t('farmer_dash.age_gender')}:</span>
                      <span className="font-semibold text-slate-800">
                        {animal.age} {t('farmer_dash.years')} • {animal.gender === 'Female' ? t('animal_form.female') : t('animal_form.male')}
                      </span>
                    </div>
                  </div>

                  {/* AI Scan Disease Badge (>85% Confidence Verified) */}
                  {(() => {
                    try {
                      const aiScan = getAnimalAiScan(animal, currentLang);
                      const conf = Number(aiScan?.confidence || aiScan?.confidenceScore || 0);
                      if (!aiScan || conf <= 85) return null;
                      const displayDisease = typeof aiScan.disease === 'string' ? aiScan.disease : (aiScan.disease?.name || 'Screening');
                      return (
                        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-300 text-xs shadow-2xs">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5 truncate">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0 animate-pulse" />
                            <span className="truncate">AI: {displayDisease}</span>
                          </span>
                          <span className="font-mono font-black text-emerald-800 text-[11px] bg-emerald-200/80 px-2 py-0.5 rounded-md shrink-0">
                            {conf}% {isEnglish ? 'Match' : 'अचूकता'}
                          </span>
                        </div>
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-stone-100 flex gap-2">
                  <button
                    onClick={() => {
                      setOpenAiRecForAnimal(null);
                      setSelectedAnimal(animal);
                    }}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-sm sm:text-base font-black py-3 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                  >
                    {t('farmer_dash.view_details')}
                  </button>

                  {(() => {
                    try {
                      const aiScan = getAnimalAiScan(animal, currentLang);
                      const conf = Number(aiScan?.confidence || aiScan?.confidenceScore || 0);
                      if (!aiScan || conf <= 85) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenAiRecForAnimal(animal);
                            setSelectedAnimal(animal);
                          }}
                          className="px-3.5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                          title={isEnglish ? 'View AI Recommendations Dialog' : isMarathi ? 'AI शिफारसी डायलॉग पहा' : 'AI सिफारिशें डायलॉग देखें'}
                        >
                          <Sparkles className="w-4 h-4 text-emerald-700 animate-pulse" />
                          <span className="hidden sm:inline">{isEnglish ? 'AI Recommendations' : isMarathi ? 'AI शिफारसी' : 'AI सिफारिशें'}</span>
                        </button>
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Animal Modal - ZERO double languages & Dynamic breed selection */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-200/80 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🐄</span>
                <h3 className="text-base font-black text-slate-900">
                  {t('animal_form.register_title')}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnimal} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{formError}</span>
                </div>
              )}
              {/* Animal Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('animal_form.name_label')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('animal_form.name_placeholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Species & Dynamic Breed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Species Dropdown */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('animal_form.species_label')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.species}
                    onChange={(e) => handleSpeciesChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {speciesOptions.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.icon} {sp.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Breed Dropdown - Updates dynamically according to selected livestock */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('animal_form.breed_label')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.breed}
                    onChange={(e) => handleBreedChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {currentBreeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* If "Other" breed selected, display clean input */}
              {isCustomBreed && (
                <div className="animate-in fade-in duration-150">
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('animal_form.enter_breed')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customBreed}
                    onChange={(e) => setFormData({ ...formData, customBreed: e.target.value })}
                    placeholder={t('animal_form.enter_breed')}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/40 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none font-medium"
                  />
                </div>
              )}

              {/* Age, Gender & Milk Yield */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('animal_form.age_label')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('animal_form.gender_label')}
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Female">{t('animal_form.female')}</option>
                    <option value="Male">{t('animal_form.male')}</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-slate-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  {t('animal_form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? t('animal_form.saving') : t('animal_form.save')}
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
          onClose={() => {
            setSelectedAnimal(null);
            setOpenAiRecForAnimal(null);
          }}
          onUpdate={handleModalUpdate}
          initialOpenAiRecommendations={Boolean(openAiRecForAnimal && ((openAiRecForAnimal._id || openAiRecForAnimal.id || openAiRecForAnimal.tagId) === (selectedAnimal._id || selectedAnimal.id || selectedAnimal.tagId)))}
        />
      )}
    </div>
  );
}
