// Voice Service for Kisan Saathi (SpeechRecognition & SpeechSynthesis)

export const INDIAN_LANGUAGES = [
  { code: 'hi-IN', key: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'en-IN', key: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'mr-IN', key: 'mr', label: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'gu-IN', key: 'gu', label: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'pa-IN', key: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'bn-IN', key: 'bn', label: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'ta-IN', key: 'ta', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te-IN', key: 'te', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'kn-IN', key: 'kn', label: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'ml-IN', key: 'ml', label: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
  { code: 'or-IN', key: 'or', label: 'ଓଡ଼ିଆ (Odia)', flag: '🇮🇳' }
];

export const voiceService = {
  recognition: null,
  isListening: false,

  // Get full BCP-47 language code for speech recognition/synthesis
  getLangCode(lang = 'hi') {
    const clean = (lang || 'hi').split('-')[0].toLowerCase();
    const found = INDIAN_LANGUAGES.find((l) => l.key === clean);
    return found ? found.code : 'hi-IN';
  },

  // Check if browser supports Web Speech API
  isSpeechSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  },

  isSynthesisSupported() {
    return 'speechSynthesis' in window;
  },

  // Start listening to microphone
  startListening({ langCode = 'hi-IN', onResult, onError, onEnd }) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (onError) onError(new Error('Speech recognition not supported in this browser. You can type your message below.'));
      return null;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = langCode;
      this.recognition.interimResults = true;
      this.recognition.continuous = false;

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (onResult) onResult(transcript, event.results[0].isFinal);
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (onError) onError(event);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd();
      };

      this.recognition.start();
      this.isListening = true;
      return this.recognition;
    } catch (err) {
      if (onError) onError(err);
      return null;
    }
  },

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  },

  // Speak text with text-to-speech
  speak(text, langCode = 'hi-IN', onEnd) {
    if (!this.isSynthesisSupported()) return;

    window.speechSynthesis.cancel(); // Stop any active speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.92; // slightly slower and clear for rural farmers
    utterance.pitch = 1.0;

    // Pick best available voice matching the language if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  },

  stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }
};

export default voiceService;
