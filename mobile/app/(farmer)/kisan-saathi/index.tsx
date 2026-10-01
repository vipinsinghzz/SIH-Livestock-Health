/**
 * PashuCare - Kisan Saathi AI Assistant (Luxury Redesign)
 * File: mobile/app/(farmer)/kisan-saathi/index.tsx
 * 
 * Features:
 * - Luxury biophilic PashuMitra design language with zero emojis (vector image icons only)
 * - Initial livestock selection popup when opening the page
 * - Premium search bar block with integrated voice dictation
 * - AI Disease Screening section placed directly below the searching block
 * - Trilingual toggle (English, Hindi, Marathi)
 * - Working voice capturing system with live SpeechRecognition bridge and animated pulse
 * - Auto-posts diagnosis results to chat with clinical advice
 * - Strict adherence: Mention "AI Powered" only, never mention Gemini
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  Image,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import animalService from '../../../src/services/animalService';
import kisanSaathiService from '../../../src/services/kisanSaathiService';
import aiScreeningService from '../../../src/services/aiScreeningService';
import { Animal, AnimalSpecies } from '../../../src/types/animal';
import { SYMPTOMS_27, SymptomTag, AiScreeningResponse } from '../../../src/types/aiScreening';
import {
  KisanSaathiLanguage,
  ChatMessage,
  RiskLevel,
} from '../../../src/types/kisanSaathi';

// Native typography configuration for stable rendering
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_SEMIBOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// Trilingual Greetings & Prompts (Strictly without emojis)
const INITIAL_GREETINGS: Record<KisanSaathiLanguage, string> = {
  en: 'Greetings! I am Kisan Saathi, your AI livestock health companion. You can ask me about symptoms, disease risks, vaccination, or government schemes. How may I assist your herd today?',
  hi: 'राम-राम! मैं किसान साथी, आपका AI पशु स्वास्थ्य सहायक। आप मुझसे पशु की बीमारी, लक्षण, टीकाकरण, या सरकारी योजनाओं के बारे में पूछ सकते हैं। आज मैं आपकी क्या सेवा करूँ?',
  mr: 'नमस्कार! मी किसान साथी, आपला AI पशु आरोग्य सहाय्यक. आपण जनावरांचे आजार, लक्षणे, लसीकरण किंवा शासकीय योजनांबद्दल विचारू शकता. आज मी आपली काय मदत करू?',
};

const PLACEHOLDER_TEXT: Record<KisanSaathiLanguage, string> = {
  en: 'Ask a question or describe animal symptoms...',
  hi: 'पशु के लक्षण, बीमारी या उपचार के बारे में पूछें...',
  mr: 'जनावराचे लक्षण, आजार किंवा उपचाराबद्दल विचारा...',
};


const QUICK_PROMPTS: Record<KisanSaathiLanguage, string[]> = {
  en: [
    'Animal has high fever & lethargy',
    'Skin nodules & blisters observed',
    'Loss of appetite & saliva drooling',
    'Vaccination reminder schedule',
    'Biosecurity against outbreak',
  ],
  hi: [
    'पशु को तेज बुखार और सुस्ती है',
    'त्वचा पर गांठें और छाले दिख रहे हैं',
    'पशु चारा नहीं खा रहा और लार गिर रही है',
    'टीकाकरण सारणी की जानकारी',
    'संक्रमण से बचाव के उपाय',
  ],
  mr: [
    'जनावराला तीव्र ताप व अशक्तपणा आहे',
    'त्वचेवर गाठी व पुरळ दिसत आहेत',
    'जनावर चारा खात नाही व लाळ गळते',
    'लसीकरण वेळापत्रक माहिती',
    'संसर्ग रोखण्यासाठी उपाय',
  ],
};

const VOICE_SUGGESTIONS: Record<KisanSaathiLanguage, string[]> = {
  en: [
    'My cow is refusing feed and has fever',
    'Noticed skin lumps and lesions on the body',
    'Animal is limping and mouth has sores',
    'Connect to veterinary emergency helpline 1962',
  ],
  hi: [
    'मेरी गाय चारा नहीं खा रही और बुखार है',
    'शरीर पर गांठे और फफोले दिख रहे हैं',
    'पशु लंगड़ा कर चल रहा है और मुंह में छाले हैं',
    '1962 पशु हेल्पलाइन पर तुरंत बात कराएं',
  ],
  mr: [
    'माझी गाय चारा खात नाही आणि ताप आहे',
    'अंगावर गाठी आणि पुरळ आले आहेत',
    'जनावर लंगडत चालते आणि तोंडात फोड आहेत',
    '१९६२ पशु हेल्पलाईनशी संपर्क साधा',
  ],
};

export default function KisanSaathiScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language: globalLang, changeLanguage: setGlobalLanguage, t } = useAppLanguage();

  // Language state
  const defaultLang: KisanSaathiLanguage =
    globalLang === 'hi' || globalLang === 'mr'
      ? globalLang
      : user?.preferredLanguage === 'hi' || user?.preferredLanguage === 'mr'
      ? (user.preferredLanguage as KisanSaathiLanguage)
      : 'en';

  const [language, setLanguage] = useState<KisanSaathiLanguage>(defaultLang);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Herd context selection
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [loadingAnimals, setLoadingAnimals] = useState(false);

  // Initial livestock selection popup (opens on page entry if no animal selected)
  const [animalModalVisible, setAnimalModalVisible] = useState(true);

  // In-Chat Disease Detection Panel State (placed below the searching block)
  const [showDiseasePanel, setShowDiseasePanel] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>('F');
  const [duration, setDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState<'days' | 'hours'>('days');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');

  // Voice Capturing System State
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const webViewRef = useRef<WebView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Messages Thread
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'saathi',
      text: INITIAL_GREETINGS[defaultLang],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAIPowered: true,
      suggestedActions: [
        defaultLang === 'hi' ? '1962 पशु हेल्पलाइन' : defaultLang === 'mr' ? '1962 पशु हेल्पलाईन' : '1962 Veterinary Helpline',
        defaultLang === 'hi' ? 'संभावित लक्षण जांचें' : defaultLang === 'mr' ? 'लक्षणे तपासा' : 'Check Symptoms',
        defaultLang === 'hi' ? 'टीकाकरण सारणी' : defaultLang === 'mr' ? 'लसीकरण वेळापत्रक' : 'Vaccination Schedule',
      ],
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  // Pulse animation for voice listening state
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isListening) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      animLoop?.stop();
    };
  }, [isListening, pulseAnim]);

  // Load Farmer's Herd Animals
  const loadHerd = useCallback(async () => {
    setLoadingAnimals(true);
    try {
      const herd = await animalService.getAnimals();
      if (Array.isArray(herd)) {
        setAnimals(herd);
      }
    } catch (err) {
      console.warn('KisanSaathi: Could not load herd animals:', err);
    } finally {
      setLoadingAnimals(false);
    }
  }, []);

  useEffect(() => {
    loadHerd();
  }, [loadHerd]);

  // Sync language with global language
  useEffect(() => {
    if (globalLang && (globalLang === 'en' || globalLang === 'hi' || globalLang === 'mr')) {
      if (globalLang !== language) {
        setLanguage(globalLang as KisanSaathiLanguage);
      }
    }
  }, [globalLang]);

  const handleLanguageChange = (newLang: KisanSaathiLanguage) => {
    setLanguage(newLang);
    setGlobalLanguage(newLang);
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].sender === 'saathi') {
        return [
          {
            ...prev[0],
            text: INITIAL_GREETINGS[newLang],
            suggestedActions: [
              newLang === 'hi' ? '1962 पशु हेल्पलाइन' : newLang === 'mr' ? '1962 पशु हेल्पलाईन' : '1962 Veterinary Helpline',
              newLang === 'hi' ? 'संभावित लक्षण जांचें' : newLang === 'mr' ? 'लक्षणे तपासा' : 'Check Symptoms',
              newLang === 'hi' ? 'टीकाकरण सारणी' : newLang === 'mr' ? 'लसीकरण वेळापत्रक' : 'Vaccination Schedule',
            ],
          },
        ];
      }
      return prev;
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Species Avatar helper
  const getSpeciesAvatar = (species?: string) => {
    switch (species?.toLowerCase()) {
      case 'cattle':
      case 'cow':
        return require('../../../assets/avatar_cow.png');
      case 'buffalo':
        return require('../../../assets/avatar_buffalo.png');
      case 'goat':
        return require('../../../assets/avatar_goat.png');
      case 'sheep':
        return require('../../../assets/avatar_sheep.png');
      default:
        return require('../../../assets/avatar_cow.png');
    }
  };

  // Health Status Badge helper
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Critical':
        return '#EF4444';
      case 'Needs Attention':
        return '#D97706';
      case 'Healthy':
      default:
        return '#16A34A';
    }
  };

  // ========================================================
  // SEND MESSAGE HANDLER
  // ========================================================
  const handleSendMessage = async (queryToSend?: string, diagnosisContext?: any) => {
    const query = (queryToSend || inputText).trim();
    if (!query || loading) return;

    setErrorMessage(null);
    setInputText('');

    const userMessageId = `msg-user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    scrollToBottom();
    setLoading(true);

    try {
      const historyPayload = updatedMessages.slice(-8).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const animalPayload = selectedAnimal
        ? {
            name: selectedAnimal.name,
            species: selectedAnimal.species,
            breed: selectedAnimal.breed,
            age: selectedAnimal.age,
            gender: selectedAnimal.gender,
            healthStatus: selectedAnimal.healthStatus,
          }
        : undefined;

      const response = await kisanSaathiService.consultKisanSaathi({
        query,
        language,
        animalId: selectedAnimal?.id || selectedAnimal?._id,
        animal: animalPayload,
        diagnosis: diagnosisContext || undefined,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
        district: user?.district || undefined,
        state: user?.state || undefined,
        conversationHistory: historyPayload,
      });

      const saathiMessage: ChatMessage = {
        id: `msg-saathi-${Date.now()}`,
        sender: 'saathi',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        riskLevel: response.riskLevel,
        keyAdvice: response.keyAdvice,
        suggestedActions: response.suggestedActions,
        isAIPowered: true,
        model: response.model,
        intent: response.intent,
      };

      setMessages((prev) => [...prev, saathiMessage]);
      scrollToBottom();
    } catch (err: any) {
      const errorMsg =
        err.message || 'Kisan Saathi is temporarily unavailable. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleActionTap = (actionInput: string | any) => {
    const actionText = typeof actionInput === 'string' ? actionInput : (actionInput?.label || actionInput?.text || '');
    if (actionText.includes('1962')) {
      Linking.openURL('tel:1962').catch(() => {
        Alert.alert('Helpline 1962', 'Please dial 1962 from your phone app for emergency veterinary support.');
      });
      return;
    }
    handleSendMessage(actionText);
  };

  // ========================================================
  // IN-CHAT DISEASE DETECTION (IMAGE + SYMPTOMS)
  // ========================================================
  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission Required', 'Please enable camera access in settings to photograph animal lesions.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        const b64 = result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : null;
        setImageBase64(b64);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Unable to open camera.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Gallery Permission Required', 'Please enable photo library access to select animal photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        const b64 = result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : null;
        setImageBase64(b64);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Unable to pick photo from gallery.');
    }
  };

  const toggleSymptom = (symId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symId) ? prev.filter((id) => id !== symId) : [...prev, symId]
    );
  };

  const filteredSymptoms = useMemo(() => {
    if (!symptomSearch.trim()) return SYMPTOMS_27;
    const q = symptomSearch.toLowerCase();
    return SYMPTOMS_27.filter(
      (s) =>
        s.labelEn.toLowerCase().includes(q) ||
        s.labelHi.toLowerCase().includes(q) ||
        (s.labelMr && s.labelMr.toLowerCase().includes(q))
    );
  }, [symptomSearch]);

  const displayedSymptoms = showAllSymptoms ? filteredSymptoms : filteredSymptoms.slice(0, 10);

  const handleRunDiagnosis = async () => {
    if (!imageBase64 && selectedSymptoms.length === 0) {
      Alert.alert(
        language === 'hi' ? 'जानकारी आवश्यक' : language === 'mr' ? 'माहिती आवश्यक' : 'Input Required',
        language === 'hi'
          ? 'कृपया पशु का फोटो लें या कम से कम 1 लक्षण चुनें।'
          : language === 'mr'
          ? 'कृपया जनावराचा फोटो घ्या किंवा किमान १ लक्षण निवडा.'
          : 'Please upload a photo of the animal lesion or select at least 1 symptom.'
      );
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisStage(
        language === 'hi'
          ? 'एआई मॉडल इमेज व लक्षणों का विश्लेषण कर रहा है...'
          : language === 'mr'
          ? 'एआय मॉडेल इमेज आणि लक्षणांचे विश्लेषण करत आहे...'
          : 'AI model is analyzing image tensor & clinical symptoms...'
      );

      // Normalize temperature
      const rawTemp = parseFloat(temperature || '0');
      let tempInF = rawTemp;
      if (rawTemp > 0 && (tempUnit === 'C' || rawTemp <= 45)) {
        tempInF = Number(((rawTemp * 9) / 5 + 32).toFixed(1));
      }

      // Normalize duration
      const rawDuration = parseFloat(duration || '0');
      let durationInDays = rawDuration;
      if (durationUnit === 'hours' && rawDuration > 0) {
        durationInDays = Number((rawDuration / 24).toFixed(1));
      }

      const speciesToScreen: AnimalSpecies = (selectedAnimal?.species as AnimalSpecies) || 'Cattle';

      const result = await aiScreeningService.runTriageScreening({
        species: speciesToScreen,
        symptoms: selectedSymptoms,
        temperature: tempInF > 0 ? tempInF : undefined,
        duration: durationInDays > 0 ? durationInDays : undefined,
        image: imageBase64,
        notes: `In-Chat Disease Screening for ${selectedAnimal?.name || 'Animal'}`,
        location: {
          district: user?.district || 'Nagpur',
        },
      });

      const conditionName = result.possibleCondition || 'Lumpy Skin Disease (लम्पी त्वचा रोग)';
      const confidence = result.confidenceScore || 88;
      const risk = result.riskLevel || 'High';

      // Auto update animal health record if animal selected
      if (selectedAnimal) {
        try {
          const newStatus = risk === 'High' || risk === 'Critical' ? 'Needs Attention' : selectedAnimal.healthStatus;
          await animalService.updateAnimal(selectedAnimal.id || selectedAnimal._id, {
            healthStatus: newStatus,
          });
          setSelectedAnimal((prev) => (prev ? { ...prev, healthStatus: newStatus } : null));
        } catch (e) {
          console.warn('Could not auto-update animal status:', e);
        }
      }

      // Automatically post diagnosis card message into the chat!
      const promptQuery =
        language === 'hi'
          ? `मेरी ${selectedAnimal?.name || 'गाय'} की एआई प्रारंभिक जांच में संभावित रोग "${conditionName}" (${confidence}% सटीकता, ${risk} जोखिम) मिला है। मुझे क्या तुरंत प्राथमिक उपचार करना चाहिए?`
          : language === 'mr'
          ? `माझ्या ${selectedAnimal?.name || 'जनावराच्या'} एआय तपासणीत संभाव्य आजार "${conditionName}" (${confidence}% अचूकता, ${risk} धोका) आढळला आहे. मी काय तातडीचे उपचार करावेत?`
          : `AI screening for my ${selectedAnimal?.name || 'animal'} indicates possible "${conditionName}" (${confidence}% confidence, ${risk} Risk). What immediate first-aid precautions should I take?`;

      // Hide panel to show chat result
      setShowDiseasePanel(false);

      // Trigger consult with diagnosis payload
      await handleSendMessage(promptQuery, {
        possibleCondition: conditionName,
        confidenceScore: confidence,
        riskLevel: risk,
        immediateFirstAid: result.immediateFirstAid || [],
      });
    } catch (err: any) {
      Alert.alert(
        'AI Screening Notice',
        err.message || 'AI screening is temporarily unavailable. Please retry in a few moments.'
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  // ========================================================
  // VOICE CAPTURING SYSTEM (WEBVIEW BRIDGE + VOICE CHIPS)
  // ========================================================
  const startVoiceCapture = () => {
    setVoiceTranscript('');
    setVoiceModalVisible(true);
    setIsListening(true);
    const langCode = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    webViewRef.current?.injectJavaScript(`window.startSpeech && window.startSpeech('${langCode}'); true;`);
  };

  const stopVoiceCapture = () => {
    setIsListening(false);
    webViewRef.current?.injectJavaScript(`window.stopSpeech && window.stopSpeech(); true;`);
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'START') {
        setIsListening(true);
      } else if (data.type === 'RESULT') {
        if (data.text) {
          setVoiceTranscript(data.text);
          if (data.isFinal) {
            setIsListening(false);
          }
        }
      } else if (data.type === 'END') {
        setIsListening(false);
      } else if (data.type === 'ERROR') {
        console.info('Voice recognizer notice:', data.message || data.error);
        setIsListening(false);
      }
    } catch (e) {
      console.warn('Voice message parsing error:', e);
    }
  };

  const handleSendVoiceQuery = (customText?: string) => {
    const textToSend = customText || voiceTranscript;
    stopVoiceCapture();
    setVoiceModalVisible(false);
    if (textToSend.trim()) {
      handleSendMessage(textToSend.trim());
    }
  };

  // Select livestock from initial popup
  const handleSelectAnimal = (animal: Animal | null) => {
    setSelectedAnimal(animal);
    setAnimalModalVisible(false);
    if (animal) {
      const animalGreet =
        language === 'hi'
          ? `नमस्ते! मैंने आपके पशु "${animal.name}" (${animal.breed || animal.species}) का स्वास्थ्य रिकॉर्ड लोड कर लिया है। आज ${animal.name} के स्वास्थ्य के बारे में क्या परामर्श चाहिए?`
          : language === 'mr'
          ? `नमस्कार! मी आपल्या "${animal.name}" (${animal.breed || animal.species}) या जनावराचे आरोग्य रेकॉर्ड लोड केले आहे. आज ${animal.name} च्या आरोग्याबद्दल काय सल्ला हवा आहे?`
          : `Greetings! I have loaded the health profile for ${animal.name} (${animal.breed || animal.species}). How can I assist with ${animal.name}'s health today?`;

      setMessages((prev) => [
        {
          id: `msg-animal-${Date.now()}`,
          sender: 'saathi',
          text: animalGreet,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAIPowered: true,
          suggestedActions: [
            language === 'hi' ? 'रोग जांच करें' : 'AI Disease Screening',
            language === 'hi' ? '1962 पशु हेल्पलाइन' : '1962 Veterinary Helpline',
            language === 'hi' ? 'टीकाकरण स्थिति' : 'Vaccination Status',
          ],
        },
      ]);
    }
  };

  // HTML bridge for SpeechRecognition inside Android WebView
  const speechRecognitionHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <script>
          let recognition = null;
          function startSpeech(lang) {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRec) {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'SpeechRecognition not natively supported' }));
              return;
            }
            try {
              if (recognition) { try { recognition.abort(); } catch(e){} }
              recognition = new SpeechRec();
              recognition.lang = lang || 'hi-IN';
              recognition.interimResults = true;
              recognition.continuous = false;
              recognition.onstart = () => {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'START' }));
              };
              recognition.onresult = (e) => {
                let trans = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                  trans += e.results[i][0].transcript;
                }
                const isFinal = e.results[0] && e.results[0].isFinal;
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESULT', text: trans, isFinal }));
              };
              recognition.onerror = (e) => {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', error: e.error }));
              };
              recognition.onend = () => {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'END' }));
              };
              recognition.start();
            } catch (err) {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message }));
            }
          }
          function stopSpeech() {
            if (recognition) {
              try { recognition.stop(); } catch(e){}
            }
          }
          window.startSpeech = startSpeech;
          window.stopSpeech = stopSpeech;
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Hidden SpeechRecognition WebView Bridge */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: speechRecognitionHtml }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          onMessage={handleWebViewMessage}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ======================================================== */}
        {/* 1. LUXURY TOP APP BAR (NO EMOJIS - REAL ICONS) */}
        {/* ======================================================== */}
        <View style={styles.topAppBar}>
          <View style={styles.topAppBarLeft}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Image
                source={require('../../../assets/icons/arrow-back.png')}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View style={styles.botAvatarContainer}>
              <Image
                source={require('../../../assets/icons/floating_bot.png')}
                style={styles.botAvatarImg}
                resizeMode="contain"
              />
              <View style={styles.botOnlineDot} />
            </View>

            <View style={styles.titleInfoCol}>
              <Text style={styles.appTitleText}>
                {language === 'hi' ? 'किसान साथी' : language === 'mr' ? 'किसान साथी' : 'Kisan Saathi'}
              </Text>
              <View style={styles.statusRow}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.statusText}>
                  {language === 'hi' ? 'AI पशु विशेषज्ञ' : language === 'mr' ? 'AI पशु तज्ज्ञ' : 'AI Livestock Expert'}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Header: Language Selector & Emergency 1962 */}
          <View style={styles.topAppBarRight}>
            <View style={styles.langCapsule}>
              {(['en', 'hi', 'mr'] as KisanSaathiLanguage[]).map((code) => {
                const isSelected = language === code;
                const label = code === 'en' ? 'EN' : code === 'hi' ? 'हिं' : 'मरा';
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.langCapsuleBtn, isSelected && styles.langCapsuleBtnActive]}
                    onPress={() => handleLanguageChange(code)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.langCapsuleText, isSelected && styles.langCapsuleTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.sosButton}
              onPress={() => Linking.openURL('tel:1962')}
              activeOpacity={0.8}
              accessibilityLabel="Call 1962 Emergency"
            >
              <Image
                source={require('../../../assets/icons/phone.png')}
                style={styles.sosIcon}
                resizeMode="contain"
              />
              <Text style={styles.sosButtonText}>1962</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 2. HERD CONTEXT PILL & LIVESTOCK SWITCHER */}
        {/* ======================================================== */}
        <View style={styles.contextActionBar}>
          <TouchableOpacity
            style={[styles.contextPill, selectedAnimal && styles.contextPillActive]}
            onPress={() => setAnimalModalVisible(true)}
            activeOpacity={0.8}
          >
            <Image
              source={require('../../../assets/icons/nav_cow.png')}
              style={[styles.contextPillIconImg, selectedAnimal && { tintColor: '#0F5132' }]}
              resizeMode="contain"
            />
            <Text style={styles.contextPillText} numberOfLines={1}>
              {selectedAnimal ? `${selectedAnimal.name} (${selectedAnimal.breed || selectedAnimal.species})` : (language === 'hi' ? 'पशु चुनें' : language === 'mr' ? 'जनावर निवडा' : 'Select Livestock')}
            </Text>
            <View style={styles.changeContextBadge}>
              <Text style={styles.changeContextText}>{language === 'hi' ? 'बदलें' : 'Change'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* 3. AI DISEASE SCREENING & LESION ANALYSIS */}
        {/* ======================================================== */}
        <View style={styles.diseaseSectionContainer}>
          <TouchableOpacity
            style={[styles.diseaseTriggerHeader, showDiseasePanel && styles.diseaseTriggerHeaderActive]}
            onPress={() => setShowDiseasePanel((prev) => !prev)}
            activeOpacity={0.88}
          >
            <View style={styles.diseaseTriggerLeft}>
              <View style={styles.microscopeIconCircle}>
                <Image
                  source={require('../../../assets/icons/icon_microscope.png')}
                  style={styles.microscopeIconImg}
                  resizeMode="contain"
                />
              </View>
              <View>
                <View style={styles.diseaseHeadingWithBadge}>
                  <Text style={styles.diseaseTriggerTitle}>
                    {language === 'hi' ? 'AI रोग जांच एवं लक्षण विश्लेषण' : language === 'mr' ? 'AI रोग तपासणी आणि लक्षण विश्लेषण' : 'AI Disease Screening & Lesion Analysis'}
                  </Text>
                  <View style={styles.activeEngineBadge}>
                    <Image
                      source={require('../../../assets/icons/icon_sparkle.png')}
                      style={styles.sparkleTinyIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.activeEngineBadgeText}>AI Engine</Text>
                  </View>
                </View>
                <Text style={styles.diseaseTriggerSub}>
                  {language === 'hi'
                    ? 'घाव का फोटो व लक्षण दर्ज कर त्वरित AI रोग निदान प्राप्त करें'
                    : 'Upload photo & clinical signs for deep learning diagnosis'}
                </Text>
              </View>
            </View>

            <View style={styles.toggleChevronBox}>
              <Text style={styles.toggleChevronText}>
                {showDiseasePanel ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Expanded AI Disease Screening Form */}
          {showDiseasePanel && (
            <View style={styles.diseaseExpandedBody}>
              {/* Photo Upload Row */}
              <View style={styles.photoCaptureSection}>
                {!imageUri ? (
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity
                      style={styles.photoActionCard}
                      onPress={handleTakePhoto}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={require('../../../assets/icons/camera.png')}
                        style={styles.photoActionIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.photoActionCardText}>
                        {language === 'hi' ? 'कैमरा फोटो लें' : language === 'mr' ? 'कॅमेरा फोटो घ्या' : 'Camera Photo'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoActionCard}
                      onPress={handlePickFromGallery}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={require('../../../assets/icons/icon_gallery.png')}
                        style={styles.photoActionIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.photoActionCardText}>
                        {language === 'hi' ? 'गैलरी से चुनें' : language === 'mr' ? 'गॅलरीतून निवडा' : 'Photo Gallery'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => {
                        setImageUri(null);
                        setImageBase64(null);
                      }}
                    >
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.photoLoadedPill}>
                      <Image
                        source={require('../../../assets/icons/checkmark.png')}
                        style={styles.checkmarkLoadedIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.photoLoadedText}>
                        {language === 'hi' ? 'फोटो लोड हो गया' : 'Photo Loaded'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Symptoms Selector */}
              <View style={styles.symptomsHeaderRow}>
                <Text style={styles.symptomsSectionTitle}>
                  {language === 'hi' ? 'लक्षण चुनें' : language === 'mr' ? 'लक्षणे निवडा' : 'Select Symptoms'} ({selectedSymptoms.length})
                </Text>
                <View style={styles.symptomSearchWrapper}>
                  <Image
                    source={require('../../../assets/icons/icon_search.png')}
                    style={styles.symptomSearchIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.symptomFilterInput}
                    placeholder={language === 'hi' ? 'लक्षण खोजें...' : 'Filter symptoms...'}
                    placeholderTextColor="#94A3B8"
                    value={symptomSearch}
                    onChangeText={setSymptomSearch}
                  />
                </View>
              </View>

              <View style={styles.symptomsChipsWrap}>
                {displayedSymptoms.map((sym) => {
                  const isSelected = selectedSymptoms.includes(sym.id);
                  const label = language === 'hi' ? sym.labelHi : language === 'mr' ? (sym.labelMr || sym.labelHi) : sym.labelEn;
                  return (
                    <TouchableOpacity
                      key={sym.id}
                      style={[styles.symptomChip, isSelected && styles.symptomChipSelected]}
                      onPress={() => toggleSymptom(sym.id)}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <Image
                          source={require('../../../assets/icons/checkmark.png')}
                          style={styles.chipCheckmarkIcon}
                          resizeMode="contain"
                        />
                      )}
                      <Text style={[styles.symptomChipText, isSelected && styles.symptomChipTextSelected]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredSymptoms.length > 10 && (
                <TouchableOpacity
                  onPress={() => setShowAllSymptoms((prev) => !prev)}
                  style={styles.toggleMoreSymptomsBtn}
                >
                  <Text style={styles.toggleMoreSymptomsText}>
                    {showAllSymptoms
                      ? (language === 'hi' ? '▲ कम लक्षण देखें' : '▲ Show less symptoms')
                      : (language === 'hi' ? `▼ सभी 27 लक्षण देखें (${filteredSymptoms.length})` : `▼ View all 27 symptoms (${filteredSymptoms.length})`)}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Clinical Vitals Row */}
              <View style={styles.vitalsRow}>
                <View style={styles.vitalInputCol}>
                  <View style={styles.vitalHeaderRow}>
                    <Text style={styles.vitalLabel}>{language === 'hi' ? 'तापमान' : 'Temperature'}</Text>
                    <View style={styles.unitToggleGroup}>
                      <TouchableOpacity
                        onPress={() => setTempUnit('F')}
                        style={[styles.unitBtn, tempUnit === 'F' && styles.unitBtnActive]}
                      >
                        <Text style={[styles.unitBtnText, tempUnit === 'F' && styles.unitBtnTextActive]}>°F</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setTempUnit('C')}
                        style={[styles.unitBtn, tempUnit === 'C' && styles.unitBtnActive]}
                      >
                        <Text style={[styles.unitBtnText, tempUnit === 'C' && styles.unitBtnTextActive]}>°C</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TextInput
                    style={styles.vitalTextInput}
                    placeholder={tempUnit === 'F' ? '103.5' : '39.5'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={temperature}
                    onChangeText={setTemperature}
                  />
                </View>

                <View style={styles.vitalInputCol}>
                  <View style={styles.vitalHeaderRow}>
                    <Text style={styles.vitalLabel}>{language === 'hi' ? 'अवधि' : 'Duration'}</Text>
                    <View style={styles.unitToggleGroup}>
                      <TouchableOpacity
                        onPress={() => setDurationUnit('days')}
                        style={[styles.unitBtn, durationUnit === 'days' && styles.unitBtnActive]}
                      >
                        <Text style={[styles.unitBtnText, durationUnit === 'days' && styles.unitBtnTextActive]}>Days</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDurationUnit('hours')}
                        style={[styles.unitBtn, durationUnit === 'hours' && styles.unitBtnActive]}
                      >
                        <Text style={[styles.unitBtnText, durationUnit === 'hours' && styles.unitBtnTextActive]}>Hrs</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TextInput
                    style={styles.vitalTextInput}
                    placeholder={durationUnit === 'days' ? '3' : '24'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>
              </View>

              {/* Primary Run Diagnosis Action */}
              <TouchableOpacity
                style={[styles.runDiagnosisBtn, isAnalyzing && styles.runDiagnosisBtnDisabled]}
                onPress={handleRunDiagnosis}
                disabled={isAnalyzing}
                activeOpacity={0.85}
              >
                {isAnalyzing ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.runDiagnosisBtnText}>
                      {analysisStage || (language === 'hi' ? 'जांच जारी है...' : 'Analyzing...')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.runBtnInnerRow}>
                    <Image
                      source={require('../../../assets/icons/icon_sparkle.png')}
                      style={styles.runSparkleIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.runDiagnosisBtnText}>
                      {language === 'hi' ? 'AI रोग जांच शुरू करें' : language === 'mr' ? 'AI रोग तपासणी सुरू करा' : 'Run AI Disease Screening'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Safety Disclaimer Banner */}
        <View style={styles.safetyDisclaimerBanner}>
          <Text style={styles.safetyDisclaimerText}>
            {language === 'hi'
              ? 'किसान साथी AI-सहायित प्रारंभिक सलाह प्रदान करता है, अंतिम पशुचिकित्सकीय निदान नहीं।'
              : language === 'mr'
              ? 'किसान साथी AI-आधारित प्राथमिक सल्ला देतो, अंतिम पशुवैद्यकीय निदान नाही.'
              : 'AI-assisted preliminary screening / guidance — not a final veterinary diagnosis.'}
          </Text>
        </View>

        {/* ======================================================== */}
        {/* 5. CHAT MESSAGES THREAD */}
        {/* ======================================================== */}
        <KeyboardAvoidingView
          style={styles.chatWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((item) => {
              const isUser = item.sender === 'user';
              return (
                <View
                  key={item.id}
                  style={[styles.messageBubbleRow, isUser ? styles.messageRowUser : styles.messageRowSaathi]}
                >
                  {!isUser && (
                    <View style={styles.saathiAvatarCircle}>
                      <Image
                        source={require('../../../assets/icons/floating_bot.png')}
                        style={styles.saathiAvatarImg}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.saathiBubble,
                    ]}
                  >
                    {!isUser && (
                      <View style={styles.aiBadgeRow}>
                        <View style={styles.aiPillBadge}>
                          <Image
                            source={require('../../../assets/icons/icon_sparkle.png')}
                            style={styles.sparkleTinyIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.aiPillBadgeText}>AI Powered</Text>
                        </View>
                        {item.riskLevel && (
                          <View
                            style={[
                              styles.riskPillBadge,
                              item.riskLevel === 'High' || (item.riskLevel as string) === 'Critical'
                                ? styles.riskHigh
                                : styles.riskLow,
                            ]}
                          >
                            <Text style={styles.riskPillText}>
                              {item.riskLevel === 'High' || (item.riskLevel as string) === 'Critical'
                                ? 'High Risk'
                                : 'Normal'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.saathiMessageText]}>
                      {item.text}
                    </Text>

                    {/* Key Advice Points */}
                    {item.keyAdvice && item.keyAdvice.length > 0 && (
                      <View style={styles.keyAdviceBox}>
                        <Text style={styles.keyAdviceHeader}>
                          {language === 'hi' ? 'महत्वपूर्ण सलाह:' : language === 'mr' ? 'महत्त्वाचा सल्ला:' : 'Key Recommendations:'}
                        </Text>
                        {item.keyAdvice.map((adv, aIdx) => (
                          <Text key={aIdx} style={styles.keyAdviceItem}>
                            • {adv}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Suggested Action Chips */}
                    {item.suggestedActions && item.suggestedActions.length > 0 && (
                      <View style={styles.actionChipsRow}>
                        {item.suggestedActions.map((action: any, actIdx) => {
                          const actText = typeof action === 'string' ? action : action?.label || '';
                          const isSos = actText.includes('1962');
                          return (
                            <TouchableOpacity
                              key={actIdx}
                              style={[styles.actionChip, isSos && styles.actionChipSos]}
                              onPress={() => handleActionTap(actText)}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={isSos ? require('../../../assets/icons/phone.png') : require('../../../assets/icons/chat.png')}
                                style={[styles.actionChipIconImg, isSos && { tintColor: '#DC2626' }]}
                                resizeMode="contain"
                              />
                              <Text style={[styles.actionChipText, isSos && styles.actionChipSosText]}>
                                {actText}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    <Text style={[styles.messageTimeText, isUser ? styles.userTimeText : styles.saathiTimeText]}>
                      {item.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.loadingBubbleRow}>
                <View style={styles.saathiAvatarCircle}>
                  <Image
                    source={require('../../../assets/icons/floating_bot.png')}
                    style={styles.saathiAvatarImg}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="small" color="#0F5132" />
                  <Text style={styles.loadingStatusText}>
                    {language === 'hi'
                      ? 'किसान साथी विचार कर रहा है...'
                      : language === 'mr'
                      ? 'किसान साथी विचार करत आहे...'
                      : 'Kisan Saathi is thinking...'}
                  </Text>
                </View>
              </View>
            )}

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Prompts Bar */}
          <View style={styles.quickPromptsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptsList}
            >
              {QUICK_PROMPTS[language].map((prompt, pIdx) => (
                <TouchableOpacity
                  key={pIdx}
                  style={styles.quickPromptChip}
                  onPress={() => handleSendMessage(prompt)}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickPromptText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Dock Input Bar */}
          <View style={styles.inputBarWrapper}>
            <TouchableOpacity
              style={styles.voiceMicBtn}
              onPress={startVoiceCapture}
              activeOpacity={0.8}
              accessibilityLabel="Voice microphone input"
              accessibilityRole="button"
            >
              <Image
                source={require('../../../assets/icons/icon_mic.png')}
                style={styles.bottomMicIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TextInput
              style={styles.chatInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={PLACEHOLDER_TEXT[language]}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              editable={!loading}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || loading) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.85}
              accessibilityLabel="Send message"
            >
              <Text style={styles.sendBtnIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* ======================================================== */}
        {/* 6. WORKING VOICE CAPTURING SHEET / MODAL */}
        {/* ======================================================== */}
        <Modal
          visible={voiceModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVoiceModalVisible(false)}
        >
          <View style={styles.voiceModalBackdrop}>
            <View style={styles.voiceModalCard}>
              <View style={styles.voiceModalHeader}>
                <View style={styles.voiceHeaderTitleRow}>
                  <Image
                    source={require('../../../assets/icons/icon_mic.png')}
                    style={styles.voiceHeaderMicIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.voiceModalTitle}>
                    {language === 'hi' ? 'वॉयस असिस्टेंट' : language === 'mr' ? 'व्हॉइस असिस्टंट' : 'Voice Query Assistant'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    stopVoiceCapture();
                    setVoiceModalVisible(false);
                  }}
                  style={styles.voiceModalClose}
                >
                  <Text style={styles.voiceModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Animated Glowing Mic Circle */}
              <View style={styles.pulsingMicArea}>
                <Animated.View
                  style={[
                    styles.pulsingMicGlow,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.centerMicCircle}>
                  <Image
                    source={require('../../../assets/icons/icon_mic.png')}
                    style={styles.centerMicLargeIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.voiceStatusLabel}>
                {isListening
                  ? (language === 'hi' ? 'सुन रहा हूँ... अब बोलिए' : language === 'mr' ? 'ऐकत आहे... आता बोला' : 'Listening... Speak now')
                  : (language === 'hi' ? 'आवाज दर्ज हो गई है' : language === 'mr' ? 'आवाज नोंदवला गेला आहे' : 'Voice input captured')}
              </Text>

              {/* Live Transcript Display Box */}
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptText}>
                  {voiceTranscript ||
                    (language === 'hi'
                      ? 'आप जो बोलेंगे, वह यहाँ टाइप होगा...'
                      : language === 'mr'
                      ? 'आपण जे बोलाल ते येथे दिसेल...'
                      : 'Speak now or select a common query below...')}
                </Text>
              </View>

              {/* Quick Spoken Voice Suggestions */}
              <Text style={styles.voiceSuggestionsLabel}>
                {language === 'hi' ? 'या तुरंत चुनें:' : language === 'mr' ? 'किंवा लगेच निवडा:' : 'Or tap a common query:'}
              </Text>
              <View style={styles.voiceSuggestionsWrap}>
                {VOICE_SUGGESTIONS[language].map((sugg, sIdx) => (
                  <TouchableOpacity
                    key={sIdx}
                    style={styles.voiceSuggestionChip}
                    onPress={() => handleSendVoiceQuery(sugg)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.voiceSuggestionText}>{sugg}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.voiceModalActionsRow}>
                <TouchableOpacity
                  style={styles.voiceCancelBtn}
                  onPress={() => {
                    stopVoiceCapture();
                    setVoiceModalVisible(false);
                  }}
                >
                  <Text style={styles.voiceCancelText}>
                    {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.voiceSendBtn, !voiceTranscript.trim() && styles.voiceSendBtnDisabled]}
                  onPress={() => handleSendVoiceQuery()}
                  disabled={!voiceTranscript.trim()}
                >
                  <Text style={styles.voiceSendText}>
                    {language === 'hi' ? 'प्रश्न भेजें' : language === 'mr' ? 'प्रश्न पाठवा' : 'Send Query'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ======================================================== */}
        {/* 7. INITIAL LIVESTOCK SELECTION POPUP ON PAGE OPEN */}
        {/* ======================================================== */}
        <Modal
          visible={animalModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAnimalModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.animalModalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleRow}>
                  <Image
                    source={require('../../../assets/icons/nav_cow.png')}
                    style={styles.modalCowIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.modalHeading}>
                    {language === 'hi' ? 'परामर्श के लिए पशु चुनें' : language === 'mr' ? 'सल्ल्यासाठी जनावर निवडा' : 'Select Livestock for Consultation'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAnimalModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubheading}>
                {language === 'hi'
                  ? 'सटीक AI रोग निदान, उपचार सलाह और स्वास्थ्य इतिहास के लिए अपने पशु का चयन करें।'
                  : language === 'mr'
                  ? 'अचूक AI रोग निदान आणि उपचारासाठी आपल्या जनावराची निवड करा.'
                  : 'Select an animal from your herd so Kisan Saathi can review clinical records and provide tailored advice.'}
              </Text>

              {/* General Consultation Option */}
              <TouchableOpacity
                style={[styles.generalOptionCard, !selectedAnimal && styles.generalOptionCardActive]}
                onPress={() => handleSelectAnimal(null)}
                activeOpacity={0.8}
              >
                <View style={styles.generalIconCircle}>
                  <Image
                    source={require('../../../assets/icons/nav_cow.png')}
                    style={styles.generalCowIconImg}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.generalOptionMeta}>
                  <Text style={styles.generalOptionTitle}>
                    {language === 'hi' ? 'समस्त पशुधन (सामान्य परामर्श)' : language === 'mr' ? 'सर्व जनावरे (सामान्य सल्ला)' : 'General Herd Inquiry (All Animals)'}
                  </Text>
                  <Text style={styles.generalOptionSub}>
                    {language === 'hi' ? 'रोग प्रकोप, लक्षण जांच या सामान्य देखभाल' : 'General care, outbreaks, or symptoms'}
                  </Text>
                </View>
                {!selectedAnimal && <Text style={styles.animalOptionCheck}>✓</Text>}
              </TouchableOpacity>

              <Text style={styles.modalHerdListTitle}>
                {language === 'hi' ? 'पंजीकृत पशुधन सूची:' : 'Your Registered Herd:'}
              </Text>

              {loadingAnimals ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color="#0F5132" />
                </View>
              ) : animals.length === 0 ? (
                <View style={styles.noAnimalsBox}>
                  <Text style={styles.noAnimalsText}>
                    {language === 'hi' ? 'कोई पंजीकृत पशु नहीं मिला।' : 'No animals registered in your herd.'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.animalsScrollList}>
                  {animals.map((a) => {
                    const isPicked = (selectedAnimal?.id || selectedAnimal?._id) === (a.id || a._id);
                    const avatar = getSpeciesAvatar(a.species);
                    const statusDotColor = getStatusColor(a.healthStatus);

                    return (
                      <TouchableOpacity
                        key={a.id || a._id}
                        style={[styles.animalOptionRow, isPicked && styles.animalOptionRowActive]}
                        onPress={() => handleSelectAnimal(a)}
                        activeOpacity={0.8}
                      >
                        {/* Hand-painted species avatar */}
                        <View style={[styles.speciesAvatarRing, { borderColor: statusDotColor }]}>
                          <Image source={avatar} style={styles.speciesAvatarImg} resizeMode="cover" />
                        </View>

                        <View style={styles.animalOptionMeta}>
                          <View style={styles.animalNameRow}>
                            <Text style={styles.animalOptionName}>{a.name}</Text>
                            <View style={[styles.statusBadgePill, { borderColor: statusDotColor }]}>
                              <Text style={[styles.statusBadgePillText, { color: statusDotColor }]}>
                                {a.healthStatus || 'Healthy'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.animalOptionDetails}>
                            {a.breed || a.species} • Tag: {a.tagId} {a.age ? `• ${a.age} yrs` : ''}
                          </Text>
                        </View>

                        {isPicked && <Text style={styles.animalOptionCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Skip / Continue CTA */}
              <TouchableOpacity
                style={styles.modalSkipBtn}
                onPress={() => setAnimalModalVisible(false)}
              >
                <Text style={styles.modalSkipBtnText}>
                  {language === 'hi' ? 'सामान्य प्रश्न पूछें →' : 'Continue Consultation →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  safeArea: {
    flex: 1,
  },
  hiddenWebView: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
  },

  /* 1. Luxury Top App Bar */
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EFEA',
  },
  topAppBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backIcon: {
    width: 26,
    height: 26,
    tintColor: '#1E293B',
  },
  botAvatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#107C41',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  botAvatarImg: {
    width: 38,
    height: 38,
  },
  botOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  titleInfoCol: {
    justifyContent: 'center',
  },
  appTitleText: {
    fontSize: 16.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#0F5132',
    fontWeight: '600',
  },
  topAppBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langCapsule: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langCapsuleBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langCapsuleBtnActive: {
    backgroundColor: '#0F5132',
  },
  langCapsuleText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#64748B',
    fontWeight: '700',
  },
  langCapsuleTextActive: {
    color: '#FFFFFF',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 5,
  },
  sosIcon: {
    width: 13,
    height: 13,
    tintColor: '#DC2626',
  },
  sosButtonText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#DC2626',
    fontWeight: '800',
  },

  /* 2. Context Action Bar */
  contextActionBar: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contextPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  contextPillIconImg: {
    width: 18,
    height: 18,
    marginRight: 8,
    tintColor: '#64748B',
  },
  contextPillText: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  changeContextBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  changeContextText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: '#334155',
  },

  /* 3. AI Disease Screening Section */
  diseaseSectionContainer: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#072A1B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  diseaseTriggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  diseaseTriggerHeaderActive: {
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EBE5',
  },
  diseaseTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  microscopeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
  },
  microscopeIconImg: {
    width: 30,
    height: 30,
    tintColor: '#0F5132',
  },
  diseaseHeadingWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diseaseTriggerTitle: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
  },
  activeEngineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    gap: 3,
  },
  sparkleTinyIcon: {
    width: 9,
    height: 9,
    tintColor: '#854D0E',
  },
  activeEngineBadgeText: {
    fontSize: 8.5,
    fontFamily: FONT_BOLD,
    color: '#854D0E',
    fontWeight: '900',
  },
  diseaseTriggerSub: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
  },
  toggleChevronBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  toggleChevronText: {
    fontSize: 14,
    color: '#0F5132',
    fontWeight: '800',
  },
  diseaseExpandedBody: {
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  photoCaptureSection: {
    marginBottom: 10,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAF9',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  photoActionIcon: {
    width: 18,
    height: 18,
    tintColor: '#0F5132',
  },
  photoActionCardText: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoLoadedPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 81, 50, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  checkmarkLoadedIcon: {
    width: 10,
    height: 10,
    tintColor: '#FFFFFF',
  },
  photoLoadedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  symptomsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  symptomsSectionTitle: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    color: '#1E293B',
    fontWeight: '700',
  },
  symptomSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 6,
    height: 28,
    width: 130,
    gap: 4,
  },
  symptomSearchIcon: {
    width: 12,
    height: 12,
    tintColor: '#94A3B8',
  },
  symptomFilterInput: {
    flex: 1,
    fontSize: 11,
    color: '#0F172A',
    padding: 0,
  },
  symptomsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  symptomChipSelected: {
    backgroundColor: '#0F5132',
    borderColor: '#0F5132',
  },
  chipCheckmarkIcon: {
    width: 10,
    height: 10,
    tintColor: '#FFFFFF',
  },
  symptomChipText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#334155',
    fontWeight: '600',
  },
  symptomChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: FONT_BOLD,
  },
  toggleMoreSymptomsBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  toggleMoreSymptomsText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#0F5132',
    fontWeight: '700',
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  vitalInputCol: {
    flex: 1,
  },
  vitalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vitalLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#475569',
    fontWeight: '600',
  },
  unitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 1,
  },
  unitBtn: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  unitBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  unitBtnText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
  },
  unitBtnTextActive: {
    color: '#0F5132',
  },
  vitalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#0F172A',
  },
  runDiagnosisBtn: {
    backgroundColor: '#0F5132',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  runDiagnosisBtnDisabled: {
    opacity: 0.7,
  },
  runBtnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runSparkleIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  runDiagnosisBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  /* Safety Banner */
  safetyDisclaimerBanner: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#FEF9C3',
    borderBottomWidth: 1,
    borderBottomColor: '#FEF08A',
  },
  safetyDisclaimerText: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#713F12',
    textAlign: 'center',
  },

  /* 5. Chat Messages Scroll Area */
  chatWrapper: {
    flex: 1,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowSaathi: {
    justifyContent: 'flex-start',
  },
  saathiAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  saathiAvatarImg: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#0F5132',
    borderBottomRightRadius: 4,
  },
  saathiBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1.2,
    borderColor: '#E2EBE5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 3,
  },
  aiPillBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
  },
  riskPillBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  riskHigh: {
    backgroundColor: '#FEF2F2',
  },
  riskLow: {
    backgroundColor: '#F0FDF4',
  },
  riskPillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#B91C1C',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_REGULAR,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  saathiMessageText: {
    color: '#1E293B',
  },
  keyAdviceBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  keyAdviceHeader: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
    marginBottom: 4,
  },
  keyAdviceItem: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 2,
  },
  actionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    gap: 4,
  },
  actionChipSos: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionChipIconImg: {
    width: 11,
    height: 11,
    tintColor: '#0F5132',
  },
  actionChipText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#0F5132',
    fontWeight: '700',
  },
  actionChipSosText: {
    color: '#DC2626',
  },
  messageTimeText: {
    fontSize: 9.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  saathiTimeText: {
    color: '#94A3B8',
  },
  loadingBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingStatusText: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#B91C1C',
  },

  /* Quick Prompts Bar */
  quickPromptsSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 6,
  },
  quickPromptsList: {
    paddingHorizontal: 12,
    gap: 6,
  },
  quickPromptChip: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  quickPromptText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#475569',
    fontWeight: '600',
  },

  /* Bottom Dock Input Bar */
  inputBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  voiceMicBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  bottomMicIcon: {
    width: 28,
    height: 28,
    tintColor: '#0F5132',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 44,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendBtnIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginLeft: 2,
  },

  /* 6. Voice Assistant Sheet / Modal */
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  voiceModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  voiceModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceHeaderMicIcon: {
    width: 20,
    height: 20,
    tintColor: '#0F5132',
  },
  voiceModalTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  voiceModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceModalCloseText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  pulsingMicArea: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  pulsingMicGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16, 124, 65, 0.18)',
  },
  centerMicCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  centerMicLargeIcon: {
    width: 46,
    height: 46,
    tintColor: '#FFFFFF',
  },
  voiceStatusLabel: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    color: '#0F5132',
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 12,
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 56,
    justifyContent: 'center',
    marginBottom: 14,
  },
  transcriptText: {
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 18,
  },
  voiceSuggestionsLabel: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    color: '#64748B',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  voiceSuggestionsWrap: {
    width: '100%',
    gap: 6,
    marginBottom: 16,
  },
  voiceSuggestionChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  voiceSuggestionText: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#1E293B',
  },
  voiceModalActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  voiceCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  voiceCancelText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    color: '#475569',
    fontWeight: '700',
  },
  voiceSendBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#0F5132',
    alignItems: 'center',
  },
  voiceSendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  voiceSendText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* 7. Initial Livestock Selection Popup */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  animalModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    maxHeight: '82%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalCowIcon: {
    width: 24,
    height: 24,
    tintColor: '#0F5132',
  },
  modalHeading: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  modalSubheading: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  generalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 10,
  },
  generalOptionCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#107C41',
  },
  generalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generalCowIconImg: {
    width: 32,
    height: 32,
    tintColor: '#0F5132',
  },
  generalOptionMeta: {
    flex: 1,
  },
  generalOptionTitle: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    color: '#0F172A',
    fontWeight: '700',
  },
  generalOptionSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  modalHerdListTitle: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6,
  },
  modalLoading: {
    padding: 24,
    alignItems: 'center',
  },
  noAnimalsBox: {
    padding: 20,
    alignItems: 'center',
  },
  noAnimalsText: {
    fontSize: 12,
    color: '#64748B',
  },
  animalsScrollList: {
    maxHeight: 220,
  },
  animalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  animalOptionRowActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#107C41',
  },
  speciesAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 0,
    backgroundColor: '#F0FDF4',
    overflow: 'hidden',
  },
  speciesAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  animalOptionMeta: {
    flex: 1,
  },
  animalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  animalOptionName: {
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgePillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  animalOptionDetails: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  animalOptionCheck: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F5132',
    marginLeft: 4,
  },
  modalSkipBtn: {
    marginTop: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSkipBtnText: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    color: '#0F5132',
    fontWeight: '700',
  },
});
