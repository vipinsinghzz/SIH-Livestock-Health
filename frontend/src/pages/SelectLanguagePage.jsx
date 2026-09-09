import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Volume2,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  {
    key: 'hi',
    code: 'hi-IN',
    nativeName: 'हिंदी',
    englishName: 'Hindi',
    badge: 'राष्ट्रीय भाषा',
    tagline: 'सरल एवं सुगम किसान भाषा',
    description: 'पशु स्वास्थ्य पहचान, किसान साथी आवाज़ सहायक, सरकारी योजनाएं और सभी परामर्श हिंदी में देखें।',
    greeting: 'नमस्ते! पशु साथी में आपका स्वागत है।',
    features: ['पूर्ण हिंदी समर्थन', 'किसान साथी वॉइस असिस्टेंट', 'AI रोग पहचान']
  },
  {
    key: 'en',
    code: 'en-IN',
    nativeName: 'English',
    englishName: 'English',
    badge: 'Global Standard',
    tagline: 'Official Veterinary & Diagnostic Mode',
    description: 'Access AI disease detection, veterinary clinical triage, surveillance maps and official alerts in English.',
    greeting: 'Welcome to Livestock Saathi veterinary platform.',
    features: ['Full English UI', 'Clinical Triage Reports', 'GIS Disease Mapping']
  },
  {
    key: 'mr',
    code: 'mr-IN',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    badge: 'राज्यभाषा महाराष्ट्र',
    tagline: 'महाराष्ट्रातील पशुपालकांसाठी सुलभ',
    description: 'पशु आरोग्य तपासणी, किसान साथी आवाज सहाय्यक, शासकीय योजना आणि सर्व माहिती मराठीत पहा.',
    greeting: 'नमस्कार! पशु साथी पोर्टलवर आपले स्वागत आहे.',
    features: ['मराठी भाषेचा पूर्ण पाठिंबा', 'किसान साथी व्हॉईस असिस्टंट', 'त्वरित डॉक्टर संपर्क']
  }
];

