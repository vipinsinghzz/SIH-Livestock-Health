import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Save,
  Sparkles,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Search,
  ShieldCheck,
  Tag,
  Building2,
  User,
  FileText,
  CheckCheck,
  RefreshCw,
  Bell,
  Info,
  PhoneCall,
  AlertOctagon,
  Stethoscope,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  VACCINE_REGISTRY,
  DOSE_NUMBER_OPTIONS,
  VACCINATION_CAMPS_PRESETS,
  calculateNextDueDate,
  getVaccineStatusInfo,
  getAIVaccineRecommendations
} from '../constants/vaccineData';
import animalService from '../services/animalService';
import {
  getCleanLang,
  getSpeciesDisplayName,
  getBreedDisplayName
} from '../constants/livestockData';
import { getImageUrl } from '../config/apiConfig';
import AiRecommendationModal from './AiRecommendationModal';
import { getAnimalAiScan, storeAnimalAiScan } from '../utils/aiScanStorage';


export const QUICK_SYMPTOMS = [
  // CRITICAL
  { id: 'fever', icon: '🌡️', en: 'High Fever', hi: 'तेज बुखार', mr: 'तीव्र ताप', severity: 'Critical' },
  { id: 'skin_nodules', icon: '🪢', en: 'Skin Nodules / Lumps', hi: 'त्वचा पर गांठें / लम्प्स', mr: 'त्वचेवर गाठी', severity: 'Critical' },
  { id: 'salivation', icon: '💧', en: 'Excessive Salivation', hi: 'मुंह से अधिक लार', mr: 'तोंडातून लाळ गळणे', severity: 'Critical' },

  // NEEDS ATTENTION
  { id: 'swelling', icon: '🩹', en: 'Swelling', hi: 'सूजन (Swelling)', mr: 'सूज (Swelling)', severity: 'Needs Attention' },
  { id: 'lethargy', icon: '🥱', en: 'Lethargy & Weakness', hi: 'सुस्ती व कमजोरी', mr: 'सुस्तपणा व अशक्तपणा', severity: 'Needs Attention' },
  { id: 'off_feed', icon: '🌾', en: 'Loss of Appetite', hi: 'चारा न खाना', mr: 'चारा न खाणे', severity: 'Needs Attention' },
  { id: 'lameness', icon: '🦶', en: 'Limping / Lameness', hi: 'लंगड़ाना', mr: 'लंगडणे', severity: 'Needs Attention' },
  { id: 'cough', icon: '🤧', en: 'Cough / Discharge', hi: 'खांसी व नाक बहना', mr: 'खोकला व नाक वाहणे', severity: 'Needs Attention' },
  { id: 'milk_drop', icon: '📉', en: 'Sudden Milk Drop', hi: 'दूध में अचानक कमी', mr: 'दुधात अचानक घट', severity: 'Needs Attention' },

  // HEALTHY
  { id: 'healthy_normal', icon: '✨', en: 'No Symptoms / Active', hi: 'कोई लक्षण नहीं / स्वस्थ', mr: 'काही लक्षणे नाहीत / निरोगी', severity: 'Healthy' }
];

export const evaluateHealthFromSymptoms = (selectedSymptomIds = [], observationText = '') => {
  const text = (observationText || '').toLowerCase();

  // Critical symptoms: High Fever, Skin Nodules / Lumps, Excessive Salivation
  const criticalIds = ['fever', 'skin_nodules', 'salivation'];
  const criticalKeywords = [
    'high fever', 'fever', 'तेज बुखार', 'बुखार', 'तीव्र ताप', 'ताप',
    'skin nodule', 'skin nodules', 'nodule', 'nodules', 'lump', 'lumps', 'त्वचा पर गांठ', 'गांठ', 'गांठे', 'गाठी', 'लम्प', 'लंप्स',
    'excessive salivation', 'salivation', 'saliva', 'drool', 'drooling', 'मुंह से अधिक लार', 'लार', 'तोंडातून लाळ', 'लाळ'
  ];

  // Needs Attention symptoms: Lethargy & Weakness, Loss of Appetite, Limping / Lameness, Cough / Discharge, Sudden Milk Drop, Swelling
  const needsAttentionIds = ['swelling', 'lethargy', 'off_feed', 'lameness', 'cough', 'milk_drop'];
  const needsAttentionKeywords = [
    'swelling', 'swell', 'swollen', 'edema', 'सूजन', 'सूज',
    'lethargy', 'weakness', 'weak', 'tired', 'सुस्ती', 'कमजोरी', 'सुस्तपणा', 'अशक्तपणा',
    'loss of appetite', 'appetite', 'off feed', 'not eating', 'चारा न खाना', 'चारा न खाणे', 'भूख न लगना',
    'limping', 'lameness', 'limp', 'lame', 'लंगड़ाना', 'लंगडणे', 'लंगडा',
    'cough', 'discharge', 'runny nose', 'sneezing', 'खांसी', 'खोकला', 'नाक बहना', 'नाक वाहणे',
    'milk drop', 'sudden milk drop', 'drop in milk', 'less milk', 'दूध में अचानक कमी', 'दुधात घट', 'दूध कम'
  ];

  // Healthy keywords
  const healthyIds = ['healthy_normal'];
  const healthyKeywords = [
    'healthy', 'active', 'no symptoms', 'normal', 'fit', 'स्वस्थ', 'निरोगी', 'सक्रिय'
  ];

  const matchedCriticalIds = selectedSymptomIds.filter((id) => criticalIds.includes(id));
  const matchedCriticalKw = criticalKeywords.filter((kw) => text.includes(kw));
  const hasCritical = matchedCriticalIds.length > 0 || matchedCriticalKw.length > 0;

  const matchedAttentionIds = selectedSymptomIds.filter((id) => needsAttentionIds.includes(id));
  const matchedAttentionKw = needsAttentionKeywords.filter((kw) => text.includes(kw));
  const hasAttention = matchedAttentionIds.length > 0 || matchedAttentionKw.length > 0;

  const hasHealthyId = selectedSymptomIds.includes('healthy_normal');
  const hasHealthyKw = healthyKeywords.some((kw) => text.includes(kw));

  // If there is ANY combination of symptoms containing AT LEAST ONE critical symptom:
  // Rule: Categorise as Critical and trigger "Recommendation of Veterinary Evaluation"
  if (hasCritical) {
    const detectedNames = [
      ...matchedCriticalIds.map((id) => QUICK_SYMPTOMS.find((s) => s.id === id)?.en || id),
      ...matchedCriticalKw.map((kw) => `Keyword "${kw}"`)
    ];
    return {
      status: 'Critical',
      requiresVetEvaluation: true,
      hasCritical: true,
      hasAttention: hasAttention,
      detectedSymptoms: [...new Set(detectedNames)],
      reason: 'Critical symptom present — recommendation of veterinary evaluation'
    };
  }

  if (hasAttention) {
    const detectedNames = [
      ...matchedAttentionIds.map((id) => QUICK_SYMPTOMS.find((s) => s.id === id)?.en || id),
      ...matchedAttentionKw.map((kw) => `Keyword "${kw}"`)
    ];
    return {
      status: 'Needs Attention',
      requiresVetEvaluation: false,
      hasCritical: false,
      hasAttention: true,
      detectedSymptoms: [...new Set(detectedNames)],
      reason: 'Mild/Moderate symptoms detected — monitor closely'
    };
  }

  if (hasHealthyId || hasHealthyKw) {
    return {
      status: 'Healthy',
      requiresVetEvaluation: false,
      hasCritical: false,
      hasAttention: false,
      detectedSymptoms: ['Active / No Symptoms'],
      reason: 'No illness symptoms observed'
    };
  }

  return {
    status: null,
    requiresVetEvaluation: false,
    hasCritical: false,
    hasAttention: false,
    detectedSymptoms: [],
    reason: ''
  };
};

