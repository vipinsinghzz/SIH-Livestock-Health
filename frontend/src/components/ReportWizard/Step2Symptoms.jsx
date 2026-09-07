import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

const COMMON_SYMPTOMS = [
  { id: 'mouth blisters', label: 'Mouth Blisters / Ulcers', hindi: 'मुंह में छाले / घाव', icon: '👄', riskCue: 'FMD' },
  { id: 'excessive salivation', label: 'Excessive Salivation / Drooling', hindi: 'अत्यधिक लार गिरना', icon: '💧', riskCue: 'FMD/Rabies' },
  { id: 'hoof blister', label: 'Hoof Blisters / Lesions', hindi: 'खुरों में छाले / घाव', icon: '🐾', riskCue: 'FMD' },
  { id: 'lameness', label: 'Acute Lameness / Limping', hindi: 'लंगड़ा कर चलना', icon: '🦵', riskCue: 'FMD/BQ' },
  { id: 'high fever', label: 'High Fever / Burning Ears', hindi: 'तेज बुखार', icon: '🌡️' },
  { id: 'skin nodules', label: 'Skin Nodules / Lumps', hindi: 'त्वचा पर कठोर गांठें', icon: '🔴', riskCue: 'LSD' },
  { id: 'throat swelling', label: 'Throat / Neck Swelling', hindi: 'गले और जबड़े में सूजन', icon: '🛑', riskCue: 'HS' },
  { id: 'difficulty breathing', label: 'Difficulty Breathing / Grunting', hindi: 'सांस लेने में कठिनाई', icon: '🫁', riskCue: 'HS' },
  { id: 'sudden death', label: 'Sudden Unexplained Death', hindi: 'अचानक आकस्मिक मृत्यु', icon: '☠️', riskCue: 'Anthrax/HS' },
  { id: 'dark blood', label: 'Dark Unclotted Blood from Orifices', hindi: 'नाक/मुंह से काला खून', icon: '🩸', riskCue: 'Anthrax' },
  { id: 'foul diarrhea', label: 'Foul Diarrhea / Enteritis', hindi: 'बदबूदार दस्त', icon: '⚠️', riskCue: 'PPR' },
  { id: 'swollen udder', label: 'Swollen / Hard Udder', hindi: 'थन में सूजन व कड़ापन', icon: '🥛', riskCue: 'Mastitis' },
  { id: 'purple wattle', label: 'Purple Wattle / Cyanosis (Birds)', hindi: 'मुर्गी की कलगी नीली पड़ना', icon: '🐔', riskCue: 'Avian Flu' },
  { id: 'nasal discharge', label: 'Nasal Discharge / Coughing', hindi: 'नाक बहना एवं खांसी', icon: '🤧' },
  { id: 'loss of appetite', label: 'Loss of Appetite / Dullness', hindi: 'चारा न खाना / सुस्ती', icon: '🌾' }
];

export default function Step2Symptoms({ formData, updateFormData }) {
  const { t } = useTranslation();
  const currentSymptoms = formData.symptoms || [];

  const toggleSymptom = (id) => {
    if (currentSymptoms.includes(id)) {
      updateFormData({ symptoms: currentSymptoms.filter((s) => s !== id) });
    } else {
      updateFormData({ symptoms: [...currentSymptoms, id] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          {t('wizard.symptoms_label')} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Tap each symptom observed in the livestock. The AI engine will correlate these with clinical outbreak patterns.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {COMMON_SYMPTOMS.map((item) => {
            const isSelected = currentSymptoms.includes(item.id);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => toggleSymptom(item.id)}
                className={`p-3 rounded-xl border-2 text-left flex items-start justify-between gap-2 transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold leading-tight">{item.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{item.hindi}</div>
                    {item.riskCue && (
                      <span className="inline-block mt-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                        {item.riskCue} indicator
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                    isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Free-text Additional Observations */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {t('wizard.additional_symptoms')}
        </label>
        <textarea
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => updateFormData({ notes: e.target.value })}
          placeholder="Describe any other symptoms, onset duration (e.g. sick since 2 days), or feed/water changes..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
        />
      </div>
    </div>
  );
}
