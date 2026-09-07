import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  Send,
  Languages,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import voiceService, { INDIAN_LANGUAGES } from '../services/voiceService';
import chatService from '../services/chatService';
import VoiceWaveform from '../components/VoiceWaveform';
import { useAuth } from '../context/AuthContext';

export default function KisanSaathiPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const farmerName = user?.name || 'किसान मित्र';

  const currentKey = (i18n.language || 'hi').split('-')[0];
  const matchedLang = INDIAN_LANGUAGES.find((l) => l.key === currentKey) || INDIAN_LANGUAGES[0];

  const [selectedLang, setSelectedLang] = useState(matchedLang.code);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'm-1',
      sender: 'saathi',
      text: chatService.getInitialGreeting(currentKey, farmerName),
      timestamp: 'Live'
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync state whenever global language changes from Navbar
  useEffect(() => {
    const k = (i18n.language || 'hi').split('-')[0];
    const l = INDIAN_LANGUAGES.find((item) => item.key === k);
    if (l && l.code !== selectedLang) {
      setSelectedLang(l.code);
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].sender === 'saathi') {
          return [{
            id: 'm-1',
            sender: 'saathi',
            text: chatService.getInitialGreeting(k, farmerName),
            timestamp: 'Live'
          }];
        }
        return prev;
      });
    }
  }, [i18n.language]);

  const handleLanguageChange = (code) => {
    setSelectedLang(code);
    const l = INDIAN_LANGUAGES.find((item) => item.code === code);
    if (l) {
      i18n.changeLanguage(l.key);
      try {
        localStorage.setItem('i18nextLng', l.key);
      } catch (e) {}
      if (messages.length === 1 && messages[0].sender === 'saathi') {
        setMessages([{
          id: 'm-1',
          sender: 'saathi',
          text: chatService.getInitialGreeting(l.key, farmerName),
          timestamp: 'Live'
        }]);
      }
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = {
      id: 'm-' + Date.now(),
      sender: 'farmer',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    const langCode = selectedLang.split('-')[0];
    const reply = await chatService.sendMessage(text, langCode);

    const saathiMsg = {
      id: 'm-' + (Date.now() + 1),
      sender: 'saathi',
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, saathiMsg]);

    setIsSpeaking(true);
    voiceService.speak(reply, selectedLang, () => {
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
          setInputText(transcript);
          if (isFinal) {
            setIsRecording(false);
            handleSendMessage(transcript);
          }
        },
        onError: () => setIsRecording(false),
        onEnd: () => setIsRecording(false)
      });
    }
  };

  const handleReplay = (text) => {
    setIsSpeaking(true);
    voiceService.speak(text, selectedLang, () => {
      setIsSpeaking(false);
    });
  };

  // Quick suggestion chips based on active language
  const quickQuestions = {
    hi: ['चारा नहीं खा रही', 'दूध बढ़ाने के उपाय', 'बुखार उपचार', 'PKCC लोन योजना'],
    en: ['Not eating feed', 'How to increase milk', 'Fever first aid', 'PKCC loan details'],
    mr: ['चारा खात नाही', 'दूध वाढीचे उपाय', 'तापावर उपचार', 'PKCC कर्ज योजना'],
    gu: ['ચારો ખાતી નથી', 'દૂધ વધારવાના ઉપાય', 'તાવ સારવાર', 'PKCC લોન યોજના'],
    pa: ['ਪੱਠੇ ਨਹੀਂ ਖਾ ਰਿਹਾ', 'ਦੁੱਧ ਵਧਾਉਣ ਦੇ ਤਰੀਕੇ', 'ਬੁਖ਼ਾਰ ਇਲਾਜ', 'PKCC ਲੋਨ'],
    bn: ['খাবার খাচ্ছে না', 'দুধ বাড়ানোর উপায়', 'জ্বরের চিকিৎসা', 'PKCC ঋণ'],
    ta: ['தீவனம் சாப்பிடவில்லை', 'பால் அதிகரிக்க வழி', 'காய்ச்சல் முதலுதவி', 'PKCC கடன்'],
    te: ['మేత తినడం లేదు', 'పాలు పెంచే మార్గాలు', 'జ్వరం చికిత్స', 'PKCC రుణం'],
    kn: ['ಮೇವು ತಿನ್ನುತ್ತಿಲ್ಲ', 'ಹಾಲು ಹೆಚ್ಚಿಸಲು ಕ್ರಮ', 'ಜ್ವರಕ್ಕೆ ಚಿಕಿತ್ಸೆ', 'PKCC ಸಾಲ'],
    ml: ['തീറ്റ എടുക്കുന്നില്ല', 'പാൽ വർദ്ധിപ്പിക്കാൻ', 'പനി ചികിത്സ', 'PKCC വായ്പ'],
    or: ['ଘାସ ଖାଉନାହିଁ', 'କ୍ଷୀର ବଢ଼ାଇବା ଉପାୟ', 'ଜ୍ୱର ଚିକିତ୍ସା', 'PKCC ଋଣ']
  };

  const currentQuestions = quickQuestions[currentKey] || quickQuestions.hi;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fafaf9] py-4 px-3 sm:px-6 pb-24 lg:pb-8 flex flex-col justify-between max-w-3xl mx-auto">
      {/* Clean Chat Header */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">
            KS
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">{t('nav.kisan_saathi')}</h1>
            <p className="text-[11px] text-emerald-700 font-semibold">● {t('status.reported', 'Online')} • {t('wizard.voice_assistant', 'Voice Assistant')}</p>
          </div>
        </div>

        {/* Clean Language Selector */}
        <select
          value={selectedLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          aria-label="Select Assistant Language"
          className="bg-stone-50 border border-stone-200 text-xs font-semibold text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
        >
          {INDIAN_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Stream Container */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs p-4 sm:p-5 flex-grow overflow-y-auto space-y-3 min-h-[380px] max-h-[55vh]">
        {messages.map((m) => {
          const isSaathi = m.sender === 'saathi';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isSaathi ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                  isSaathi
                    ? 'bg-stone-50 text-slate-800 border border-stone-200'
                    : 'bg-emerald-700 text-white rounded-br-none'
                }`}
              >
                <p>{m.text}</p>
                <div
                  className={`flex items-center justify-between gap-3 mt-2 pt-1 border-t text-[10px] ${
                    isSaathi ? 'border-stone-200/70 text-slate-400' : 'border-emerald-600 text-emerald-100'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {isSaathi && (
                    <button
                      onClick={() => handleReplay(m.text)}
                      className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> {t('actions.listen', 'Listen')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Clean Audio Waveform Indicator */}
      {(isSpeaking || isRecording) && (
        <div className="my-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-semibold">
          <span>{isRecording ? t('kisan_saathi.listening', 'Listening... Please speak') : t('kisan_saathi.speaking', 'Kisan Saathi is speaking...')}</span>
          <VoiceWaveform isActive={true} barCount={12} color={isRecording ? 'bg-amber-500' : 'bg-emerald-600'} />
        </div>
      )}

      {/* Quick Suggestions & Input Controls */}
      <div className="mt-3 space-y-2">
        {/* Quick Question Chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {currentQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="bg-white hover:bg-stone-100 text-slate-700 px-3 py-1.5 rounded-full border border-stone-200 whitespace-nowrap text-[11px]"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Big Clean Mic and Text Input */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-2xs">
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
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t('kisan_saathi.placeholder', 'बोलें या अपनी भाषा में लिखें...')}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="p-2 text-emerald-700 hover:text-emerald-900 transition shrink-0"
            title={t('actions.submit', 'Send')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