export default function SelectLanguagePage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect') || searchParams.get('next');
  const flowParam = searchParams.get('flow');
  const isPreRegistration =
    redirectParam === '/register' ||
    flowParam === 'register' ||
    location.state?.flow === 'register' ||
    location.state?.from?.pathname === '/register';

  const currentLangKey = (i18n.language || 'hi').split('-')[0];
  const [selectedLang, setSelectedLang] = useState(currentLangKey);
  const [savedNotice, setSavedNotice] = useState(false);

  const proceedNext = (langKey = selectedLang) => {
    sessionStorage.setItem('livestock_lang_confirmed_reg', 'true');
    if (isPreRegistration) {
      navigate('/register', {
        state: { fromLanguageSelect: true, selectedLanguage: langKey }
      });
    } else {
      const target = redirectParam || location.state?.from?.pathname || '/';
      navigate(target);
    }
  };

  const handleSelectLanguage = (langKey, andContinue = false) => {
    setSelectedLang(langKey);
    i18n.changeLanguage(langKey);
    localStorage.setItem('i18nextLng', langKey);
    localStorage.setItem('livestock_saathi_lang', langKey);
    sessionStorage.setItem('livestock_lang_confirmed_reg', 'true');

    // Update user local cache if logged in
    if (user) {
      try {
        const updatedUser = { ...user, preferredLanguage: langKey };
        localStorage.setItem('pashurakshak_user', JSON.stringify(updatedUser));
      } catch (e) {}
    }

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);

    if (andContinue) {
      proceedNext(langKey);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Pre-Registration Visual Stepper */}
        {isPreRegistration && (
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-2.5 px-4 bg-emerald-50/90 rounded-2xl border border-emerald-200 text-xs font-bold shadow-xs">
            <div className="flex items-center gap-1.5 text-emerald-900">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px] font-black">
                1
              </span>
              <span>
                {selectedLang === 'hi'
                  ? 'चरण 1: भाषा का चयन'
                  : selectedLang === 'mr'
                  ? 'टप्पा १: भाषा निवडा'
                  : 'Step 1: Choose Language'}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-slate-600 flex items-center justify-center text-[11px] font-black">
                2
              </span>
              <span>
                {selectedLang === 'hi'
                  ? 'चरण 2: खाता पंजीकरण व जीपीएस'
                  : selectedLang === 'mr'
                  ? 'टप्पा २: खाते नोंदणी व जीपीएस'
                  : 'Step 2: Registration & GPS'}
              </span>
            </div>
          </div>
        )}

        {/* Brand Header with Trilingual Title */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-sm shadow-emerald-700/20 border border-emerald-800">
            <Globe className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isPreRegistration
                ? 'पंजीकरण से पहले भाषा चुनें • Choose Language First • नोंदणीपूर्वी भाषा निवडा'
                : 'अपनी पसंदीदा भाषा चुनें • Choose Language • भाषा निवडा'}
            </h1>
            <p className="mt-1 text-sm font-bold text-emerald-800 font-indic">
              LIVESTOCK SAATHI • स्वस्थ पशु • समृद्ध किसान
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
              {isPreRegistration ? (
                <>
                  आपकी चुनी गई भाषा में पंजीकरण फॉर्म, किसान साथी आवाज़ और पूरी वेबसाइट दिखाई देगी।
                  <br />
                  <span className="text-[11px] text-slate-400">
                    Your chosen language will apply to your registration form, AI voice assistant, and the entire website.
                  </span>
                </>
              ) : (
                <>
                  यह भाषा पूरी वेबसाइट, AI रोग जांच, किसान साथी आवाज़ और सभी सूचनाओं पर लागू होगी।
                  <br />
                  <span className="text-[11px] text-slate-400">
                    This language will be applied across the entire platform, voice assistant & disease surveillance.
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Trilingual Notice Banner */}
        {savedNotice && (
          <div className="p-3.5 bg-emerald-100 border border-emerald-300 rounded-2xl text-xs text-emerald-950 font-bold flex items-center justify-center gap-2 transition animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              भाषा सफलतापूर्वक बदल गई! • Language updated successfully! • भाषा यशस्वीरीत्या बदलली!
            </span>
          </div>
        )}

        {/* 3 Prominent Language Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.key;

            return (
              <div
                key={lang.key}
                onClick={() => handleSelectLanguage(lang.key, false)}
                className={`cursor-pointer rounded-3xl p-5 border-2 transition-all duration-200 flex flex-col justify-between space-y-4 bg-white shadow-xs hover:shadow-md ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50/20'
                    : 'border-stone-200 hover:border-emerald-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-slate-700 border border-stone-200">
                      {lang.badge}
                    </span>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> सक्रिय (Active)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">क्लिक करें</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {lang.nativeName}
                    </h2>
                    <div className="text-xs font-semibold text-emerald-800">
                      {lang.englishName} • {lang.tagline}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {lang.description}
                  </p>

                  <div className="mt-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-[11px] text-slate-700 italic">
                    "{lang.greeting}"
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {lang.features.map((feat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-stone-100 text-slate-600 font-medium"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLanguage(lang.key, isPreRegistration);
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-slate-800'
                    }`}
                  >
                    <span>
                      {isPreRegistration
                        ? lang.key === 'hi'
                          ? 'हिंदी चुनें व आगे बढ़ें'
                          : lang.key === 'mr'
                          ? 'मराठी निवडा व पुढे जा'
                          : 'Select English & Continue'
                        : lang.key === 'hi'
                        ? 'हिंदी चुनें (Select Hindi)'
                        : lang.key === 'mr'
                        ? 'मराठी निवडा (Select Marathi)'
                        : 'Select English'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Persistence Note & Continue Button */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>
                वर्तमान चयनित भाषा: <strong className="text-emerald-800">{selectedLang === 'hi' ? 'हिंदी (Hindi)' : selectedLang === 'mr' ? 'मराठी (Marathi)' : 'English'}</strong>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isPreRegistration
                ? 'पंजीकरण के बाद भी आप कभी भी ऊपरी नेविगेशन बार में "🌐 भाषा" पर क्लिक करके भाषा बदल सकते हैं।'
                : 'आप कभी भी ऊपरी नेविगेशन बार में "🌐 भाषा" पर क्लिक करके भाषा बदल सकते हैं।'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => proceedNext(selectedLang)}
            className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-xs cursor-pointer"
          >
            <span>
              {isPreRegistration
                ? selectedLang === 'hi'
                  ? 'पंजीकरण के लिए आगे बढ़ें'
                  : selectedLang === 'mr'
                  ? 'नोंदणीसाठी पुढे जा'
                  : 'Continue to Registration'
                : selectedLang === 'hi'
                ? 'वेबसाइट पर आगे बढ़ें'
                : selectedLang === 'mr'
                ? 'वेबसाईटवर पुढे जा'
                : 'Continue to Website'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick links to core sections */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-4 pt-2">
          <Link to="/" className="text-emerald-700 hover:underline font-semibold">
            {selectedLang === 'hi' ? 'होम पेज' : selectedLang === 'mr' ? 'मुख्य पृष्ठ' : 'Home'}
          </Link>
          <span>•</span>
          <Link to="/login" className="text-emerald-700 hover:underline font-semibold">
            {selectedLang === 'hi' ? 'लॉग इन' : selectedLang === 'mr' ? 'लॉगिन करा' : 'Sign In'}
          </Link>
          <span>•</span>
          <Link to="/report-sick" className="text-emerald-700 hover:underline font-semibold">
            {selectedLang === 'hi' ? 'रोग जांच' : selectedLang === 'mr' ? 'आजार तपासणी' : 'Disease Triage'}
          </Link>
        </div>
      </div>
    </div>
  );
}
