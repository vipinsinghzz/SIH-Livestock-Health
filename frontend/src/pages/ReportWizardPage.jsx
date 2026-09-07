import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Step1Animal from '../components/ReportWizard/Step1Animal';
import Step2Symptoms from '../components/ReportWizard/Step2Symptoms';
import Step3LocationPhotos from '../components/ReportWizard/Step3LocationPhotos';
import Step4Review from '../components/ReportWizard/Step4Review';
import {
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ReportWizardPage() {
  const { user } = useAuth();
  const { isOnline, queueReport } = useOffline();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    species: 'Cattle',
    tagId: '',
    age: 3,
    mortalityCount: 0,
    affectedCount: 1,
    symptoms: ['mouth blisters', 'excessive salivation'],
    notes: '',
    location: {
      lat: 18.1517,
      lng: 74.5772,
      village: user?.village || 'Malegaon Bk',
      block: user?.block || 'Baramati',
      district: user?.district || 'Pune'
    },
    photos: [],
    reporterContact: {
      name: user?.name || '',
      phone: user?.phone || ''
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [createdReport, setCreatedReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const updateFormData = (fields) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!formData.species) {
        alert('Please select an animal species.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.symptoms || formData.symptoms.length === 0) {
        alert('Please select at least one observed symptom.');
        return false;
      }
    }
    if (currentStep === 3) {
      if (!formData.location?.village || !formData.location?.block) {
        alert('Please enter your village and block.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (isOnline) {
        // Online API submission
        const res = await api.post('/reports', formData);
        if (res.data.success) {
          setCreatedReport(res.data.report);
          setTriageResult(res.data.triageResult);
        }
      } else {
        // Offline: save to Dexie.js
        console.log('[ReportWizard] Network offline. Queueing in IndexedDB...');
        const offlineId = await queueReport(formData);

        // Immediate mock client-side feedback for offline farmer
        const mockOfflineTriage = {
          riskLevel: formData.mortalityCount > 0 ? 'High' : 'Moderate',
          suspectedDiseases: [
            { name: 'Foot and Mouth Disease (FMD)', confidenceScore: 0.85 },
            { name: 'Bovine Vesicular Stomatitis', confidenceScore: 0.45 }
          ],
          recommendedAction: 'Isolate affected animal immediately. Stored locally on device. Will auto-sync to district database upon reconnection.',
          outbreakFlag: false,
          explanation: 'Offline pre-triage assessment. Complete cluster analysis will execute on server sync.',
          modelVersion: 'mock-v0.1-offline'
        };

        setCreatedReport({
          caseId: `OFFLINE-QUEUE-#${offlineId}`,
          species: formData.species,
          status: 'Reported'
        });
        setTriageResult(mockOfflineTriage);
      }
    } catch (err) {
      console.error('Report submission error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: t('wizard.step1_title') },
    { number: 2, title: t('wizard.step2_title') },
    { number: 3, title: t('wizard.step3_title') },
    { number: 4, title: t('wizard.step4_title') }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Wizard Header */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
          <span>Disease Early-Warning Reporting Wizard</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {t('nav.report_new')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Provide observed clinical signs to trigger instant simulated veterinary triage and notify local authorities.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="mb-8">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s) => {
            const isCompleted = currentStep > s.number || triageResult;
            const isCurrent = currentStep === s.number && !triageResult;
            return (
              <div key={s.number} className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <div
                  className={`w-full h-1.5 rounded-full mb-2 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600'
                      : isCurrent
                      ? 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`text-[11px] font-bold ${
                    isCurrent || isCompleted ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  Step {s.number}
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:block truncate max-w-full">
                  {s.title.split(':')[1] || s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {currentStep === 1 && (
          <Step1Animal
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 2 && (
          <Step2Symptoms
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 3 && (
          <Step3LocationPhotos
            formData={formData}
            updateFormData={updateFormData}
            user={user}
          />
        )}

        {currentStep === 4 && (
          <Step4Review
            formData={formData}
            isSubmitting={isSubmitting}
            triageResult={triageResult}
            createdReport={createdReport}
            onSubmit={handleSubmit}
            isOnline={isOnline}
          />
        )}

        {/* Wizard Footer Controls (hidden if already triaged) */}
        {!triageResult && !isSubmitting && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('wizard.back')}</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
              >
                <span>{t('wizard.next')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
