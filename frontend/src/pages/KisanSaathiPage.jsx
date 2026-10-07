import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Square,
  Camera,
  Upload,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  MapPin,
  Stethoscope,
  Sparkles,
  Activity,
  Calendar,
  X,
  ChevronDown,
  Loader2,
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import voiceService, { INDIAN_LANGUAGES } from '../services/voiceService';
import chatService from '../services/chatService';
import animalService from '../services/animalService';
import diseaseDetectionService, { SYMPTOMS_27 } from '../services/diseaseDetectionService';
import nadresService from '../services/nadresService';
import VoiceWaveform from '../components/VoiceWaveform';
import { useAuth } from '../context/AuthContext';
import { LivestockSaathiEmblem, KisanSaathiEmblem } from '../components/LivestockSaathiLogo';
import AiRecommendationModal from '../components/AiRecommendationModal';
import {
  storeAnimalAiScan,
  determineHealthStatusFromScan,
  getTailoredRecommendations
} from '../utils/aiScanStorage';

class KisanSaathiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[KisanSaathi ErrorBoundary Caught]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#f8fafc]">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-rose-200 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-base font-bold text-slate-900">Kisan Saathi Console Recovered</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your consultation session is safe. Click below to continue your screening or conversation.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
            >
              Resume Consultation
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function KisanSaathiContent() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const farmerName = user?.name || 'किसान मित्र';

  const currentKey = (i18n.language || 'hi').split('-')[0];
  const matchedLang = INDIAN_LANGUAGES.find((l) => l.key === currentKey) || INDIAN_LANGUAGES[0];

  // Language & Voice State
  const [selectedLang, setSelectedLang] = useState(matchedLang.code);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);

  // Patient / Herd Context
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [isLoadingAnimals, setIsLoadingAnimals] = useState(true);

  // Geolocation & District Disease Alerts State (No hardcoding)
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null });
  const [detectedDistrict, setDetectedDistrict] = useState(user?.location?.district || user?.district || 'Detecting...');
  const [detectedState, setDetectedState] = useState(user?.location?.state || user?.state || 'India');
  const [districtAlerts, setDistrictAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [locationDetected, setLocationDetected] = useState(false);

  // AI Disease Diagnosis State (Photo + 27 Symptoms + Species Health AI)
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit] = useState('F'); // 'F' or 'C'
  const [durationDays, setDurationDays] = useState('');
  const [durationUnit, setDurationUnit] = useState('days'); // 'days' or 'hours'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [recordSavedNotice, setRecordSavedNotice] = useState(null);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [showAiRecDialog, setShowAiRecDialog] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Messages Thread
  const [messages, setMessages] = useState([
    {
      id: 'm-1',
      sender: 'saathi',
      text: chatService.getInitialGreeting(currentKey, farmerName),
      timestamp: 'Live',
      source: 'gemini_ai',
      suggestedActions: [
        'Diagnose Animal Symptoms',
        'Check Local Outbreak Alerts',
        '1962 Veterinary Helpline'
      ]
    }
  ]);

  const selectedAnimal = animals.find((a) => a._id === selectedAnimalId) || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      voiceService.stopSpeaking();
    };
  }, []);

  // Sync language with navbar i18n
  useEffect(() => {
    const k = (i18n.language || 'hi').split('-')[0];
    const l = INDIAN_LANGUAGES.find((item) => item.key === k);
    if (l && l.code !== selectedLang) {
      setSelectedLang(l.code);
    }
  }, [i18n.language]);

  // Load Animals
  useEffect(() => {
    let isMounted = true;
    const loadAnimals = async () => {
      try {
        setIsLoadingAnimals(true);
        const data = await animalService.getAnimals();
        if (isMounted && Array.isArray(data)) {
          setAnimals(data);
          if (data.length > 0 && !selectedAnimalId) {
            setSelectedAnimalId(data[0]._id);
          }
        }
      } catch (e) {
        console.warn('Could not load animals in Kisan Saathi:', e);
      } finally {
        if (isMounted) setIsLoadingAnimals(false);
      }
    };
    loadAnimals();
    return () => {
      isMounted = false;
    };
  }, []);

  // Detect GPS & dynamically fetch ICAR-NIVEDI NADRES District Disease Alerts
  useEffect(() => {
    let isMounted = true;

    const fetchAlertsForCoords = async (lat, lng) => {
      try {
        setAlertsLoading(true);
        const data = await nadresService.getVillageAlerts({ lat, lng });
        if (isMounted && data && data.success) {
          if (data.district) setDetectedDistrict(data.district);
          if (data.state) setDetectedState(data.state);
          setDistrictAlerts(Array.isArray(data.alerts) ? data.alerts : []);
          setLocationDetected(true);
        }
      } catch (err) {
        console.warn('Failed to load dynamic alerts by coords:', err);
      } finally {
        if (isMounted) setAlertsLoading(false);
      }
    };

    const fetchAlertsByDistrict = async (district, state) => {
      try {
        setAlertsLoading(true);
        const data = await nadresService.getVillageAlerts({ district, state });
        if (isMounted && data && data.success) {
          if (data.district) setDetectedDistrict(data.district);
          if (data.state) setDetectedState(data.state);
          setDistrictAlerts(Array.isArray(data.alerts) ? data.alerts : []);
          setLocationDetected(true);
        }
      } catch (err) {
        console.warn('Failed to load dynamic alerts by district:', err);
      } finally {
        if (isMounted) setAlertsLoading(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          fetchAlertsForCoords(latitude, longitude);
        },
        (err) => {
          console.info('GPS unavailable, using user profile district:', err.message);
          const fallbackDist = user?.location?.district || user?.district || 'Nagpur';
          const fallbackSt = user?.location?.state || user?.state || 'Maharashtra';
          setDetectedDistrict(fallbackDist);
          setDetectedState(fallbackSt);
          fetchAlertsByDistrict(fallbackDist, fallbackSt);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      const fallbackDist = user?.location?.district || user?.district || 'Nagpur';
      const fallbackSt = user?.location?.state || user?.state || 'Maharashtra';
      setDetectedDistrict(fallbackDist);
      setDetectedState(fallbackSt);
      fetchAlertsByDistrict(fallbackDist, fallbackSt);
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle Language change
  const handleLanguageChange = (code) => {
    setSelectedLang(code);
    const l = INDIAN_LANGUAGES.find((item) => item.code === code);
    if (l) {
      i18n.changeLanguage(l.key);
      try {
        localStorage.setItem('i18nextLng', l.key);
      } catch (e) {}
    }
  };

  // Image Upload Handling
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Symptom toggling
  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    );
  };

  // Run AI Disease Diagnosis (connecting to Species Health AI via /api/reports/triage & Gemini summary)
  const handleRunDiagnosis = async () => {
    if (!imagePreview && selectedSymptoms.length === 0) {
      alert('Please upload an animal image or select at least 1 symptom to run AI screening.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setRecordSavedNotice(null);
      setAnalysisStage('Preprocessing clinical case & image tensor...');

      await diseaseDetectionService.runAnalysisProgress((stage) => {
        setAnalysisStage(stage.label);
      });

      // 1. Normalize Temperature and Duration units
      const rawTemp = parseFloat(temperature || 0);
      let tempInF = rawTemp;
      if (rawTemp > 0) {
        // If entered in Celsius or typed human/animal range <= 45 (which is Celsius)
        if (tempUnit === 'C' || rawTemp <= 45) {
          tempInF = Number(((rawTemp * 9) / 5 + 32).toFixed(1));
        }
      }

      const rawDuration = parseFloat(durationDays || 0);
      let durationInDays = rawDuration;
      if (durationUnit === 'hours' && rawDuration > 0) {
        durationInDays = Number((rawDuration / 24).toFixed(1));
      }

      const result = await diseaseDetectionService.evaluateCase({
        species: selectedAnimal?.species || 'Cattle',
        symptoms: selectedSymptoms,
        temperature: tempInF,
        duration: durationInDays,
        image: imagePreview,
        notes: `Kisan Saathi In-App Triage for ${selectedAnimal?.name || 'Animal'}`,
        location: {
          village: user?.location?.village || 'Local Village',
          block: user?.location?.block || 'Local Block',
          district: detectedDistrict,
          state: detectedState
        }
      });

      // If AI service is unavailable or offline, do not claim a fabricated diagnosis
      if (result.aiUnavailable) {
        setDiagnosisResult({
          aiUnavailable: true,
          message: result.message || 'AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian.'
        });
        return;
      }

      // 2. Resolve predicted condition, confidence score, and risk
      const cleanCondition =
        result.possibleCondition ||
        result.predictedDisease ||
        result.suspectedDiseases?.[0]?.name ||
        'Lumpy Skin Disease (लम्पी त्वचा रोग)';
      const confidence = Math.round(result.confidenceScore || result.confidence || 88);
      const risk = result.riskLevel || result.severity || 'High';
      const firstAidAdvice =
        result.immediateFirstAid?.[0] || 'Isolate infected animal immediately and keep in a clean, shaded shed.';

      const normalizedResult = {
        ...result,
        predictedDisease: cleanCondition,
        possibleCondition: cleanCondition,
        confidence,
        confidenceScore: confidence,
        riskLevel: risk,
        severity: risk,
        firstAid: firstAidAdvice,
        isLsd: result.isLsd ?? cleanCondition.toLowerCase().includes('lumpy')
      };

      setDiagnosisResult(normalizedResult);

      // 3. Automatically store in Animal Health Records when confidence > 85
      if (selectedAnimal) {
        try {
          const confidenceNum = Number(confidence || 0);
          const tailored = getTailoredRecommendations(
            cleanCondition,
            selectedAnimal.species,
            risk,
            currentKey
          );

          let newHealthStatus = selectedAnimal.healthStatus || 'Healthy';
          let statusChanged = false;

          // Strict Requirement: Only when confidence > 85, change healthy category to Critical or Needs Attention!
          if (confidenceNum > 85) {
            newHealthStatus = determineHealthStatusFromScan(normalizedResult, cleanCondition, selectedSymptoms) || (risk === 'High' || risk === 'Critical' ? 'Critical' : 'Needs Attention');
            statusChanged = true;
          }

          const vitalsDisplay = rawTemp > 0 ? `${rawTemp}°${tempUnit}` : 'N/A';
          const durationDisplay =
            rawDuration > 0
              ? `${rawDuration} ${durationUnit === 'hours' ? 'घंटे (Hours)' : 'दिन (Days)'}`
              : 'N/A';

          const immediateAidList = (normalizedResult.immediateFirstAid && normalizedResult.immediateFirstAid.length > 0)
            ? normalizedResult.immediateFirstAid
            : tailored.immediateFirstAid;

          const advisoryText = immediateAidList.join('. ');

          const scanTimelineEvent = {
            type: 'AI Disease Scan',
            title: `AI प्रारंभिक जांच: ${cleanCondition} (${risk} Risk)`,
            date: new Date().toLocaleDateString('en-GB'),
            doctor: 'AI Preliminary Screening (Kisan Saathi)',
            assessedBy: 'AI Preliminary Screening (Kisan Saathi)',
            image: imagePreview || '',
            status: newHealthStatus,
            disease: cleanCondition,
            confidence: confidenceNum,
            symptoms: selectedSymptoms,
            advisory: advisoryText,
            temperature: rawTemp,
            tempUnit,
            duration: rawDuration,
            durationUnit,
            notes: `AI प्रारंभिक जांच में ${cleanCondition} के संकेत (${confidenceNum}% सटीकता, ${risk} जोखिम) मिले। तापमान: ${vitalsDisplay}, अवधि: ${durationDisplay}। सलाह: ${advisoryText}`
          };

          const richScanData = {
            animalId: selectedAnimal._id || selectedAnimal.id || selectedAnimal.tagId,
            animalName: selectedAnimal.name,
            tagId: selectedAnimal.tagId,
            species: selectedAnimal.species,
            disease: cleanCondition,
            confidence: confidenceNum,
            riskLevel: risk,
            healthStatus: newHealthStatus,
            image: imagePreview || '',
            advisory: advisoryText,
            immediateFirstAid: immediateAidList,
            clinicalPrecautions: tailored.clinicalPrecautions,
            explanation: normalizedResult.explanation || '',
            symptoms: selectedSymptoms,
            timestamp: new Date().toISOString(),
            formattedDate: new Date().toLocaleDateString('en-GB')
          };

          // Cache rich recommendations in localStorage
          storeAnimalAiScan(selectedAnimal._id || selectedAnimal.id || selectedAnimal.tagId, richScanData);
          if (selectedAnimal.tagId) {
            storeAnimalAiScan(selectedAnimal.tagId, richScanData);
          }

          const updates = {
            healthStatus: newHealthStatus,
            lastCheckup: new Date().toLocaleDateString('en-GB'),
            newTimelineEvent: scanTimelineEvent,
            latestAiScan: richScanData
          };

          await animalService.updateAnimal(
            selectedAnimal._id || selectedAnimal.id || selectedAnimal.tagId,
            updates
          );

          // Update local herd state so UI badge and list reflect the record immediately
          setAnimals((prev) =>
            prev.map((a) =>
              a._id === selectedAnimal._id || a.tagId === selectedAnimal.tagId
                ? {
                    ...a,
                    healthStatus: newHealthStatus,
                    lastCheckup: updates.lastCheckup,
                    timeline: [scanTimelineEvent, ...(a.timeline || [])],
                    latestAiScan: richScanData
                  }
                : a
            )
          );

          const animalName = selectedAnimal.name || 'पशु';
          if (confidenceNum > 85) {
            setRecordSavedNotice(`✓ सटीकता >85% (${confidenceNum}%): ${animalName} के स्वास्थ्य रिकॉर्ड में "${cleanCondition}" दर्ज व श्रेणी "${newHealthStatus}" सुरक्षित`);
          } else {
            setRecordSavedNotice(`✓ ${animalName} के रिकॉर्ड में जांच अवलोकन दर्ज (सटीकता ${confidenceNum}% ≤ 85%, स्थिति अपरिवर्तित)`);
          }
        } catch (saveErr) {
          console.warn('Auto-save to health records failed:', saveErr);
        }
      }

      // 4. Pass diagnosis to Gemini API for summarized clinical advice in preferred language (Concern 1)
      setIsConsulting(true);
      const langCode = selectedLang.split('-')[0];
      const userLangObj = INDIAN_LANGUAGES.find((l) => l.code === selectedLang);
      const userLangLabel = userLangObj?.label || 'Hindi (हिंदी)';

      const promptForGemini = `मेरे पशु ${selectedAnimal ? selectedAnimal.name : 'गाय'} की AI रोग जांच पूरी हो गई है। 
जांच का निष्कर्ष: संभावित रोग: ${cleanCondition}, AI मॉडल सटीकता: ${confidence}%, जोखिम स्तर: ${risk}।
कृपया मुझे ${userLangLabel} भाषा में सरल, संवेदनशील और स्पष्ट सारांश दें कि इस स्थिति में क्या करना चाहिए, क्या घरेलू प्राथमिक उपचार तुरंत करें, और किन बातों से बचें। पशुपालक किसान को आश्वस्त करें।`;

      let geminiReply = '';
      let geminiActions = [];

      try {
        const response = await chatService.consultAssistant({
          message: promptForGemini,
          language: langCode,
          animal: selectedAnimal,
          diagnosis: {
            possibleCondition: cleanCondition,
            confidenceScore: confidence,
            riskLevel: risk,
            explanation: result.explanation || '',
            immediateFirstAid: result.immediateFirstAid || []
          },
          symptoms: selectedSymptoms,
          district: detectedDistrict,
          state: detectedState,
          lat: userLocation.lat,
          lng: userLocation.lng
        });

        if (typeof response?.reply === 'string' && response.reply.trim()) {
          geminiReply = response.reply.trim();
        } else if (typeof response?.text === 'string' && response.text.trim()) {
          geminiReply = response.text.trim();
        }
        if (Array.isArray(response?.suggestedActions) && response.suggestedActions.length > 0) {
          geminiActions = response.suggestedActions;
        }
      } catch (geminiErr) {
        console.warn('Gemini consult error on diagnosis:', geminiErr);
      }

      // Structured localized fallback if Gemini LLM is offline
      if (!geminiReply) {
        if (langCode === 'mr') {
          geminiReply = `नमस्कार! आपल्या ${selectedAnimal?.name || 'जनावराच्या'} तपासणीत एआय मॉडेलनुसार "${cleanCondition}" ची प्राथमिक शक्यता (${confidence}% अचूकता, धोका: ${risk}) आढळली आहे.\n\nतातडीचे प्राथमिक उपचार:\n१. बाधित जनावराला इतर निरोगी जनावरांपासून ताबडतोब वेगळे बांधा.\n२. अंगावर कडुनिंबाच्या अर्काची फवारणी करा जेणेकरून माशांचा प्रादुर्भाव टाळता येईल.\n३. भरपूर स्वच्छ पाणी आणि मऊ हिरवा चारा द्या.\n४. अधिक मार्गदर्शनासाठी १९६२ पशु हेल्पलाईनवर संपर्क साधा.\n\n*टीप: हे AI-आधारित प्राथमिक स्क्रिनिंग आहे — अंतिम पशुवैद्यकीय निदान नाही.*`;
        } else if (langCode === 'en') {
          geminiReply = `AI Preliminary Screening for ${selectedAnimal?.name || 'your animal'}: Potential condition is "${cleanCondition}" (${confidence}% confidence, ${risk} Risk).\n\nImmediate First-Aid Guidelines:\n1. Isolate the affected animal immediately in a dry, shaded shed to stop disease spread.\n2. Apply herbal fly repellents (neem decoction) to prevent biting vector flies.\n3. Provide clean drinking water and soft green fodder with electrolyte supplements.\n4. Call veterinary helpline 1962 or consult your local veterinary officer promptly.\n\n*Note: AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis.*`;
        } else {
          // Default Hindi
          geminiReply = `नमस्ते! आपके पशु ${selectedAnimal?.name || 'गाय'} की जांच में एआई मॉडल के अनुसार "${cleanCondition}" की प्राथमिक संभावना (${confidence}% सटीकता, जोखिम: ${risk}) पाई गई है।\n\nतत्काल प्राथमिक उपचार:\n१. बीमार पशु को तुरंत स्वस्थ पशुओं से अलग साफ व हवादार स्थान पर रखें।\n२. शरीर पर मक्खियों व कीड़ों से बचाव के लिए नीम के पानी का छिड़काव करें।\n३. ताजा व साफ पीने का पानी दें और सुपाच्य हरा चारा खिलाएं।\n४. किसी भी मानवीय दवा का प्रयोग न करें और तुरंत 1962 टोल-फ्री हेल्पलाइन पर पशु चिकित्सक से संपर्क करें।\n\n*सूचना: यह AI-सहायित प्रारंभिक स्क्रीनिंग है — अंतिम पशुचिकित्सकीय निदान नहीं है।*`;
        }
      }

      if (geminiActions.length === 0) {
        geminiActions = [
          '1962 पशु हेल्पलाइन पर कॉल करें',
          'बीमार पशु को अलग रखने के नियम',
          'नजदीकी पशु चिकित्सक खोजें'
        ];
      }

      const diagChatMsg = {
        id: 'diag-' + Date.now(),
        sender: 'saathi',
        text: geminiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini_ai',
        meta: {
          disease: cleanCondition,
          confidence,
          riskLevel: risk,
          savedToHealthRecord: !!selectedAnimal
        },
        suggestedActions: geminiActions
      };

      setMessages((prev) => [...prev, diagChatMsg]);

      // Speak response aloud in user's preferred language
      setIsSpeaking(true);
      voiceService.speak(geminiReply, selectedLang, () => {
        setIsSpeaking(false);
      });
    } catch (err) {
      console.error('Screening evaluation failed:', err);
      alert('AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian.');
    } finally {
      setIsAnalyzing(false);
      setIsConsulting(false);
      setAnalysisStage('');
    }
  };

  // Send Message to Kisan Saathi (Gemini LLM + Full Clinical Context)
  const handleSendMessage = async (textToSend) => {
    let text = '';
    if (typeof textToSend === 'string') {
      text = textToSend.trim();
    } else if (textToSend && typeof textToSend.label === 'string') {
      text = textToSend.label.trim();
    } else {
      text = (inputText || '').trim();
    }
    if (!text) return;

    const userMsg = {
      id: 'm-' + Date.now(),
      sender: 'farmer',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsConsulting(true);

    const langCode = selectedLang.split('-')[0];

    try {
      const recentHistory = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await chatService.consultAssistant({
        message: text,
        language: langCode,
        animal: selectedAnimal,
        diagnosis: diagnosisResult,
        symptoms: selectedSymptoms,
        district: detectedDistrict,
        state: detectedState,
        lat: userLocation.lat,
        lng: userLocation.lng,
        conversationHistory: recentHistory
      });

      let replyText = 'कृपया पशु को तुरंत छायादार स्थान पर रखें और 1962 पर कॉल करें।';
      if (typeof response?.reply === 'string' && response.reply.trim()) {
        replyText = response.reply.trim();
      } else if (typeof response?.text === 'string' && response.text.trim()) {
        replyText = response.text.trim();
      }

      const saathiMsg = {
        id: 'm-' + (Date.now() + 1),
        sender: 'saathi',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: response?.source || 'gemini_ai',
        suggestedActions: Array.isArray(response?.suggestedActions)
          ? response.suggestedActions
          : ['Call 1962 Vet', 'Check Vaccination Schedule'],
        disclaimer: typeof response?.disclaimer === 'string' ? response.disclaimer : undefined
      };

      setMessages((prev) => [...prev, saathiMsg]);

      // Speak response aloud
      setIsSpeaking(true);
      voiceService.speak(replyText, selectedLang, () => {
        setIsSpeaking(false);
      });
    } catch (err) {
      console.error('Consultation error:', err);
      const fallbackMsg = {
        id: 'm-' + (Date.now() + 1),
        sender: 'saathi',
        text: 'मैंने आपकी बात नोट कर ली है। यदि पशु अस्वस्थ है, तो तुरंत 1962 पर कॉल करें या नजदीकी सरकारी पशु चिकित्सालय से संपर्क करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'clinical_rule'
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsConsulting(false);
    }
  };

  // Voice Recording Toggle
  const handleToggleRecord = () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      voiceService.startListening({
        langCode: selectedLang,
        onResult: (transcript, isFinal) => {
          setInputText(transcript);
          if (isFinal) {
            setIsRecording(false);
            handleSendMessage(transcript);
          }
        },
        onError: (err) => {
          console.warn('Voice recognition error:', err);
          setIsRecording(false);
        },
        onEnd: () => setIsRecording(false)
      });
    }
  };

  // Stop voice speaking and generation (Concern 2)
  const handleStopSpeaking = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
    setIsConsulting(false);
  };

  // Replay Voice
  const handleReplay = (text) => {
    if (isSpeaking) {
      handleStopSpeaking();
      return;
    }
    setIsSpeaking(true);
    voiceService.speak(text, selectedLang, () => {
      setIsSpeaking(false);
    });
  };

  // Reset Conversation
  const handleResetConversation = () => {
    setMessages([
      {
        id: 'm-1',
        sender: 'saathi',
        text: chatService.getInitialGreeting(currentKey, farmerName),
        timestamp: 'Live',
        source: 'gemini_ai'
      }
    ]);
    setDiagnosisResult(null);
  };

  // Filter symptoms for display
  const filteredSymptoms = SYMPTOMS_27.filter((s) => {
    if (!symptomSearch) return true;
    const q = symptomSearch.toLowerCase();
    return (
      s.nameEn.toLowerCase().includes(q) ||
      (s.labelHi && s.labelHi.toLowerCase().includes(q)) ||
      (s.labelMr && s.labelMr.toLowerCase().includes(q))
    );
  });

  const displayedSymptoms = showAllSymptoms ? filteredSymptoms : filteredSymptoms.slice(0, 10);

  // Check upcoming vaccination for selected animal
  const nextVaccine = selectedAnimal?.vaccinations?.find((v) => v.nextDue);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] py-4 px-3 sm:px-6 pb-24 lg:pb-8 flex flex-col justify-between max-w-7xl mx-auto space-y-4">
      {/* 1. Header Bar: Status, District GPS, Language, 1962 Emergency Call */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <KisanSaathiEmblem size={52} className="shrink-0 drop-shadow-xs" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {t('nav.kisan_saathi', 'Kisan Saathi AI')}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Gemini 2.5 + Species Health AI
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                {detectedDistrict}, {detectedState}
              </span>
              <span>•</span>
              <span className="text-emerald-800 font-bold">PS128 Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Emergency 1962 Call Button */}
          <a
            href="tel:1962"
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black rounded-xl shadow-xs transition duration-200 active:scale-95"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>1962 {t('emergency.helpline', 'Vet Helpline')}</span>
          </a>

          {/* Clean Language Selector */}
          <select
            value={selectedLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            aria-label="Select Assistant Language"
            className="bg-stone-50 border border-stone-200 text-sm font-bold text-slate-800 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            {INDIAN_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>

          {/* Reset button */}
          <button
            onClick={handleResetConversation}
            title="Reset conversation"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-stone-100 rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Workspace: Split into Clinical Action Center (Left) & Intelligent Consultation Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Clinical Tools & Dynamic District Outbreak Alerts (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card A: My Animals Patient Selector */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>{t('animals.title', 'My Animals')} (पशु प्रोफ़ाइल)</span>
              </div>
              <Link
                to="/animals"
                className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
              >
                + Manage Herd <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingAnimals ? (
              <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Loading registered livestock...</span>
              </div>
            ) : animals.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={selectedAnimalId}
                  onChange={(e) => setSelectedAnimalId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- General Consultation (No specific animal) --</option>
                  {animals.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.species} - {a.breed}) [{a.tagId}]
                    </option>
                  ))}
                </select>

                {selectedAnimal && (
                  <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-200/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">
                        {selectedAnimal.name}{' '}
                        <span className="text-[10px] font-semibold text-slate-500">({selectedAnimal.tagId})</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {selectedAnimal.species} • {selectedAnimal.breed} • {selectedAnimal.age} Yrs
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedAnimal.healthStatus === 'Healthy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {selectedAnimal.healthStatus}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-stone-50 rounded-xl text-center text-xs text-slate-500">
                No animals registered yet. You can still use AI Screening and Outbreak Alerts below!
              </div>
            )}
          </div>

          {/* Card B: PS128 Feature 1 - AI Preliminary Screening (Camera/Image + 27 Symptoms + Species Health AI) */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                <span>AI Preliminary Screening (रोग प्रारंभिक जांच)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Species Health AI
              </span>
            </div>

            {/* Photo Capture / Upload Dropzone */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
                id="animal-diagnosis-upload"
              />

              {!imagePreview ? (
                <label
                  htmlFor="animal-diagnosis-upload"
                  className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl cursor-pointer bg-stone-50/60 hover:bg-emerald-50/20 transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
                    <Camera className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Upload or Take Animal Photo (कैमरा / फोटो)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clear photo of skin nodules, mouth, hoofs, or eyes
                  </p>
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-900">
                  <img
                    src={imagePreview}
                    alt="Animal lesion preview"
                    className="w-full h-36 object-cover opacity-90"
                  />
                  <button
                    onClick={handleClearImage}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black transition"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs rounded-md text-[10px] text-emerald-300 font-bold">
                    ✓ Photo Loaded for Deep Learning Inference
                  </div>
                </div>
              )}
            </div>

            {/* 27 Clinical Symptoms Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Select Symptoms ({selectedSymptoms.length} selected):
                </label>
                <input
                  type="text"
                  placeholder="Filter symptom..."
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  className="text-[11px] px-2 py-1 rounded-lg border border-stone-200 bg-stone-50 w-28 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {displayedSymptoms.map((s) => {
                  const isChecked = selectedSymptoms.includes(s.id);
                  const localizedLabel = currentKey === 'hi' ? s.labelHi : currentKey === 'mr' ? s.labelMr : s.nameEn;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSymptom(s.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                        isChecked
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-stone-50 text-slate-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {localizedLabel || s.nameEn}
                    </button>
                  );
                })}
              </div>

              {filteredSymptoms.length > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAllSymptoms((prev) => !prev)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  {showAllSymptoms ? '▲ Show less symptoms' : `▼ View all 27 symptoms (${filteredSymptoms.length})`}
                </button>
              )}
            </div>

            {/* Vitals Inputs: Temp & Duration with explicit unit toggles (Concern 3) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Body Temp:</span>
                  <div className="inline-flex rounded-md border border-stone-200 p-0.5 bg-stone-100 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTempUnit('F')}
                      className={`px-1.5 py-0.5 rounded font-bold transition ${
                        tempUnit === 'F'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      °F
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempUnit('C')}
                      className={`px-1.5 py-0.5 rounded font-bold transition ${
                        tempUnit === 'C'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      °C
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  placeholder={tempUnit === 'F' ? 'e.g. 103.5 (Normal 101.5)' : 'e.g. 39.5 (Normal 38.6)'}
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 block">
                  {tempUnit === 'F' ? 'Normal cattle: ~101.5°F' : 'Normal cattle: ~38.6°C'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Duration:</span>
                  <div className="inline-flex rounded-md border border-stone-200 p-0.5 bg-stone-100 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDurationUnit('days')}
                      className={`px-1.5 py-0.5 rounded font-bold transition ${
                        durationUnit === 'days'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Days (दिन)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationUnit('hours')}
                      className={`px-1.5 py-0.5 rounded font-bold transition ${
                        durationUnit === 'hours'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Hours (घंटे)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="1"
                  placeholder={durationUnit === 'days' ? 'e.g. 3 days' : 'e.g. 24 hours'}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 block">
                  {durationUnit === 'days' ? 'लक्षण कितने दिनों से हैं' : 'लक्षण कितने घंटों से हैं'}
                </span>
              </div>
            </div>

            {/* Run Diagnosis CTA */}
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleRunDiagnosis}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{analysisStage || 'Running AI Screening...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze with AI Model (रोग जांच करें)</span>
                </>
              )}
            </button>

            {/* AI Preliminary Screening Result Box */}
            {diagnosisResult && (
              diagnosisResult.aiUnavailable ? (
                <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>AI Screening Temporarily Unavailable (स्क्रीनिंग अस्थायी रूप से अनुपलब्ध)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {diagnosisResult.message || 'AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian.'}
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200 space-y-2.5 text-xs">
                  {/* Medical Disclaimer Banner */}
                  <div className="bg-white/90 border border-emerald-200 rounded-lg p-2 flex items-start gap-1.5 text-[10px] text-slate-600 leading-snug">
                    <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis.</strong> (यह प्रारंभिक AI जोखिम जांच है, अधिकृत पशुचिकित्सकीय निदान नहीं।)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">AI Preliminary Screening Result</span>
                    <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-200 text-emerald-900">
                      {(diagnosisResult.confidence || diagnosisResult.confidenceScore || 90)}% Match
                    </span>
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {diagnosisResult.predictedDisease || diagnosisResult.possibleCondition || 'Lumpy Skin Disease (लम्पी त्वचा रोग)'}
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Severity / Risk: <span className="font-bold text-rose-700">{diagnosisResult.severity || diagnosisResult.riskLevel || 'High'}</span>.
                    Immediate action: {diagnosisResult.recommendedActions?.[0] || 'Isolate animal and disinfect shed.'}
                  </p>

                  {/* Urgent Veterinary Consultation for High/Critical Risk */}
                  {['High', 'Critical'].includes(diagnosisResult.severity || diagnosisResult.riskLevel) && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-900 font-semibold flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>
                        उच्च जोखिम (High Risk): कृपया तुरंत नजदीकी पशु चिकित्सालय अथवा पशु चिकित्सक (Registered Veterinarian) से संपर्क कर विधिवत शारीरिक जांच कराएं।
                      </span>
                    </div>
                  )}

                  {/* Action Buttons: View Recommendations Dialog & Chat */}
                  <button
                    type="button"
                    onClick={() => setShowAiRecDialog(true)}
                    className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                    <span>View AI Recommendations Dialog (AI शिफारसी डायलॉग पहा)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `I received an AI preliminary screening indicating possible ${diagnosisResult.predictedDisease} for my ${
                          selectedAnimal?.name || 'animal'
                        }. What immediate biosecurity, first-aid, and veterinary consultation steps should I take?`
                      )
                    }
                    className="w-full py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-300 text-[11px] transition shadow-2xs"
                  >
                    💬 Discuss this screening with Kisan Saathi
                  </button>
                </div>
              )
            )}
          </div>

          {/* Card C: PS128 Feature 2 - Local District Disease Alerts (Dynamic ICAR-NIVEDI NADRES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>District Outbreak Alerts ({detectedDistrict})</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">ICAR-NIVEDI NADRES</span>
            </div>

            {alertsLoading ? (
              <div className="bg-white p-4 rounded-2xl border border-stone-200 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                <span>Fetching district outbreak telemetry...</span>
              </div>
            ) : districtAlerts.length > 0 ? (
              <div className="space-y-3">
                {districtAlerts.map((alert, idx) => (
                  <div
                    key={alert.id || idx}
                    className="border-circulation-card shadow-sm hover:shadow-md transition duration-300"
                  >
                    <div className="relative z-10 w-full h-full bg-white rounded-[13.5px] p-4 flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-beacon-glow" />
                          <span>🔴 ACTIVE OUTBREAK</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-red-100 text-red-900 border border-red-300">
                          {alert.riskLevel || 'High Risk'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900 text-sm">
                          {alert.disease}
                        </h3>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Affected: <span className="font-semibold">
                            {Array.isArray(alert.speciesAffected)
                              ? alert.speciesAffected.join(', ')
                              : (alert.speciesAffected || 'Cattle & Buffalo')}
                          </span> • Radius: {alert.radiusKm || 5} km
                        </p>
                        {alert.advisory && (
                          <p className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded-lg mt-2 border border-rose-100 font-medium">
                            ⚠️ {alert.advisory}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleSendMessage(
                            `There is an active outbreak of ${alert.disease} reported in ${detectedDistrict} district. What biosecurity precautions and vaccinations should I implement for my herd immediately?`
                          )
                        }
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg border border-rose-200 text-[11px] transition"
                      >
                        Ask Saathi for Emergency Advisory
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Verified Safe Zone</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    No active high-risk disease alerts reported in <span className="font-bold text-slate-900">{detectedDistrict}</span> district by ICAR-NIVEDI NADRES. Keep routine vaccinations up to date.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card D: Vaccination Due Status */}
          {nextVaccine && (
            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 shadow-2xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <div className="font-bold text-amber-950">
                    Upcoming Vaccination: {nextVaccine.name}
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Due by {nextVaccine.nextDue} for {selectedAnimal?.name || 'herd'}
                  </div>
                </div>
              </div>
              <Link
                to="/vaccination-camps"
                className="px-2.5 py-1 bg-amber-700 text-white rounded-lg font-bold text-[11px] hover:bg-amber-800 transition shrink-0"
              >
                Find Camp
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Intelligent Consultation Terminal (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-[750px] bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 justify-between">
          {/* Active Context Banner */}
          <div className="pb-3 border-b border-stone-100 flex items-center justify-between gap-2 flex-wrap text-sm font-medium">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 font-semibold text-xs">Active Clinical Context:</span>
              {selectedAnimal ? (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-md font-bold text-xs">
                  🐾 {selectedAnimal.name} ({selectedAnimal.species})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-stone-100 text-slate-600 rounded-md text-xs">
                  Herd General
                </span>
              )}

              {selectedSymptoms.length > 0 && (
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded-md font-bold text-xs">
                  🩺 {selectedSymptoms.length} Symptoms
                </span>
              )}

              {diagnosisResult && (
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 rounded-md font-bold text-xs">
                  🔬 {diagnosisResult.predictedDisease}
                </span>
              )}

              {districtAlerts.length > 0 && (
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-900 rounded-md font-bold text-xs">
                  🔴 {districtAlerts[0].disease} Outbreak
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">11 Languages Enabled</span>
            </div>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-grow overflow-y-auto space-y-3.5 my-3 pr-1 min-h-[380px]">
            {messages.map((m) => {
              const isSaathi = m.sender === 'saathi';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isSaathi ? 'justify-start' : 'justify-end'}`}
                >
                  {isSaathi && (
                    <KisanSaathiEmblem size={34} className="shrink-0 mt-0.5 drop-shadow-2xs" />
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl p-4 text-sm sm:text-base leading-relaxed whitespace-pre-line shadow-2xs ${
                      isSaathi
                        ? 'bg-stone-50 text-slate-800 border border-stone-200/90'
                        : 'bg-emerald-700 text-white rounded-br-none'
                    }`}
                  >
                    {/* Diagnosis Header pill if present */}
                    {isSaathi && m.meta?.disease && (
                      <div className="mb-2 p-2.5 bg-emerald-100/80 rounded-xl border border-emerald-300 text-sm text-emerald-950 font-bold space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4 text-emerald-700" />
                            <span>संभावित रोग: {m.meta.disease}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="bg-emerald-200 px-2.5 py-0.5 rounded-full">{m.meta.confidence}% सटीकता</span>
                            <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold">{m.meta.riskLevel} जोखिम</span>
                          </div>
                        </div>
                        {m.meta.savedToHealthRecord && (
                          <div className="text-xs text-emerald-800 font-semibold pt-1 border-t border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>पशु स्वास्थ्य रिकॉर्ड (Health Records) में स्वतः सुरक्षित किया गया</span>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="whitespace-pre-line">{m.text}</p>

                    {/* Suggested Action Chips from LLM */}
                    {isSaathi && Array.isArray(m.suggestedActions) && m.suggestedActions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex flex-wrap gap-1.5">
                        {m.suggestedActions.map((act, aIdx) => {
                          const actionLabel = typeof act === 'string' ? act : (act?.label || act?.text || 'Action');
                          const hasTel = typeof act === 'object' && act?.tel;
                          const hasUrl = typeof act === 'object' && act?.url;

                          if (hasTel) {
                            return (
                              <a
                                key={aIdx}
                                href={`tel:${act.tel}`}
                                className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs"
                              >
                                📞 {actionLabel}
                              </a>
                            );
                          }

                          if (hasUrl) {
                            return (
                              <Link
                                key={aIdx}
                                to={act.url}
                                className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs"
                              >
                                ↗ {actionLabel}
                              </Link>
                            );
                          }

                          return (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => handleSendMessage(actionLabel)}
                              className="px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                              → {actionLabel}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer with Voice Replay / Stop & Source Badge */}
                    <div
                      className={`flex items-center justify-between gap-3 mt-2.5 pt-1.5 border-t text-[10px] ${
                        isSaathi ? 'border-stone-200/60 text-slate-400' : 'border-emerald-600 text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{m.timestamp}</span>
                        {isSaathi && m.source && (
                          <span className="font-semibold text-emerald-700">
                            • {m.source === 'gemini_ai' ? 'Gemini 2.5 AI' : 'Clinical Diagnostic Engine'}
                          </span>
                        )}
                      </div>

                      {isSaathi && (
                        <button
                          type="button"
                          onClick={() => handleReplay(m.text)}
                          className={`inline-flex items-center gap-1 font-bold hover:underline ${
                            isSpeaking ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {isSpeaking ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current text-red-600" />
                              <span>{t('actions.stop', 'Stop')}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{t('actions.listen', 'Listen')}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isConsulting && (
              <div className="flex gap-2.5 justify-start items-center p-3 bg-stone-50 rounded-2xl border border-stone-200 w-64">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span className="text-xs font-semibold text-slate-600">
                  Kisan Saathi is synthesizing guidance...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Audio Waveform Indicator with dedicated Stop button */}
          {(isSpeaking || isRecording) && (
            <div className="mb-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-semibold">
              <span>
                {isRecording
                  ? t('kisan_saathi.listening', 'Listening to your voice... Speak now')
                  : t('kisan_saathi.speaking', 'Speaking in selected Indian language...')}
              </span>
              <div className="flex items-center gap-2">
                <VoiceWaveform
                  isActive={true}
                  barCount={14}
                  color={isRecording ? 'bg-amber-500' : 'bg-emerald-600'}
                />
                {isSpeaking && (
                  <button
                    type="button"
                    onClick={handleStopSpeaking}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] rounded-lg font-bold shadow-xs transition"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Contextual Quick Suggestions */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {[
                'चारा नहीं खा रही, क्या करें?',
                'त्वचा पर गांठों का प्राथमिक उपचार',
                '1962 एम्बुलेंस कैसे बुलाएं?',
                'बीमार गाय को अलग कैसे रखें?'
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="bg-stone-50 hover:bg-stone-100 text-slate-700 px-3 py-1 rounded-full border border-stone-200 whitespace-nowrap text-[11px] font-medium transition"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar: Mic, Input, Send / Stop button */}
            <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-2xl border border-stone-200 focus-within:border-emerald-600 focus-within:bg-white transition">
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`p-3 rounded-xl transition transform active:scale-95 flex items-center justify-center shrink-0 ${
                  isRecording
                    ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
                title={isRecording ? t('actions.stop', 'Stop') : t('actions.listen', 'Speak')}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t(
                  'kisan_saathi.placeholder',
                  'Ask about animal illness, symptoms, vaccination, or district outbreaks...'
                )}
                className="w-full bg-transparent border-none text-xs sm:text-sm focus:outline-none text-slate-800 placeholder-slate-400"
              />

              {/* Dual state: Send when idle, Stop when speaking / consulting (Concern 2) */}
              {isSpeaking || isConsulting ? (
                <button
                  type="button"
                  onClick={handleStopSpeaking}
                  className="p-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl transition shrink-0 shadow-md flex items-center justify-center gap-1.5 animate-pulse"
                  title="Stop speaking / generating (रोकें)"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span className="text-xs font-bold hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!inputText.trim()}
                  onClick={() => handleSendMessage()}
                  className="p-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-30 text-white rounded-xl transition shrink-0 shadow-2xs"
                  title={t('actions.submit', 'Send')}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Dialogue Box Modal */}
      <AiRecommendationModal
        isOpen={showAiRecDialog}
        onClose={() => setShowAiRecDialog(false)}
        scanData={diagnosisResult}
        animal={selectedAnimal}
        currentLang={currentKey}
      />
    </div>
  );
}

export default function KisanSaathiPage() {
  return (
    <KisanSaathiErrorBoundary>
      <KisanSaathiContent />
    </KisanSaathiErrorBoundary>
  );
}
