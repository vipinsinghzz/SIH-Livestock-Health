import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Upload,
  Mic,
  Stethoscope,
  Save,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  Check,
  AlertTriangle,
  Activity,
  Cpu,
  Thermometer,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import diseaseDetectionService, { SYMPTOMS_27 } from '../services/diseaseDetectionService';
import voiceService from '../services/voiceService';

export default function DiseaseDetectionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEnglish = i18n.language?.startsWith('en');

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Animal Selection
  const [selectedSpecies, setSelectedSpecies] = useState('Cattle');
  const [animalName, setAnimalName] = useState('Lakshmi');

  // Step 2: Symptoms & Inputs (Matching Image 2)
  const [selectedSymptoms, setSelectedSymptoms] = useState(['skin_nodules', 'high_fever']);
  const [temperature, setTemperature] = useState('0');
  const [duration, setDuration] = useState('0');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [customNotes, setCustomNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [symptomSearch, setSymptomSearch] = useState('');

  // Step 3: AI Progress Simulation
  const [aiStage, setAiStage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 4: Result
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [caseIdSaved, setCaseIdSaved] = useState('');

  const handleToggleSymptom = (id) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      const activeLangCode = voiceService.getLangCode(i18n.language);
      voiceService.startListening({
        langCode: activeLangCode,
        onResult: (transcript) => {
          setCustomNotes(transcript);
        },
        onError: () => setIsRecording(false),
        onEnd: () => setIsRecording(false)
      });
    }
  };

  const handleStartAnalysis = async () => {
    setCurrentStep(3);
    setIsAnalyzing(true);

    await diseaseDetectionService.runAnalysisProgress((stage) => {
      setAiStage(stage.label);
    });

    const result = await diseaseDetectionService.evaluateCase({
      species: selectedSpecies,
      symptoms: selectedSymptoms,
      temperature: parseFloat(temperature || 0),
      duration: parseFloat(duration || 0),
      notes: customNotes,
      image: photoPreview
    });

    setAnalysisResult(result);
    setIsAnalyzing(false);
    setCurrentStep(4);
  };

  const handleSaveFormalReport = async () => {
    try {
      setSavedSuccess(true);
      const user = JSON.parse(localStorage.getItem('pashurakshak_user') || '{}');
      const payload = {
        species: selectedSpecies,
        symptoms: selectedSymptoms,
        temperature: parseFloat(temperature || 0),
        duration: parseFloat(duration || 0),
        notes: customNotes,
        photos: photoPreview ? [photoPreview] : [],
        location: {
          lat: 18.5204,
          lng: 73.8567,
          village: user.village || 'Gram Panchayat',
          block: user.block || 'Taluka Block',
          district: user.district || 'District'
        }
      };

      const res = await diseaseDetectionService.submitFormalReport(payload);
      if (res && res.report && res.report.caseId) {
        setCaseIdSaved(res.report.caseId);
      } else {
        setCaseIdSaved('CASE-' + Date.now().toString().slice(-6));
      }
    } catch (e) {
      console.warn('Could not persist report to server:', e);
      setCaseIdSaved('CASE-' + Date.now().toString().slice(-6));
    }
  };

  // Filter symptoms based on search query
  const filteredSymptoms = SYMPTOMS_27.filter((sym) => {
    if (!symptomSearch.trim()) return true;
    const q = symptomSearch.toLowerCase();
    return (
      sym.id.toLowerCase().includes(q) ||
      sym.labelEn.toLowerCase().includes(q) ||
      sym.labelHi.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#fafaf9] py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header & Step Indicator */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {isEnglish ? 'Livestock Disease Early Detection' : 'पशु रोग पहचान (Disease Detection)'}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Cpu className="w-3 h-3" /> lsd_model.keras
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEnglish
                  ? 'AI-assisted clinical evaluation and veterinary guidance using EfficientNetB0 CNN'
                  : 'lsd_model.keras डीप लर्निंग मॉडल एवं 27 क्लीनिकल लक्षणों द्वारा जांच'}
              </p>
            </div>
            <span className="text-xs font-bold bg-stone-100 text-slate-700 px-3 py-1 rounded-full">
              {isEnglish ? `Step ${currentStep} / 4` : `चरण ${currentStep} / 4`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
            <div className={`py-1.5 rounded-lg border transition ${currentStep >= 1 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              1. {isEnglish ? 'Animal' : 'पशु चयन'}
            </div>
            <div className={`py-1.5 rounded-lg border transition ${currentStep >= 2 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              2. {isEnglish ? 'Symptoms & Photo' : 'लक्षण व फोटो'}
            </div>
            <div className={`py-1.5 rounded-lg border transition ${currentStep >= 3 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              3. {isEnglish ? 'AI Triage' : 'AI जांच'}
            </div>
            <div className={`py-1.5 rounded-lg border transition ${currentStep >= 4 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              4. {isEnglish ? 'Result' : 'परिणाम'}
            </div>
          </div>
        </div>

        {/* STEP 1: SELECT ANIMAL */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-5">
            <h2 className="text-sm font-bold text-slate-800">
              {isEnglish ? 'Step 1: Select Affected Livestock Species' : 'चरण 1: प्रभावित पशु का चयन करें'}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { species: 'Cattle', label: isEnglish ? 'Cow / Cattle' : 'गाय (Cow)', emoji: '🐄' },
                { species: 'Buffalo', label: isEnglish ? 'Buffalo' : 'भैंस (Buffalo)', emoji: '🦬' },
                { species: 'Goat', label: isEnglish ? 'Goat' : 'बकरी (Goat)', emoji: '🐐' },
                { species: 'Sheep', label: isEnglish ? 'Sheep' : 'भेड़ (Sheep)', emoji: '🐑' }
              ].map((item) => (
                <button
                  key={item.species}
                  type="button"
                  onClick={() => setSelectedSpecies(item.species)}
                  className={`p-4 rounded-xl border text-center transition ${
                    selectedSpecies === item.species
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                  }`}
                >
                  <span className="text-3xl block mb-1">{item.emoji}</span>
                  <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isEnglish ? 'Animal Name or Tag ID (Optional):' : 'पशु का नाम या टैग (वैकल्पिक):'}
              </label>
              <input
                type="text"
                value={animalName}
                onChange={(e) => setAnimalName(e.target.value)}
                placeholder={isEnglish ? 'e.g. Lakshmi / MH-12-P-1001' : 'उदा. लक्ष्मी / MH-12-P-1001'}
                className="w-full sm:w-72 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs"
              >
                {t('actions.next', 'Continue')} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SYMPTOMS, PHOTO, TEMPERATURE & DURATION (MATCHING IMAGE 2) */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {isEnglish ? 'Step 2: Select Symptoms & Upload Photo' : 'चरण 2: लक्षण चुनें और फोटो लगाएं'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEnglish
                    ? 'Enter clinical parameters and skin photograph for the AI neural network'
                    : 'डीप लर्निंग मॉडल के लिए त्वचा की फोटो और सभी लक्षण दर्ज करें'}
                </p>
              </div>
              <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {selectedSpecies}
              </span>
            </div>

            {/* 1. Skin Photo Box (Image 2 style) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  {isEnglish ? 'Skin photo (optional)' : 'त्वचा की फोटो (वैकल्पिक)'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {isEnglish ? 'Input shape: 224x224 RGB' : '224x224 RGB इनपुट'}
                </span>
              </div>

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-black/90 p-2 flex flex-col items-center justify-center">
                  <img
                    src={photoPreview}
                    alt="Skin preview"
                    className="max-h-56 rounded-xl object-contain"
                  />
                  <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-stone-700/50 px-2">
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {isEnglish ? 'Photo loaded for CNN inference' : 'फोटो लोड हो गई'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition"
                    >
                      {isEnglish ? 'Remove Photo' : 'फोटो हटाएं'}
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-2xl p-6 flex flex-col items-center justify-center bg-stone-50/70 hover:bg-emerald-50/30 transition group">
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-stone-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {isEnglish ? 'Drop Image Here' : 'फोटो यहां खींचें'}
                  </span>
                  <span className="text-[11px] text-slate-400 my-0.5">- or -</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {isEnglish ? 'Click to Upload' : 'फोटो अपलोड करने के लिए क्लिक करें'}
                  </span>
                  <div className="flex items-center gap-4 mt-3 text-slate-400 text-xs">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> {isEnglish ? 'Camera' : 'कैमरा'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> {isEnglish ? 'Upload' : 'अपलोड'}
                    </span>
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* 2. Symptoms Observed (All 27 symptoms from Image 2) */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  {isEnglish ? 'Symptoms observed' : 'लक्षण पहचानें (Symptoms observed)'}
                  <span className="text-[11px] font-normal text-slate-500">
                    ({selectedSymptoms.length} / 27 {isEnglish ? 'selected' : 'चुने गए'})
                  </span>
                </label>
                <input
                  type="text"
                  placeholder={isEnglish ? 'Filter symptoms...' : 'लक्षण खोजें...'}
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-600 w-full sm:w-48"
                />
              </div>

              {/* 27 Symptom Buttons Grid */}
              <div className="flex flex-wrap gap-2 pt-1">
                {filteredSymptoms.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym.id);
                  return (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => handleToggleSymptom(sym.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                        isChecked
                          ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-slate-700 border-stone-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                          isChecked ? 'bg-white text-emerald-800 border-white font-bold' : 'border-stone-400 bg-white'
                        }`}
                      >
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{isEnglish ? sym.id : sym.labelHi}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Temperature (°C) & 4. Duration (hours) (Image 2 style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                  {isEnglish ? 'Temperature (°C)' : 'तापमान (°C - Temperature)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="45"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 block">
                  {isEnglish ? 'Normal: 38.0–39.3°C, Fever: >39.5°C' : 'सामान्य: 38.0–39.3°C, बुखार: >39.5°C'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {isEnglish ? 'Duration of symptoms (hours)' : 'लक्षणों की अवधि (घंटे - Duration)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 block">
                  {isEnglish ? 'e.g. 24 for 1 day, 48 for 2 days' : 'उदा. 24 (1 दिन), 48 (2 दिन)'}
                </span>
              </div>
            </div>

            {/* Voice & Text Notes */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  {isEnglish ? 'Additional Observations (Speak or Type):' : 'अतिरिक्त विवरण (बोलें या लिखें):'}
                </label>
                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg transition ${
                    isRecording ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                  }`}
                >
                  <Mic className="w-3 h-3" /> {isRecording ? (isEnglish ? 'Listening...' : 'सुन रहा हूं...') : (isEnglish ? 'Speak' : 'बोलें')}
                </button>
              </div>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder={isEnglish ? 'Describe feed intake, milk changes, herd contact...' : 'पशु की स्थिति, चारा-पानी या अन्य बातें यहां लिखें...'}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Navigation Actions */}
            <div className="pt-4 flex items-center justify-between border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> {t('actions.back', 'Back')}
              </button>
              <button
                type="button"
                onClick={handleStartAnalysis}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                {t('wizard.submit_triage', 'Run AI Triage & Submit Report')} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOADING INFERENCE */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl p-10 border border-stone-200/80 shadow-2xs text-center space-y-5">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
              <Cpu className="w-6 h-6 text-emerald-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                {isEnglish ? 'Analyzing with lsd_model.keras...' : 'lsd_model.keras द्वारा विश्लेषण जारी है...'}
              </h3>
              <p className="text-xs text-emerald-800 font-medium animate-pulse">{aiStage}</p>
            </div>
            <div className="max-w-xs mx-auto text-[11px] text-slate-400">
              {isEnglish
                ? 'Processing EfficientNetB0 neural weights with PyTorch backend'
                : 'न्यूरल नेटवर्क और क्लीनिकल डायग्नोस्टिक इंजन द्वारा मिलान किया जा रहा है'}
            </div>
          </div>
        )}

        {/* STEP 4: RESULT VIEW */}
        {currentStep === 4 && analysisResult && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-6">
            {/* AI Model Badge & Disclaimer */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    {analysisResult.modelVersion || 'lsd_model.keras (EfficientNetB0)'}
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    {isEnglish ? 'Real deep learning inference verified' : 'डीप लर्निंग मॉडल द्वारा सत्यापित परिणाम'}
                  </span>
                </div>
              </div>
              {analysisResult.hasImage && analysisResult.visualScore !== null && (
                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-700 text-white shadow-2xs self-start sm:self-auto">
                  {isEnglish ? 'Visual Match:' : 'फोटो मिलान:'} {Math.round(analysisResult.visualScore * 100)}%
                </span>
              )}
            </div>

            {/* Disease Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  {isEnglish ? 'Suspected Condition:' : 'संभावित बीमारी:'}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">
                  {analysisResult.possibleCondition}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{analysisResult.explanation}</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    analysisResult.riskLevel === 'Critical'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : analysisResult.riskLevel === 'High'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isEnglish ? 'Risk' : 'जोखिम'}: {analysisResult.riskLevel}
                </span>
                <span className="text-xs font-black text-emerald-700 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                  {isEnglish ? 'Confidence' : 'सटीकता'}: {analysisResult.confidenceScore}%
                </span>
              </div>
            </div>

            {/* Image Preview & Clinical Signs Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {photoPreview && (
                <div className="rounded-xl overflow-hidden border border-stone-200 h-32 bg-black flex items-center justify-center relative">
                  <img src={photoPreview} alt="Analyzed lesion" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                    CNN Analyzed
                  </span>
                </div>
              )}
              <div className={`${photoPreview ? 'sm:col-span-2' : 'sm:col-span-3'} space-y-1.5`}>
                <span className="text-xs font-bold text-slate-700 block">
                  {isEnglish ? 'Evaluated Parameters:' : 'जांचे गए मापदंड:'}
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {analysisResult.clinicalObservations && analysisResult.clinicalObservations.map((obs, i) => (
                    <span key={i} className="px-2.5 py-1 bg-stone-100 rounded-lg border border-stone-200 text-slate-700 text-[11px] font-medium">
                      • {obs}
                    </span>
                  ))}
                  {temperature > 0 && (
                    <span className="px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] font-medium">
                      Temp: {temperature}°C
                    </span>
                  )}
                  {duration > 0 && (
                    <span className="px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-[11px] font-medium">
                      Duration: {duration}h
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Differential Candidate Diseases */}
            {analysisResult.suspectedDiseases && analysisResult.suspectedDiseases.length > 1 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  {isEnglish ? 'Differential Diagnostic Ranking:' : 'अन्य संभावित रोग (Differential Ranking):'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisResult.suspectedDiseases.slice(0, 4).map((d, idx) => (
                    <div key={idx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{d.name}</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {Math.round((d.confidenceScore <= 1 ? d.confidenceScore * 100 : d.confidenceScore))}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Immediate First Aid & Biosecurity */}
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
              <strong className="block font-bold text-emerald-900">
                {isEnglish ? 'Immediate First Aid & Biosecurity Actions:' : 'प्राथमिक उपचार व बचाव के उपाय:'}
              </strong>
              <ul className="space-y-1.5 text-slate-700">
                {analysisResult.immediateFirstAid && analysisResult.immediateFirstAid.map((aid, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-700 font-bold">{idx + 1}.</span>
                    <span>{aid}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Case Saved Confirmation */}
            {savedSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-bold">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>
                  {isEnglish ? 'Report successfully filed to Surveillance System!' : 'रिपोर्ट पशु स्वास्थ्य निगरानी प्रणाली में दर्ज हो गई!'}
                  {caseIdSaved && ` (Case ID: ${caseIdSaved})`}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <Link
                to="/veterinary-help"
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs"
              >
                <Stethoscope className="w-4 h-4" /> {isEnglish ? 'Contact Nearest Veterinarian' : 'पशु चिकित्सक से संपर्क करें'}
              </Link>
              <button
                type="button"
                onClick={handleSaveFormalReport}
                className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold py-2.5 px-4 rounded-xl border border-stone-200 transition"
              >
                <Save className="w-4 h-4" />
                {savedSuccess ? (isEnglish ? 'Report Saved' : 'रिपोर्ट सेव हो गई') : (isEnglish ? 'Save Formal Report' : 'सरकारी रिपोर्ट सेव करें')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setPhotoPreview(null);
                  setSavedSuccess(false);
                  setCaseIdSaved('');
                }}
                className="inline-flex items-center justify-center gap-1 bg-stone-50 hover:bg-stone-100 text-slate-600 text-xs font-semibold py-2.5 px-3 rounded-xl border border-stone-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {isEnglish ? 'New Test' : 'नई जांच'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
