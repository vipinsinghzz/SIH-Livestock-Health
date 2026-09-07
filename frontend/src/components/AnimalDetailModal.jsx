import React, { useState, useEffect } from 'react';
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
  Plus,
  Loader2,
  Save
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import animalService from '../services/animalService';

export default function AnimalDetailModal({ animal, onClose, onUpdate }) {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi' || !i18n.language?.startsWith('en');

  // Internal state to guarantee immediate UI updates
  const [modalAnimal, setModalAnimal] = useState(animal);
  const [timeline, setTimeline] = useState(animal?.timeline || []);
  const [activeTab, setActiveTab] = useState('overview');

  // Tab 1: Timeline Add Event form state
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineType, setNewTimelineType] = useState('Health Check');
  const [newTimelineNotes, setNewTimelineNotes] = useState('');
  const [isSubmittingTimeline, setIsSubmittingTimeline] = useState(false);

  // Tab 2: Health Status Update state
  const [selectedHealthStatus, setSelectedHealthStatus] = useState(animal?.healthStatus || 'Healthy');
  const [healthObservation, setHealthObservation] = useState('');
  const [isSubmittingHealth, setIsSubmittingHealth] = useState(false);

  // Tab 3: Vaccination form state
  const [newVaccineName, setNewVaccineName] = useState('');
  const [newVaccineNextDue, setNewVaccineNextDue] = useState('');
  const [isSubmittingVaccine, setIsSubmittingVaccine] = useState(false);

  // Tab 5: Milk Yield state
  const [newMilkYield, setNewMilkYield] = useState('');
  const [isSubmittingMilk, setIsSubmittingMilk] = useState(false);

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize when animal prop changes
  useEffect(() => {
    if (animal) {
      setModalAnimal(animal);
      setTimeline(animal.timeline || []);
      setSelectedHealthStatus(animal.healthStatus || 'Healthy');
    }
  }, [animal]);

  if (!modalAnimal) return null;

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setSuccessMessage('');
    setTimeout(() => {
      setErrorMessage('');
    }, 4000);
  };

  // 1. Handle Adding Timeline Event (Tab 1)
  const handleAddTimeline = async (e) => {
    e.preventDefault();
    if (!newTimelineTitle.trim()) {
      showError(isHindi ? 'कृपया रिकॉर्ड का शीर्षक दर्ज करें।' : 'Please enter a title for the record.');
      return;
    }

    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;
    const newEvent = {
      type: newTimelineType,
      title: newTimelineTitle.trim(),
      date: new Date().toLocaleDateString('en-GB'),
      doctor: 'Registered Doctor / Self',
      notes: newTimelineNotes.trim()
    };

    // Instant optimistic update
    setTimeline((prev) => [newEvent, ...prev]);
    setModalAnimal((prev) => ({
      ...prev,
      timeline: [newEvent, ...(prev?.timeline || [])]
    }));

    setIsSubmittingTimeline(true);
    try {
      const updated = await animalService.addTimelineEvent(animalId, newEvent);
      if (updated) {
        setModalAnimal(updated);
        if (updated.timeline) setTimeline(updated.timeline);
        if (onUpdate) onUpdate(updated);
      } else if (onUpdate) {
        onUpdate();
      }

      setNewTimelineTitle('');
      setNewTimelineNotes('');
      showSuccess(isHindi ? '✓ रिकॉर्ड सफलतापूर्वक सुरक्षित किया गया!' : '✓ Record saved successfully!');
    } catch (err) {
      console.error('Error saving timeline event:', err);
      showError(isHindi ? 'रिकॉर्ड सुरक्षित करने में समस्या आई।' : 'Failed to save record. Please try again.');
    } finally {
      setIsSubmittingTimeline(false);
    }
  };

  // 2. Handle Updating Health Status (Tab 2 - View Health)
  const handleUpdateHealth = async (e) => {
    e.preventDefault();
    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;

    setIsSubmittingHealth(true);
    try {
      const healthEvent = {
        type: 'Health Check',
        title: `स्वास्थ्य स्थिति: ${selectedHealthStatus}`,
        date: new Date().toLocaleDateString('en-GB'),
        doctor: 'Registered Doctor / Self',
        notes: healthObservation.trim() || `Health status updated to ${selectedHealthStatus}`
      };

      const updates = {
        healthStatus: selectedHealthStatus,
        lastCheckup: new Date().toLocaleDateString('en-GB'),
        newTimelineEvent: healthEvent
      };

      // Optimistic update
      setModalAnimal((prev) => ({
        ...prev,
        healthStatus: selectedHealthStatus,
        lastCheckup: updates.lastCheckup,
        timeline: [healthEvent, ...(prev?.timeline || [])]
      }));
      setTimeline((prev) => [healthEvent, ...prev]);

      const updated = await animalService.updateAnimal(animalId, updates);
      if (updated) {
        setModalAnimal(updated);
        if (updated.timeline) setTimeline(updated.timeline);
        if (onUpdate) onUpdate(updated);
      } else if (onUpdate) {
        onUpdate();
      }

      setHealthObservation('');
      showSuccess(isHindi ? '✓ स्वास्थ्य स्थिति सफलतापूर्वक सुरक्षित की गई!' : '✓ Health status updated and saved!');
    } catch (err) {
      console.error('Error updating health status:', err);
      showError(isHindi ? 'स्थिति सुरक्षित करने में समस्या आई।' : 'Failed to save health status.');
    } finally {
      setIsSubmittingHealth(false);
    }
  };

  // 3. Handle Logging Vaccination (Tab 3)
  const handleAddVaccine = async (e) => {
    e.preventDefault();
    if (!newVaccineName.trim()) {
      showError(isHindi ? 'कृपया टीके का नाम दर्ज करें।' : 'Please enter vaccine name.');
      return;
    }

    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;
    const vName = newVaccineName.trim();
    const vDate = new Date().toLocaleDateString('en-GB');
    const vDue = newVaccineNextDue ? new Date(newVaccineNextDue).toLocaleDateString('en-GB') : '6 Months later';

    const vaccineEvent = {
      type: 'Vaccination',
      title: `${vName} Vaccination Completed`,
      date: vDate,
      notes: `Next due: ${vDue}`
    };

    const newVaccObj = {
      name: vName,
      vaccine: vName,
      date: vDate,
      nextDue: vDue,
      status: 'Completed'
    };

    setIsSubmittingVaccine(true);
    try {
      setModalAnimal((prev) => ({
        ...prev,
        vaccinations: [...(prev?.vaccinations || []), newVaccObj],
        timeline: [vaccineEvent, ...(prev?.timeline || [])]
      }));
      setTimeline((prev) => [vaccineEvent, ...prev]);

      const updated = await animalService.updateAnimal(animalId, {
        newVaccination: {
          vaccine: vName,
          date: new Date(),
          nextDue: newVaccineNextDue ? new Date(newVaccineNextDue) : null
        },
        newTimelineEvent: vaccineEvent
      });

      if (updated && onUpdate) onUpdate(updated);
      else if (onUpdate) onUpdate();

      setNewVaccineName('');
      setNewVaccineNextDue('');
      showSuccess(isHindi ? '✓ टीकाकरण सफलतापूर्वक सुरक्षित किया गया!' : '✓ Vaccination record saved!');
    } catch (err) {
      console.error('Error saving vaccine:', err);
      showError(isHindi ? 'टीकाकरण सुरक्षित करने में समस्या आई।' : 'Failed to save vaccination.');
    } finally {
      setIsSubmittingVaccine(false);
    }
  };

  // 4. Handle Updating Daily Milk Yield (Tab 5)
  const handleUpdateMilk = async (e) => {
    e.preventDefault();
    if (!newMilkYield) return;

    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;
    const yieldStr = `${newMilkYield} L`;
    const milkEvent = {
      type: 'Milk Production',
      title: `दैनिक दूध दर्ज: ${yieldStr}`,
      date: new Date().toLocaleDateString('en-GB'),
      notes: 'दैनिक दुग्ध मापन रिकॉर्ड'
    };

    setIsSubmittingMilk(true);
    try {
      setModalAnimal((prev) => ({
        ...prev,
        milkYieldDaily: yieldStr,
        timeline: [milkEvent, ...(prev?.timeline || [])]
      }));
      setTimeline((prev) => [milkEvent, ...prev]);

      const updated = await animalService.updateAnimal(animalId, {
        milkYieldDaily: yieldStr,
        newTimelineEvent: milkEvent
      });

      if (updated && onUpdate) onUpdate(updated);
      else if (onUpdate) onUpdate();

      setNewMilkYield('');
      showSuccess(isHindi ? '✓ दूध उत्पादन सुरक्षित किया गया!' : '✓ Milk yield record saved!');
    } catch (err) {
      console.error('Error updating milk yield:', err);
      showError(isHindi ? 'दूध रिकॉर्ड सुरक्षित करने में समस्या आई।' : 'Failed to update milk yield.');
    } finally {
      setIsSubmittingMilk(false);
    }
  };

  const tabs = [
    { key: 'overview', label: t('farmer_dash.health_overview') || 'Daily Livestock Health Status', icon: HeartPulse },
    { key: 'health', label: t('farmer_dash.view_details') || 'View Health', icon: FileCheck },
    { key: 'vaccination', label: t('farmer_dash.vaccine_track') || 'Vaccination', icon: Syringe },
    { key: 'diseaseHistory', label: t('dashboard.top_diseases') || 'Top Suspected Diseases', icon: History },
    { key: 'milkProduction', label: t('farmer_dash.milk_yield') || 'Daily Milk', icon: TrendingUp },
    { key: 'treatments', label: t('wizard.recommended_action') || 'Treatments', icon: Pill }
  ];

  // Merge vaccinations from both possible schemas
  const allVaccinations = [
    ...(modalAnimal.vaccinations || []),
    ...(modalAnimal.vaccinationHistory || []).map((v) => ({
      name: v.vaccine || v.name,
      date: v.date ? new Date(v.date).toLocaleDateString('en-GB') : 'Recorded',
      nextDue: v.nextDue ? new Date(v.nextDue).toLocaleDateString('en-GB') : 'Due in 6 months',
      status: 'Completed'
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header with Photo & Basic Info */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-100 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-amber-100 border-2 border-white/20 flex items-center justify-center text-3xl sm:text-4xl shadow-md">
              {modalAnimal.species === 'Buffalo' ? '🦬' : modalAnimal.species === 'Goat' ? '🐐' : '🐄'}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white">{modalAnimal.name}</h2>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    modalAnimal.healthStatus === 'Healthy'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400'
                      : modalAnimal.healthStatus === 'Needs Attention'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400'
                      : 'bg-red-500/20 text-red-200 border-red-400'
                  }`}
                >
                  ● {modalAnimal.healthStatus || 'Healthy'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 font-mono">
                टैग संख्या: {modalAnimal.tagId} • {modalAnimal.species} ({modalAnimal.breed}) • {modalAnimal.age} वर्ष आयु
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 pt-5 mt-2 border-t border-emerald-700/60 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
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

        {/* Global Feedback Banners */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-fadeIn shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-900 flex items-center gap-2 animate-fadeIn shadow-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-6">
          {/* TAB 1: OVERVIEW & TIMELINE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">प्रजाति व नस्ल</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">{modalAnimal.species}</span>
                  <span className="text-xs text-slate-600 block truncate">{modalAnimal.breed}</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">आयु व लिंग</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">{modalAnimal.age} वर्ष</span>
                  <span className="text-xs text-slate-600 block">{modalAnimal.gender || 'मादा'}</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">दैनिक दूध क्षमता</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">{modalAnimal.milkYieldDaily || '12.0 L'}</span>
                  <span className="text-xs text-emerald-600 font-semibold block">औसत रिकॉर्ड</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <span className="text-xs text-slate-500 block">अंतिम स्वास्थ्य जांच</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">{modalAnimal.lastCheckup || '28 Aug 2026'}</span>
                  <span className="text-xs text-slate-500 block">सत्यापित</span>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-700" />
                    जीवन चक्र एवं स्वास्थ्य समय-रेखा ({timeline.length} रिकॉर्ड)
                  </h3>
                </div>

                <div className="relative pl-6 border-l-2 border-emerald-500/30 space-y-4">
                  {timeline.map((t, idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 hover:border-emerald-300 transition shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
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
                  {timeline.length === 0 && (
                    <p className="text-xs text-slate-400 py-3">कोई रिकॉर्ड दर्ज नहीं है। नीचे दिए फॉर्म से नया रिकॉर्ड जोड़ें।</p>
                  )}
                </div>

                {/* Quick Add Timeline Event Form with guaranteed 'सुरक्षित करें' */}
                <form
                  onSubmit={handleAddTimeline}
                  className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-700" /> नया रिकॉर्ड जोड़ें (Add Event)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">* शीर्षक अनिवार्य है</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-emerald-950 block mb-1">प्रकार (Type)</label>
                      <select
                        value={newTimelineType}
                        onChange={(e) => setNewTimelineType(e.target.value)}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="Health Check">स्वास्थ्य जांच (Health Check)</option>
                        <option value="Vaccination">टीकाकरण (Vaccination)</option>
                        <option value="Treatment">उपचार (Treatment)</option>
                        <option value="Deworming">कृमिनाशक (Deworming)</option>
                        <option value="Milk Production">दूध रिकॉर्ड (Milk)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-emerald-950 block mb-1">शीर्षक (Title) *</label>
                      <input
                        type="text"
                        placeholder="उदा. पेट दर्द दवा दी / खुरपका टीका"
                        value={newTimelineTitle}
                        onChange={(e) => setNewTimelineTitle(e.target.value)}
                        required
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-emerald-950 block mb-1">टिप्पणी (Notes)</label>
                      <input
                        type="text"
                        placeholder="विवरण या डॉक्टर की सलाह"
                        value={newTimelineNotes}
                        onChange={(e) => setNewTimelineNotes(e.target.value)}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingTimeline}
                      className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {isSubmittingTimeline ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>सुरक्षित हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>सुरक्षित करें</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: VIEW HEALTH & UPDATE STATUS */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* Current Status Overview */}
              <div className="p-4 sm:p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-sm sm:text-base">
                      वर्तमान स्वास्थ्य स्थिति:{' '}
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ml-1.5 ${
                          modalAnimal.healthStatus === 'Healthy'
                            ? 'bg-emerald-600 text-white'
                            : modalAnimal.healthStatus === 'Needs Attention'
                            ? 'bg-amber-500 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {modalAnimal.healthStatus || 'Healthy'}
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1">
                      अंतिम जांच: {modalAnimal.lastCheckup || 'आज'}. यदि पशु अस्वस्थ है या कोई लक्षण दिख रहे हैं, तो नीचे से स्थिति अपडेट करके सुरक्षित करें।
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                </div>
              </div>

              {/* Interactive Health Status Update Card with 'सुरक्षित करें' */}
              <form
                onSubmit={handleUpdateHealth}
                className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 shadow-2xs"
              >
                <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                  <FileCheck className="w-5 h-5 text-emerald-700" />
                  <h4 className="font-extrabold text-slate-900 text-sm">स्वास्थ्य स्थिति बदलें व सुरक्षित करें (Update Status)</h4>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">नई स्वास्थ्य स्थिति चुनें:</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { val: 'Healthy', label: 'Healthy (स्वस्थ)', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                      { val: 'Needs Attention', label: 'Needs Attention (ध्यान दें)', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                      { val: 'Critical', label: 'Critical (गंभीर)', color: 'border-red-500 bg-red-50 text-red-900' }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.val}
                        onClick={() => setSelectedHealthStatus(item.val)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                          selectedHealthStatus === item.val
                            ? `${item.color} ring-2 ring-emerald-600 shadow-xs font-black`
                            : 'bg-white border-stone-300 text-slate-700 hover:bg-stone-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">जांच टिप्पणी / लक्षण (Observation Notes):</label>
                    <input
                      type="text"
                      placeholder="उदा. तापमान सामान्य, जुगाली ठीक से कर रहा है"
                      value={healthObservation}
                      onChange={(e) => setHealthObservation(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingHealth}
                      className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {isSubmittingHealth ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>सुरक्षित हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>सुरक्षित करें</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Vitals & Biological Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">रुमेन गतिशीलता (Rumen Motility)</span>
                  <p className="text-sm font-semibold text-slate-900">2-3 संकुचन प्रति 2 मिनट (सामान्य)</p>
                </div>
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">थूथन व त्वचा स्थिति</span>
                  <p className="text-sm font-semibold text-slate-900">नम थूथन, गांठ रहित चमकदार त्वचा</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VACCINATION */}
          {activeTab === 'vaccination' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">टीकाकरण रिकॉर्ड (Vaccination History)</h4>
                <span className="text-xs text-slate-500">{allVaccinations.length} टीके दर्ज</span>
              </div>

              <div className="space-y-3">
                {allVaccinations.map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200 shadow-2xs">
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
                {allVaccinations.length === 0 && (
                  <p className="text-xs text-slate-400 py-3">कोई टीका दर्ज नहीं है। नीचे दिए फॉर्म से नया टीका जोड़ें।</p>
                )}
              </div>

              {/* Quick Add Vaccination Record with 'सुरक्षित करें' */}
              <form
                onSubmit={handleAddVaccine}
                className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-3 shadow-2xs"
              >
                <span className="text-xs font-bold text-emerald-900 block">नया टीकाकरण दर्ज करें (Log Vaccine)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">टीके का नाम (Vaccine Name) *</label>
                    <input
                      type="text"
                      placeholder="उदा. FMD, HS, BQ, Brucellosis"
                      value={newVaccineName}
                      onChange={(e) => setNewVaccineName(e.target.value)}
                      required
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">अगला नियत (Next Due Date)</label>
                    <input
                      type="date"
                      value={newVaccineNextDue}
                      onChange={(e) => setNewVaccineNextDue(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingVaccine}
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    {isSubmittingVaccine ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>सुरक्षित हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>सुरक्षित करें</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: DISEASE HISTORY */}
          {activeTab === 'diseaseHistory' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-900 text-sm">पिछली बीमारियों का इतिहास</h4>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-sm text-slate-600 space-y-2">
                <p>• मई 2025: सामान्य अपच (Tympanites) - हिंग्वाष्टक चूर्ण व मीठा तेल द्वारा 24 घंटे में सुधार।</p>
                <p>• नवंबर 2024: मौसमी खांसी - डॉक्टर द्वारा कफ सिरप व एंटीबायोटिक खुराक से पूर्ण स्वस्थ।</p>
              </div>
            </div>
          )}

          {/* TAB 5: MILK PRODUCTION */}
          {activeTab === 'milkProduction' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">दैनिक दूध रिकॉर्ड (Milk Yield)</h4>
                  <p className="text-xs text-slate-500">वर्तमान दैनिक औसत: {modalAnimal.milkYieldDaily || '12.0 L'}</p>
                </div>
                <div className="text-2xl font-black text-emerald-700">{modalAnimal.milkYieldDaily || '12.0 L'}</div>
              </div>

              <form onSubmit={handleUpdateMilk} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <span className="text-xs font-bold text-emerald-900 block">दूध माप अपडेट करें:</span>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="नया माप (उदा. 15.2 L)"
                    value={newMilkYield}
                    onChange={(e) => setNewMilkYield(e.target.value)}
                    required
                    className="bg-white border border-stone-300 rounded-xl px-4 py-2 text-xs w-full sm:w-48 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingMilk}
                    className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    {isSubmittingMilk ? 'सुरक्षित हो रहा है...' : 'सुरक्षित करें'}
                  </button>
                </div>
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