export default function AnimalDetailModal({
  animal,
  onClose,
  onUpdate,
  initialTab = 'health',
  initialOpenAiRecommendations = false
}) {
    const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = getCleanLang(i18n.language);
  const isEnglish = currentLang === 'en';
  const isMarathi = currentLang === 'mr';
  const isHindi = currentLang === 'hi';

  // Internal state to guarantee immediate UI updates
  const [modalAnimal, setModalAnimal] = useState(animal);
  const [timeline, setTimeline] = useState(animal?.timeline || []);
  const [activeTab, setActiveTab] = useState(initialTab || 'health');
  const [expandedTimelineIdx, setExpandedTimelineIdx] = useState(null);
  const [showAiRecommendationDialog, setShowAiRecommendationDialog] = useState(initialOpenAiRecommendations || false);
  const [selectedAiScanForDialog, setSelectedAiScanForDialog] = useState(null);

  // Tab: Health Status Update state
  const [selectedHealthStatus, setSelectedHealthStatus] = useState(animal?.healthStatus || 'Healthy');
  const [selectedQuickSymptoms, setSelectedQuickSymptoms] = useState([]);
  const [healthObservation, setHealthObservation] = useState('');
  const [isSubmittingHealth, setIsSubmittingHealth] = useState(false);

  // Tab: Timeline Add Event form state
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineType, setNewTimelineType] = useState('Health Check');
  const [newTimelineNotes, setNewTimelineNotes] = useState('');
  const [isSubmittingTimeline, setIsSubmittingTimeline] = useState(false);

  // Tab: Vaccination form state
  const [selectedVaccineKey, setSelectedVaccineKey] = useState('fmd');
  const [newVaccineName, setNewVaccineName] = useState('FMD (Foot & Mouth Disease)');
  const [vaccineSearchQuery, setVaccineSearchQuery] = useState('');
  const [isVaccineDropdownOpen, setIsVaccineDropdownOpen] = useState(false);
  const [newVaccineDateAdministered, setNewVaccineDateAdministered] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [newVaccineNextDue, setNewVaccineNextDue] = useState(() => {
    return calculateNextDueDate('fmd', new Date().toISOString().split('T')[0]);
  });
  const [newVaccineDose, setNewVaccineDose] = useState('Annual Booster');
  const [newVaccineBatch, setNewVaccineBatch] = useState('');
  const [newVaccineAdministeredBy, setNewVaccineAdministeredBy] = useState('');
  const [newVaccineCamp, setNewVaccineCamp] = useState('');
  const [newVaccineNotes, setNewVaccineNotes] = useState('');
  const [isSubmittingVaccine, setIsSubmittingVaccine] = useState(false);

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize when animal prop changes
  useEffect(() => {
    if (animal) {
      setModalAnimal(animal);
      setTimeline(animal.timeline || []);
      setSelectedHealthStatus(animal.healthStatus || 'Healthy');
      if (initialOpenAiRecommendations) {
        setShowAiRecommendationDialog(true);
      }
    }
  }, [animal, initialOpenAiRecommendations]);

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

  const handleDeleteAnimal = async () => {
    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;
    const confirmMsg = isEnglish
      ? `Are you sure you want to delete ${modalAnimal.name} (${modalAnimal.tagId})? This action cannot be undone.`
      : isMarathi
      ? `खात्री आहे का? तुम्ही ${modalAnimal.name} (${modalAnimal.tagId}) हे जनावर कायमचे हटवू इच्छिता?`
      : `क्या आप वाकई ${modalAnimal.name} (${modalAnimal.tagId}) को हटाना चाहते हैं?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await animalService.deleteAnimal(animalId);
      if (onClose) onClose();
      if (onUpdate) onUpdate();
    } catch (err) {
      showError(err.message || 'Failed to delete animal');
    }
  };

  const handleToggleQuickSymptom = (sym) => {
    if (sym.id === 'healthy_normal') {
      setSelectedQuickSymptoms(['healthy_normal']);
      setSelectedHealthStatus('Healthy');
      setHealthObservation(
        isEnglish
          ? 'Active, normal appetite, healthy vitals, no symptoms observed.'
          : isMarathi
          ? 'सक्रिय, चारा व्यवस्थित खात आहे, कोणतीही लक्षणे नाहीत.'
          : 'सक्रिय, चारा ठीक से खा रहा है, कोई बीमारी लक्षण नहीं।'
      );
      return;
    }

    let next = selectedQuickSymptoms.filter((id) => id !== 'healthy_normal');
    if (next.includes(sym.id)) {
      next = next.filter((id) => id !== sym.id);
    } else {
      next = [...next, sym.id];
    }
    setSelectedQuickSymptoms(next);

    if (next.length === 0) {
      setSelectedHealthStatus(animal?.healthStatus || 'Healthy');
      setHealthObservation('');
      return;
    }

    // Auto-categorize based on symptoms
    const evaluation = evaluateHealthFromSymptoms(next, healthObservation);
    if (evaluation.status) {
      setSelectedHealthStatus(evaluation.status);
    }

    const names = next.map((id) => {
      const found = QUICK_SYMPTOMS.find((s) => s.id === id);
      return found ? (isEnglish ? found.en : isMarathi ? found.mr : found.hi) : id;
    });

    const prefix = isEnglish ? 'Noticed symptoms: ' : isMarathi ? 'आढळलेली लक्षणे: ' : 'दिखे लक्षण: ';
    setHealthObservation(prefix + names.join(', '));
  };

  const handleObservationChange = (text) => {
    setHealthObservation(text);
    const evaluation = evaluateHealthFromSymptoms(selectedQuickSymptoms, text);
    if (evaluation.status) {
      setSelectedHealthStatus(evaluation.status);
    }
  };

  // 1. Handle Updating Health Status (View Health Tab)
  const handleUpdateHealth = async (e) => {
    e.preventDefault();
    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;

    setIsSubmittingHealth(true);
    try {
      const evalResult = evaluateHealthFromSymptoms(selectedQuickSymptoms, healthObservation);
      const isCriticalOrVetEval = evalResult.requiresVetEvaluation || selectedHealthStatus === 'Critical';

      const statusTitle = isEnglish
        ? `Health Status: ${selectedHealthStatus}${isCriticalOrVetEval ? ' (Recommendation of Veterinary Evaluation)' : ''}`
        : isMarathi
        ? `आरोग्य स्थिती: ${selectedHealthStatus === 'Healthy' ? 'निरोगी' : selectedHealthStatus === 'Needs Attention' ? 'लक्ष द्या' : 'गंभीर'}${isCriticalOrVetEval ? ' (पशुवैद्यकीय तपासणीची शिफारस)' : ''}`
        : `स्वास्थ्य स्थिति: ${selectedHealthStatus === 'Healthy' ? 'स्वस्थ' : selectedHealthStatus === 'Needs Attention' ? 'ध्यान दें' : 'गंभीर'}${isCriticalOrVetEval ? ' (पशुचिकित्सक मूल्यांकन की सिफारिश)' : ''}`;

      let formattedNotes = healthObservation.trim();
      if (isCriticalOrVetEval && !formattedNotes.toLowerCase().includes('veterinary evaluation')) {
        formattedNotes = formattedNotes
          ? `${formattedNotes} [Recommendation of Veterinary Evaluation]`
          : (isEnglish ? 'Recommendation of Veterinary Evaluation advised.' : isMarathi ? 'पशुवैद्यकीय तपासणीची शिफारस करण्यात आली.' : 'पशुचिकित्सक मूल्यांकन की सिफारिश की गई।');
      }
      if (!formattedNotes) {
        formattedNotes = isEnglish ? `Health updated to ${selectedHealthStatus}` : `स्थिति ${selectedHealthStatus} अपडेट की गई`;
      }

      const healthEvent = {
        type: 'Health Check',
        title: statusTitle,
        date: new Date().toLocaleDateString('en-GB'),
        doctor: isEnglish ? 'Registered Veterinarian / Self' : isMarathi ? 'नोंदणीकृत पशुवैद्यक / स्वतः' : 'पंजीकृत डॉक्टर / स्वयं',
        notes: formattedNotes,
        status: selectedHealthStatus,
        symptoms: selectedQuickSymptoms
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

      if (latestAiScan) {
        const updatedScan = {
          ...latestAiScan,
          healthStatus: selectedHealthStatus,
          userOverridden: true,
          updatedAt: new Date().toISOString()
        };
        storeAnimalAiScan(animalId, updatedScan);
        if (modalAnimal.tagId) storeAnimalAiScan(modalAnimal.tagId, updatedScan);
      }

      setHealthObservation('');
      showSuccess(
        isEnglish
          ? '✓ Health status updated and saved successfully!'
          : isMarathi
          ? '✓ आरोग्य स्थिती यशस्वीरीत्या जतन केली!'
          : '✓ स्वास्थ्य स्थिति सफलतापूर्वक सुरक्षित की गई!'
      );
    } catch (err) {
      console.error('Error updating health status:', err);
      showError(
        isEnglish
          ? 'Failed to save health status. Please try again.'
          : isMarathi
          ? 'आरोग्य स्थिती जतन करताना त्रुटी आली.'
          : 'स्थिति सुरक्षित करने में समस्या आई।'
      );
    } finally {
      setIsSubmittingHealth(false);
    }
  };

  // 2. Handle Adding Timeline Event
  const handleAddTimeline = async (e) => {
    e.preventDefault();
    if (!newTimelineTitle.trim()) {
      showError(
        isEnglish
          ? 'Please enter a title for the record.'
          : isMarathi
          ? 'कृपया नोंदीचे शीर्षक प्रविष्ट करा.'
          : 'कृपया रिकॉर्ड का शीर्षक दर्ज करें।'
      );
      return;
    }

    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;
    const newEvent = {
      type: newTimelineType,
      title: newTimelineTitle.trim(),
      date: new Date().toLocaleDateString('en-GB'),
      doctor: isEnglish ? 'Veterinarian / Self' : isMarathi ? 'पशुवैद्यक / स्वतः' : 'डॉक्टर / स्वयं',
      notes: newTimelineNotes.trim()
    };

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
      showSuccess(
        isEnglish
          ? '✓ Record saved successfully!'
          : isMarathi
          ? '✓ नोंद यशस्वीरीत्या जतन केली!'
          : '✓ रिकॉर्ड सफलतापूर्वक सुरक्षित किया गया!'
      );
    } catch (err) {
      console.error('Error saving timeline event:', err);
      showError(
        isEnglish
          ? 'Failed to save record.'
          : isMarathi
          ? 'नोंद जतन करण्यात त्रुटी आली.'
          : 'रिकॉर्ड सुरक्षित करने में समस्या आई।'
      );
    } finally {
      setIsSubmittingTimeline(false);
    }
  };

  // 3. Handle Logging Vaccination
  const handleSelectVaccineDropdown = (v) => {
    setSelectedVaccineKey(v.key);
    const localizedName = v.name[currentLang] || v.name.en;
    setNewVaccineName(localizedName);
    if (v.defaultDose) setNewVaccineDose(v.defaultDose);
    if (v.govtScheme && !newVaccineCamp) setNewVaccineCamp(v.govtScheme);
    const calculatedDue = calculateNextDueDate(v.key, newVaccineDateAdministered);
    if (calculatedDue) setNewVaccineNextDue(calculatedDue);
    setIsVaccineDropdownOpen(false);
    setVaccineSearchQuery('');
  };

  const handleDateAdministeredChange = (dateVal) => {
    setNewVaccineDateAdministered(dateVal);
    const calculatedDue = calculateNextDueDate(selectedVaccineKey, dateVal);
    if (calculatedDue) setNewVaccineNextDue(calculatedDue);
  };

  const handleQuickFillRecommendation = (rec) => {
    setSelectedVaccineKey(rec.key);
    setNewVaccineName(rec.name);
    if (rec.dose) setNewVaccineDose(rec.dose);
    if (rec.suggestedCamp) setNewVaccineCamp(rec.suggestedCamp);
    const calculatedDue = calculateNextDueDate(rec.key, newVaccineDateAdministered);
    if (calculatedDue) setNewVaccineNextDue(calculatedDue);
    showSuccess(
      isEnglish
        ? `✓ Auto-filled ${rec.name} into vaccination form`
        : isMarathi
        ? `✓ फॉर्ममध्ये ${rec.name} आपोआप भरले गेले`
        : `✓ फॉर्म में ${rec.name} स्वचालित रूप से भरा गया`
    );
  };

  const handleAddVaccine = async (e) => {
    e.preventDefault();
    if (!newVaccineName.trim()) {
      showError(
        isEnglish
          ? 'Please select or enter vaccine name.'
          : isMarathi
          ? 'कृपया लसीचे नाव निवडा.'
          : 'कृपया टीके का नाम चुनें।'
      );
      return;
    }

    const animalId = modalAnimal._id || modalAnimal.id || modalAnimal.tagId;
    const vName = newVaccineName.trim();
    const adminDateObj = newVaccineDateAdministered ? new Date(newVaccineDateAdministered) : new Date();
    const nextDueObj = newVaccineNextDue ? new Date(newVaccineNextDue) : null;

    const vDateStr = adminDateObj.toLocaleDateString('en-GB');
    const vDueStr = nextDueObj ? nextDueObj.toLocaleDateString('en-GB') : (isEnglish ? '6 Months later' : isMarathi ? '६ महिन्यांनी' : '6 माह बाद');

    const vaccineEvent = {
      type: 'Vaccination',
      title: `${vName} (${newVaccineDose || 'Vaccinated'})`,
      date: vDateStr,
      doctor: newVaccineAdministeredBy.trim() || (isEnglish ? 'Veterinarian' : isMarathi ? 'पशुवैद्यक' : 'पशु चिकित्सक'),
      notes: [
        newVaccineDose,
        newVaccineBatch ? `Batch: ${newVaccineBatch}` : '',
        newVaccineCamp ? `Camp: ${newVaccineCamp}` : '',
        `Next due: ${vDueStr}`,
        newVaccineNotes ? `Note: ${newVaccineNotes}` : ''
      ].filter(Boolean).join(' • ')
    };

    const newVaccObj = {
      name: vName,
      vaccine: vName,
      date: adminDateObj,
      nextDue: nextDueObj,
      dose: newVaccineDose || 'Primary Dose (1st)',
      batchNumber: newVaccineBatch.trim(),
      administeredBy: newVaccineAdministeredBy.trim() || (isEnglish ? 'Veterinarian' : isMarathi ? 'पशुवैद्यक' : 'पशु चिकित्सक'),
      camp: newVaccineCamp.trim(),
      notes: newVaccineNotes.trim()
    };

    setIsSubmittingVaccine(true);
    try {
      setModalAnimal((prev) => ({
        ...prev,
        vaccinationHistory: [...(prev?.vaccinationHistory || []), newVaccObj],
        timeline: [vaccineEvent, ...(prev?.timeline || [])]
      }));
      setTimeline((prev) => [vaccineEvent, ...prev]);

      const updated = await animalService.updateAnimal(animalId, {
        newVaccination: newVaccObj,
        newTimelineEvent: vaccineEvent
      });

      if (updated && onUpdate) onUpdate(updated);
      else if (onUpdate) onUpdate();

      setNewVaccineBatch('');
      setNewVaccineNotes('');
      setNewVaccineCamp('');
      showSuccess(
        isEnglish
          ? '✓ Vaccination record successfully saved!'
          : isMarathi
          ? '✓ लसीकरण नोंद यशस्वीरीत्या जतन केली!'
          : '✓ टीकाकरण रिकॉर्ड सफलतापूर्वक सुरक्षित किया गया!'
      );
    } catch (err) {
      console.error('Error saving vaccine:', err);
      showError(
        isEnglish
          ? 'Failed to save vaccination.'
          : isMarathi
          ? 'लसीकरण जतन करताना त्रुटी आली.'
          : 'टीकाकरण सुरक्षित करने में समस्या आई।'
      );
    } finally {
      setIsSubmittingVaccine(false);
    }
  };

  // Tabs configured strictly in the preferred language (3 Essential Tabs)
  const tabs = [
    {
      key: 'health',
      label: isEnglish ? 'View Health' : isMarathi ? 'आरोग्य पहा' : 'स्वास्थ्य देखें',
      icon: HeartPulse
    },
    {
      key: 'timeline',
      label: isEnglish ? 'Timeline' : isMarathi ? 'इतिहास' : 'समय-रेखा',
      icon: Clock
    },
    {
      key: 'vaccination',
      label: isEnglish ? 'Vaccination' : isMarathi ? 'लसीकरण' : 'टीकाकरण',
      icon: Syringe
    }
  ];

  const allVaccinations = [
    ...(modalAnimal.vaccinations || []),
    ...(modalAnimal.vaccinationHistory || [])
  ].map((v) => {
    const rawDate = v.date;
    const rawNextDue = v.nextDue;
    const statusInfo = getVaccineStatusInfo(rawNextDue, currentLang);
    return {
      name: v.vaccine || v.name || 'Vaccination',
      date: rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : (isEnglish ? 'Recorded' : 'दर्ज'),
      rawDate: rawDate,
      nextDue: rawNextDue ? new Date(rawNextDue).toLocaleDateString('en-GB') : (isEnglish ? 'Scheduled' : 'नियत'),
      rawNextDue: rawNextDue,
      dose: v.dose || (isEnglish ? 'Standard Dose' : isMarathi ? 'डोस' : 'खुराक'),
      batchNumber: v.batchNumber || '',
      administeredBy: v.administeredBy || v.doctor || (isEnglish ? 'Veterinarian' : isMarathi ? 'पशुवैद्यक' : 'पशु चिकित्सक'),
      camp: v.camp || '',
      notes: v.notes || '',
      statusInfo
    };
  });

  const totalVaccinesCount = allVaccinations.length;
  const upcomingDueCount = allVaccinations.filter(
    (v) => v.statusInfo.isDueSoon || (v.rawNextDue && new Date(v.rawNextDue) >= new Date())
  ).length;
  const overdueCount = allVaccinations.filter((v) => v.statusInfo.isOverdue).length;

  const overdueVaccines = allVaccinations.filter((v) => v.statusInfo.isOverdue);
  const dueSoonVaccines = allVaccinations.filter((v) => v.statusInfo.isDueSoon);

  const aiRecommendations = getAIVaccineRecommendations({
    species: modalAnimal.species,
    age: modalAnimal.age,
    breed: modalAnimal.breed,
    gender: modalAnimal.gender,
    diseaseHistory: modalAnimal.timeline || [],
    district: modalAnimal.district || 'Nagpur',
    currentVaccinations: allVaccinations,
    lang: currentLang
  });

  const statusLabel =
    modalAnimal.healthStatus === 'Healthy'
      ? (isEnglish ? 'Healthy' : isMarathi ? 'निरोगी' : 'स्वस्थ')
      : modalAnimal.healthStatus === 'Needs Attention'
      ? (isEnglish ? 'Needs Attention' : isMarathi ? 'लक्ष द्या' : 'ध्यान दें')
      : (isEnglish ? 'Critical' : isMarathi ? 'गंभीर' : 'गंभीर');

  const speciesDisplayName = getSpeciesDisplayName(modalAnimal.species, currentLang);
  const breedDisplayName = getBreedDisplayName(modalAnimal.breed, modalAnimal.species, currentLang);
  const latestAiScan = getAnimalAiScan(modalAnimal, currentLang);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-modal border border-stone-200/80 overflow-hidden my-6 max-h-[92vh] flex flex-col"
      >
        {/* Clean Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-5 sm:p-6 relative">
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDeleteAnimal}
              className="text-red-300 hover:text-white p-2 rounded-full hover:bg-red-500/25 transition cursor-pointer"
              title={isEnglish ? 'Delete this animal' : 'हे जनावर हटवा'}
            >
              <Trash2 className="w-5 h-5 text-red-200 hover:text-white" />
            </button>
            <button
              onClick={onClose}
              className="text-emerald-100 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-100 border-2 border-white/20 flex items-center justify-center text-3xl sm:text-4xl shadow-md">
              {modalAnimal.species === 'Buffalo' ? '🐃' : modalAnimal.species === 'Goat' ? '🐐' : modalAnimal.species === 'Sheep' ? '🐑' : '🐄'}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-black text-white">{modalAnimal.name}</h2>
                <span
                  className={`text-xs sm:text-sm font-black px-3.5 py-1 rounded-full border shadow-2xs ${
                    modalAnimal.healthStatus === 'Healthy'
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400'
                      : modalAnimal.healthStatus === 'Needs Attention'
                      ? 'bg-amber-400/30 text-amber-200 border-amber-300'
                      : 'bg-red-500/30 text-red-200 border-red-400'
                  }`}
                >
                  ● {statusLabel}
                </span>
              </div>
              <p className="text-sm sm:text-base text-emerald-200/90 mt-1 font-mono">
                {t('animal_form.tag_id', 'Tag ID')}: {modalAnimal.tagId} • {speciesDisplayName}{breedDisplayName ? ` • ${breedDisplayName}` : ''} • {modalAnimal.age} {t('farmer_dash.years', 'Years')}
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition cursor-pointer ${
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
        <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-6 bg-stone-50/60">
          {/* TAB 1: VIEW HEALTH (CLEANED - UNWANTED DUMMY ELEMENTS REMOVED) */}
          {activeTab === 'health' && (
            <div className="space-y-5">

              {/* Prominent AI-Based Recommendations Banner & Dialogue Box Trigger */}
              {latestAiScan && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-900 via-teal-950 to-emerald-900 text-white rounded-3xl border-2 border-emerald-400 shadow-md space-y-3 relative overflow-hidden animate-in fade-in duration-150">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/60 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
                        <Sparkles className="w-5 h-5 text-emerald-300 animate-pulse" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                            {isEnglish ? 'AI Recommendations Available' : isMarathi ? 'AI शिफारसी उपलब्ध' : 'AI सिफारिशें उपलब्ध'}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-300">
                            {latestAiScan.confidence}% {isEnglish ? 'Confidence' : 'सटीकता'}
                          </span>
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-white mt-0.5">
                          {latestAiScan.disease}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAiScanForDialog(latestAiScan);
                        setShowAiRecommendationDialog(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl transition shadow-sm cursor-pointer whitespace-nowrap active:scale-95 self-start sm:self-auto"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-950" />
                      <span>{isEnglish ? 'Open AI Recommendations Dialog' : isMarathi ? 'AI शिफारसी डायलॉग उघडा' : 'AI सिफारिशें डायलॉग बॉक्स खोलें'}</span>
                    </button>
                  </div>

                  {latestAiScan.immediateFirstAid && latestAiScan.immediateFirstAid.length > 0 && (
                    <div className="space-y-1.5 text-xs text-emerald-100/90 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {isEnglish ? 'Immediate First-Aid & Care Snapshot:' : isMarathi ? 'तात्काळ प्रथमोपचार व काळजी सारांश:' : 'तत्काल प्राथमिक उपचार सारांश:'}
                      </span>
                      <ul className="space-y-1 text-xs leading-relaxed pl-1">
                        {latestAiScan.immediateFirstAid.slice(0, 2).map((aid, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{aid}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Current Status Overview Card */}
              <div className="p-4 sm:p-5 bg-emerald-50/90 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900">
                      {isEnglish ? 'Current Health Status:' : isMarathi ? 'सध्याची आरोग्य स्थिती:' : 'वर्तमान स्वास्थ्य स्थिति:'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        modalAnimal.healthStatus === 'Healthy'
                          ? 'bg-emerald-600 text-white'
                          : modalAnimal.healthStatus === 'Needs Attention'
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {isEnglish
                      ? `Last checked: ${modalAnimal.lastCheckup || 'Today'}. Update the status below whenever symptoms or conditions change.`
                      : isMarathi
                      ? `शेवटची तपासणी: ${modalAnimal.lastCheckup || 'आज'}. काही लक्षणे किंवा बदल आढळल्यास खालील पर्यायातून स्थिती अपडेट करा.`
                      : `अंतिम जांच: ${modalAnimal.lastCheckup || 'आज'}। यदि कोई लक्षण दिखे तो नीचे से स्थिति अपडेट करके सुरक्षित करें।`}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              </div>

              {/* Status Update Form (ZERO double language) */}
              <form
                onSubmit={handleUpdateHealth}
                className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <FileCheck className="w-5 h-5 text-emerald-700" />
                  <h4 className="font-black text-slate-900 text-lg">
                    {isEnglish
                      ? 'Update Health Status'
                      : isMarathi
                      ? 'आरोग्य स्थिती बदला व जतन करा'
                      : 'स्वास्थ्य स्थिति बदलें व सुरक्षित करें'}
                  </h4>
                </div>

                <div className="space-y-3">
                  {(() => {
                    const currentEvaluation = evaluateHealthFromSymptoms(selectedQuickSymptoms, healthObservation);
                    const showVetEvaluationRecommendation =
                      currentEvaluation.requiresVetEvaluation || selectedHealthStatus === 'Critical';

                    return (
                      <>
                        {/* Dynamic Status Feedback */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                          <span className="text-xs font-bold text-slate-700">
                            {isEnglish ? 'Assigned Category:' : isMarathi ? 'आरोग्य प्रवर्ग:' : 'स्वास्थ्य श्रेणी:'}
                          </span>
                          <div className="flex items-center gap-2">
                            {currentEvaluation.status && (
                              <span className="text-[10px] font-bold text-slate-500">
                                {isEnglish ? 'Auto-detected:' : isMarathi ? 'लक्षणानुसार:' : 'लक्षणानुसार:'}
                              </span>
                            )}
                            <span
                              className={`text-xs font-black px-3 py-1 rounded-full border ${
                                selectedHealthStatus === 'Critical'
                                  ? 'bg-red-50 text-red-700 border-red-300'
                                  : selectedHealthStatus === 'Needs Attention'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              ● {selectedHealthStatus === 'Healthy'
                                ? (isEnglish ? 'Healthy' : isMarathi ? 'निरोगी' : 'स्वस्थ')
                                : selectedHealthStatus === 'Needs Attention'
                                ? (isEnglish ? 'Needs Attention' : isMarathi ? 'लक्ष द्या' : 'ध्यान दें')
                                : (isEnglish ? 'Critical' : isMarathi ? 'गंभीर' : 'गंभीर')}
                            </span>
                          </div>
                        </div>

                        {/* 3 Status Buttons */}
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            {
                              val: 'Healthy',
                              label: isEnglish ? 'Healthy' : isMarathi ? 'निरोगी' : 'स्वस्थ',
                              color: 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600'
                            },
                            {
                              val: 'Needs Attention',
                              label: isEnglish ? 'Needs Attention' : isMarathi ? 'लक्ष द्या' : 'ध्यान दें',
                              color: 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-600'
                            },
                            {
                              val: 'Critical',
                              label: isEnglish ? 'Critical' : isMarathi ? 'गंभीर' : 'गंभीर',
                              color: 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-600'
                            }
                          ].map((item) => (
                            <button
                              type="button"
                              key={item.val}
                              onClick={() => setSelectedHealthStatus(item.val)}
                              className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition text-center cursor-pointer ${
                                selectedHealthStatus === item.val
                                  ? `${item.color} shadow-xs font-black`
                                  : 'bg-stone-50 border-stone-200 text-slate-700 hover:bg-stone-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {/* Quick-Tap Symptom Chips Organized into the 3 Requested Tiers */}
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-slate-800">
                              {isEnglish
                                ? 'Observed Symptoms (Select or type below to categorize):'
                                : isMarathi
                                ? 'निरीक्षण केलेली लक्षणे (निवडा किंवा खाली लिहा):'
                                : 'देखे गए लक्षण (चुनें या नीचे लिखें):'}
                            </label>
                            {selectedQuickSymptoms.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedQuickSymptoms([]);
                                  setHealthObservation('');
                                  setSelectedHealthStatus(animal?.healthStatus || 'Healthy');
                                }}
                                className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer underline"
                              >
                                {isEnglish ? 'Clear' : isMarathi ? 'साफ करा' : 'हटाएं'}
                              </button>
                            )}
                          </div>

                          {/* Tier 1: CRITICAL Symptoms */}
                          <div className="p-3 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-black text-red-900 uppercase tracking-wide">
                              <span className="flex items-center gap-1.5">
                                <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                                {isEnglish ? 'Critical Symptoms (Triggers Vet Evaluation)' : isMarathi ? 'गंभीर लक्षणे (पशुवैद्यकीय तपासणी आवश्यक)' : 'गंभीर लक्षण (पशुचिकित्सक जांच अनिवार्य)'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-200 text-red-900 font-bold">
                                CRITICAL
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {QUICK_SYMPTOMS.filter((s) => s.severity === 'Critical').map((sym) => {
                                const isSelected = selectedQuickSymptoms.includes(sym.id);
                                const label = isEnglish ? sym.en : isMarathi ? sym.mr : sym.hi;
                                return (
                                  <button
                                    type="button"
                                    key={sym.id}
                                    onClick={() => handleToggleQuickSymptom(sym)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-300'
                                        : 'bg-white border border-red-200 text-red-900 hover:bg-red-100/70 hover:border-red-300'
                                    }`}
                                  >
                                    <span>{sym.icon}</span>
                                    <span>{label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Tier 2: NEEDS ATTENTION Symptoms */}
                          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-black text-amber-900 uppercase tracking-wide">
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                {isEnglish ? 'Needs Attention Symptoms' : isMarathi ? 'लक्ष देण्यासारखी लक्षणे' : 'ध्यान देने योग्य लक्षण'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                                NEEDS ATTENTION
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {QUICK_SYMPTOMS.filter((s) => s.severity === 'Needs Attention').map((sym) => {
                                const isSelected = selectedQuickSymptoms.includes(sym.id);
                                const label = isEnglish ? sym.en : isMarathi ? sym.mr : sym.hi;
                                return (
                                  <button
                                    type="button"
                                    key={sym.id}
                                    onClick={() => handleToggleQuickSymptom(sym)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                                        : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100/70 hover:border-amber-300'
                                    }`}
                                  >
                                    <span>{sym.icon}</span>
                                    <span>{label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Tier 3: HEALTHY */}
                          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-black text-emerald-900 uppercase tracking-wide">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                {isEnglish ? 'Healthy / Active' : isMarathi ? 'निरोगी / सक्रिय' : 'स्वस्थ / सक्रिय'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                                HEALTHY
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {QUICK_SYMPTOMS.filter((s) => s.severity === 'Healthy').map((sym) => {
                                const isSelected = selectedQuickSymptoms.includes(sym.id);
                                const label = isEnglish ? sym.en : isMarathi ? sym.mr : sym.hi;
                                return (
                                  <button
                                    type="button"
                                    key={sym.id}
                                    onClick={() => handleToggleQuickSymptom(sym)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                                        : 'bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100/70 hover:border-emerald-300'
                                    }`}
                                  >
                                    <span>{sym.icon}</span>
                                    <span>{label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Clinical Observation Notes */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            {isEnglish
                              ? 'Clinical Notes & Observations (Type symptoms e.g. swelling, fever):'
                              : isMarathi
                              ? 'तपासणी नोंदी / लक्षणे (उदा. सूज (swelling), ताप लिहू शकता):'
                              : 'जांच टिप्पणी / लक्षण (जैसे सूजन (swelling), बुखार आदि लिख सकते हैं):'}
                          </label>
                          <input
                            type="text"
                            placeholder={
                              isEnglish
                                ? 'e.g. swelling on left hock, high fever, or active eating well'
                                : isMarathi
                                ? 'उदा. पायावर सूज (swelling), तीव्र ताप किंवा चारा व्यवस्थित खात आहे'
                                : 'उदा. पैर में सूजन (swelling), तेज बुखार या चारा खा रहा है'
                            }
                            value={healthObservation}
                            onChange={(e) => handleObservationChange(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                          />
                        </div>

                        {/* PROMINENT REQUIREMENT: Recommendation of Veterinary Evaluation */}
                        {showVetEvaluationRecommendation && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-2 border-red-400 shadow-sm space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-red-100 border border-red-300 text-red-700 flex items-center justify-center shrink-0 shadow-inner">
                                <Stethoscope className="w-6 h-6 text-red-700 animate-pulse" />
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-600 text-white tracking-wider">
                                    ⚠️ {isEnglish ? 'CRITICAL SYMPTOM ALERT' : isMarathi ? 'गंभीर लक्षण इशारा' : 'गंभीर लक्षण चेतावनी'}
                                  </span>
                                  {currentEvaluation.hasAttention && currentEvaluation.hasCritical && (
                                    <span className="text-[11px] font-bold text-red-800">
                                      {isEnglish ? 'Symptom combination includes critical signs' : isMarathi ? 'लक्षण मिश्रणात गंभीर लक्षण समाविष्ट आहे' : 'लक्षणों में गंभीर लक्षण शामिल है'}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-base sm:text-lg font-black text-red-950 mt-1">
                                  {isEnglish
                                    ? 'Recommendation of Veterinary Evaluation'
                                    : isMarathi
                                    ? 'पशुवैद्यकीय तपासणीची शिफारस'
                                    : 'पशुचिकित्सक मूल्यांकन की सिफारिश'}
                                </h4>
                                <p className="text-xs font-semibold text-red-800/90 mt-0.5">
                                  {isMarathi
                                    ? 'Recommendation of Veterinary Evaluation (पशुवैद्यकीय तपासणीची शिफारस)'
                                    : isHindi
                                    ? 'Recommendation of Veterinary Evaluation (पशुचिकित्सक मूल्यांकन की सिफारिश)'
                                    : 'Recommendation of Veterinary Evaluation'}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white/80 p-3.5 rounded-xl border border-red-200 space-y-2">
                              <p className="text-xs text-red-950 leading-relaxed font-semibold">
                                {isEnglish
                                  ? 'One or more observed symptoms consist of critical livestock indicators (High Fever, Skin Nodules/Lumps, or Excessive Salivation). Even if paired with other symptoms like swelling or appetite loss, immediate on-ground clinical evaluation by a registered veterinarian is strongly recommended to protect your livestock and prevent disease spread.'
                                  : isMarathi
                                  ? 'नोंदवलेल्या लक्षणांमध्ये किमान एक गंभीर लक्षण (तीव्र ताप, त्वचेवर गाठी, किंवा तोंडातून लाळ) समाविष्ट आहे. इतर लक्षणांसोबत (उदा. सूज किंवा भूक न लागणे) हे एकत्र असल्यास तात्काळ परवानाधारक पशुवैद्यकाकडून तपासणी करून घेण्याची शिफारस आहे.'
                                  : 'दर्ज किए गए लक्षणों में कम से कम एक गंभीर लक्षण (तेज बुखार, त्वचा की गांठें, या अधिक लार) शामिल है। संयोजन में अन्य लक्षण (जैसे सूजन या भूख न लगना) होने पर भी तत्काल योग्य डॉक्टर से जांच कराने की सिफारिश की जाती है।'}
                              </p>
                              <div className="flex flex-wrap gap-2 text-[11px] text-red-800 font-medium pt-1">
                                <span>🛡️ <strong>{isEnglish ? 'Immediate Care:' : isMarathi ? 'तात्काळ उपाय:' : 'तत्काल उपाय:'}</strong></span>
                                <span>• {isEnglish ? 'Isolate affected animal in shade' : isMarathi ? 'जनावरास सावलीत वेगळे ठेवा' : 'पशु को छाया में अलग रखें'}</span>
                                <span>• {isEnglish ? 'Provide fresh clean water' : isMarathi ? 'स्वच्छ पाणी द्या' : 'साफ पानी दें'}</span>
                                <span>• {isEnglish ? 'Do not inject antibiotics without prescription' : isMarathi ? 'डॉक्टरांच्या सल्ल्याशिवाय औषध देऊ नका' : 'बिना पर्ची एंटीबायोटिक न दें'}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                              <a
                                href="tel:1962"
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 active:scale-95 text-white rounded-xl text-xs font-black transition shadow-sm cursor-pointer"
                              >
                                <PhoneCall className="w-4 h-4" />
                                <span>{isEnglish ? 'Call 1962 Animal Helpline' : isMarathi ? '1962 रुग्णवाहिका / हेल्पलाईन' : '1962 पशु हेल्पलाइन कॉल करें'}</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  navigate('/veterinary-help');
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 text-red-900 border border-red-300 active:scale-95 rounded-xl text-xs font-black transition shadow-2xs cursor-pointer"
                              >
                                <Stethoscope className="w-4 h-4 text-red-600" />
                                <span>{isEnglish ? 'Contact Nagpur Veterinarians' : isMarathi ? 'उपलब्ध पशुवैद्यक पहा' : 'उपलब्ध पशुचिकित्सक देखें'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingHealth}
                      className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {isSubmittingHealth ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isEnglish ? 'Saving...' : isMarathi ? 'जतन होत आहे...' : 'सुरक्षित हो रहा है...'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>
                            {isEnglish
                              ? 'Save Health Status'
                              : isMarathi
                              ? 'आरोग्य स्थिती जतन करा'
                              : 'स्थिति सुरक्षित करें'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Automatic AI Scan Link Card */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h5 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                      {isEnglish ? 'Automatic AI Disease Scan' : isMarathi ? 'स्वयंचलित AI रोग तपासणी' : 'स्वचालित AI रोग जांच'}
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 border border-emerald-300">
                      Species Health AI
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {isEnglish 
                      ? `Scan ${modalAnimal.name} with AI. The scan result will automatically sync to this animal's health record and timeline.`
                      : isMarathi
                      ? `${modalAnimal.name} ची AI द्वारे तपासणी करा. निकाल थेट या जनावराच्या आरोग्य नोंदवहीत सुरक्षित केला जाईल.`
                      : `${modalAnimal.name} की AI से जांच करें। परिणाम सीधे इस पशु के स्वास्थ्य रिकॉर्ड और समय-रेखा में दर्ज होगा।`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/report-sick?animalId=${modalAnimal._id || modalAnimal.id || modalAnimal.tagId}`);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isEnglish ? 'Scan This Animal' : isMarathi ? 'या जनावराची तपासणी करा' : 'इस पशु की जांच करें'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MEDICAL TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-700" />
                  {isEnglish
                    ? `Medical Timeline (${timeline.length} records)`
                    : isMarathi
                    ? `वैद्यकीय इतिहास (${timeline.length} नोंदी)`
                    : `स्वास्थ्य समय-रेखा (${timeline.length} रिकॉर्ड)`}
                </h3>
              </div>

              <div className="relative pl-6 border-l-2 border-stone-200 space-y-4">
                {timeline.map((item, idx) => {
                  const statusStr = String(item.status || item.riskLevel || '').toLowerCase();
                  const titleLower = String(item.title || item.disease || '').toLowerCase();
                  const notesLower = String(item.notes || '').toLowerCase();

                  const isCritical =
                    statusStr.includes('critical') ||
                    statusStr.includes('high') ||
                    titleLower.includes('critical') ||
                    titleLower.includes('गंभीर') ||
                    titleLower.includes('लम्प') ||
                    titleLower.includes('lumpy');

                  const isAttention =
                    !isCritical &&
                    (statusStr.includes('attention') ||
                      statusStr.includes('medium') ||
                      statusStr.includes('moderate') ||
                      titleLower.includes('attention') ||
                      titleLower.includes('ध्यान') ||
                      titleLower.includes('लक्ष') ||
                      notesLower.includes('attention') ||
                      notesLower.includes('symptoms'));

                  // Clean title: remove bilingual duplicate names in parentheses
                  let cleanTitle = (item.title || '')
                    .replace(/\s*\([\u0900-\u097F\s\/\-_]+\)/g, '')
                    .replace(/\s*\(\s*\)/g, '')
                    .trim();

                  // Clean notes summary: remove internal legacy model logs
                  let summaryNotes = item.notes || '';
                  if (summaryNotes.includes('lsd_model.keras')) {
                    summaryNotes = summaryNotes.split('lsd_model.keras')[0].trim();
                  }
                  if (summaryNotes.includes('.keras')) {
                    summaryNotes = summaryNotes.split('.keras')[0].trim();
                  }

                  const isExpanded = expandedTimelineIdx === idx;
                  const hasExtraDetails = Boolean(
                    item.image ||
                    item.confidence ||
                    item.advisory ||
                    (item.symptoms && item.symptoms.length > 0) ||
                    summaryNotes.length > 80
                  );

                  return (
                    <div key={idx} className="relative group">
                      {/* Color-coded Timeline Dot: Red for Critical, Yellow for Needs Attention, Green for Healthy */}
                      <span
                        className={`absolute -left-[31px] top-2 w-4 h-4 rounded-full ring-4 transition ${
                          isCritical
                            ? 'bg-red-600 ring-red-100 shadow-xs'
                            : isAttention
                            ? 'bg-amber-500 ring-amber-100 shadow-xs'
                            : 'bg-emerald-600 ring-emerald-100 shadow-xs'
                        }`}
                      />

                      {/* Timeline Card */}
                      <div
                        className={`rounded-2xl p-4 sm:p-5 border transition shadow-2xs space-y-2.5 ${
                          isCritical
                            ? 'bg-white border-red-200 hover:border-red-400'
                            : isAttention
                            ? 'bg-white border-amber-200 hover:border-amber-400'
                            : 'bg-white border-stone-200 hover:border-emerald-300'
                        }`}
                      >
                        {/* Header: Badge & Date */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                              isCritical
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isAttention
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isCritical
                              ? (isEnglish ? '● Critical' : isMarathi ? '● गंभीर' : '● गंभीर')
                              : isAttention
                              ? (isEnglish ? '● Needs Attention' : isMarathi ? '● लक्ष द्या' : '● ध्यान दें')
                              : (item.type || (isEnglish ? 'Health Check' : isMarathi ? 'आरोग्य तपासणी' : 'स्वास्थ्य जांच'))}
                          </span>

                          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {item.date}
                          </span>
                        </div>

                        {/* Title */}
                        <h4
                          className={`font-black text-lg ${
                            isCritical ? 'text-red-950' : isAttention ? 'text-amber-950' : 'text-slate-900'
                          }`}
                        >
                          {cleanTitle}
                        </h4>

                        {/* Doctor / Examiner */}
                        {item.doctor && (
                          <p className="text-xs text-slate-600">
                            <span className="font-semibold">{isEnglish ? 'Examined by:' : isMarathi ? 'तपासणी:' : 'जांचकर्ता:'}</span> {item.doctor}
                          </p>
                        )}

                        {/* Concise Notes Preview */}
                        {summaryNotes && (
                          <p className="text-xs text-slate-600 leading-relaxed bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
                            {summaryNotes}
                          </p>
                        )}

                        {/* View More / View Details Toggle & Direct Recommendations Button */}
                        {hasExtraDetails && (
                          <div className="pt-2 border-t border-stone-100 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedTimelineIdx(isExpanded ? null : idx)}
                                className={`inline-flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                                  isCritical
                                    ? 'text-red-700 hover:text-red-900'
                                    : isAttention
                                    ? 'text-amber-800 hover:text-amber-950'
                                    : 'text-emerald-700 hover:text-emerald-900'
                                }`}
                              >
                                <span>
                                  {isExpanded
                                    ? (isEnglish ? 'Hide Details ▲' : isMarathi ? 'तपशील लपवा ▲' : 'विवरण छुपाएं ▲')
                                    : (isEnglish ? 'View More Details ▼' : isMarathi ? 'अधिक तपशील पहा ▼' : 'अधिक विवरण देखें ▼')}
                                </span>
                              </button>

                              {(item.confidence > 85 || item.type === 'AI Disease Scan' || item.type === 'AI Diagnosis' || item.advisory) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAiScanForDialog({
                                      animalId: modalAnimal._id || modalAnimal.id || modalAnimal.tagId,
                                      animalName: modalAnimal.name,
                                      tagId: modalAnimal.tagId,
                                      species: modalAnimal.species,
                                      disease: item.disease || cleanTitle,
                                      confidence: item.confidence || 92,
                                      riskLevel: isCritical ? 'Critical' : 'Moderate',
                                      healthStatus: item.status || (isCritical ? 'Critical' : 'Needs Attention'),
                                      image: item.image || item.imageUrl,
                                      advisory: item.advisory,
                                      immediateFirstAid: item.advisory ? item.advisory.split(/\.\s+/).filter(Boolean) : latestAiScan?.immediateFirstAid,
                                      clinicalPrecautions: latestAiScan?.clinicalPrecautions,
                                      explanation: summaryNotes,
                                      symptoms: item.symptoms || [],
                                      formattedDate: item.date
                                    });
                                    setShowAiRecommendationDialog(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition shadow-2xs cursor-pointer active:scale-95"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                                  <span>{isEnglish ? 'AI Recommendations' : isMarathi ? 'AI शिफारसी' : 'AI सिफारिशें'}</span>
                                </button>
                              )}
                            </div>

                            {/* Collapsible Expanded Details Section */}
                            {isExpanded && (
                              <div className="mt-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-3 animate-fadeIn">
                                {/* Uploaded Disease Scan Photo */}
                                {item.image && (
                                  <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                      {isEnglish ? 'Uploaded Disease Scan Photo:' : isMarathi ? 'अपलोड केलेला तपासणी फोटो:' : 'अपलोड की गई जांच फोटो:'}
                                    </span>
                                    <div className="relative group w-fit max-w-xs rounded-xl overflow-hidden border border-stone-200 shadow-xs bg-white">
                                      <img
                                        src={getImageUrl(item.image)}
                                        alt="Scan Lesion"
                                        className="w-48 h-36 object-cover cursor-pointer hover:scale-105 transition duration-200"
                                        onClick={() => window.open(getImageUrl(item.image), '_blank')}
                                      />
                                      <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded font-mono pointer-events-none">
                                        🔍 {isEnglish ? 'Tap to enlarge' : isMarathi ? 'मोठे पहा' : 'बड़ा देखें'}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Confidence Score */}
                                {item.confidence && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold text-slate-700">{isEnglish ? 'AI Confidence:' : isMarathi ? 'AI अचूकता:' : 'AI सटीकता:'}</span>
                                    <span className="font-black text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                                      {item.confidence}%
                                    </span>
                                  </div>
                                )}

                                {/* Symptoms List */}
                                {item.symptoms && item.symptoms.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-700 block">
                                      {isEnglish ? 'Evaluated Symptoms:' : isMarathi ? 'तपासलेली लक्षणे:' : 'पहचाने गए लक्षण:'}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.symptoms.map((s, sIdx) => (
                                        <span
                                          key={sIdx}
                                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-slate-800 shadow-2xs"
                                        >
                                          • {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Advisory / First Aid Guidance */}
                                {item.advisory && (
                                  <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      {isEnglish ? 'Veterinary Guidance & First Aid:' : isMarathi ? 'पशुवैद्यकीय सल्ला व प्रथमोपचार:' : 'पशुचिकित्सक परामर्श एवं प्राथमिक उपचार:'}
                                    </span>
                                    <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                                      {item.advisory}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {timeline.length === 0 && (
                  <p className="text-xs text-slate-400 py-3">
                    {isEnglish ? 'No records logged yet.' : isMarathi ? 'अद्याप कोणत्याही नोंदी नाहीत.' : 'कोई रिकॉर्ड दर्ज नहीं है।'}
                  </p>
                )}
              </div>

              {/* Add Timeline Event Form */}
              <form
                onSubmit={handleAddTimeline}
                className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    {isEnglish ? '+ Add Health Record' : isMarathi ? '+ नवीन आरोग्य नोंद जोडा' : '+ नया स्वास्थ्य रिकॉर्ड जोड़ें'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Type' : isMarathi ? 'प्रकार' : 'प्रकार'}
                    </label>
                    <select
                      value={newTimelineType}
                      onChange={(e) => setNewTimelineType(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Health Check">{isEnglish ? 'Health Check' : isMarathi ? 'आरोग्य तपासणी' : 'स्वास्थ्य जांच'}</option>
                      <option value="Treatment">{isEnglish ? 'Treatment' : isMarathi ? 'उपचार' : 'उपचार'}</option>
                      <option value="Vaccination">{isEnglish ? 'Vaccination' : isMarathi ? 'लसीकरण' : 'टीकाकरण'}</option>
                      <option value="Deworming">{isEnglish ? 'Deworming' : isMarathi ? 'जंतनाशक' : 'कृमिनाशक'}</option>
                      <option value="Other">{isEnglish ? 'Other' : isMarathi ? 'इतर' : 'अन्य'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Title *' : isMarathi ? 'शीर्षक *' : 'शीर्षक *'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEnglish ? 'e.g. Deworming given' : isMarathi ? 'उदा. जंतनाशक दिले' : 'उदा. पेट दर्द दवा दी'}
                      value={newTimelineTitle}
                      onChange={(e) => setNewTimelineTitle(e.target.value)}
                      required
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Notes' : isMarathi ? 'तपशील' : 'टिप्पणी'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEnglish ? 'Notes or doctor advice' : isMarathi ? 'तपशील किंवा सल्ला' : 'विवरण या सलाह'}
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
                        <span>{isEnglish ? 'Saving...' : isMarathi ? 'जतन होत आहे...' : 'सुरक्षित हो रहा है...'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{isEnglish ? 'Save Record' : isMarathi ? 'नोंद जतन करा' : 'रिकॉर्ड सुरक्षित करें'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: VACCINATION */}
          {activeTab === 'vaccination' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-emerald-700" />
                  <h4 className="font-black text-slate-900 text-lg sm:text-xl">
                    {isEnglish ? 'Vaccination Management' : isMarathi ? 'लसीकरण व्यवस्थापन' : 'टीकाकरण प्रबंधन'}
                  </h4>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                  {allVaccinations.length} {isEnglish ? 'total recorded' : isMarathi ? 'नोंदवलेल्या लसी' : 'कुल दर्ज टीके'}
                </span>
              </div>

              {/* 1. Reminder Alerts (when due within 7 days or overdue) */}
              {overdueVaccines.length > 0 && (
                <div className="p-3.5 sm:p-4 bg-red-50/95 rounded-2xl border border-red-200 text-red-950 flex items-start gap-3 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <span className="font-black text-red-900 block sm:inline">
                      {isEnglish ? '⚠️ Overdue Vaccination Alert:' : isMarathi ? '⚠️ थकबाकी लस इशारा:' : '⚠️ अतिदेय टीकाकरण चेतावनी:'}
                    </span>{' '}
                    <span>
                      {overdueVaccines.map((ov, idx) => (
                        <span key={idx} className="font-semibold">
                          {ov.name} ({ov.statusInfo.label}){idx < overdueVaccines.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {' — '}
                      {isEnglish
                        ? 'Immediate booster dose recommended to avoid disease outbreak.'
                        : isMarathi
                        ? 'रोगप्रसार टाळण्यासाठी त्वरित बूस्टर डोस द्यावा.'
                        : 'संक्रमण से बचाव हेतु तुरंत बूस्टर टीका लगवाएं।'}
                    </span>
                  </div>
                </div>
              )}

              {dueSoonVaccines.length > 0 && (
                <div className="p-3.5 sm:p-4 bg-amber-50/95 rounded-2xl border border-amber-300 text-amber-950 flex items-start gap-3 shadow-2xs">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <span className="font-black text-amber-900 block sm:inline">
                      {isEnglish ? '⏳ Upcoming Vaccination Reminder:' : isMarathi ? '⏳ नियोजित लस आठवण:' : '⏳ आगामी टीकाकरण अनुस्मारक:'}
                    </span>{' '}
                    <span>
                      {dueSoonVaccines.map((dv, idx) => (
                        <span key={idx} className="font-semibold">
                          {dv.name} ({dv.statusInfo.label}){idx < dueSoonVaccines.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {' — '}
                      {isEnglish
                        ? 'Please coordinate with your local veterinary doctor or gram panchayat camp.'
                        : isMarathi
                        ? 'कृपया आपल्या नजीकच्या पशुवैद्यकीय दवाखान्याशी संपर्क साधा.'
                        : 'कृपया अपने नजदीकी पशु चिकित्सालय या ग्राम पंचायत शिविर से संपर्क करें।'}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Summary Section Above Table */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {/* Total */}
                <div className="p-3 sm:p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {isEnglish ? 'Total Vaccines' : isMarathi ? 'एकूण लसी' : 'कुल टीके'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">{totalVaccinesCount}</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {isEnglish ? 'Doses' : isMarathi ? 'डोस' : 'डोज'}
                    </span>
                  </div>
                </div>

                {/* Upcoming Due */}
                <div
                  className={`p-3 sm:p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between ${
                    upcomingDueCount > 0 ? 'bg-amber-50/70 border-amber-300/80' : 'bg-stone-50 border-stone-200/80'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold block ${
                      upcomingDueCount > 0 ? 'text-amber-800' : 'text-slate-500'
                    }`}
                  >
                    {isEnglish ? 'Upcoming Due' : isMarathi ? 'पुढील देय' : 'आगामी नियत'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span
                      className={`text-xl sm:text-2xl font-black ${
                        upcomingDueCount > 0 ? 'text-amber-900' : 'text-slate-900'
                      }`}
                    >
                      {upcomingDueCount}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        upcomingDueCount > 0 ? 'text-amber-700' : 'text-slate-400'
                      }`}
                    >
                      {upcomingDueCount > 0
                        ? (isEnglish ? 'Scheduled' : isMarathi ? 'नियोजित' : 'नियत')
                        : (isEnglish ? 'Up to date' : 'सुरक्षित')}
                    </span>
                  </div>
                </div>

                {/* Overdue */}
                <div
                  className={`p-3 sm:p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between ${
                    overdueCount > 0 ? 'bg-red-50/70 border-red-300/80' : 'bg-stone-50 border-stone-200/80'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold block ${
                      overdueCount > 0 ? 'text-red-800' : 'text-slate-500'
                    }`}
                  >
                    {isEnglish ? 'Overdue' : isMarathi ? 'थकबाकी' : 'अतिदेय'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span
                      className={`text-xl sm:text-2xl font-black ${
                        overdueCount > 0 ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {overdueCount}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        overdueCount > 0 ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {overdueCount > 0
                        ? (isEnglish ? 'Urgent' : isMarathi ? 'तातडीचे' : 'तुरंत दें')
                        : (isEnglish ? 'None' : 'शून्य')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. AI-Powered Vaccine Recommendations */}
              {aiRecommendations.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200/90 space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                      <h5 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                        {isEnglish ? 'AI Vaccine Recommendations' : isMarathi ? 'AI लस शिफारसी' : 'AI टीका परामर्श'}
                      </h5>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                        Smart Triage
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-mono font-medium">
                      {speciesDisplayName} • {modalAnimal.age} {t('farmer_dash.years', 'Years')} • {modalAnimal.district || 'Nagpur'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {aiRecommendations.map((rec, rIdx) => (
                      <div
                        key={rIdx}
                        className="bg-white/90 backdrop-blur-xs p-3 rounded-xl border border-emerald-200/80 flex flex-col justify-between gap-2 hover:border-emerald-400 transition shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <h6 className="font-black text-xs text-slate-900">{rec.name}</h6>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${rec.badgeColor}`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">{rec.reason}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickFillRecommendation(rec)}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold py-1.5 px-2 rounded-lg border border-emerald-200 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-emerald-700" />
                          <span>{isEnglish ? 'Quick Fill Form' : isMarathi ? 'फॉर्ममध्ये भरा' : 'फॉर्म में भरें'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Responsive Vaccination History Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs sm:text-sm text-slate-800">
                    {isEnglish ? 'Vaccination History Records' : isMarathi ? 'लसीकरण इतिहास नोंदी' : 'टीकाकरण इतिहास तालिका'}
                  </h5>
                  <span className="text-xs text-slate-400 font-mono">
                    {allVaccinations.length} {isEnglish ? 'entries' : 'प्रविष्टियां'}
                  </span>
                </div>

                {allVaccinations.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-stone-50 border-b border-stone-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-3.5 sm:px-4">{isEnglish ? 'Vaccine' : isMarathi ? 'लस' : 'टीका'}</th>
                            <th className="py-3 px-3 sm:px-3.5 whitespace-nowrap">{isEnglish ? 'Date Given' : isMarathi ? 'दिलेली तारीख' : 'दी गई तारीख'}</th>
                            <th className="py-3 px-3 sm:px-3.5 whitespace-nowrap">{isEnglish ? 'Next Due' : isMarathi ? 'पुढील तारीख' : 'अगली नियत'}</th>
                            <th className="py-3 px-3 sm:px-3.5 whitespace-nowrap">{isEnglish ? 'Veterinarian' : isMarathi ? 'पशुवैद्यक' : 'चिकित्सक'}</th>
                            <th className="py-3 px-3.5 sm:px-4 text-right">{isEnglish ? 'Status' : isMarathi ? 'स्थिती' : 'स्थिति'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {allVaccinations.map((v, i) => {
                            const isOverdue = v.statusInfo.isOverdue;
                            const isDueSoon = v.statusInfo.isDueSoon;

                            return (
                              <tr key={i} className="hover:bg-stone-50/60 transition">
                                <td className="py-3 px-3.5 sm:px-4">
                                  <div className="space-y-0.5">
                                    <span className="font-black text-slate-900 block">{v.name}</span>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                                      <span className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-medium">
                                        {v.dose}
                                      </span>
                                      {v.batchNumber && (
                                        <span className="font-mono text-slate-400">
                                          Batch: {v.batchNumber}
                                        </span>
                                      )}
                                    </div>
                                    {v.notes && (
                                      <p className="text-[10px] text-slate-400 italic pt-0.5">{v.notes}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 sm:px-3.5 font-mono text-slate-600 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>{v.date}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 sm:px-3.5 whitespace-nowrap">
                                  <div className="space-y-0.5 font-mono">
                                    <span className="text-slate-800 font-semibold block">{v.nextDue}</span>
                                    {v.rawNextDue && (
                                      <span
                                        className={`text-[10px] block font-sans ${
                                          isOverdue
                                            ? 'text-red-600 font-black'
                                            : isDueSoon
                                            ? 'text-amber-600 font-bold'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {v.statusInfo.daysDiff !== null && (
                                          v.statusInfo.daysDiff < 0
                                            ? `${Math.abs(v.statusInfo.daysDiff)} ${isEnglish ? 'days ago' : 'दिन पहले'}`
                                            : v.statusInfo.daysDiff === 0
                                            ? (isEnglish ? 'Due Today' : 'आज देय')
                                            : `${isEnglish ? 'in' : 'में'} ${v.statusInfo.daysDiff} ${isEnglish ? 'days' : 'दिन'}`
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 sm:px-3.5 text-xs text-slate-600 whitespace-nowrap">
                                  <div>
                                    <span className="font-semibold text-slate-800 block">{v.administeredBy}</span>
                                    {v.camp && (
                                      <span className="text-[10px] text-slate-400 block max-w-[140px] truncate" title={v.camp}>
                                        {v.camp}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                                  <span
                                    className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md border shadow-2xs ${
                                      isOverdue
                                        ? 'bg-red-50 text-red-700 border-red-200 font-black'
                                        : isDueSoon
                                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    ● {v.statusInfo.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-stone-50 rounded-2xl border border-stone-200 text-slate-400 text-xs space-y-1">
                    <Syringe className="w-6 h-6 mx-auto text-stone-300" />
                    <p>{isEnglish ? 'No vaccination records logged yet.' : isMarathi ? 'अद्याप कोणतीही लस नोंदवली नाही.' : 'कोई टीकाकरण दर्ज नहीं है।'}</p>
                  </div>
                )}
              </div>

              {/* 5. Log Vaccination Form */}
              <form
                onSubmit={handleAddVaccine}
                className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-700" />
                    {isEnglish ? 'Log New Vaccination' : isMarathi ? 'नवीन लसीकरण नोंदवा' : 'नया टीका दर्ज करें'}
                  </span>
                  <span className="text-[11px] text-emerald-800 font-mono">
                    {t('animal_form.tag_id', 'Tag ID')}: {modalAnimal.tagId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* Field 1: Searchable Vaccine Dropdown */}
                  <div className="relative sm:col-span-2 md:col-span-1">
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Vaccine Name *' : isMarathi ? 'लसीचे नाव *' : 'टीके का नाम *'}
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsVaccineDropdownOpen(!isVaccineDropdownOpen)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 flex items-center justify-between shadow-2xs hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer text-left"
                    >
                      <span className="font-bold truncate">{newVaccineName || (isEnglish ? 'Select Vaccine' : 'लस निवडा')}</span>
                      <ChevronDown className={`w-4 h-4 text-emerald-700 shrink-0 transition-transform ${isVaccineDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Popover Dropdown */}
                    {isVaccineDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
                        {/* Search Input */}
                        <div className="p-2 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <input
                            type="text"
                            placeholder={isEnglish ? 'Search FMD, HS, BQ, LSD, Rabies...' : 'शोधा FMD, HS, BQ, लम्पी, रेबीज...'}
                            value={vaccineSearchQuery}
                            onChange={(e) => setVaccineSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-800 placeholder:text-stone-400 focus:outline-none"
                            autoFocus
                          />
                        </div>

                        {/* Vaccine List */}
                        <div className="max-h-60 overflow-y-auto divide-y divide-stone-100">
                          {VACCINE_REGISTRY.filter((v) => {
                            if (!vaccineSearchQuery.trim()) return true;
                            const q = vaccineSearchQuery.toLowerCase();
                            return (
                              v.key.toLowerCase().includes(q) ||
                              v.code.toLowerCase().includes(q) ||
                              v.name.en.toLowerCase().includes(q) ||
                              v.name.hi.toLowerCase().includes(q) ||
                              v.name.mr.toLowerCase().includes(q)
                            );
                          }).map((v) => (
                            <div
                              key={v.id}
                              onClick={() => handleSelectVaccineDropdown(v)}
                              className="p-2.5 hover:bg-emerald-50 cursor-pointer transition flex items-start justify-between gap-2"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-xs text-slate-900">{v.key}</span>
                                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                    {v.defaultIntervalMonths === 12
                                      ? (isEnglish ? 'Annual' : 'वार्षिक')
                                      : `${v.defaultIntervalMonths} ${isEnglish ? 'Months' : 'महिने'}`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug">
                                  {v.name[currentLang] || v.name.en}
                                </p>
                              </div>
                              {selectedVaccineKey === v.key && (
                                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Field 2: Date Administered */}
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Date Administered *' : isMarathi ? 'दिलेली तारीख *' : 'दी गई तारीख *'}
                    </label>
                    <input
                      type="date"
                      value={newVaccineDateAdministered}
                      onChange={(e) => handleDateAdministeredChange(e.target.value)}
                      required
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Field 3: Next Due Date (Auto-calculated but editable) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-emerald-950 block">
                        {isEnglish ? 'Next Due Date' : isMarathi ? 'पुढील नियोजित तारीख' : 'अगली नियत तारीख'}
                      </label>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {isEnglish ? 'Auto-calc' : 'आपोआप'}
                      </span>
                    </div>
                    <input
                      type="date"
                      value={newVaccineNextDue}
                      onChange={(e) => setNewVaccineNextDue(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Field 4: Dose Number */}
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Dose Number' : isMarathi ? 'डोस क्रमांक' : 'खुराक (डोज)'}
                    </label>
                    <select
                      value={newVaccineDose}
                      onChange={(e) => setNewVaccineDose(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      {DOSE_NUMBER_OPTIONS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d[currentLang] || d.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field 5: Batch Number */}
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Batch Number' : isMarathi ? 'बॅच नंबर' : 'बैच संख्या'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEnglish ? 'e.g. BATCH-2026-09' : 'उदा. BATCH-2026-09'}
                      value={newVaccineBatch}
                      onChange={(e) => setNewVaccineBatch(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Field 6: Administered By (Veterinarian) */}
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Administered By (Veterinarian)' : isMarathi ? 'पशुवैद्यकाचे नाव' : 'पशु चिकित्सक / डॉक्टर'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEnglish ? 'e.g. Dr. Suresh Kulkarni' : 'उदा. डॉ. सुरेश कुलकर्णी'}
                      value={newVaccineAdministeredBy}
                      onChange={(e) => setNewVaccineAdministeredBy(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Field 7: Vaccination Camp (Optional) */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-emerald-950 block">
                        {isEnglish ? 'Vaccination Camp / Programme (Optional)' : isMarathi ? 'लसीकरण शिबिर / योजना' : 'टीकाकरण शिविर / कार्यक्रम'}
                      </label>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {isEnglish ? 'Tap preset:' : 'निवडा:'}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder={isEnglish ? 'e.g. NADCP Free Govt Drive' : 'उदा. राष्ट्रीय लाळखुरी निर्मूलन मोहीम'}
                      value={newVaccineCamp}
                      onChange={(e) => setNewVaccineCamp(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {['NADCP Govt Drive', 'Gram Panchayat Camp', 'Pre-Monsoon Drive', 'Private Clinic'].map((campName) => (
                        <button
                          key={campName}
                          type="button"
                          onClick={() => setNewVaccineCamp(campName)}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-900 border border-emerald-200 transition cursor-pointer"
                        >
                          + {campName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field 8: Notes */}
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      {isEnglish ? 'Notes / Observations' : isMarathi ? 'नोंदी / निरीक्षण' : 'टिप्पणी / विवरण'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEnglish ? 'e.g. 2ml subcutaneous, healthy vitals' : 'उदा. २ मिली मान, निरोगी'}
                      value={newVaccineNotes}
                      onChange={(e) => setNewVaccineNotes(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2 border-t border-emerald-200/60">
                  <button
                    type="submit"
                    disabled={isSubmittingVaccine}
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    {isSubmittingVaccine ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isEnglish ? 'Saving...' : isMarathi ? 'जतन होत आहे...' : 'सुरक्षित हो रहा है...'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{isEnglish ? 'Save Vaccination Record' : isMarathi ? 'लस नोंद जतन करा' : 'टीका रिकॉर्ड सुरक्षित करें'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* AI Based Recommendation Dialogue Box Modal */}
      <AiRecommendationModal
        isOpen={showAiRecommendationDialog}
        onClose={() => {
          setShowAiRecommendationDialog(false);
          setSelectedAiScanForDialog(null);
        }}
        scanData={selectedAiScanForDialog || latestAiScan}
        animal={modalAnimal}
        currentLang={currentLang}
      />
    </div>
  );
}
