import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  AlertTriangle,
  Activity,
  Cpu,
  Thermometer,
  Clock,
  Sparkles,
  CheckCircle2,
  Plus,
  Radio,
  PhoneCall,
  UserCheck,
  Send,
  Loader2,
  ShieldCheck,
  MapPin,
  Eye,
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import diseaseDetectionService, { SYMPTOMS_27 } from '../services/diseaseDetectionService';
import voiceService from '../services/voiceService';
import animalService from '../services/animalService';
import caseService from '../services/caseService';
import { getCleanLang, getSpeciesDisplayName, getBreedDisplayName } from '../constants/livestockData';
import { LivestockSaathiEmblem } from '../components/LivestockSaathiLogo';
import { useAuth } from '../context/AuthContext';
import AiRecommendationModal from '../components/AiRecommendationModal';
import {
  storeAnimalAiScan,
  determineHealthStatusFromScan,
  getTailoredRecommendations
} from '../utils/aiScanStorage';

// Species metadata for species-aware presentation
const SPECIES_PROFILES = {
  Cattle: {
    key: 'Cattle',
    labelEn: 'Cow',
    labelHi: 'गाय / गोवंश',
    labelMr: 'गाय / गोवंश',
    aiNameEn: 'Cow Health AI',
    aiNameHi: 'गोवंश स्वास्थ्य AI',
    aiNameMr: 'गोवंश आरोग्य AI',
    emoji: '🐄',
    analysisTitleEn: 'Cow Health Analysis',
    analysisTitleHi: 'गोवंश स्वास्थ्य विश्लेषण',
    analysisTitleMr: 'गोवंश आरोग्य तपासणी',
    scopeNoteEn: 'Evaluates bovine skin lesions (including Lumpy Skin Disease) & clinical signs',
    scopeNoteHi: 'गोवंश त्वचा विकार (लम्पी त्वचा रोग सहित) एवं क्लीनिकल लक्षणों का मूल्यांकन',
    scopeNoteMr: 'गोवंश त्वचेवरील आजार (लंपी चर्मरोग सह) आणि शारीरिक लक्षणांचे मूल्यांकन'
  },
  Goat: {
    key: 'Goat',
    labelEn: 'Goat',
    labelHi: 'बकरी',
    labelMr: 'शेळी',
    aiNameEn: 'Goat Health AI',
    aiNameHi: 'बकरी स्वास्थ्य AI',
    aiNameMr: 'शेळी आरोग्य AI',
    emoji: '🐐',
    analysisTitleEn: 'Goat Health Analysis',
    analysisTitleHi: 'बकरी स्वास्थ्य विश्लेषण',
    analysisTitleMr: 'शेळी आरोग्य तपासणी',
    scopeNoteEn: 'Evaluates goat skin conditions (Mange, Lice, Orf, Caseous Lymphadenitis, Ringworm)',
    scopeNoteHi: 'बकरी त्वचा रोग (खुजली, जूं, ऑर्फ़, केसियस लिम्फैडेनाइटिस, दाद) की जांच',
    scopeNoteMr: 'शेळीच्या त्वचेचे आजार (खरुज, गोचीड/ऊ, ऑर्फ, गाठी, नायटा) तपासणी'
  },
  Sheep: {
    key: 'Sheep',
    labelEn: 'Sheep',
    labelHi: 'भेड़',
    labelMr: 'मेंढी',
    aiNameEn: 'Sheep Health AI',
    aiNameHi: 'भेड़ स्वास्थ्य AI',
    aiNameMr: 'मेंढी आरोग्य AI',
    emoji: '🐑',
    analysisTitleEn: 'Sheep Health Analysis',
    analysisTitleHi: 'भेड़ स्वास्थ्य विश्लेषण',
    analysisTitleMr: 'मेंढी आरोग्य तपासणी',
    scopeNoteEn: 'Evaluates ovine skin conditions (Contagious Ecthyma / Orf & cutaneous health)',
    scopeNoteHi: 'भेड़ त्वचा रोग (कंटेजियस एक्टिमा / ऑर्फ़ एवं त्वचा स्वास्थ्य) का मूल्यांकन',
    scopeNoteMr: 'मेंढीच्या त्वचेचे आजार (ऑर्फ, त्वचेचे आरोग्य) तपासणी'
  },
  Buffalo: {
    key: 'Buffalo',
    labelEn: 'Buffalo',
    labelHi: 'भैंस',
    labelMr: 'म्हैस',
    aiNameEn: 'Buffalo Health AI',
    aiNameHi: 'भैंस स्वास्थ्य AI',
    aiNameMr: 'म्हैस आरोग्य AI',
    emoji: '🐃',
    analysisTitleEn: 'Buffalo Health Analysis',
    analysisTitleHi: 'भैंस स्वास्थ्य विश्लेषण',
    analysisTitleMr: 'म्हैस आरोग्य तपासणी',
    scopeNoteEn: 'Evaluates buffalo dermatological and systemic symptoms',
    scopeNoteHi: 'भैंस के त्वचा संबंधी विकार और लक्षणों का मूल्यांकन',
    scopeNoteMr: 'म्हैशीचे त्वचेचे विकार आणि लक्षणांचे मूल्यांकन'
  }
};

const isNormalDiagnosis = (condition) => {
  if (!condition) return false;
  const lower = String(condition).toLowerCase();
  return (
    lower.includes('normal') ||
    lower.includes('healthy') ||
    lower.includes('निरोगी') ||
    lower.includes('स्वस्थ')
  );
};

class DiseaseDetectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[DiseaseDetection ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#fafaf8]">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-modal text-center space-y-4">
            <span className="text-4xl block">🔍</span>
            <h2 className="text-xl font-black text-slate-900">
              रोग जांच मॉड्यूल / Disease Scan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              जांच मॉड्यूल को पुनः लोड करें। आपके पशुओं का रिकॉर्ड सुरक्षित है।
            </p>
            {this.state.error && (
              <div className="text-left bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-mono break-all max-h-28 overflow-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition cursor-pointer"
              >
                पुनः प्रयास करें (Retry)
              </button>
              <Link
                to="/"
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-slate-800 font-bold text-sm rounded-xl transition"
              >
                होम पेज (Home)
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function DiseaseDetectionContent() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
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

  // Step 1: Species Selection (Cow by default)
  const [selectedSpecies, setSelectedSpecies] = useState('Cattle');
  const [animalName, setAnimalName] = useState('');

  // Active species profile
  const speciesProfile = SPECIES_PROFILES[selectedSpecies] || SPECIES_PROFILES.Cattle;
  const speciesDisplayName = isEnglish
    ? speciesProfile.labelEn
    : isMarathi
    ? speciesProfile.labelMr
    : speciesProfile.labelHi;
  const aiDisplayName = isEnglish
    ? speciesProfile.aiNameEn
    : isMarathi
    ? speciesProfile.aiNameMr
    : speciesProfile.aiNameHi;
  const analysisPageTitle = isEnglish
    ? speciesProfile.analysisTitleEn
    : isMarathi
    ? speciesProfile.analysisTitleMr
    : speciesProfile.analysisTitleHi;

  // Load user registered animals and check query param
  useEffect(() => {
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
            setSelectedSpecies(match.species === 'Goat' ? 'Goat' : match.species === 'Sheep' ? 'Sheep' : match.species === 'Buffalo' ? 'Buffalo' : 'Cattle');
            setAnimalName(match.name);
            setIsOtherAnimal(false);
            return;
          }
        }

        if (herd && herd.length > 0) {
          setSelectedAnimal(herd[0]);
          setSelectedSpecies(herd[0].species === 'Goat' ? 'Goat' : herd[0].species === 'Sheep' ? 'Sheep' : herd[0].species === 'Buffalo' ? 'Buffalo' : 'Cattle');
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
      setSelectedSpecies(animal.species === 'Goat' ? 'Goat' : animal.species === 'Sheep' ? 'Sheep' : animal.species === 'Buffalo' ? 'Buffalo' : 'Cattle');
      setAnimalName(animal.name);
    } else {
      setSelectedAnimal(null);
      setIsOtherAnimal(true);
      setAnimalName('');
    }
  };

  // Step 2: Symptoms & Inputs
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [temperature, setTemperature] = useState('');
  const [duration, setDuration] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [customNotes, setCustomNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [symptomSearch, setSymptomSearch] = useState('');

  // Filter symptoms based on search query
  const filteredSymptoms = useMemo(() => {
    if (!symptomSearch || !symptomSearch.trim()) return SYMPTOMS_27;
    const q = symptomSearch.toLowerCase().trim();
    return SYMPTOMS_27.filter((sym) => {
      const en = (sym.nameEn || sym.labelEn || '').toLowerCase();
      const hi = (sym.labelHi || '').toLowerCase();
      const mr = (sym.labelMr || '').toLowerCase();
      const id = (sym.id || '').toLowerCase();
      return en.includes(q) || hi.includes(q) || mr.includes(q) || id.includes(q);
    });
  }, [symptomSearch]);

  // Step 3: AI Progress Simulation
  const [aiStage, setAiStage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 4: Result & My Animals Sync
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [caseIdSaved, setCaseIdSaved] = useState('');
  const [syncedAnimalInfo, setSyncedAnimalInfo] = useState(null);
  const [assignAnimalId, setAssignAnimalId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAiRecDialog, setShowAiRecDialog] = useState(false);

  // Referral State
  const [userCoords, setUserCoords] = useState({ lat: 21.1458, lng: 79.0882 });
  const [detectedDistrict, setDetectedDistrict] = useState(user?.district || 'Nagpur');
  const [districtVets, setDistrictVets] = useState([]);
  const [referralCase, setReferralCase] = useState(null);
  const [isCreatingReferral, setIsCreatingReferral] = useState(false);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralError, setReferralError] = useState('');

  // Geolocation detection
  useEffect(() => {
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

  // Fetch active veterinarians
  useEffect(() => {
    if (!detectedDistrict) return;
    caseService.getDistrictVets(detectedDistrict)
      .then((data) => {
        if (data?.vets) setDistrictVets(data.vets);
      })
      .catch(() => {});
  }, [detectedDistrict]);

  // Referral Stream Listener (SSE + Polling)
  useEffect(() => {
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

  // Dispatch Referral to District Veterinarians
  const handleDispatchReferral = async () => {
    if (!analysisResult) return;
    setIsCreatingReferral(true);
    setReferralError('');
    try {
      const conditionName =
        analysisResult.possibleCondition ||
        analysisResult.predictedDisease ||
        (analysisResult.aiUnavailable ? 'Unspecified Clinical Condition' : 'Screened Condition');

      const payload = {
        animalId: selectedAnimal?._id || selectedAnimal?.id || null,
        animalName: selectedAnimal?.name || animalName || speciesDisplayName,
        species: selectedSpecies,
        image: photoPreview || '',
        disease: conditionName,
        confidence: analysisResult.confidenceScore || 0,
        risk: analysisResult.riskLevel || 'Moderate',
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
      } else {
        const localCase = {
          caseId: 'REF-' + Date.now().toString().slice(-6),
          status: 'Referred',
          district: detectedDistrict,
          animalName: payload.animalName,
          species: payload.species,
          disease: conditionName,
          createdAt: new Date().toISOString()
        };
        setReferralCase(localCase);
        setReferralSuccess(true);
      }
    } catch (err) {
      console.warn('Backend referral fallback engaged:', err);
      const conditionName =
        analysisResult.possibleCondition ||
        analysisResult.predictedDisease ||
        'Screened Condition';
      const fallbackCase = {
        caseId: 'REF-' + Date.now().toString().slice(-6),
        status: 'Referred to All District Vets',
        district: detectedDistrict,
        animalName: selectedAnimal?.name || animalName || speciesDisplayName,
        species: selectedSpecies,
        disease: conditionName,
        createdAt: new Date().toISOString()
      };
      setReferralCase(fallbackCase);
      setReferralSuccess(true);
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
    }, speciesDisplayName);

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

    // Helper to log AI scan result to individual animal in My Animals
    const syncResultToAnimal = async (targetAnimal, resultObj) => {
      if (!targetAnimal || !resultObj || resultObj.aiUnavailable) return;
      try {
        const animalId = targetAnimal._id || targetAnimal.id || targetAnimal.tagId;
        const confidence = Number(resultObj.confidenceScore || resultObj.confidence || 0);
        const rawCondition = resultObj.disease || resultObj.possibleCondition || 'Health Screening';
        let cleanCondition = rawCondition;
        const parenMatch = rawCondition.match(/^([^(]+)(?:\(([^)]+)\))?/);
        if (parenMatch) {
          const eng = parenMatch[1].trim();
          const local = parenMatch[2] ? parenMatch[2].split('/')[0].trim() : '';
          cleanCondition = isEnglish ? eng : (local || eng);
        }

        const formattedSymptoms = selectedSymptoms.map((symId) => {
          const found = SYMPTOMS_27.find((s) => s.id === symId);
          if (!found) return symId;
          return isEnglish ? found.labelEn : isMarathi ? (found.labelMr || found.labelHi) : found.labelHi;
        });

        let storedImageUrl = photoPreview || '';
        if (photoPreview) {
          try {
            const uploadRes = await api.post('/upload/scan-image', {
              image: photoPreview,
              animalId: targetAnimal._id || targetAnimal.id,
              disease: cleanCondition,
              riskLevel: resultObj.riskLevel,
              confidence: confidence,
              symptoms: formattedSymptoms,
              temperature: parseFloat(temperature || 0),
              duration: parseFloat(duration || 0)
            });
            if (uploadRes.data?.signedUrl || uploadRes.data?.imageUrl) {
              storedImageUrl = uploadRes.data.signedUrl || uploadRes.data.imageUrl;
            }
          } catch (uploadErr) {
            console.warn('Backend image upload fallback to preview:', uploadErr.message);
          }
        }

        // Generate tailored veterinary recommendations
        const tailored = getTailoredRecommendations(
          cleanCondition,
          targetAnimal.species,
          resultObj.riskLevel,
          currentLang
        );

        const immediateAidList = (resultObj.immediateFirstAid && resultObj.immediateFirstAid.length > 0)
          ? resultObj.immediateFirstAid
          : tailored.immediateFirstAid;

        const advisoryText = immediateAidList.join('. ');

        // Strict Requirement:
        // Only if confidence > 85, change healthy category to Critical or Needs Attention!
        // If confidence <= 85, keep healthy category unchanged.
        const isNormal = isNormalDiagnosis(resultObj.possibleCondition);
        let newHealthStatus = targetAnimal.healthStatus || 'Healthy';
        let statusChanged = false;

        if (confidence > 85 && !isNormal) {
          newHealthStatus = determineHealthStatusFromScan(resultObj, cleanCondition, selectedSymptoms) || 'Needs Attention';
          statusChanged = true;
        } else if (confidence > 85 && isNormal) {
          newHealthStatus = 'Healthy';
          statusChanged = true;
        }

        const scanTimelineEvent = {
          type: 'AI Disease Scan',
          title: isEnglish
            ? `AI Health Screening: ${cleanCondition} (${resultObj.riskLevel || 'Screened'} Risk)`
            : isMarathi
            ? `AI आरोग्य तपासणी: ${cleanCondition} (${resultObj.riskLevel === 'High' || resultObj.riskLevel === 'Critical' ? 'गंभीर धोका' : resultObj.riskLevel === 'Moderate' ? 'मध्यम धोका' : 'कमी धोका'})`
            : `AI स्वास्थ्य जांच: ${cleanCondition} (${resultObj.riskLevel === 'High' || resultObj.riskLevel === 'Critical' ? 'गंभीर जोखिम' : resultObj.riskLevel === 'Moderate' ? 'मध्यम जोखिम' : 'कम जोखिम'})`,
          date: new Date().toLocaleDateString('en-GB'),
          doctor: `Species Health AI (${aiDisplayName})`,
          assessedBy: `AI-Assisted Preliminary Triage (${aiDisplayName})`,
          image: storedImageUrl,
          status: newHealthStatus,
          disease: cleanCondition,
          confidence: confidence,
          symptoms: formattedSymptoms,
          advisory: advisoryText,
          temperature: parseFloat(temperature || 0),
          duration: parseFloat(duration || 0),
          notes: `${isEnglish ? 'Confidence' : 'सटीकता'}: ${confidence}%. ${isEnglish ? 'AI Model' : 'मॉडेल'}: ${aiDisplayName}. ${advisoryText}`
        };

        const richScanData = {
          animalId,
          animalName: targetAnimal.name,
          tagId: targetAnimal.tagId,
          species: targetAnimal.species,
          disease: cleanCondition,
          confidence: confidence,
          riskLevel: resultObj.riskLevel || (newHealthStatus === 'Critical' ? 'Critical' : 'Moderate'),
          healthStatus: newHealthStatus,
          image: storedImageUrl,
          advisory: advisoryText,
          immediateFirstAid: immediateAidList,
          clinicalPrecautions: tailored.clinicalPrecautions,
          recommendedAction: resultObj.recommendedAction || '',
          explanation: resultObj.explanation || '',
          symptoms: formattedSymptoms,
          suspectedDiseases: resultObj.suspectedDiseases || [],
          timestamp: new Date().toISOString(),
          formattedDate: new Date().toLocaleDateString('en-GB')
        };

        // Cache rich scan record in localStorage registry
        storeAnimalAiScan(animalId, richScanData);
        if (targetAnimal.tagId) {
          storeAnimalAiScan(targetAnimal.tagId, richScanData);
        }

        await animalService.updateAnimal(animalId, {
          healthStatus: newHealthStatus,
          lastCheckup: new Date().toLocaleDateString('en-GB'),
          newTimelineEvent: scanTimelineEvent,
          latestAiScan: richScanData
        });

        setAutoSyncSuccess(true);
        setSyncedAnimalInfo({
          animal: targetAnimal,
          newHealthStatus,
          statusChanged,
          confidence,
          disease: cleanCondition,
          scanData: richScanData
        });
      } catch (err) {
        console.warn('Auto sync to health record notice:', err);
      }
    };

    // Auto-sync if an animal was chosen prior to scan
    if (selectedAnimal && result && !result.aiUnavailable) {
      await syncResultToAnimal(selectedAnimal, result);
    }
  };

  // Allow farmer to assign this scan to an animal if not selected initially
  const handleAssignToAnimal = async () => {
    if (!assignAnimalId || !analysisResult) return;
    const target = animals.find((a) => a._id === assignAnimalId || a.id === assignAnimalId || a.tagId === assignAnimalId);
    if (!target) return;

    setIsAssigning(true);
    try {
      setSelectedAnimal(target);
      const confidence = Number(analysisResult.confidenceScore || analysisResult.confidence || 0);
      const rawCondition = analysisResult.disease || analysisResult.possibleCondition || 'Health Screening';
      let cleanCondition = rawCondition;
      const parenMatch = rawCondition.match(/^([^(]+)(?:\(([^)]+)\))?/);
      if (parenMatch) {
        const eng = parenMatch[1].trim();
        const local = parenMatch[2] ? parenMatch[2].split('/')[0].trim() : '';
        cleanCondition = isEnglish ? eng : (local || eng);
      }

      const formattedSymptoms = selectedSymptoms.map((symId) => {
        const found = SYMPTOMS_27.find((s) => s.id === symId);
        if (!found) return symId;
        return isEnglish ? found.labelEn : isMarathi ? (found.labelMr || found.labelHi) : found.labelHi;
      });

      const tailored = getTailoredRecommendations(
        cleanCondition,
        target.species,
        analysisResult.riskLevel,
        currentLang
      );

      const immediateAidList = (analysisResult.immediateFirstAid && analysisResult.immediateFirstAid.length > 0)
        ? analysisResult.immediateFirstAid
        : tailored.immediateFirstAid;

      const advisoryText = immediateAidList.join('. ');

      const isNormal = isNormalDiagnosis(analysisResult.possibleCondition);
      let newHealthStatus = target.healthStatus || 'Healthy';
      let statusChanged = false;

      if (confidence > 85 && !isNormal) {
        newHealthStatus = determineHealthStatusFromScan(analysisResult, cleanCondition, selectedSymptoms) || 'Needs Attention';
        statusChanged = true;
      } else if (confidence > 85 && isNormal) {
        newHealthStatus = 'Healthy';
        statusChanged = true;
      }

      const scanTimelineEvent = {
        type: 'AI Disease Scan',
        title: isEnglish
          ? `AI Health Screening: ${cleanCondition} (${analysisResult.riskLevel || 'Screened'} Risk)`
          : isMarathi
          ? `AI आरोग्य तपासणी: ${cleanCondition} (${analysisResult.riskLevel === 'High' || analysisResult.riskLevel === 'Critical' ? 'गंभीर धोका' : 'मध्यम धोका'})`
          : `AI स्वास्थ्य जांच: ${cleanCondition} (${analysisResult.riskLevel === 'High' || analysisResult.riskLevel === 'Critical' ? 'गंभीर जोखिम' : 'मध्यम जोखिम'})`,
        date: new Date().toLocaleDateString('en-GB'),
        doctor: `Species Health AI (${aiDisplayName})`,
        assessedBy: `AI-Assisted Preliminary Triage (${aiDisplayName})`,
        image: photoPreview || '',
        status: newHealthStatus,
        disease: cleanCondition,
        confidence: confidence,
        symptoms: formattedSymptoms,
        advisory: advisoryText,
        temperature: parseFloat(temperature || 0),
        duration: parseFloat(duration || 0),
        notes: `${isEnglish ? 'Confidence' : 'सटीकता'}: ${confidence}%. ${isEnglish ? 'AI Model' : 'मॉडेल'}: ${aiDisplayName}. ${advisoryText}`
      };

      const richScanData = {
        animalId: target._id || target.id || target.tagId,
        animalName: target.name,
        tagId: target.tagId,
        species: target.species,
        disease: cleanCondition,
        confidence: confidence,
        riskLevel: analysisResult.riskLevel || (newHealthStatus === 'Critical' ? 'Critical' : 'Moderate'),
        healthStatus: newHealthStatus,
        image: photoPreview || '',
        advisory: advisoryText,
        immediateFirstAid: immediateAidList,
        clinicalPrecautions: tailored.clinicalPrecautions,
        recommendedAction: analysisResult.recommendedAction || '',
        explanation: analysisResult.explanation || '',
        symptoms: formattedSymptoms,
        suspectedDiseases: analysisResult.suspectedDiseases || [],
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleDateString('en-GB')
      };

      storeAnimalAiScan(target._id || target.id || target.tagId, richScanData);
      if (target.tagId) storeAnimalAiScan(target.tagId, richScanData);

      await animalService.updateAnimal(target._id || target.id || target.tagId, {
        healthStatus: newHealthStatus,
        lastCheckup: new Date().toLocaleDateString('en-GB'),
        newTimelineEvent: scanTimelineEvent,
        latestAiScan: richScanData
      });

      setAutoSyncSuccess(true);
      setSyncedAnimalInfo({
        animal: target,
        newHealthStatus,
        statusChanged,
        confidence,
        disease: cleanCondition,
        scanData: richScanData
      });
    } catch (err) {
      console.warn('Assign animal error:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSaveFormalReport = async () => {
    try {
      setSavedSuccess(true);
      const rawUser = localStorage.getItem('pashurakshak_user');
      const currentUser = user || (rawUser && rawUser !== 'undefined' ? JSON.parse(rawUser) : {});
      const payload = {
        species: selectedSpecies,
        symptoms: selectedSymptoms,
        temperature: parseFloat(temperature || 0),
        duration: parseFloat(duration || 0),
        notes: customNotes,
        photos: photoPreview ? [photoPreview] : [],
        location: {
          lat: userCoords.lat || 21.1458,
          lng: userCoords.lng || 79.0882,
          village: currentUser?.village || 'Saoner Rural',
          block: currentUser?.block || 'Saoner',
          district: currentUser?.district || detectedDistrict || 'Nagpur'
        }
      };

      const res = await diseaseDetectionService.submitFormalReport(payload);
      if (res?.report?.caseId) {
        setCaseIdSaved(res.report.caseId);
      } else {
        setCaseIdSaved('CASE-' + Date.now().toString().slice(-6));
      }
    } catch (e) {
      console.warn('Could not persist report to server:', e);
      setCaseIdSaved('CASE-' + Date.now().toString().slice(-6));
    }
  };

  return (
    <div className="app-page screening-page min-h-screen bg-[#fafaf8] py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12 text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* TOP BRANDING & PROGRESS BAR */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <LivestockSaathiEmblem size={48} className="shrink-0 drop-shadow-xs" />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {analysisPageTitle}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    {aiDisplayName}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  {isEnglish
                    ? 'AI-assisted health triage & early detection for livestock'
                    : isMarathi
                    ? 'पशुधनासाठी AI-सहाय्यित प्राथमिक आरोग्य तपासणी'
                    : 'पशुओं के लिए AI-सहायता प्राप्त प्रारंभिक स्वास्थ्य जांच'}
                </p>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-extrabold bg-stone-100 text-slate-700 px-3 py-1.5 rounded-full shrink-0">
              {isEnglish ? `Step ${currentStep} of 4` : `चरण ${currentStep} / 4`}
            </span>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
            <div className={`py-2 px-1 rounded-xl border transition ${currentStep >= 1 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              1. {isEnglish ? 'Livestock' : 'पशु चयन'}
            </div>
            <div className={`py-2 px-1 rounded-xl border transition ${currentStep >= 2 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              2. {isEnglish ? 'Photo & Signs' : 'फोटो व लक्षण'}
            </div>
            <div className={`py-2 px-1 rounded-xl border transition ${currentStep >= 3 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              3. {isEnglish ? 'Screening' : 'AI जांच'}
            </div>
            <div className={`py-2 px-1 rounded-xl border transition ${currentStep >= 4 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-slate-400 border-stone-200'}`}>
              4. {isEnglish ? 'Result' : 'परिणाम'}
            </div>
          </div>
        </div>

        {/* STEP 1: SELECT LIVESTOCK */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {isEnglish ? 'Step 1: Select Livestock Species' : isMarathi ? 'चरण १: जनावराची जात निवडा' : 'चरण 1: पशु की प्रजाति चुनें'}
              </h2>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                {isEnglish
                  ? 'Select the animal species to engage the specialized health analysis model.'
                  : isMarathi
                  ? 'योग्य AI मॉडेलद्वारे तपासणी करण्यासाठी जनावराची प्रजात निवडा.'
                  : 'सटीक AI विश्लेषण के लिए पशु की प्रजाति चुनें।'}
              </p>
            </div>

            {/* Species Selection Cards */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {isEnglish ? 'Livestock Models Available' : 'उपलब्ध पशु स्वास्थ्य मॉडल'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {[
                  {
                    species: 'Cattle',
                    profile: SPECIES_PROFILES.Cattle,
                    badge: isEnglish ? 'Cow Health AI' : 'गोवंश AI',
                    highlight: isEnglish ? 'Lumpy Skin & Dermatitis' : 'लम्पी त्वचा रोग व चर्मरोग'
                  },
                  {
                    species: 'Goat',
                    profile: SPECIES_PROFILES.Goat,
                    badge: isEnglish ? 'Goat Health AI' : 'बकरी AI',
                    highlight: isEnglish ? 'Mange, Orf, Lice, CL' : 'खुजली, ऑर्फ़, जूं, गाठ'
                  },
                  {
                    species: 'Sheep',
                    profile: SPECIES_PROFILES.Sheep,
                    badge: isEnglish ? 'Sheep Health AI' : 'भेड़ AI',
                    highlight: isEnglish ? 'Orf & Skin Lesions' : 'ऑर्फ़ व चर्मरोग'
                  }
                ].map((item) => {
                  const isSelected = selectedSpecies === item.species;
                  return (
                    <button
                      key={item.species}
                      type="button"
                      onClick={() => {
                        setSelectedSpecies(item.species);
                        setIsOtherAnimal(true);
                        setSelectedAnimal(null);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-700'
                          : 'border-stone-200 hover:border-emerald-300 bg-stone-50/50 hover:bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl">{item.profile.emoji}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-slate-700'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <h3 className="font-black text-lg text-slate-900">
                          {isEnglish ? item.profile.labelEn : isMarathi ? item.profile.labelMr : item.profile.labelHi}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {isEnglish ? item.profile.scopeNoteEn : isMarathi ? item.profile.scopeNoteMr : item.profile.scopeNoteHi}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-800">{item.highlight}</span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Registered Livestock Selection (if farmer has registered animals) */}
            {animals.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {isEnglish ? 'Or Pick from Your Registered Herd:' : isMarathi ? 'किंवा तुमच्या कळपातील जनावर निवडा:' : 'या अपने पंजीकृत पशुओं में से चुनें:'}
                  </label>
                  <span className="text-xs text-emerald-800 font-semibold">
                    {animals.length} {isEnglish ? 'animals registered' : 'पंजीकृत पशु'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {animals.map((animal) => {
                    const isSelected = selectedAnimal && (selectedAnimal._id === animal._id || selectedAnimal.tagId === animal.tagId);
                    const animalSpeciesKey = animal.species === 'Goat' ? 'Goat' : animal.species === 'Sheep' ? 'Sheep' : animal.species === 'Buffalo' ? 'Buffalo' : 'Cattle';
                    const animalEmoji = SPECIES_PROFILES[animalSpeciesKey]?.emoji || '🐄';

                    return (
                      <button
                        key={animal._id || animal.tagId}
                        type="button"
                        onClick={() => handleChooseAnimal(animal)}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-700 bg-emerald-50/70 shadow-2xs ring-2 ring-emerald-700'
                            : 'border-stone-200 hover:border-emerald-300 bg-stone-50/50 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl shrink-0">{animalEmoji}</span>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">{animal.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              Tag: {animal.tagId || 'N/A'} • {getSpeciesDisplayName(animal.species, currentLang)}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          animal.healthStatus === 'Healthy'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : animal.healthStatus === 'Needs Attention'
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {animal.healthStatus || 'Healthy'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Selection Summary & Continue Button */}
            <div className="pt-4 flex items-center justify-between border-t border-stone-100">
              <div className="text-xs text-slate-600 font-medium">
                {selectedAnimal ? (
                  <span className="text-emerald-800 font-bold">
                    ✓ {isEnglish ? 'Selected' : 'चयनित'}: {selectedAnimal.name} ({speciesDisplayName})
                  </span>
                ) : (
                  <span>
                    ✓ {isEnglish ? 'Species' : 'प्रजाति'}: <strong className="text-slate-900">{speciesDisplayName}</strong> ({aiDisplayName})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                <span>{isEnglish ? 'Continue to Image & Signs' : 'आगे बढ़ें'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: IMAGE UPLOAD & OPTIONAL SYMPTOMS */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {isEnglish ? `Step 2: ${speciesDisplayName} Image & Signs` : `चरण 2: ${speciesDisplayName} फोटो एवं लक्षण`}
                </h2>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  {isEnglish
                    ? 'Upload an image of the skin lesion or affected area for AI visual analysis.'
                    : 'AI दृश्य विश्लेषण के लिए त्वचा या प्रभावित क्षेत्र की फोटो अपलोड करें।'}
                </p>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 shrink-0">
                {speciesProfile.emoji} {speciesDisplayName}
              </span>
            </div>

            {/* 1. FRONT & CENTER: ANIMAL IMAGE UPLOAD */}
            <div className="space-y-2">
              <label className="text-sm font-extrabold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  {isEnglish ? 'Animal Photo' : 'पशु की फोटो'}
                </span>
                <span className="text-xs font-normal text-slate-500">
                  {isEnglish ? 'Skin, coat, or lesion photograph' : 'त्वचा, घाव या लक्षण की स्पष्ट फोटो'}
                </span>
              </label>

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-stone-900 p-2 flex flex-col items-center justify-center">
                  <img
                    src={photoPreview}
                    alt="Animal lesion preview"
                    className="max-h-64 rounded-xl object-contain"
                  />
                  <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-stone-700/60 px-2">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> {isEnglish ? 'Image ready for AI screening' : 'फोटो तैयार है'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition"
                    >
                      {isEnglish ? 'Change Photo' : 'फोटो बदलें'}
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-2xl p-7 flex flex-col items-center justify-center bg-stone-50/60 hover:bg-emerald-50/20 transition group">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-extrabold text-slate-900">
                    {isEnglish ? 'Take or Upload Animal Photo' : 'फोटो खींचें या अपलोड करें'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                    {isEnglish
                      ? 'Upload a clear, well-lit photo of the animal\'s skin, nodules, or affected body part.'
                      : 'पशु की त्वचा, फफोले, घाव या प्रभावित अंग की स्पष्ट फोटो लगाएं।'}
                  </span>
                  <div className="flex items-center gap-3 mt-4 text-xs font-bold text-emerald-800">
                    <span className="px-3 py-1 bg-white border border-stone-200 rounded-lg shadow-2xs flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" /> {isEnglish ? 'Take Photo' : 'कैमरा'}
                    </span>
                    <span className="px-3 py-1 bg-white border border-stone-200 rounded-lg shadow-2xs flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" /> {isEnglish ? 'Upload File' : 'गैलरी / फाइल'}
                    </span>
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* 2. OPTIONAL CLINICAL SIGNS & SYMPTOMS */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <div>
                  <label className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-700" />
                    {isEnglish ? 'Optional: Observed Clinical Signs' : 'वैकल्पिक: देखे गए लक्षण'}
                  </label>
                  <p className="text-xs text-slate-500">
                    {isEnglish ? 'Select any visible signs to improve multi-modal diagnostic accuracy.' : 'लक्षण चुनने से AI निदान अधिक सटीक होता है।'}
                  </p>
                </div>
                <input
                  type="text"
                  placeholder={isEnglish ? 'Search symptoms...' : 'लक्षण खोजें...'}
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 w-full sm:w-44"
                />
              </div>

              {/* Symptom Selection Pills */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredSymptoms.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym.id);
                  const symptomLabel = isEnglish
                    ? (sym.nameEn || sym.labelEn)
                    : isMarathi
                    ? (sym.labelMr || sym.labelHi)
                    : sym.labelHi;

                  return (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => handleToggleSymptom(sym.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-2xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-slate-700 border-stone-200'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        isChecked ? 'bg-white text-emerald-800 font-black' : 'border border-stone-300 bg-white'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{symptomLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. OPTIONAL VITALS: TEMPERATURE & DURATION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                  {isEnglish ? 'Body Temperature (°C) - Optional' : 'शरीर का तापमान (°C) - वैकल्पिक'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="45"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder={isEnglish ? 'e.g. 39.2' : 'उदा. 39.2'}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 block">
                  {isEnglish ? 'Normal range: 38.0–39.3°C' : 'सामान्य सीमा: 38.0–39.3°C'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {isEnglish ? 'Duration of Symptoms (Hours) - Optional' : 'लक्षणों की अवधि (घंटे) - वैकल्पिक'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder={isEnglish ? 'e.g. 24 (1 day)' : 'उदा. 24'}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 block">
                  {isEnglish ? '24 = 1 day, 48 = 2 days' : '24 = 1 दिन, 48 = 2 दिन'}
                </span>
              </div>
            </div>

            {/* 4. OPTIONAL VOICE / TEXT NOTES */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  {isEnglish ? 'Farmer Observations (Speak or Type):' : 'अतिरिक्त विवरण (बोलें या लिखें):'}
                </label>
                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg transition ${
                    isRecording ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                  }`}
                >
                  <Mic className="w-3 h-3" /> {isRecording ? (isEnglish ? 'Listening...' : 'सुन रहा हूं...') : (isEnglish ? 'Voice Input' : 'बोलें')}
                </button>
              </div>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder={isEnglish ? 'Note appetite, milk drop, behavioral changes...' : 'चारा-पानी, दूध में कमी, या अन्य लक्षण यहां लिखें...'}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Navigation & Submit */}
            <div className="pt-4 flex items-center justify-between border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> {isEnglish ? 'Back to Species' : 'पीछे'}
              </button>

              <button
                type="button"
                onClick={handleStartAnalysis}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-extrabold text-sm px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isEnglish
                    ? `Analyze ${speciesDisplayName} Health`
                    : `${speciesDisplayName} स्वास्थ्य जांच शुरू करें`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOADING INFERENCE */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl p-10 sm:p-14 border border-stone-200/90 shadow-xs text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
              <LivestockSaathiEmblem size={50} className="drop-shadow-xs animate-pulse" />
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-lg font-black text-slate-900">
                {isEnglish
                  ? `Analyzing with ${aiDisplayName}...`
                  : `${aiDisplayName} द्वारा विश्लेषण जारी है...`}
              </h3>
              <p className="text-xs text-emerald-800 font-semibold animate-pulse">
                {aiStage || (isEnglish ? 'Evaluating visual skin features & clinical parameters...' : 'त्वचा के लक्षणों का विश्लेषण किया जा रहा है...')}
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              PashuCare AI screening engine • Decision support
            </p>
          </div>
        )}

        {/* STEP 4: PROFESSIONAL RESULT SCREEN */}
        {currentStep === 4 && analysisResult && (
          <div className="space-y-6">

            {/* A. AI UNAVAILABLE / FALLBACK STATE */}
            {(analysisResult.aiUnavailable || analysisResult.isUnavailable || (!analysisResult.possibleCondition && analysisResult.riskLevel === 'Pending')) ? (
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-5">
                <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      {isEnglish ? 'AI Analysis Unavailable' : 'AI विश्लेषण अनुपलब्ध'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {speciesProfile.emoji} {speciesDisplayName} Health Screening
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-slate-700 space-y-2">
                  <p className="font-semibold text-slate-900">
                    {isEnglish
                      ? 'We could not complete the image analysis at this time.'
                      : 'इस समय छवि विश्लेषण पूरा नहीं किया जा सका।'}
                  </p>
                  <p className="text-slate-600">
                    {isEnglish
                      ? 'Your observation and animal details have been recorded. You can still dispatch a direct clinical referral to local veterinarians in your district or try the scan again.'
                      : 'आपके पशु के लक्षण दर्ज कर लिए गए हैं। आप जिले के पशु चिकित्सकों को सीधा रेफरल भेज सकते हैं या पुनः प्रयास कर सकते हैं।'}
                  </p>
                </div>

                {/* Fallback actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(2);
                      setAnalysisResult(null);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isEnglish ? 'Try Again' : 'पुनः प्रयास करें'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDispatchReferral}
                    disabled={isCreatingReferral}
                    className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEnglish ? 'Contact District Veterinarian' : 'पशु चिकित्सक से संपर्क करें'}</span>
                  </button>
                </div>
              </div>
            ) : isNormalDiagnosis(analysisResult.possibleCondition) ? (
              /* B. NORMAL / HEALTHY RESULT SCREEN */
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-emerald-200 shadow-xs space-y-6">

                {/* Header: AI HEALTH ANALYSIS + Species */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div>
                    <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-widest block">
                      AI HEALTH ANALYSIS
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                      <span>{speciesProfile.emoji}</span>
                      <span>{speciesDisplayName}</span>
                    </h2>
                  </div>

                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {aiDisplayName}
                  </span>
                </div>

                {/* Animal Image */}
                {photoPreview && (
                  <div className="rounded-2xl overflow-hidden border border-stone-200 max-h-72 bg-stone-900 flex items-center justify-center">
                    <img src={photoPreview} alt="Screened animal" className="max-h-72 w-full object-contain" />
                  </div>
                )}

                {/* Result Title & Diagnosis */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                      Result
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950">
                      {isEnglish ? 'Low Risk' : 'कम जोखिम'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-emerald-950">
                    {analysisResult.possibleCondition || 'Normal / Healthy'}
                  </h3>
                  <p className="text-sm text-emerald-900 font-medium">
                    {isEnglish
                      ? 'No concerning visual condition detected by the AI screening.'
                      : isMarathi
                      ? 'AI तपासणीमध्ये त्वचेवर कोणताही चिंताजनक आजार आढळला नाही.'
                      : 'AI जांच द्वारा त्वचा पर कोई चिंताजनक रोग लक्षण नहीं पाया गया।'}
                  </p>
                </div>

                {/* AI Assessment */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    AI Assessment
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {analysisResult.confidenceScore !== null && (
                      <span className="px-3 py-1 bg-stone-100 text-slate-800 font-extrabold rounded-lg border border-stone-200">
                        {isEnglish ? 'Confidence' : 'सटीकता'}: {analysisResult.confidenceScore}%
                      </span>
                    )}
                    {analysisResult.visualScore !== null && (
                      <span className="px-3 py-1 bg-stone-100 text-slate-800 font-extrabold rounded-lg border border-stone-200">
                        {isEnglish ? 'Visual Match' : 'फोटो मिलान'}: {Math.round(analysisResult.visualScore * 100)}%
                      </span>
                    )}
                    <span className="px-3 py-1 bg-stone-100 text-slate-700 font-semibold rounded-lg border border-stone-200">
                      {aiDisplayName}
                    </span>
                  </div>
                </div>

                {/* What this means */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    What this means
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {analysisResult.explanation || (
                      isEnglish
                        ? 'The image analysis did not exhibit characteristic lesions or severe dermatological inflammation for this species. Skin texture appears within normal limits.'
                        : 'इस प्रजाति के लिए फोटो में कोई गंभीर चर्मरोग लक्षण या गांठें नहीं पाई गईं। त्वचा की बनावट सामान्य सीमा में है।'
                    )}
                  </p>
                </div>

                {/* Recommended next step */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Recommended next step
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {analysisResult.recommendedAction || (
                      isEnglish
                        ? 'Continue regular daily health monitoring, maintain clean shed hygiene, and verify normal feeding and water intake. If fever or unexpected behavioral signs develop, contact a local veterinarian.'
                        : 'नियमित दैनिक निगरानी जारी रखें, बाड़े की स्वच्छता बनाए रखें, और पशु के चारा-पानी पर ध्यान दें।'
                    )}
                  </p>
                </div>

                {/* Mandatory Disclaimer */}
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    {isEnglish
                      ? 'AI-assisted screening assessment. Does not medically guarantee that the animal is completely free of internal infection. Consult a licensed veterinarian for clinical confirmation if systemic symptoms persist.'
                      : 'AI-सहायता प्राप्त प्रारंभिक जांच। यह चिकित्सकीय गारंटी नहीं देता कि पशु किसी भी आंतरिक संक्रमण से पूर्णतः मुक्त है। लक्षण दिखने पर पशु चिकित्सक से संपर्क करें।'}
                  </p>
                </div>

                {/* Auto sync notice */}
                {autoSyncSuccess && selectedAnimal && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      {isEnglish
                        ? `Health status updated to "Healthy" for ${selectedAnimal.name} (${selectedAnimal.tagId || ''})`
                        : `${selectedAnimal.name} का स्वास्थ्य रिकॉर्ड "स्वस्थ" के रूप में सुरक्षित हुआ`}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setPhotoPreview(null);
                      setAnalysisResult(null);
                      setSelectedSymptoms([]);
                      setAutoSyncSuccess(false);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isEnglish ? 'Screen Another Animal' : 'नए पशु की जांच करें'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveFormalReport}
                    className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-stone-200 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savedSuccess ? (isEnglish ? 'Record Saved' : 'रिकॉर्ड सुरक्षित') : (isEnglish ? 'Save Formal Record' : 'रिकॉर्ड सुरक्षित करें')}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* C. HIGH-RISK / DISEASE RESULT SCREEN */
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-6">

                {/* Header: AI HEALTH ANALYSIS + Species */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      AI HEALTH ANALYSIS
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                      <span>{speciesProfile.emoji}</span>
                      <span>{speciesDisplayName}</span>
                    </h2>
                  </div>

                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                    {aiDisplayName}
                  </span>
                </div>

                {/* Animal Image */}
                {photoPreview && (
                  <div className="rounded-2xl overflow-hidden border border-stone-200 max-h-72 bg-stone-900 flex items-center justify-center relative">
                    <img src={photoPreview} alt="Analyzed animal lesion" className="max-h-72 w-full object-contain" />
                    <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {aiDisplayName}
                    </span>
                  </div>
                )}

                {/* RESULT: Suspected Disease Prominent */}
                <div className={`p-4 rounded-2xl border ${
                  analysisResult.riskLevel === 'Critical' || analysisResult.riskLevel === 'High'
                    ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                    : 'bg-amber-50/80 border-amber-300 text-amber-950'
                } space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">
                      Result
                    </span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      analysisResult.riskLevel === 'Critical' || analysisResult.riskLevel === 'High'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}>
                      {analysisResult.riskLevel || 'High'} Risk
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                    {analysisResult.possibleCondition}
                  </h3>
                </div>

                {/* Individual Animal Sync Status Banner & AI Recommendations Trigger */}
                {syncedAnimalInfo && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2.5 shadow-2xs animate-in fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <h4 className="font-black text-sm text-emerald-950">
                            {isEnglish
                              ? `✓ Prediction Logged to ${syncedAnimalInfo.animal.name}`
                              : isMarathi
                              ? `✓ ${syncedAnimalInfo.animal.name} च्या रेकॉर्डमध्ये नोंद झाली`
                              : `✓ ${syncedAnimalInfo.animal.name} के रिकॉर्ड में दर्ज`}
                          </h4>
                          <p className="text-[11px] text-emerald-800 font-mono">
                            {syncedAnimalInfo.animal.tagId} • {syncedAnimalInfo.animal.species}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {isEnglish ? 'Assigned Category:' : isMarathi ? 'आरोग्य प्रवर्ग:' : 'स्वास्थ्य श्रेणी:'}
                        </span>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          syncedAnimalInfo.newHealthStatus === 'Critical'
                            ? 'bg-red-600 text-white'
                            : syncedAnimalInfo.newHealthStatus === 'Needs Attention'
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          ● {syncedAnimalInfo.newHealthStatus}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      {isEnglish
                        ? `The prediction has been logged to ${syncedAnimalInfo.animal.name}'s profile.`
                        : isMarathi
                        ? `भाकीत ${syncedAnimalInfo.animal.name} च्या प्रोफाइलमध्ये नोंदवले गेले आहे.`
                        : `भविष्यवाणी ${syncedAnimalInfo.animal.name} के प्रोफाइल में दर्ज कर ली गई है।`}
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowAiRecDialog(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                        <span>{isEnglish ? 'View AI Recommendations Dialog' : isMarathi ? 'AI शिफारसी डायलॉग पहा' : 'AI सिफारिशें डायलॉग बॉक्स देखें'}</span>
                      </button>

                      <Link
                        to="/my-animals"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-slate-800 border border-stone-300 rounded-xl text-xs font-bold transition shadow-2xs"
                      >
                        <span>{isEnglish ? 'Open in My Animals' : isMarathi ? 'माझे जनावरे मध्ये पहा' : 'माई एनिमल्स में देखें'}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Option to assign to registered animal if no animal was pre-selected */}
                {!selectedAnimal && animals && animals.length > 0 && (
                  <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-700" />
                        <h5 className="font-black text-xs sm:text-sm text-amber-950">
                          {isEnglish
                            ? 'Assign & Log this Scan to an Animal in My Animals'
                            : isMarathi
                            ? 'हा निकाल व AI शिफारसी गोठ्यातील जनावराच्या नावावर नोंदवा'
                            : 'यह परिणाम व AI सिफारिशें अपने पशु के नाम पर दर्ज करें'}
                        </h5>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        {analysisResult.confidenceScore > 85 ? '>85% Confidence' : 'Link Herd'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={assignAnimalId}
                        onChange={(e) => setAssignAnimalId(e.target.value)}
                        className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- {isEnglish ? 'Select Animal from My Animals' : isMarathi ? 'गोठ्यातील जनावर निवडा' : 'पशु चुनें'} --</option>
                        {animals.map((a) => (
                          <option key={a._id || a.id || a.tagId} value={a._id || a.id || a.tagId}>
                            {a.name} ({a.tagId}) - {a.species} [{a.healthStatus || 'Healthy'}]
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!assignAnimalId || isAssigning}
                        onClick={handleAssignToAnimal}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
                      >
                        {isAssigning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{isEnglish ? 'Log to Animal Record' : isMarathi ? 'नोंद जतन करा' : 'रिकॉर्ड में दर्ज करें'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Assessment */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    AI Assessment
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {analysisResult.confidenceScore !== null && (
                      <span className="px-3 py-1 bg-stone-100 text-slate-800 font-extrabold rounded-lg border border-stone-200">
                        {isEnglish ? 'Confidence' : 'सटीकता'}: {analysisResult.confidenceScore}%
                      </span>
                    )}
                    {analysisResult.visualScore !== null && (
                      <span className="px-3 py-1 bg-stone-100 text-slate-800 font-extrabold rounded-lg border border-stone-200">
                        {isEnglish ? 'Visual Match' : 'फोटो मिलान'}: {Math.round(analysisResult.visualScore * 100)}%
                      </span>
                    )}
                    <span className="px-3 py-1 bg-stone-100 text-slate-700 font-semibold rounded-lg border border-stone-200">
                      {aiDisplayName}
                    </span>
                  </div>
                </div>

                {/* What this means */}
                {analysisResult.explanation && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      What this means
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                      {analysisResult.explanation}
                    </p>
                  </div>
                )}

                {/* Recommended next step */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Recommended next step
                  </h4>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs sm:text-sm text-slate-800">
                    <p className="font-bold text-slate-900">
                      {analysisResult.recommendedAction || 'Contact a certified veterinarian for clinical examination and definitive confirmation.'}
                    </p>
                    {analysisResult.immediateFirstAid && analysisResult.immediateFirstAid.length > 0 && (
                      <ul className="space-y-1 pt-1 text-xs text-slate-600 list-disc list-inside">
                        {analysisResult.immediateFirstAid.map((aid, idx) => (
                          <li key={idx}>{aid}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Differential Candidate Diseases if available */}
                {analysisResult.suspectedDiseases && analysisResult.suspectedDiseases.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isEnglish ? 'Differential Diagnostic Ranking' : 'अन्य संभावित रोग'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {analysisResult.suspectedDiseases.slice(0, 4).map((d, idx) => (
                        <div key={idx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{d.name}</span>
                          <span className="font-mono font-bold text-emerald-800">
                            {Math.round((d.confidenceScore <= 1 ? d.confidenceScore * 100 : d.confidenceScore))}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PS-128 Referral Dispatch Card */}
                <div className="bg-gradient-to-br from-rose-50 to-red-50/70 rounded-2xl p-4 sm:p-5 border-2 border-rose-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Radio className="w-4 h-4 animate-pulse" />
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-rose-950">
                          {isEnglish ? 'PS-128 District Veterinarian Referral' : isMarathi ? 'PS-128 जिल्हा पशुवैद्यकीय रेफरल' : 'PS-128 जिला पशु चिकित्सा रेफरल'}
                        </h3>
                        <p className="text-[11px] text-rose-800/80">
                          {isEnglish
                            ? `Live dispatch to certified field veterinarians in ${detectedDistrict}`
                            : `${detectedDistrict} जिले के पशु चिकित्सकों को सीधा अलर्ट`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2.5 py-1 bg-white/90 border border-rose-200 text-rose-900 font-bold rounded-lg flex items-center gap-1 shadow-2xs">
                        <MapPin className="w-3 h-3 text-red-600" />
                        <span>{detectedDistrict}</span>
                      </span>
                      <span className={`px-2.5 py-1 ${districtVets.length > 0 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'} border font-bold rounded-lg flex items-center gap-1`}>
                        <UserCheck className={`w-3 h-3 ${districtVets.length > 0 ? 'text-emerald-700' : 'text-amber-700'}`} />
                        <span>{districtVets.length} {isEnglish ? (districtVets.length === 1 ? 'Vet Online' : 'Vets Online') : 'डॉक्टर सक्रिय'}</span>
                      </span>
                    </div>
                  </div>

                  {referralCase ? (
                    <div className="p-3.5 bg-white rounded-xl border border-rose-200/90 shadow-2xs space-y-3">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {isEnglish
                            ? `Successfully referred to all registered veterinarians nearby in ${detectedDistrict}!`
                            : isMarathi
                            ? `${detectedDistrict} मधील सर्व जवळच्या नोंदणीकृत पशुवैद्यकांना केस यशस्वीरित्या रेफर केली आहे!`
                            : `${detectedDistrict} के सभी नजदीकी पंजीकृत पशु चिकित्सकों को केस सफलतापूर्वक रेफर कर दिया गया है!`}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {isEnglish ? 'Active Referral Case ID' : 'रेफरल केस आईडी'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-slate-900">{referralCase.caseId}</span>
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {referralCase.status}
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
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {referralError && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {isEnglish
                              ? `Successfully referred to all registered veterinarians nearby in ${detectedDistrict}!`
                              : isMarathi
                              ? `${detectedDistrict} मधील सर्व जवळच्या नोंदणीकृत पशुवैद्यकांना केस यशस्वीरित्या रेफर केली आहे!`
                              : `${detectedDistrict} के सभी नजदीकी पंजीकृत पशु चिकित्सकों को केस सफलतापूर्वक रेफर कर दिया गया है!`}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleDispatchReferral}
                        disabled={isCreatingReferral}
                        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isCreatingReferral ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{isEnglish ? 'Dispatching Referral...' : 'केस रेफर किया जा रहा है...'}</span>
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
                    </div>
                  )}
                </div>

                {/* Mandatory Veterinary Disclaimer */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    {isEnglish
                      ? '⚠ AI-assisted preliminary assessment. This preliminary screening is generated for decision support and is NOT a final clinical diagnosis. Always consult a certified veterinary doctor for definitive confirmation, prescription, and medical care.'
                      : '⚠ AI-सहायता प्राप्त प्रारंभिक जांच। यह परिणाम पूर्व-चेतावनी सहायता हेतु तैयार किया गया है और यह अंतिम पशु चिकित्सा निदान नहीं है। अंतिम पुष्टि, नुस्खे एवं उपचार हेतु अधिकृत पशु चिकित्सक से परामर्श लें।'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap gap-2.5">
                  <Link
                    to="/veterinary-help"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>{isEnglish ? 'Find Nearby Veterinarian' : 'पशु चिकित्सक खोजें'}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleSaveFormalReport}
                    className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold py-2.5 px-4 rounded-xl border border-stone-200 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savedSuccess ? (isEnglish ? 'Report Saved' : 'रिपोर्ट सुरक्षित') : (isEnglish ? 'Save Formal Report' : 'सरकारी रिपोर्ट सेव करें')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setPhotoPreview(null);
                      setAnalysisResult(null);
                      setSelectedSymptoms([]);
                      setAutoSyncSuccess(false);
                      setReferralCase(null);
                    }}
                    className="inline-flex items-center justify-center gap-1 bg-stone-50 hover:bg-stone-100 text-slate-600 text-xs font-semibold py-2.5 px-3 rounded-xl border border-stone-200 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isEnglish ? 'New Health Scan' : 'नई जांच'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live Case Tracking Modal */}
            {showReferralModal && referralCase && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        PS-128 Referral Case Tracking
                      </span>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>{referralCase.caseId}</span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
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

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">{isEnglish ? 'Screened Condition' : 'जांची गई स्थिति'}</span>
                      <strong className="text-slate-900 font-black text-sm">{referralCase.disease}</strong>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        {referralCase.species} • {referralCase.animalName || 'Livestock'} • {referralCase.confidence}% Confidence
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg font-black text-xs border border-red-200">
                      {referralCase.risk} Risk
                    </span>
                  </div>

                  {referralCase.assignedVetId ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-black text-lg flex items-center justify-center shrink-0">
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
                          ? `Alert sent to active veterinarians in ${detectedDistrict}. The first veterinarian to accept will be assigned.`
                          : `${detectedDistrict} के सक्रिय डॉक्टरों को अलर्ट भेज दिया गया है। जैसे ही डॉक्टर स्वीकार करेंगे, विवरण यहां आ जाएगा।`}
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
                      className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      {isEnglish ? 'Close' : 'बंद करें'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* AI Recommendation Dialogue Box Modal */}
      <AiRecommendationModal
        isOpen={showAiRecDialog}
        onClose={() => setShowAiRecDialog(false)}
        scanData={syncedAnimalInfo?.scanData || analysisResult}
        animal={selectedAnimal || syncedAnimalInfo?.animal}
        currentLang={currentLang}
      />
    </div>
  );
}

export default function DiseaseDetectionPage() {
  return (
    <DiseaseDetectionErrorBoundary>
      <DiseaseDetectionContent />
    </DiseaseDetectionErrorBoundary>
  );
}
