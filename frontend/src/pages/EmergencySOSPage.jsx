import React, { useState } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  Camera,
  Mic,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Truck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import emergencyService, { EMERGENCY_STAGES } from '../services/emergencyService';
import voiceService, { INDIAN_LANGUAGES } from '../services/voiceService';

export default function EmergencySOSPage() {
  const { t, i18n } = useTranslation();
  const [activeSOS, setActiveSOS] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLangKey = (i18n.language || 'hi').split('-')[0];
  const activeLangCode = INDIAN_LANGUAGES.find((l) => l.key === activeLangKey)?.code || 'hi-IN';

  // Form Fields
  const [animalName, setAnimalName] = useState('');
  const [species, setSpecies] = useState('Cattle');
  const [location, setLocation] = useState('Malegaon, Baramati, Pune (GPS Detected)');
  const [urgency, setUrgency] = useState('Critical');
  const [symptoms, setSymptoms] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Recent SOS records
  const [sosList, setSosList] = useState(emergencyService.getAllSOS());

  const handleVoiceRecord = () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      voiceService.startListening({
        langCode: activeLangCode,
        onResult: (transcript) => {
          setSymptoms(transcript);
        },
        onError: () => setIsRecording(false),
        onEnd: () => setIsRecording(false)
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const created = emergencyService.createEmergencySOS({
        animalName: animalName || 'गौमाता / पशु',
        species,
        location,
        urgency,
        symptoms: symptoms || 'तीव्र आपातकालीन स्थिति',
        photo: photoPreview,
        voiceNote: isRecording
      });

      setActiveSOS(created);
      setSosList(emergencyService.getAllSOS());
      setIsSubmitting(false);
    }, 800);
  };

  const handleSimulateNextStage = () => {
    if (!activeSOS) return;
    const nextIdx = Math.min(4, activeSOS.statusIndex + 1);
    const updated = emergencyService.updateSOSStatus(activeSOS.id, nextIdx);
    setActiveSOS(updated);
    setSosList(emergencyService.getAllSOS());
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Emergency SOS Banner */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-rose-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
                <span>24×7 {t('nav.emergency_sos')}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black">
                🚨 {t('nav.emergency_sos')}
              </h1>
              <p className="text-xs sm:text-sm text-red-100 max-w-xl leading-relaxed">
                {activeLangKey === 'en'
                  ? 'Emergency triage and response for severe livestock distress: bloat, poison, respiratory failure, or dystocia. Dispatch 1962 mobile ambulance.'
                  : activeLangKey === 'mr'
                  ? 'गंभीर पशु आरोग्याच्या समस्येसाठी त्वरित प्रतिसाद: विषबाधा, पोटफुगी किंवा श्वसन विकार. १९६२ फिरती रुग्णवाहिका सेवा.'
                  : 'पशुओं की गंभीर आपातकालीन स्थिति: पेट फूलना, जहर, श्वसन विफलता के लिए तुरंत 1962 पशु एम्बुलेंस सेवा प्राप्त करें।'}
              </p>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <a
                href="tel:1962"
                className="inline-flex items-center gap-2 bg-white hover:bg-red-50 text-red-700 font-black text-base sm:text-lg px-6 py-3 rounded-2xl shadow-lg transition transform active:scale-95"
              >
                <PhoneCall className="w-5 h-5 animate-pulse" />
                <span>{activeLangKey === 'en' ? 'Call: 1962' : activeLangKey === 'mr' ? 'कॉल करा: १९६२' : 'कॉल करें: 1962'}</span>
              </a>
              <span className="text-[10px] text-red-200 block mt-1">
                {activeLangKey === 'en' ? 'Toll-Free National Helpline' : activeLangKey === 'mr' ? 'टोल-फ्री राष्ट्रीय आपत्कालीन क्रमांक' : 'टोल-फ्री राष्ट्रीय आपातकालीन नंबर'}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE SOS STATUS TIMELINE (If an emergency is active) */}
        {activeSOS && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-red-500 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                  {activeLangKey === 'en' ? 'Live Emergency Tracking' : activeLangKey === 'mr' ? 'सक्रिय आपत्कालीन देखरेख' : 'सक्रिय आपातकालीन स्थिति'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {activeLangKey === 'en' ? 'Case #' : activeLangKey === 'mr' ? 'केस क्रमांक: ' : 'केस संख्या: '} {activeSOS.id} ({activeSOS.animalName})
                </h2>
                <p className="text-xs text-slate-500">{activeLangKey === 'en' ? 'Location: ' : 'स्थान: '} {activeSOS.location}</p>
              </div>

              <div className="text-right">
                <span className="bg-red-100 text-red-800 text-xs font-black px-3 py-1 rounded-full border border-red-300">
                  {EMERGENCY_STAGES[activeSOS.statusIndex].label}
                </span>
                <span className="text-xs text-emerald-700 font-bold block mt-1">
                  {activeLangKey === 'en'
                    ? `Estimated Ambulance ETA: ~${activeSOS.ambulanceEtaMinutes} mins`
                    : activeLangKey === 'mr'
                    ? `अंदाजे रुग्णवाहिका वेळ: ~${activeSOS.ambulanceEtaMinutes} मिनिटे`
                    : `अनुमानित एम्बुलेंस समय: ~${activeSOS.ambulanceEtaMinutes} मिनट`}
                </span>
              </div>
            </div>

            {/* 5-Step Visual Progression Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {EMERGENCY_STAGES.map((stage, idx) => {
                const isPassed = idx < activeSOS.statusIndex;
                const isCurrent = idx === activeSOS.statusIndex;

                return (
                  <div
                    key={stage.key}
                    className={`p-3.5 rounded-2xl border text-center transition ${
                      isCurrent
                        ? 'bg-red-600 text-white border-red-600 shadow-md ring-4 ring-red-100'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-stone-50 text-slate-400 border-stone-200'
                    }`}
                  >
                    <div className="text-xs font-black mb-1">चरण {idx + 1}</div>
                    <div className="text-xs font-bold leading-snug">{stage.labelHi}</div>
                    <div className="text-[10px] mt-1 opacity-80">{stage.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Assigned Doctor / Ambulance Info */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{activeSOS.assignedDoctor}</h4>
                  <p className="text-xs text-slate-500">संपर्क: {activeSOS.doctorContact}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${activeSOS.doctorContact}`}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> डॉक्टर को कॉल करें
                </a>
                <button
                  onClick={handleSimulateNextStage}
                  className="bg-stone-200 hover:bg-stone-300 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  अगला चरण सिमुलेट करें →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SOS SUBMISSION FORM */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200 space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h2 className="text-xl font-extrabold text-slate-950">
              {activeLangKey === 'en' ? 'Submit Emergency SOS Alert' : activeLangKey === 'mr' ? 'नवीन आपत्कालीन अलर्ट नोंदवा' : 'नया आपातकालीन अलर्ट दर्ज करें'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeLangKey === 'en'
                ? 'Immediate notification will be dispatched to nearby veterinary officers and mobile ambulance teams.'
                : activeLangKey === 'mr'
                ? 'नजीकच्या सर्व पशुवैद्यकीय अधिकारी आणि रुग्णवाहिका पथकाला त्वरित माहिती पाठवली जाईल.'
                : 'सभी निकटवर्ती पशु चिकित्सा अधिकारियों और एम्बुलेंस दल को तुरंत सूचना भेजी जाएगी।'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeLangKey === 'en' ? 'Livestock Species:' : activeLangKey === 'mr' ? 'पशु प्रजात:' : 'पशु प्रजाति:'}
                </label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="Cattle">{activeLangKey === 'en' ? 'Cattle / Cow' : 'गाय'}</option>
                  <option value="Buffalo">{activeLangKey === 'en' ? 'Buffalo' : activeLangKey === 'mr' ? 'म्हैस' : 'भैंस'}</option>
                  <option value="Goat">{activeLangKey === 'en' ? 'Goat' : activeLangKey === 'mr' ? 'शेळी' : 'बकरी'}</option>
                  <option value="Sheep">{activeLangKey === 'en' ? 'Sheep' : activeLangKey === 'mr' ? 'मेंढी' : 'भेड़'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeLangKey === 'en' ? 'Animal Name or Tag ID:' : activeLangKey === 'mr' ? 'जनावराचे नाव किंवा टॅग:' : 'पशु का नाम या टैग:'}
                </label>
                <input
                  type="text"
                  placeholder={activeLangKey === 'en' ? 'e.g. Gauri / MH-12-P-1001' : activeLangKey === 'mr' ? 'उदा. गौरी / MH-12-P-1001' : 'उदा. लक्ष्मी / MH-12-P-1001'}
                  value={animalName}
                  onChange={(e) => setAnimalName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {activeLangKey === 'en' ? 'Current Location (GPS):' : activeLangKey === 'mr' ? 'सध्याचे स्थान (GPS):' : 'वर्तमान स्थान (GPS):'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3.5 py-2.5 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <MapPin className="w-4 h-4 text-red-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  आपातकालीन लक्षण (Symptoms & Distress):
                </label>
                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-lg transition ${
                    isRecording ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  {isRecording ? 'सुन रहा हूं...' : 'बोलकर बताएं'}
                </button>
              </div>
              <textarea
                rows={3}
                required
                placeholder="पशु की गंभीर स्थिति बताएं (उदा. पेट में भयंकर अफारा है, सांस नहीं ले पा रही, मुंह से झाग निकल रहा है)..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-4 rounded-2xl shadow-lg shadow-red-600/30 transition transform active:scale-95"
            >
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span>{isSubmitting ? 'अलर्ट भेजा जा रहा है...' : '🚨 आपातकालीन SOS भेजें (Send Emergency SOS)'}</span>
            </button>
          </form>
        </div>

        {/* Previous Emergency Alerts List */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base">
            हाल के आपातकालीन रिकॉर्ड (Recent SOS History)
          </h3>
          <div className="space-y-3">
            {sosList.map((sos) => (
              <div
                key={sos.id}
                className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{sos.id}</span>
                    <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                      {sos.animalName} ({sos.species})
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{sos.symptoms}</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                    {EMERGENCY_STAGES[sos.statusIndex]?.label || 'सक्रिय'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">{sos.assignedDoctor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
