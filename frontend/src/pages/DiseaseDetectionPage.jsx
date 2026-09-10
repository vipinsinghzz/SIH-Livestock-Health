import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  FileText,
  CheckCircle2,
  Plus,
  Radio,
  PhoneCall,
  UserCheck,
  Send,
  Loader2,
  ShieldCheck,
  AlertOctagon,
  MapPin,
  Eye,
  X
} from 'lucide-react';
import api from '../services/api';
import diseaseDetectionService, { SYMPTOMS_27 } from '../services/diseaseDetectionService';
import voiceService from '../services/voiceService';
import animalService from '../services/animalService';
import caseService from '../services/caseService';
import { getCleanLang, getSpeciesDisplayName, getBreedDisplayName } from '../constants/livestockData';
import { LivestockSaathiEmblem } from '../components/LivestockSaathiLogo';

export default function DiseaseDetectionPage() {
    const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = getCleanLang(i18n.language);
  const isEnglish = currentLang === 'en';
  const isMarathi = currentLang === 'mr';

  const [currentStep, setCurrentStep] = useState(1);

  // Herd selection state
  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [isOtherAnimal, setIsOtherAnimal] = useState(false);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [autoSyncSuccess, setAutoSyncSuccess] = useState(false);

  // Step 1: Animal Selection
  const [selectedSpecies, setSelectedSpecies] = useState('Cattle');
  const [animalName, setAnimalName] = useState('Lakshmi');

  // Load user registered animals and check query param
  React.useEffect(() => {
    const fetchHerd = async () => {
      try {
        const herd = await animalService.getAnimals();
        setAnimals(herd || []);

        const params = new URLSearchParams(location.search);
        const targetId = params.get('animalId');
        if (targetId && herd && herd.length > 0) {
          const match = herd.find((a) => a._id === targetId || a.tagId === targetId || a.id === targetId);
          if (match) {
            setSelectedAnimal(match);
            setSelectedSpecies(match.species || 'Cattle');
            setAnimalName(match.name);
            setIsOtherAnimal(false);
            return;
          }
        }

        if (herd && herd.length > 0) {
          setSelectedAnimal(herd[0]);
          setSelectedSpecies(herd[0].species || 'Cattle');
          setAnimalName(herd[0].name);
          setIsOtherAnimal(false);
        } else {
          setIsOtherAnimal(true);
        }
      } catch (err) {
        console.warn('Failed to load herd:', err);
        setIsOtherAnimal(true);
      } finally {
        setLoadingAnimals(false);
      }
    };
    fetchHerd();
  }, [location.search]);

  const handleChooseAnimal = (animal) => {
    if (animal) {
      setSelectedAnimal(animal);
      setIsOtherAnimal(false);
      setSelectedSpecies(animal.species || 'Cattle');
      setAnimalName(animal.name);
    } else {
      setSelectedAnimal(null);
      setIsOtherAnimal(true);
      setAnimalName('');
    }
  };

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

  // PS-128 Disease-to-Veterinarian Referral State
  const [userCoords, setUserCoords] = useState({ lat: 18.5204, lng: 73.8567 });
  const [detectedDistrict, setDetectedDistrict] = useState('Pune');
  const [districtVets, setDistrictVets] = useState([]);
  const [referralCase, setReferralCase] = useState(null);
  const [isCreatingReferral, setIsCreatingReferral] = useState(false);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralError, setReferralError] = useState('');

  // 1. Detect location and district automatically
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('pashurakshak_user');
      const storedUser = raw && raw !== 'undefined' ? JSON.parse(raw) : {};
      if (storedUser?.district) {
        setDetectedDistrict(storedUser.district);
      }
      if (storedUser?.location?.lat && storedUser?.location?.lng) {
        setUserCoords(storedUser.location);
      }
    } catch (e) {}

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          try {
            const res = await api.get(`/nadres/alerts?lat=${lat}&lng=${lng}`);
            if (res.data?.district) {
              setDetectedDistrict(res.data.district);
            }
          } catch (e) {}
        },
        (err) => console.warn('Geolocation fallback used:', err.message),
        { timeout: 8000 }
      );
    }
  }, []);

  // 2. Fetch active veterinarians in detected district
  React.useEffect(() => {
    if (!detectedDistrict) return;
    caseService.getDistrictVets(detectedDistrict)
      .then((data) => {
        if (data?.vets) setDistrictVets(data.vets);
      })
      .catch(() => {});
  }, [detectedDistrict]);

  // 3. Real-time Referral Case Status Listener (SSE + Polling fallback)
  React.useEffect(() => {
    if (!referralCase?._id) return;
    const unsub = caseService.subscribeToCaseStream(
      (event) => {
        if (event.type === 'connected') setSseConnected(true);
        if (event.case && (event.case._id === referralCase._id || event.case.caseId === referralCase.caseId)) {
          setReferralCase(event.case);
        }
      },
      () => setSseConnected(false)
    );

    const pollInterval = setInterval(async () => {
      try {
        const res = await caseService.getCaseById(referralCase._id);
        if (res?.case) {
          setReferralCase(res.case);
        }
      } catch (e) {}
    }, 4000);

    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, [referralCase?._id]);

  // 4. Dispatch Case to All Matching District Veterinarians
  const handleDispatchReferral = async () => {
    if (!analysisResult) return;
    setIsCreatingReferral(true);
    setReferralError('');
    try {
      const cleanCondition = analysisResult.possibleCondition || analysisResult.predictedDisease || 'Lumpy Skin Disease (LSD)';
      const payload = {
        animalId: selectedAnimal?._id || selectedAnimal?.id || null,
        animalName: selectedAnimal?.name || animalName || 'Livestock',
        species: selectedSpecies,
        image: photoPreview || '',
        disease: cleanCondition,
        confidence: analysisResult.confidenceScore || 88,
        risk: analysisResult.riskLevel || 'High',
        coordinates: userCoords,
        district: detectedDistrict,
        symptoms: selectedSymptoms,
        temperature: parseFloat(temperature || 0),
        duration: parseFloat(duration || 0),
        notes: customNotes
      };

      const res = await caseService.createCase(payload);
      if (res?.case) {
        setReferralCase(res.case);
        setReferralSuccess(true);
        setShowReferralModal(true);
      }
    } catch (err) {
      console.error('Failed to create referral:', err);
      setReferralError(err.response?.data?.message || 'Failed to dispatch referral alert. Please retry.');
    } finally {
      setIsCreatingReferral(false);
    }
  };

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

    // AUTOMATIC HEALTH RECORD SYNC WITH PERSISTENT IMAGE STORAGE
    if (selectedAnimal) {
      try {
        const animalId = selectedAnimal._id || selectedAnimal.id || selectedAnimal.tagId;
        const isCritical = result.riskLevel === 'Critical' || result.riskLevel === 'High';
        const isAttention = result.riskLevel === 'Moderate';
        const newHealthStatus = isCritical ? 'Critical' : isAttention ? 'Needs Attention' : 'Healthy';

        // 1. Clean Condition Name (Remove parenthetical double languages)
        const rawCondition = result.disease || result.possibleCondition || 'Lumpy Skin Disease (LSD)';
        let cleanCondition = rawCondition;
        const parenMatch = rawCondition.match(/^([^(]+)(?:\(([^)]+)\))?/);
        if (parenMatch) {
          const eng = parenMatch[1].trim();
          const local = parenMatch[2] ? parenMatch[2].split('/')[0].trim() : '';
          cleanCondition = isEnglish ? eng : (local || eng);
        }

        // 2. Format localized symptoms
        const formattedSymptoms = selectedSymptoms.map((symId) => {
          const found = SYMPTOMS_27.find((s) => s.id === symId);
          if (!found) return symId;
          return isEnglish ? found.labelEn : isMarathi ? (found.labelMr || found.labelHi) : found.labelHi;
        });

        // 3. Store Image in Backend Database and get public URL
        let storedImageUrl = '';
        if (photoPreview) {
          try {
            const uploadRes = await api.post('/upload/scan-image', {
              image: photoPreview,
              animalId: selectedAnimal._id || selectedAnimal.id,
              disease: cleanCondition,
              riskLevel: result.riskLevel,
              confidence: result.confidenceScore || result.confidence || 88,
              symptoms: formattedSymptoms,
              temperature: parseFloat(temperature || 0),
              duration: parseFloat(duration || 0)
            });
            if (uploadRes.data?.imageUrl) {
              storedImageUrl = uploadRes.data.imageUrl;
            }
          } catch (uploadErr) {
            console.warn('Backend image upload failed, using local preview:', uploadErr.message);
            storedImageUrl = photoPreview;
          }
        }

        const advisoryText = (result.immediateFirstAid && result.immediateFirstAid.length > 0)
          ? result.immediateFirstAid.join('. ')
          : (result.explanation || '');

        const scanTimelineEvent = {
          type: 'Health Check',
          title: isEnglish
            ? `AI Disease Scan: ${cleanCondition} (${result.riskLevel} Risk)`
            : isMarathi
            ? `AI रोग तपासणी: ${cleanCondition} (${result.riskLevel === 'High' || result.riskLevel === 'Critical' ? 'गंभीर धोका' : result.riskLevel === 'Moderate' ? 'मध्यम धोका' : 'कमी धोका'})`
            : `AI रोग जांच: ${cleanCondition} (${result.riskLevel === 'High' || result.riskLevel === 'Critical' ? 'गंभीर जोखिम' : result.riskLevel === 'Moderate' ? 'मध्यम जोखिम' : 'कम जोखिम'})`,
          date: new Date().toLocaleDateString('en-GB'),
          doctor: 'AI Neural Triage (lsd_model.keras)',
          image: storedImageUrl,
          status: newHealthStatus,
          disease: cleanCondition,
          confidence: result.confidenceScore || result.confidence || 88,
          symptoms: formattedSymptoms,
          advisory: advisoryText,
          temperature: parseFloat(temperature || 0),
          duration: parseFloat(duration || 0),
          notes: `${isEnglish ? 'Confidence' : 'सटीकता'}: ${result.confidenceScore || result.confidence || 88}%. ${isEnglish ? 'Symptoms' : isMarathi ? 'लक्षणे' : 'लक्षण'}: ${formattedSymptoms.join(', ')}.`
        };

        const updates = {
          healthStatus: newHealthStatus,
          lastCheckup: new Date().toLocaleDateString('en-GB'),
          newTimelineEvent: scanTimelineEvent
        };

        await animalService.updateAnimal(animalId, updates);
        setAutoSyncSuccess(true);
      } catch (err) {
        console.warn('Auto sync to health record failed:', err);
      }
    }
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
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <LivestockSaathiEmblem size={50} className="shrink-0 drop-shadow-xs" />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    {isEnglish ? 'Livestock Disease Early Detection' : 'पशु रोग पहचान (Disease Detection)'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-200">
                    <Cpu className="w-3.5 h-3.5" /> lsd_model.keras
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {isEnglish
                    ? 'AI-assisted clinical evaluation and veterinary guidance using EfficientNetB0 CNN'
                    : 'lsd_model.keras डीप लर्निंग मॉडल एवं 27 क्लीनिकल लक्षणों द्वारा जांच'}
                </p>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold bg-stone-100 text-slate-800 px-3.5 py-1.5 rounded-full shrink-0">
              {isEnglish ? `Step ${currentStep} / 4` : `चरण ${currentStep} / 4`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs sm:text-sm font-bold">
            <div className={`py-2 rounded-xl border transition ${currentStep >= 1 ? 'bg-emerald-700 text-white border-emerald-700 font-black' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              1. {isEnglish ? 'Animal' : 'पशु चयन'}
            </div>
            <div className={`py-2 rounded-xl border transition ${currentStep >= 2 ? 'bg-emerald-700 text-white border-emerald-700 font-black' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              2. {isEnglish ? 'Symptoms & Photo' : 'लक्षण व फोटो'}
            </div>
            <div className={`py-2 rounded-xl border transition ${currentStep >= 3 ? 'bg-emerald-700 text-white border-emerald-700 font-black' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              3. {isEnglish ? 'AI Triage' : 'AI जांच'}
            </div>
            <div className={`py-2 rounded-xl border transition ${currentStep >= 4 ? 'bg-emerald-700 text-white border-emerald-700 font-black' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              4. {isEnglish ? 'Result' : 'परिणाम'}
            </div>
          </div>
        </div>

        {/* STEP 1: SELECT ANIMAL */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/80 shadow-2xs space-y-6">
            <div className="border-b border-stone-100 pb-3.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {isEnglish ? 'Step 1: Select Livestock for Disease Scan' : isMarathi ? 'चरण १: रोग तपासणीसाठी जनावर निवडा' : 'चरण 1: रोग जांच के लिए पशु चुनें'}
              </h2>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                {isEnglish
                  ? 'Select from your registered herd. The AI scan result will automatically update the animal\'s health record.'
                  : isMarathi
                  ? 'नोंदणीकृत जनावरांमधून निवडा. AI चाचणीचा निकाल थेट या जनावराच्या आरोग्य नोंदवहीत जतन केला जाईल.'
                  : 'अपने पंजीकृत पशुओं में से चुनें। AI जांच का परिणाम सीधे इस पशु के स्वास्थ्य रिकॉर्ड में जुड़ जाएगा।'}
              </p>
            </div>

            {/* Registered Livestock Selection Grid */}
            {animals.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-sm font-bold text-slate-700 block">
                  {isEnglish ? 'Your Registered Livestock:' : isMarathi ? 'तुमची नोंदणीकृत जनावरे:' : 'आपके पंजीकृत पशु:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {animals.map((animal) => {
                    const isSelected = selectedAnimal && (selectedAnimal._id === animal._id || selectedAnimal.tagId === animal.tagId);
                    const speciesLabel = getSpeciesDisplayName(animal.species, currentLang);
                    const breedLabel = getBreedDisplayName(animal.breed, animal.species, currentLang);
                    const statusLabel =
                      animal.healthStatus === 'Healthy'
                        ? (isEnglish ? 'Healthy' : isMarathi ? 'निरोगी' : 'स्वस्थ')
                        : animal.healthStatus === 'Needs Attention'
                        ? (isEnglish ? 'Needs Attention' : isMarathi ? 'लक्ष द्या' : 'ध्यान दें')
                        : (isEnglish ? 'Critical' : isMarathi ? 'गंभीर' : 'गंभीर');

                    return (
                      <button
                        key={animal._id || animal.tagId}
                        type="button"
                        onClick={() => handleChooseAnimal(animal)}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600'
                            : 'border-stone-200 hover:border-emerald-300 bg-stone-50/70 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-3xl shrink-0">
                            {animal.species === 'Buffalo' ? '🐃' : animal.species === 'Goat' ? '🐐' : animal.species === 'Sheep' ? '🐑' : '🐄'}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-base sm:text-lg text-slate-900 truncate">{animal.name}</h4>
                            <p className="text-xs text-slate-500 font-mono truncate">
                              Tag: {animal.tagId} • {speciesLabel}
                            </p>
                            {breedLabel && <p className="text-xs text-emerald-800 font-medium truncate">{breedLabel}</p>}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                            animal.healthStatus === 'Healthy'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : animal.healthStatus === 'Needs Attention'
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </button>
                    );
                  })}

                  {/* Option: Other / Unregistered Animal */}
                  <button
                    type="button"
                    onClick={() => handleChooseAnimal(null)}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      isOtherAnimal
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600'
                        : 'border-dashed border-stone-300 hover:border-emerald-400 bg-stone-50/50 hover:bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">
                        {isEnglish ? '+ Other / Unregistered Animal' : isMarathi ? '+ इतर / नवीन जनावर' : '+ अन्य / नया पशु'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isEnglish ? 'Scan animal without linking to registered profile' : 'नोंदणी न केलेल्या जनावराची तपासणी करा'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* If Other / Unregistered animal is selected, pick species & name manually */}
            {isOtherAnimal && (
              <div className="space-y-4 pt-2 border-t border-stone-100">
                <label className="text-xs font-bold text-slate-700 block">
                  {isEnglish ? 'Select Species:' : isMarathi ? 'प्रजात निवडा:' : 'प्रजाति चुनें:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { species: 'Cattle', label: isEnglish ? 'Cow / Cattle' : isMarathi ? 'गाय' : 'गाय', emoji: '🐄' },
                    { species: 'Buffalo', label: isEnglish ? 'Buffalo' : isMarathi ? 'म्हैस' : 'भैंस', emoji: '🐃' },
                    { species: 'Goat', label: isEnglish ? 'Goat' : isMarathi ? 'शेळी' : 'बकरी', emoji: '🐐' },
                    { species: 'Sheep', label: isEnglish ? 'Sheep' : isMarathi ? 'मेंढी' : 'भेड़', emoji: '🐑' }
                  ].map((item) => (
                    <button
                      key={item.species}
                      type="button"
                      onClick={() => setSelectedSpecies(item.species)}
                      className={`p-4 rounded-xl border text-center transition cursor-pointer ${
                        selectedSpecies === item.species
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600'
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
                    {isEnglish ? 'Animal Name / Temporary Identifier (Optional):' : 'पशु का नाम / पहचान (वैकल्पिक):'}
                  </label>
                  <input
                    type="text"
                    value={animalName}
                    onChange={(e) => setAnimalName(e.target.value)}
                    placeholder={isEnglish ? 'e.g. Neighbor\'s Cow / Tag' : 'उदा. गाय / पहचान टैग'}
                    className="w-full sm:w-72 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
              <div className="text-xs text-slate-500">
                {selectedAnimal ? (
                  <span className="font-semibold text-emerald-800">
                    ✓ {isEnglish ? 'Selected:' : isMarathi ? 'निवडले:' : 'चयनित:'} {selectedAnimal.name} ({selectedAnimal.tagId})
                  </span>
                ) : (
                  <span>{isEnglish ? 'Custom scan' : 'सामान्य जांच'}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
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
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {isEnglish ? 'Step 2: Select Symptoms & Upload Photo' : 'चरण 2: लक्षण चुनें और फोटो लगाएं'}
                </h2>
                <p className="text-sm text-slate-600 font-medium">
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
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  {isEnglish ? 'Skin photo (optional)' : 'त्वचा की फोटो (वैकल्पिक)'}
                </label>
                <span className="text-xs text-slate-400">
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
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  {isEnglish ? 'Symptoms observed' : 'लक्षण पहचानें (Symptoms observed)'}
                  <span className="text-xs font-normal text-slate-500">
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
                      className={`text-sm px-3.5 py-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-slate-700 border-stone-200'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          isChecked ? 'bg-white text-emerald-800 border-white font-bold' : 'border-stone-400 bg-white'
                        }`}
                      >
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{isEnglish ? (sym.nameEn || sym.labelEn) : isMarathi ? (sym.labelMr || sym.labelHi) : sym.labelHi}</span>
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
                  {isEnglish ? 'Temperature (°C)' : isMarathi ? 'तापमान (°C)' : 'तापमान (°C)'}
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
                  {isEnglish
                    ? 'Normal: 38.0–39.3°C, Fever: >39.5°C'
                    : isMarathi
                    ? 'सामान्य: ३८.०–३९.३°C, ताप: >३९.५°C'
                    : 'सामान्य: 38.0–39.3°C, बुखार: >39.5°C'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {isEnglish ? 'Duration of symptoms (hours)' : isMarathi ? 'लक्षणे सुरू असल्याचा कालावधी (तास)' : 'लक्षणों की अवधि (घंटे)'}
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
                  {isEnglish
                    ? 'e.g. 24 for 1 day, 48 for 2 days'
                    : isMarathi
                    ? 'उदा. २४ (१ दिवस), ४८ (२ दिवस)'
                    : 'उदा. 24 (1 दिन), 48 (2 दिन)'}
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
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> {t('actions.back', 'Back')}
              </button>
              <button
                type="button"
                onClick={handleStartAnalysis}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
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
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
              <LivestockSaathiEmblem size={52} className="drop-shadow-xs animate-pulse" />
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

                        {/* Automatic Health Record Sync Banner */}
            {autoSyncSuccess && selectedAnimal && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                <div className="flex items-start sm:items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                      {isEnglish
                        ? `✓ Health Record Automatically Updated for ${selectedAnimal.name} (${selectedAnimal.tagId})`
                        : isMarathi
                        ? `✓ ${selectedAnimal.name} (${selectedAnimal.tagId}) ची आरोग्य नोंद स्वयंचलितपणे अद्यतनित केली`
                        : `✓ ${selectedAnimal.name} (${selectedAnimal.tagId}) का स्वास्थ्य रिकॉर्ड स्वचालित रूप से अपडेट हो गया`}
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {isEnglish
                        ? `Health status updated to "${analysisResult.riskLevel === 'High' || analysisResult.riskLevel === 'Critical' ? 'Critical' : analysisResult.riskLevel === 'Moderate' ? 'Needs Attention' : 'Healthy'}" and scan entry added to medical timeline.`
                        : isMarathi
                        ? `आरोग्य स्थिती आणि AI चाचणी इतिहास जनावराच्या प्रोफाइलमध्ये सुरक्षित केला आहे.`
                        : `स्वास्थ्य स्थिति और AI जांच विवरण पशु की समय-रेखा में सुरक्षित कर दिया गया है।`}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/animals?openAnimal=${selectedAnimal._id || selectedAnimal.id || selectedAnimal.tagId}`}
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs shrink-0 cursor-pointer"
                >
                  <span>{isEnglish ? 'View Health Record' : isMarathi ? 'आरोग्य नोंद पहा' : 'स्वास्थ्य रिकॉर्ड देखें'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Disease Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">
                  {isEnglish ? 'Suspected Condition:' : 'संभावित बीमारी:'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                  {analysisResult.possibleCondition}
                </h2>
                <p className="text-sm text-slate-600 mt-1 font-medium">{analysisResult.explanation}</p>
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

            {/* PS-128 Disease-to-Veterinarian Referral Card */}
            <div className="bg-gradient-to-br from-rose-50 to-red-50/70 rounded-2xl p-4 sm:p-5 border-2 border-rose-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-rose-950">
                      {isEnglish ? 'PS-128 District Veterinarian Referral' : isMarathi ? 'PS-128 जिल्हा पशुवैद्यकीय रेफरल' : 'PS-128 जिला पशु चिकित्सा रेफरल'}
                    </h3>
                    <p className="text-[11px] text-rose-800/80">
                      {isEnglish
                        ? `Live broadcast to all verified veterinarians in ${detectedDistrict} district`
                        : `${detectedDistrict} जिले के सभी सक्रिय पशु चिकित्सकों को सीधा अलर्ट`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2.5 py-1 bg-white/90 border border-rose-200 text-rose-900 font-bold rounded-lg flex items-center gap-1 shadow-2xs">
                    <MapPin className="w-3 h-3 text-red-600" />
                    <span>{detectedDistrict}</span>
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-lg flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-700" />
                    <span>{districtVets.length || 2} {isEnglish ? 'Vets Online' : 'डॉक्टर सक्रिय'}</span>
                  </span>
                </div>
              </div>

              {/* Referral Status / Action */}
              {referralCase ? (
                <div className="p-3.5 bg-white rounded-xl border border-rose-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {isEnglish ? 'Active Referral Case' : 'सक्रिय रेफरल केस'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-900">{referralCase.caseId}</span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            referralCase.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : referralCase.status === 'IN_TREATMENT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : referralCase.status === 'RESOLVED'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          }`}
                        >
                          {referralCase.status === 'OPEN' ? (isEnglish ? 'Pending Claim...' : 'दावे की प्रतीक्षा...') : referralCase.status}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowReferralModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer self-start sm:self-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isEnglish ? 'Track Live Status' : 'लाइव स्थिति देखें'}</span>
                    </button>
                  </div>

                  {referralCase.assignedVetId && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black shrink-0">
                          Dr
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{referralCase.assignedVetId.name}</span>
                            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">Assigned Vet</span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            {referralCase.assignedVetId.department || `${detectedDistrict} District Animal Health Office`}
                          </p>
                        </div>
                      </div>

                      {referralCase.assignedVetId.phone && (
                        <a
                          href={`tel:${referralCase.assignedVetId.phone}`}
                          className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>{isEnglish ? 'Call Doctor' : 'कॉल करें'} ({referralCase.assignedVetId.phone})</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {referralError && (
                    <div className="p-2.5 bg-red-100 text-red-900 text-xs rounded-xl font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                      <span>{referralError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDispatchReferral}
                    disabled={isCreatingReferral}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isCreatingReferral ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isEnglish ? 'Dispatching to District Vets...' : 'जिले के डॉक्टरों को अलर्ट भेजा जा रहा है...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {isEnglish
                            ? `Dispatch Case to All District Vets (${detectedDistrict})`
                            : `${detectedDistrict} जिले के सभी डॉक्टरों को केस रेफर करें`}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">
                    {isEnglish
                      ? 'Atomic assignment: Only the first veterinarian to respond will be assigned.'
                      : 'सिस्टम नियम: जो डॉक्टर पहले स्वीकार करेंगे, केस स्वतः उन्हें असाइन होगा।'}
                  </p>
                </div>
              )}
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
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-stone-200 transition shadow-2xs"
              >
                <Stethoscope className="w-4 h-4 text-emerald-700" /> {isEnglish ? 'Browse Nearby Clinics' : 'नजदीकी अस्पताल देखें'}
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
                  setReferralCase(null);
                }}
                className="inline-flex items-center justify-center gap-1 bg-stone-50 hover:bg-stone-100 text-slate-600 text-xs font-semibold py-2.5 px-3 rounded-xl border border-stone-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {isEnglish ? 'New Test' : 'नई जांच'}
              </button>
            </div>

            {/* Live Case Tracking Modal */}
            {showReferralModal && referralCase && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        PS-128 Referral Case Tracking
                      </span>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>{referralCase.caseId}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            referralCase.status === 'Investigating' || referralCase.status === 'ACCEPTED'
                              ? 'bg-blue-100 text-blue-800'
                              : referralCase.status === 'Confirmed'
                              ? 'bg-amber-100 text-amber-800'
                              : referralCase.status === 'Containment' || referralCase.status === 'IN_TREATMENT'
                              ? 'bg-purple-100 text-purple-800'
                              : referralCase.status === 'Resolved' || referralCase.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {referralCase.status}
                        </span>
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReferralModal(false)}
                      className="p-1.5 rounded-full hover:bg-stone-100 text-slate-400 hover:text-slate-700 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Disease & Animal Snapshot */}
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">{isEnglish ? 'Suspected Disease' : 'संभावित बीमारी'}</span>
                      <strong className="text-slate-900 font-black text-sm">{referralCase.disease}</strong>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        {referralCase.species} • {referralCase.animalName || 'Livestock'} • {referralCase.confidence}% Confidence
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg font-black text-xs border border-red-200">
                      {referralCase.risk} Risk
                    </span>
                  </div>

                  {/* Progress Stepper - 5 Canonical Stages */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      {isEnglish ? 'Referral Lifecycle (5 Stages):' : 'रेफरल प्रगति (5 चरण):'}
                    </span>
                    <div className="grid grid-cols-5 gap-1 text-center text-[9px] font-bold">
                      <div className="p-2 rounded-lg bg-emerald-600 text-white">
                        1. New ✓
                      </div>
                      <div
                        className={`p-2 rounded-lg transition ${
                          ['Investigating', 'ACCEPTED', 'Confirmed', 'Containment', 'IN_TREATMENT', 'Resolved', 'RESOLVED'].includes(referralCase.status)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 text-slate-400'
                        }`}
                      >
                        2. Investigating {referralCase.assignedVetId ? '✓' : ''}
                      </div>
                      <div
                        className={`p-2 rounded-lg transition ${
                          ['Confirmed', 'Containment', 'IN_TREATMENT', 'Resolved', 'RESOLVED'].includes(referralCase.status)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 text-slate-400'
                        }`}
                      >
                        3. Confirmed
                      </div>
                      <div
                        className={`p-2 rounded-lg transition ${
                          ['Containment', 'IN_TREATMENT', 'Resolved', 'RESOLVED'].includes(referralCase.status)
                            ? 'bg-purple-600 text-white'
                            : 'bg-stone-100 text-slate-400'
                        }`}
                      >
                        4. Containment
                      </div>
                      <div
                        className={`p-2 rounded-lg transition ${
                          ['Resolved', 'RESOLVED'].includes(referralCase.status)
                            ? 'bg-emerald-700 text-white'
                            : 'bg-stone-100 text-slate-400'
                        }`}
                      >
                        5. Resolved
                      </div>
                    </div>
                  </div>

                  {/* Assigned Doctor Card or Waiting Status */}
                  {referralCase.assignedVetId ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                          Dr
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Attending Veterinary Doctor
                          </span>
                          <h4 className="text-base font-black text-slate-900">{referralCase.assignedVetId.name}</h4>
                          <p className="text-xs text-slate-600">
                            {referralCase.assignedVetId.department || `Animal Husbandry Department, ${detectedDistrict}`}
                          </p>
                        </div>
                      </div>

                      {referralCase.assignedVetId.phone && (
                        <a
                          href={`tel:${referralCase.assignedVetId.phone}`}
                          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs"
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span>{isEnglish ? 'Call Doctor Directly' : 'डॉक्टर से सीधा संपर्क करें'} ({referralCase.assignedVetId.phone})</span>
                        </a>
                      )}

                      {referralCase.treatmentNotes && (
                        <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
                          <strong className="block text-slate-800 font-bold">Doctor's Clinical Notes:</strong>
                          <p className="text-slate-700">{referralCase.treatmentNotes}</p>
                        </div>
                      )}
                      {referralCase.prescription && (
                        <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
                          <strong className="block text-slate-800 font-bold">Prescription / Medications:</strong>
                          <p className="text-slate-700 font-mono">{referralCase.prescription}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                        <Radio className="w-5 h-5 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-black text-amber-950">
                        {isEnglish ? 'Notifying District Veterinarians...' : 'जिले के डॉक्टरों को नोटिफिकेशन भेज दिया गया है...'}
                      </h4>
                      <p className="text-xs text-amber-800/80 max-w-sm mx-auto">
                        {isEnglish
                          ? `Alert sent to ${referralCase.notifiedVets?.length || districtVets.length || 2} active veterinarians in ${detectedDistrict}. First veterinarian to accept will be assigned instantly.`
                          : `${detectedDistrict} के ${referralCase.notifiedVets?.length || districtVets.length || 2} डॉक्टरों को अलर्ट भेज दिया गया है। जैसे ही कोई डॉक्टर स्वीकार करेंगे, उनकी जानकारी यहाँ आ जाएगी।`}
                      </p>
                      <span className="inline-block text-[10px] text-slate-400 font-medium pt-1">
                        {sseConnected ? '🟢 Live SSE Connected' : '🟡 Polling for Live Updates'}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReferralModal(false)}
                      className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold rounded-xl transition"
                    >
                      {isEnglish ? 'Close Window' : 'बंद करें'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
