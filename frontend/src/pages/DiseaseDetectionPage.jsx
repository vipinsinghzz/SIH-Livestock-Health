import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Mic,
  Stethoscope,
  Save,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';
import diseaseDetectionService from '../services/diseaseDetectionService';
import voiceService from '../services/voiceService';

export default function DiseaseDetectionPage() {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Animal Selection
  const [selectedSpecies, setSelectedSpecies] = useState('Cattle');
  const [animalName, setAnimalName] = useState('Lakshmi');

  // Step 2: Symptoms & Inputs
  const [selectedSymptoms, setSelectedSymptoms] = useState(['swelling', 'reduced milk production']);
  const [customNotes, setCustomNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Step 3: AI Progress Simulation
  const [aiStage, setAiStage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 4: Result
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Common clinical symptom chips with bilingual labels
  const COMMON_SYMPTOMS = [
    { key: 'swelling', labelEn: 'Udder or neck swelling', labelHi: 'थन या गले में सूजन' },
    { key: 'reduced milk production', labelEn: 'Sudden drop in milk yield', labelHi: 'दूध में अचानक कमी' },
    { key: 'abnormal milk', labelEn: 'Clots or pus in milk', labelHi: 'दूध में थक्के या मवाद' },
    { key: 'high fever', labelEn: 'High fever', labelHi: 'तेज बुखार' },
    { key: 'mouth blisters', labelEn: 'Blisters on mouth / hooves', labelHi: 'मुंह व खुर में छाले' },
    { key: 'excessive salivation', labelEn: 'Excessive salivation / drooling', labelHi: 'मुंह से लार गिरना' },
    { key: 'skin nodules', labelEn: 'Skin nodules / firm lumps', labelHi: 'त्वचा पर सख्त गांठें' },
    { key: 'limping', labelEn: 'Limping / acute lameness', labelHi: 'लंगड़ा कर चलना' },
    { key: 'difficulty breathing', labelEn: 'Difficulty breathing / grunting', labelHi: 'सांस लेने में तकलीफ' },
    { key: 'loss of appetite', labelEn: 'Loss of appetite / dullness', labelHi: 'चारा न खाना' }
  ];

  const isEnglish = i18n.language?.startsWith('en');

  const handleToggleSymptom = (key) => {
    if (selectedSymptoms.includes(key)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== key));
    } else {
      setSelectedSymptoms([...selectedSymptoms, key]);
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
      notes: customNotes,
      image: photoPreview
    });

    setAnalysisResult(result);
    setIsAnalyzing(false);
    setCurrentStep(4);
  };

  const handleSaveReport = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Clean Header & Step Indicator */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isEnglish ? 'Livestock Disease Early Detection' : 'पशु रोग पहचान (Disease Detection)'}
              </h1>
              <p className="text-xs text-slate-500">
                {isEnglish ? 'AI-assisted preliminary clinical evaluation and veterinary guidance' : 'AI द्वारा प्रारंभिक स्वास्थ्य जांच व मार्गदर्शन'}
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
              2. {isEnglish ? 'Symptoms' : 'लक्षण व फोटो'}
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

        {/* STEP 2: SYMPTOMS, PHOTO & VOICE */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {isEnglish ? 'Step 2: Select Symptoms & Upload Photo' : 'चरण 2: लक्षण चुनें और फोटो लगाएं'}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {isEnglish ? `Species: ${selectedSpecies}` : `पशु: ${selectedSpecies}`}
              </span>
            </div>

            {/* Symptoms Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                {t('wizard.symptoms_label', isEnglish ? 'Select Observed Symptoms:' : 'लक्षण चुनें:')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOMS.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym.key);
                  const displayLabel = isEnglish ? sym.labelEn : `${sym.labelHi} (${sym.labelEn})`;
                  return (
                    <button
                      key={sym.key}
                      type="button"
                      onClick={() => handleToggleSymptom(sym.key)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                        isChecked
                          ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                          : 'bg-stone-50 hover:bg-stone-100 text-slate-700 border-stone-200'
                      }`}
                    >
                      {isChecked && '✓ '} {displayLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-600">
                {isEnglish ? 'Photo (Optional):' : 'फोटो (वैकल्पिक):'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="cursor-pointer border border-dashed border-stone-300 hover:border-emerald-600 rounded-xl p-4 flex flex-col items-center justify-center bg-stone-50 transition">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-medium text-slate-700">
                    {isEnglish ? 'Take photo or upload image' : 'फोटो खींचें या अपलोड करें'}
                  </span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>

                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 h-28 bg-black">
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded hover:bg-black/80"
                    >
                      {isEnglish ? 'Remove' : 'हटाएं'}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-stone-200 h-28 bg-stone-50 flex items-center justify-center text-xs text-slate-400">
                    {isEnglish ? 'No photo selected' : 'कोई फोटो नहीं चुनी गई'}
                  </div>
                )}
              </div>
            </div>

            {/* Voice or text notes */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
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
                placeholder={isEnglish ? 'Describe any further clinical signs, sick duration, feed intake...' : 'पशु की स्थिति के बारे में कुछ और बताना चाहें...'}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-stone-100">
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
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-xs"
              >
                {t('wizard.submit_triage', isEnglish ? 'Run AI Analysis' : 'AI जांच शुरू करें')} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOADING SIMULATION */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl p-10 border border-stone-200/80 shadow-2xs text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-emerald-200 border-t-emerald-700 animate-spin mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEnglish ? 'Analyzing symptoms with AI Model...' : 'लक्षणों का विश्लेषण जारी है...'}
              </h3>
              <p className="text-xs text-emerald-800 mt-1 font-medium">{aiStage}</p>
            </div>
          </div>
        )}

        {/* STEP 4: CLEAN RESULT */}
        {currentStep === 4 && analysisResult && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-2xs space-y-5">
            {/* Medical Disclaimer */}
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>{isEnglish ? 'Preliminary AI Triage:' : 'प्रारंभिक AI जांच:'}</strong>{' '}
                {isEnglish
                  ? 'This is a preliminary decision support assessment. Please consult a licensed veterinary professional for diagnostic confirmation and medicinal prescription.'
                  : 'यह केवल पूर्व-आंकलन है। कृपया अंतिम पुष्टि व इलाज के लिए पशु चिकित्सक से परामर्श लें।'}
              </div>
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
                <p className="text-xs text-slate-500 mt-0.5">{analysisResult.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-slate-800">
                  {isEnglish ? 'Risk' : 'जोखिम'}: {analysisResult.riskLevel}
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  {isEnglish ? 'Confidence' : 'सटीकता'}: {analysisResult.confidenceScore}%
                </span>
              </div>
            </div>

            {/* Observed Signs */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">
                {isEnglish ? 'Observed Clinical Signs:' : 'पहचाने गए लक्षण:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {analysisResult.clinicalObservations.map((obs, i) => (
                  <div key={i} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-slate-700">
                    • {obs}
                  </div>
                ))}
              </div>
            </div>

            {/* First Aid */}
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
              <strong className="block font-bold">
                {isEnglish ? 'Immediate First Aid & Precautions:' : 'प्राथमिक उपचार व सावधानी:'}
              </strong>
              <ul className="space-y-1 text-slate-700">
                {analysisResult.immediateFirstAid.map((aid, idx) => (
                  <li key={idx}>
                    {idx + 1}. {aid}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <Link
                to="/veterinary-help"
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs"
              >
                <Stethoscope className="w-4 h-4" /> {isEnglish ? 'Contact Nearest Veterinarian' : 'नजदीकी डॉक्टर से संपर्क करें'}
              </Link>
              <button
                type="button"
                onClick={handleSaveReport}
                className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold py-2.5 px-4 rounded-xl border border-stone-200 transition"
              >
                <Save className="w-4 h-4" /> {savedSuccess ? (isEnglish ? 'Report Saved' : 'सुरक्षित हो गई') : (isEnglish ? 'Save Report' : 'रिपोर्ट सेव करें')}
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
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
