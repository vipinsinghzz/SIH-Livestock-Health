import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Users, AlertCircle } from 'lucide-react';

const SPECIES_OPTIONS = [
  { id: 'Cattle', label: 'Cattle (गाय/बैल)', icon: '🐄' },
  { id: 'Buffalo', label: 'Buffalo (भैंस)', icon: '🐃' },
  { id: 'Goat', label: 'Goat (बकरी)', icon: '🐐' },
  { id: 'Sheep', label: 'Sheep (भेड़)', icon: '🐑' },
  { id: 'Poultry', label: 'Poultry (मुर्गी)', icon: '🐔' },
  { id: 'Pig', label: 'Pig (सुअर)', icon: '🐖' },
  { id: 'Other', label: 'Other (अन्य)', icon: '🐾' }
];

export default function Step1Animal({ formData, updateFormData, registeredAnimals = [] }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-3">
          {t('wizard.select_species')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SPECIES_OPTIONS.map((item) => {
            const isSelected = formData.species === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => updateFormData({ species: item.id })}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all text-center ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm scale-102'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-3xl">{item.icon}</span>
                <span className="text-xs sm:text-sm font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Select from registered animals or enter tag */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            {t('wizard.tag_id_label')}
          </label>
          <input
            type="text"
            placeholder="e.g. MH-12-P-1001"
            value={formData.tagId || ''}
            onChange={(e) => updateFormData({ tagId: e.target.value.toUpperCase() })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm uppercase"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {t('wizard.age_label')}
          </label>
          <input
            type="number"
            min="0"
            max="30"
            value={formData.age || ''}
            onChange={(e) => updateFormData({ age: e.target.value })}
            placeholder="3"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
        </div>
      </div>

      {/* Mortality & Affected Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            {t('wizard.affected_label')}
          </label>
          <input
            type="number"
            min="1"
            value={formData.affectedCount || 1}
            onChange={(e) => updateFormData({ affectedCount: parseInt(e.target.value, 10) || 1 })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            {t('wizard.mortality_label')}
          </label>
          <input
            type="number"
            min="0"
            value={formData.mortalityCount || 0}
            onChange={(e) => updateFormData({ mortalityCount: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-red-300 focus:ring-2 focus:ring-red-500 bg-white text-sm font-bold text-red-800"
          />
        </div>
      </div>
    </div>
  );
}
