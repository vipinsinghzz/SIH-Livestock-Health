import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Mic,
  ShieldCheck,
  MapPin,
  Stethoscope,
  Building2,
  Syringe,
  AlertTriangle,
  WifiOff,
  ChevronRight,
  PhoneCall,
  Volume2,
  CheckCircle2,
  FileText,
  ArrowRight,
  Compass,
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VoiceWaveform from '../components/VoiceWaveform';
import voiceService, { INDIAN_LANGUAGES } from '../services/voiceService';
import chatService from '../services/chatService';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, i18n } = useTranslation();

  const currentKey = (i18n.language || 'hi').split('-')[0];
  const matchedLang = INDIAN_LANGUAGES.find((l) => l.key === currentKey) || INDIAN_LANGUAGES[0];

  // Kisan Saathi interactive voice state
  const [selectedLang, setSelectedLang] = useState(matchedLang.code);
  const [voiceInput, setVoiceInput] = useState(
    currentKey === 'en'
      ? 'My cow stopped eating feed since morning'
      : currentKey === 'mr'
      ? 'माझी गाय सकाळपासून चारा खात नाहीये'
      : 'मेरी गाय ने आज सुबह से चारा खाना बंद कर दिया है'
  );
  const [voiceOutput, setVoiceOutput] = useState(
    currentKey === 'en'
      ? 'Hello Kisan friend! Are the ears and muzzle unusually warm? Move the animal to shade and provide fresh water.'
      : currentKey === 'mr'
      ? 'नमस्कार शेतकरी मित्र! जनावराचे कान गरम लागत आहेत का? सावलीत बांधा आणि मुबलक स्वच्छ पाणी द्या.'
      : 'नमस्ते किसान भाई! क्या गाय के कान और थूथन छूने पर गर्म लग रहे हैं? उसे तुरंत छाया में बांधें और स्वच्छ पानी दें।'
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Sync state when global language changes
  useEffect(() => {
    const k = (i18n.language || 'hi').split('-')[0];
    const l = INDIAN_LANGUAGES.find((item) => item.key === k);
    if (l && l.code !== selectedLang) {
      setSelectedLang(l.code);
    }
  }, [i18n.language]);

  const handleLanguageSwitch = (code) => {
    setSelectedLang(code);
    const l = INDIAN_LANGUAGES.find((item) => item.code === code);
    if (l) {
      i18n.changeLanguage(l.key);
      try {
        localStorage.setItem('i18nextLng', l.key);
      } catch (e) {}

      // Update sample demo dialog
      const demoQuery = l.key === 'en'
        ? 'My cow stopped eating feed'
        : l.key === 'mr'
        ? 'माझी गाय चारा खात नाही'
        : l.key === 'gu'
        ? 'મારી ગાય ચારો ખાતી નથી'
        : l.key === 'ta'
        ? 'என் பசு தீவனம் சாப்பிடவில்லை'
        : l.key === 'te'
        ? 'నా ఆవు మేత తినడం లేదు'
        : 'मेरी गाय चारा नहीं खा रही';

      setVoiceInput(demoQuery);
      chatService.sendMessage(demoQuery, l.key).then((reply) => {
        setVoiceOutput(reply);
      });
    }
  };

  const handleSpeakDemo = () => {
    setIsSpeaking(true);
    voiceService.speak(voiceOutput, selectedLang, () => {
      setIsSpeaking(false);
    });
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      voiceService.startListening({
        langCode: selectedLang,
        onResult: (transcript, isFinal) => {
          setVoiceInput(transcript);
          if (isFinal) {
            setIsRecording(false);
            const langKey = selectedLang.split('-')[0];
            chatService.sendMessage(transcript, langKey).then((reply) => {
              setVoiceOutput(reply);
              voiceService.speak(reply, selectedLang);
            });
          }
        },
        onError: () => setIsRecording(false),
        onEnd: () => setIsRecording(false)
      });
    }
  };

  const handleSampleQuery = (queryText) => {
    setVoiceInput(queryText);
    const langKey = selectedLang.split('-')[0];
    chatService.sendMessage(queryText, langKey).then((reply) => {
      setVoiceOutput(reply);
      voiceService.speak(reply, selectedLang);
    });
  };

  const handleQuickLogin = async (email, password) => {
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      navigate('/login');
    }
  };

  const demoChips = {
    hi: ['चारा नहीं खा रही', 'दूध बढ़ाने के उपाय', 'बुखार प्राथमिक उपचार'],
    en: ['Not eating feed', 'How to increase milk', 'Fever first aid'],
    mr: ['चारा खात नाही', 'दूध वाढीचे उपाय', 'तापावर उपचार'],
    gu: ['ચારો ખાતી નથી', 'દૂધ વધારવાના ઉપાય', 'તાવ સારવાર'],
    pa: ['ਪੱਠੇ ਨਹੀਂ ਖਾ ਰਿਹਾ', 'ਦੁੱਧ ਵਧਾਉਣ ਦੇ ਤਰੀਕੇ', 'ਬੁਖ਼ਾਰ ਇਲਾਜ'],
    bn: ['খাবার খাচ্ছে না', 'দুধ বাড়ানোর উপায়', 'জ্বরের চিকিৎসা'],
    ta: ['தீவனம் சாப்பிடவில்லை', 'பால் அதிகரிக்க வழி', 'காய்ச்சல் முதலுதவி'],
    te: ['మేత తినడం లేదు', 'పాలు పెంచే మార్గాలు', 'జ్వరం చికిత్స'],
    kn: ['ಮೇವು ತಿನ್ನುತ್ತಿಲ್ಲ', 'ಹಾಲು ಹೆಚ್ಚಿಸಲು ಕ್ರಮ', 'ಜ್ವರಕ್ಕೆ ಚಿಕಿತ್ಸೆ'],
    ml: ['തീറ്റ എടുക്കുന്നില്ല', 'പാൽ വർദ്ധിപ്പിക്കാൻ', 'പനി ചികിത്സ'],
    or: ['ଘାସ ଖାଉନାହିଁ', 'କ୍ଷୀର ବଢ଼ାଇବା ଉପାୟ', 'ଜ୍ୱର ଚିକିତ୍ସା']
  };

  const activeChips = demoChips[currentKey] || demoChips.hi;

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 font-sans">
      {/* Clean Top Helpline Bar */}
      <div className="bg-emerald-800 text-white text-xs py-2 px-4 border-b border-emerald-900">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" /> 1962
            </span>
            <span className="text-emerald-200 hidden sm:inline">
              • {t('landing.helpline')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-200 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t('landing.language')}:
            </span>
            <select
              value={selectedLang}
              onChange={(e) => handleLanguageSwitch(e.target.value)}
              className="bg-emerald-900 text-white rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
            >
              {INDIAN_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* HERO SECTION — Clean, Open & Airy */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-stone-200/80 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
                <span>{t('landing.hero_tag')}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {t('landing.hero_title')}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                {t('landing.hero_subtitle')}
              </p>

              {/* Clean CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  to="/select-language?redirect=/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3.5 rounded-xl transition shadow-xs text-sm"
                >
                  <span>{t('landing.start_free')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#kisan-saathi"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 text-slate-800 font-bold px-6 py-3.5 rounded-xl border border-stone-300 transition text-sm"
                >
                  <Mic className="w-4 h-4 text-emerald-700" />
                  <span>{t('landing.talk_saathi')}</span>
                </a>
              </div>

              {/* Simple Stats Strip */}
              <div className="pt-6 border-t border-stone-100 grid grid-cols-3 gap-4 text-left max-w-md mx-auto lg:mx-0">
                <div>
                  <div className="text-2xl font-black text-slate-900">10k+</div>
                  <div className="text-xs text-slate-500">{t('landing.stat_records')}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">11</div>
                  <div className="text-xs text-slate-500">{t('landing.stat_languages')}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">100%</div>
                  <div className="text-xs text-slate-500">{t('landing.stat_free')}</div>
                </div>
              </div>
            </div>

            {/* Right Card: Clean Livestock Card Preview */}
            <div className="lg:col-span-5">
              <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🐄</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">लक्ष्मी (Lakshmi)</h3>
                      <p className="text-xs text-slate-500">Gir Cow • 4 {t('farmer_dash.years')} • Sehore</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                    {t('landing.preview_tag')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="text-slate-400 block text-[10px]">{t('landing.preview_milk')}</span>
                    <span className="font-bold text-slate-900 text-sm">14.5 L</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="text-slate-400 block text-[10px]">{t('landing.preview_temp')}</span>
                    <span className="font-bold text-slate-900 text-sm">101.8°F</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="text-slate-400 block text-[10px]">{t('landing.preview_vaccine')}</span>
                    <span className="font-bold text-emerald-700 text-sm">{t('landing.preview_updated')}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>{t('landing.preview_triage')}</span>
                    <span className="text-emerald-700 text-[10px]">{t('landing.preview_accuracy')}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {t('landing.preview_healthy_note')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 VALUE PROPOSITIONS — Clean, Simple Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#fafaf9]">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              {t('landing.core_pillars')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {t('landing.core_title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t('landing.pillar1_title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('landing.pillar1_desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t('landing.pillar2_title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('landing.pillar2_desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t('landing.pillar3_title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('landing.pillar3_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KISAN SAATHI VOICE SECTION — Clean Light Style */}
      <section id="kisan-saathi" className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-stone-200">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {t('landing.stat_languages')} • Voice First
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {t('landing.saathi_demo_title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              {t('landing.saathi_demo_subtitle')}
            </p>
          </div>

          <div className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-6">
            {/* Language Selector row: All 11 languages */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-stone-200 pb-4">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-700" /> {t('landing.language')}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INDIAN_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleLanguageSwitch(l.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                      selectedLang === l.code
                        ? 'bg-emerald-700 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-700 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {l.flag} {l.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Farmer Question */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                {t('roles.farmer')} Question:
              </span>
              <div className="bg-white p-4 rounded-2xl border border-stone-200 text-xs sm:text-sm text-slate-900 font-medium">
                "{voiceInput}"
              </div>
            </div>

            {/* Assistant Answer */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">
                  {t('nav.kisan_saathi')} Answer:
                </span>
                <button
                  onClick={handleSpeakDemo}
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline"
                >
                  <Volume2 className="w-3.5 h-3.5" /> {t('actions.listen')}
                </button>
              </div>
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 whitespace-pre-line leading-relaxed">
                {voiceOutput}
              </div>
            </div>

            {/* Center Microphone Button */}
            <div className="pt-2 flex flex-col items-center justify-center gap-3">
              <button
                onClick={handleToggleRecord}
                className={`px-8 py-3.5 rounded-2xl font-extrabold text-sm transition transform active:scale-95 flex items-center gap-2.5 shadow-sm ${
                  isRecording
                    ? 'bg-amber-500 text-slate-950 animate-pulse ring-4 ring-amber-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                <Mic className="w-5 h-5" />
                <span>{isRecording ? t('landing.mic_listening') : t('landing.mic_tap_speak')}</span>
              </button>

              {/* Sample Quick Questions */}
              <div className="flex flex-wrap justify-center gap-2 pt-1 text-xs">
                {activeChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSampleQuery(chip)}
                    className="bg-white hover:bg-stone-100 text-slate-700 px-3 py-1.5 rounded-xl border border-stone-200 text-xs"
                  >
                    "{chip}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK DEMO PERSONAS FOR EVALUATORS */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-100/70 border-b border-stone-200">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {t('landing.evaluator_sub')}
          </span>
          <h3 className="text-lg font-extrabold text-slate-900">
            {t('landing.evaluator_title')}
          </h3>
          <div className="flex flex-wrap justify-center gap-2.5 pt-1">
            <button
              onClick={() => handleQuickLogin('farmer@pashurakshak.in', 'Farmer@123')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              🌾 रमेश पाटिल (Baramati - 3 गाय/भैंस)
            </button>
            <button
              onClick={() => handleQuickLogin('santosh@pashurakshak.in', 'Farmer@123')}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              🌾 संतोष शिंदे (Shirur - 2 बकरी/बैल)
            </button>
            <button
              onClick={() => handleQuickLogin('vet@pashurakshak.in', 'Vet@123')}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              🩺 डॉ. अनन्या (Field Vet)
            </button>
            <button
              onClick={() => handleQuickLogin('officer@pashurakshak.in', 'Admin@123')}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              🏛️ डॉ. सुरेश (District Officer)
            </button>
            <Link
              to="/select-language?redirect=/register"
              className="bg-white hover:bg-stone-50 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl border border-stone-300 transition shadow-2xs"
            >
              ➕ नया किसान बनाएं (Register New Farm)
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 text-center text-xs text-slate-500 bg-white">
        <p>© 2026 Livestock Saathi • {t('tagline')}</p>
        <p className="text-[11px] text-slate-400 mt-1">
          {t('landing.footer_sub')}
        </p>
      </footer>
    </div>
  );
}
