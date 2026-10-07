/**
 * PashuCare - Luxury AI Livestock Disease Screening Screen
 * File: mobile/app/(farmer)/ai-scan/index.tsx
 * 
 * Redesigned using UI/UX Pro Max Intelligence:
 * - Biophilic organic color system (#0F5132 deep forest green, #107C41 emerald, #F8FAF8 surface)
 * - 3-Step Guided Workflow Banner (Select Animal -> Lesion Photo -> Clinical Symptoms)
 * - Horizontal Animal Herd Selection Carousel with species vector icons and tag badges
 * - Dual Clinical Capture Cards (Camera Photo & Gallery Upload) with instant high-res preview
 * - Comprehensive 27 Clinical Symptoms grid with bilingual labels (English/Hindi) and active pills
 * - Vitals observation cards (Body Temp °C with fever alert, Duration in hours)
 * - Multi-stage AI triage analysis progress with dynamic status updates
 * - Official medical disclaimer card with vector shield icon
 * - Floating levitating Kisan Saathi AI companion with sinusoidal hover motion
 * - Floating luxury bottom navigation dock matching dashboard (Scan highlighted)
 * - Strictly zero raw emojis, using crisp dedicated vector icons
 * - Safe native font fallbacks preventing ExpoFontLoader Android crashes
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppLanguage } from '../../../src/services/i18n';
import animalService from '../../../src/services/animalService';
import aiScreeningService from '../../../src/services/aiScreeningService';
import { Animal } from '../../../src/types/animal';
import { SYMPTOMS_27, SymptomTag, AiScreeningResponse } from '../../../src/types/aiScreening';

// Native platform font fallbacks
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_SEMIBOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

export default function FarmerAiScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ animalId?: string }>();
  const { isEnglish, language } = useAppLanguage();

  // State
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Symptoms & clinical observations state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [temperature, setTemperature] = useState('');
  const [duration, setDuration] = useState('');

  // Analysis progression & submission state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Floating Levitation Animation for AI Chatbot
  const botFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(botFloatAnim, {
          toValue: -7,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(botFloatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatingLoop.start();
    return () => floatingLoop.stop();
  }, [botFloatAnim]);

  // 1. Fetch farmer's herd to populate selector
  const fetchAnimals = useCallback(async () => {
    try {
      setLoadingAnimals(true);
      const list = await animalService.getAnimals();
      setAnimals(list || []);

      if (params.animalId) {
        const found = (list || []).find((a) => (a._id || a.id) === params.animalId);
        if (found) {
          setSelectedAnimal(found);
        }
      } else if (list && list.length === 1) {
        setSelectedAnimal(list[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load farmer livestock herd:', err);
    } finally {
      setLoadingAnimals(false);
    }
  }, [params.animalId]);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  // Pure JS Uint8Array to base64 encoder
  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '';
    const len = bytes.length;
    for (let i = 0; i < len; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < len ? bytes[i + 1] : 0;
      const b2 = i + 2 < len ? bytes[i + 2] : 0;
      base64 += chars[b0 >> 2];
      base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
      base64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
      base64 += i + 2 < len ? chars[b2 & 63] : '=';
    }
    return base64;
  };

  // Convert a local file URI to base64 data URI
  const uriToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      if (typeof FileReader !== 'undefined') {
        try {
          const res = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result);
              } else {
                reject(new Error('FileReader did not return string'));
              }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
          });
          if (res && res.startsWith('data:')) {
            return res;
          }
        } catch {
          // fallback to ArrayBuffer
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Str = uint8ArrayToBase64(uint8Array);
      const mimeType = blob.type || (uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
      return `data:${mimeType};base64,${base64Str}`;
    } catch (err: any) {
      console.error('[uriToBase64 error]', err);
      throw new Error(`Failed to convert image URI to base64: ${err?.message || String(err)}`);
    }
  };

  // 2. Camera photo capture
  const handleTakePhoto = async () => {
    try {
      setErrorMessage(null);
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          isEnglish ? 'Camera Permission Needed' : 'कैमरा अनुमति आवश्यक',
          isEnglish
            ? 'Please grant camera access to photograph the affected livestock lesion.'
            : 'कृपया रोग के लक्षणों की तस्वीर लेने के लिए कैमरा अनुमति प्रदान करें।',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('[handleTakePhoto error]', err);
      setErrorMessage(
        isEnglish
          ? 'Unable to open camera. Please retry or choose from gallery.'
          : 'कैमरा खोलने में त्रुटि हुई। कृपया गैलरी से चुनें।'
      );
    }
  };

  // 3. Gallery image picker
  const handlePickFromGallery = async () => {
    try {
      setErrorMessage(null);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          isEnglish ? 'Gallery Permission Needed' : 'गैलरी अनुमति आवश्यक',
          isEnglish
            ? 'Please grant photo library access to upload a picture of the affected animal.'
            : 'कृपया पशु की तस्वीर अपलोड करने के लिए गैलरी अनुमति प्रदान करें।',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: false,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('[handlePickFromGallery error]', err);
      setErrorMessage(
        isEnglish
          ? 'Unable to access photo gallery. Please retry.'
          : 'गैलरी खोलने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
      );
    }
  };

  const handleClearImage = () => {
    setImageUri(null);
    setImageBase64(null);
  };

  // 4. Toggle symptom tag
  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  // 5. Species icon resolver
  const getSpeciesIconSource = (speciesStr?: string) => {
    const s = (speciesStr || '').toLowerCase();
    if (s.includes('buffalo') || s.includes('भैंस')) {
      return require('../../../assets/avatar_buffalo.png');
    }
    if (s.includes('goat') || s.includes('बकरी')) {
      return require('../../../assets/avatar_goat.png');
    }
    if (s.includes('sheep') || s.includes('भेड़')) {
      return require('../../../assets/avatar_sheep.png');
    }
    return require('../../../assets/avatar_cow.png');
  };

  // 6. Multi-stage analysis & submission
  const handleSubmitScreening = async () => {
    setErrorMessage(null);

    if (!selectedAnimal) {
      setErrorMessage(
        isEnglish
          ? 'Please select an animal from your herd to screen.'
          : 'कृपया जांच के लिए अपने पशुधन में से एक पशु चुनें।'
      );
      return;
    }

    if (!imageUri && selectedSymptoms.length === 0 && !customNotes.trim()) {
      setErrorMessage(
        isEnglish
          ? 'Please capture a photo or select at least one clinical symptom.'
          : 'कृपया रोग की तस्वीर लें अथवा कम से कम एक लक्षण चुनें।'
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      let finalBase64Image: string | null = null;
      if (imageUri) {
        setAnalysisStage(
          isEnglish ? 'Optimizing lesion imagery...' : 'तस्वीर संसाधित की जा रही है...'
        );
        try {
          finalBase64Image = await uriToBase64(imageUri);
          if (!finalBase64Image) {
            throw new Error('Image base64 conversion returned empty');
          }
          setImageBase64(finalBase64Image);
        } catch (convErr: any) {
          console.error('[handleSubmitScreening] Image encoding failed:', convErr);
          setIsAnalyzing(false);
          setErrorMessage(
            isEnglish
              ? 'Could not process the selected image. Please capture or select the photo again.'
              : 'तस्वीर प्रोसेस नहीं हो सकी। कृपया पुनः फोटो लें।'
          );
          return;
        }
      }

      setAnalysisStage(
        isEnglish ? 'Running deep neural vision triage...' : 'AI विज़न मॉडल जांच कर रहा है...'
      );
      await new Promise((resolve) => setTimeout(resolve, 600));

      setAnalysisStage(
        isEnglish ? 'Cross-referencing 27 clinical symptoms...' : 'लक्षणों का नैदानिक मिलान जारी है...'
      );
      await new Promise((resolve) => setTimeout(resolve, 600));

      setAnalysisStage(
        isEnglish ? 'Formulating diagnostic triage report...' : 'जांच रिपोर्ट तैयार की जा रही है...'
      );

      const payload = {
        species: selectedAnimal.species || 'Cattle',
        symptoms: selectedSymptoms,
        temperature: temperature.trim() ? parseFloat(temperature) : 0,
        duration: duration.trim() ? parseFloat(duration) : 0,
        image: finalBase64Image || null,
        notes: customNotes.trim() || undefined,
        location: {
          village: selectedAnimal.village || undefined,
          block: selectedAnimal.block || undefined,
          district: selectedAnimal.district || undefined,
        },
      };

      const result: AiScreeningResponse = await aiScreeningService.runTriageScreening(payload);

      // Async background upload to storage if image provided
      if (finalBase64Image && result.success) {
        aiScreeningService
          .uploadScanImage(finalBase64Image, {
            animalId: selectedAnimal._id || selectedAnimal.id,
            disease: result.possibleCondition || undefined,
            riskLevel: result.riskLevel,
            confidence: result.confidenceScore || undefined,
            symptoms: selectedSymptoms,
            temperature: payload.temperature,
            duration: payload.duration,
          })
          .catch(() => {});
      }
      // Auto-sync status with animal record if confidence > 85%
      const confidence = result.confidenceScore || 0;
      const cond = (result.possibleCondition || '').toLowerCase();
      const isNormal = cond.includes('healthy') || cond.includes('normal') || cond.includes('no disease');
      let newHealthStatus = selectedAnimal.healthStatus || 'Healthy';
      let statusUpdated = false;

      if (confidence > 85 && !isNormal) {
        const isCritical =
          result.riskLevel === 'Critical' ||
          result.riskLevel === 'High' ||
          ['lumpy', 'lsd', 'foot and mouth', 'fmd', 'anthrax', 'blackleg', 'rabies', 'ppr'].some((k) => cond.includes(k)) ||
          selectedSymptoms.some((s) => ['fever', 'nodule', 'lump', 'salivat'].some((k) => s.toLowerCase().includes(k)));

        newHealthStatus = isCritical ? 'Critical' : 'Needs Attention';
        statusUpdated = true;
      } else if (confidence > 85 && isNormal) {
        newHealthStatus = 'Healthy';
        statusUpdated = true;
      }

      if (statusUpdated) {
        try {
          const targetId = selectedAnimal._id || selectedAnimal.id;
          if (targetId) {
            await animalService.updateAnimal(targetId, {
              healthStatus: newHealthStatus as any,
            });
            selectedAnimal.healthStatus = newHealthStatus as any;
          }
        } catch (syncErr) {
          console.warn('[handleSubmitScreening] Auto sync animal status warning:', syncErr);
        }
      }

      setIsAnalyzing(false);

      // Navigate to results screen with clean serialized state
      router.push({
        pathname: '/(farmer)/ai-scan/result',
        params: {
          resultData: JSON.stringify(result),
          animalData: JSON.stringify(selectedAnimal),
          imageUri: imageUri || '',
          symptomsList: JSON.stringify(selectedSymptoms),
          temperature: temperature || '',
          duration: duration || '',
          notes: customNotes || '',
          statusUpdated: statusUpdated ? 'true' : 'false',
          newHealthStatus,
        },
      });
    } catch (err: any) {
      setIsAnalyzing(false);
      setErrorMessage(
        err.message ||
          (isEnglish
            ? 'AI screening could not be completed. Please check your connection and retry.'
            : 'AI स्क्रीनिंग पूरी नहीं हो सकी। कृपया नेटवर्क जांचें और पुनः प्रयास करें।')
      );
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ======================================================== */}
        {/* 1. TOP APP BAR */}
        {/* ======================================================== */}
        <View style={styles.topAppBar}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Image
              source={require('../../../assets/icons/arrow-back.png')}
              style={styles.backArrowIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.appBarTitleCol}>
            <Text style={styles.appBarTitle}>
              {isEnglish ? 'AI Disease Screening' : 'AI रोग स्क्रीनिंग'}
            </Text>
            <Text style={styles.appBarSub}>
              {isEnglish ? 'Multimodal Vision & Triage' : 'लक्षण व कंप्यूटर विज़न जांच'}
            </Text>
          </View>

          <View style={styles.headerBadgePill}>
            <Image
              source={require('../../../assets/icons/icon_sparkle.png')}
              style={styles.headerBadgeIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerBadgeText}>
              {isEnglish ? 'AI Triage' : 'AI जांच'}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* SCROLLABLE SCREENING FORM */}
        {/* ======================================================== */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ======================================================== */}
          {/* HERO WORKFLOW CARD */}
          {/* ======================================================== */}
          <View style={styles.heroBannerCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextCol}>
                <View style={styles.heroTagPill}>
                  <Text style={styles.heroTagText}>
                    {isEnglish ? 'CLINICAL TRIAGE ASSISTANT' : 'क्लिनिकल ट्रायज सहायक'}
                  </Text>
                </View>
                <Text style={styles.heroTitle}>
                  {isEnglish
                    ? 'Screen Livestock Health'
                    : 'पशु स्वास्थ्य की जांच करें'}
                </Text>
                <Text style={styles.heroSub}>
                  {isEnglish
                    ? 'Photograph skin nodules or select observed symptoms for instant deep learning analysis.'
                    : 'त्वचा के घावों की तस्वीर लें या लक्षणों को चुनकर तुरंत AI विश्लेषण प्राप्त करें।'}
                </Text>
              </View>

              <View style={styles.heroBotAvatarSquircle}>
                <Image
                  source={require('../../../assets/icons/floating_bot.png')}
                  style={styles.heroBotAvatarImg}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* 3 Step Ribbon */}
            <View style={styles.stepRibbon}>
              <View style={styles.stepItem}>
                <View style={[styles.stepNumBadge, selectedAnimal && styles.stepNumDone]}>
                  <Text style={[styles.stepNumText, selectedAnimal && styles.stepNumDoneText]}>
                    {selectedAnimal ? '✓' : '1'}
                  </Text>
                </View>
                <Text style={styles.stepLabelText}>
                  {isEnglish ? 'Select' : 'पशु चुनें'}
                </Text>
              </View>

              <View style={styles.stepConnector} />

              <View style={styles.stepItem}>
                <View style={[styles.stepNumBadge, imageUri && styles.stepNumDone]}>
                  <Text style={[styles.stepNumText, imageUri && styles.stepNumDoneText]}>
                    {imageUri ? '✓' : '2'}
                  </Text>
                </View>
                <Text style={styles.stepLabelText}>
                  {isEnglish ? 'Photo' : 'फोटो'}
                </Text>
              </View>

              <View style={styles.stepConnector} />

              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepNumBadge,
                    selectedSymptoms.length > 0 && styles.stepNumDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumText,
                      selectedSymptoms.length > 0 && styles.stepNumDoneText,
                    ]}
                  >
                    {selectedSymptoms.length > 0 ? '✓' : '3'}
                  </Text>
                </View>
                <Text style={styles.stepLabelText}>
                  {isEnglish ? 'Symptoms' : 'लक्षण'}
                </Text>
              </View>
            </View>
          </View>

          {/* Error Notice Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Image
                source={require('../../../assets/icons/alert.png')}
                style={styles.errorIcon}
                resizeMode="contain"
              />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* ======================================================== */}
          {/* STEP 1: SELECT ANIMAL FROM HERD */}
          {/* ======================================================== */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconCircle}>
                <Image
                  source={require('../../../assets/avatar_cow.png')}
                  style={styles.cardHeaderAvatar}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.cardHeaderTitleCol}>
                <Text style={styles.cardTitle}>
                  {isEnglish ? '1. Select Affected Animal' : '1. प्रभावित पशु का चयन करें'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isEnglish
                    ? 'Links screening to individual animal medical history'
                    : 'जांच परिणाम पशु के स्वास्थ्य रिकॉर्ड से जुड़ेगा'}
                </Text>
              </View>
              <View style={styles.requiredPill}>
                <Text style={styles.requiredText}>
                  {isEnglish ? 'Required' : 'आवश्यक'}
                </Text>
              </View>
            </View>

            {loadingAnimals ? (
              <View style={styles.loadingHerdRow}>
                <ActivityIndicator size="small" color="#0F5132" />
                <Text style={styles.loadingHerdText}>
                  {isEnglish
                    ? 'Loading registered herd animals...'
                    : 'पंजीकृत पशुधन लोड हो रहा है...'}
                </Text>
              </View>
            ) : animals.length === 0 ? (
              <View style={styles.emptyHerdBox}>
                <View style={styles.emptyHerdIconCircle}>
                  <Image
                    source={require('../../../assets/icons/cow.png')}
                    style={styles.emptyHerdIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.emptyHerdTitle}>
                  {isEnglish ? 'No Animals Registered Yet' : 'कोई पशु पंजीकृत नहीं है'}
                </Text>
                <Text style={styles.emptyHerdSub}>
                  {isEnglish
                    ? 'Register your cattle, buffalo, goat, or sheep first to track clinical history.'
                    : 'स्वास्थ्य इतिहास सुरक्षित रखने के लिए पहले पशु का पंजीकरण करें।'}
                </Text>
                <TouchableOpacity
                  style={styles.registerAnimalBtn}
                  onPress={() => router.push('/(farmer)/animals/add')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.registerAnimalBtnText}>
                    {isEnglish ? '+ Register Animal First' : '+ नया पशु पंजीकृत करें'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.animalCarousel}
                >
                  {animals.map((a) => {
                    const targetId = a._id || a.id;
                    const isSelected =
                      selectedAnimal && (selectedAnimal._id || selectedAnimal.id) === targetId;

                    return (
                      <TouchableOpacity
                        key={targetId}
                        style={[
                          styles.animalCardTile,
                          isSelected && styles.animalCardTileSelected,
                        ]}
                        onPress={() => setSelectedAnimal(a)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.animalTileAvatar,
                            isSelected && styles.animalTileAvatarSelected,
                          ]}
                        >
                          <Image
                            source={getSpeciesIconSource(a.species)}
                            style={styles.animalTileSpeciesImg}
                            resizeMode="contain"
                          />
                        </View>

                        <Text
                          style={[
                            styles.animalTileName,
                            isSelected && styles.animalTileNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {a.name || a.tagId}
                        </Text>

                        <View style={styles.animalTileTagRow}>
                          <Image
                            source={require('../../../assets/icons/tag.png')}
                            style={[
                              styles.animalTileTagIcon,
                              isSelected && { tintColor: '#0F5132' },
                            ]}
                            resizeMode="contain"
                          />
                          <Text
                            style={[
                              styles.animalTileTagText,
                              isSelected && styles.animalTileTagTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            #{a.tagId || 'N/A'}
                          </Text>
                        </View>

                        <Text style={styles.animalTileBreed} numberOfLines={1}>
                          {a.species}
                          {a.breed ? ` • ${a.breed}` : ''}
                        </Text>

                        {isSelected && (
                          <View style={styles.animalSelectedCheckmark}>
                            <Image
                              source={require('../../../assets/icons/checkmark.png')}
                              style={styles.animalCheckmarkIcon}
                              resizeMode="contain"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {selectedAnimal && (
                  <View style={styles.selectedAnimalPillBox}>
                    <View style={styles.selectedAnimalLeft}>
                      <Image
                        source={require('../../../assets/icons/checkmark.png')}
                        style={styles.selectedGreenCheck}
                        resizeMode="contain"
                      />
                      <Text style={styles.selectedAnimalInfo}>
                        {isEnglish ? 'Selected' : 'चयनित'}:{' '}
                        <Text style={{ fontFamily: FONT_BOLD, color: '#0F5132' }}>
                          {selectedAnimal.name}
                        </Text>{' '}
                        (#{selectedAnimal.tagId} • {selectedAnimal.species}
                        {selectedAnimal.breed ? `, ${selectedAnimal.breed}` : ''})
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ======================================================== */}
          {/* STEP 2: CAPTURE LESION PHOTO */}
          {/* ======================================================== */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Image
                  source={require('../../../assets/icons/camera.png')}
                  style={[styles.cardHeaderIcon, { tintColor: '#0284C7' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.cardHeaderTitleCol}>
                <Text style={styles.cardTitle}>
                  {isEnglish ? '2. Capture Lesion Photo' : '2. रोग या घाव की तस्वीर लें'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isEnglish
                    ? 'Photographs nodules, blisters, or infected skin'
                    : 'गांठ, छाले अथवा त्वचा के लक्षणों की स्पष्ट तस्वीर'}
                </Text>
              </View>
              <View style={[styles.requiredPill, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.requiredText, { color: '#64748B' }]}>
                  {isEnglish ? 'Recommended' : 'अनुशंसित'}
                </Text>
              </View>
            </View>

            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewOverlayBadge}>
                  <Image
                    source={require('../../../assets/icons/checkmark.png')}
                    style={styles.previewCheckIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.previewOverlayText}>
                    {isEnglish ? 'Lesion Photo Attached' : 'तस्वीर संलग्न है'}
                  </Text>
                </View>

                <View style={styles.previewActionsRow}>
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require('../../../assets/icons/camera.png')}
                      style={styles.retakeIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.retakeBtnText}>
                      {isEnglish ? 'Retake' : 'पुनः फोटो'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={handleClearImage}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.removePhotoText}>✕ {isEnglish ? 'Remove' : 'हटाएं'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.dualPhotoActions}>
                {/* Primary Camera Button */}
                <TouchableOpacity
                  style={styles.cameraActionCard}
                  onPress={handleTakePhoto}
                  activeOpacity={0.88}
                >
                  <View style={styles.cameraActionIconCircle}>
                    <Image
                      source={require('../../../assets/icons/camera.png')}
                      style={styles.cameraActionIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.cameraActionTitle}>
                    {isEnglish ? 'Take Camera Photo' : 'कैमरे से फोटो लें'}
                  </Text>
                  <Text style={styles.cameraActionSub}>
                    {isEnglish ? 'Snap lesion in daylight' : 'स्पष्ट रोशनी में फोटो खींचें'}
                  </Text>
                </TouchableOpacity>

                {/* Secondary Gallery Button */}
                <TouchableOpacity
                  style={styles.galleryActionCard}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.88}
                >
                  <View style={styles.galleryActionIconCircle}>
                    <Image
                      source={require('../../../assets/icons/icon_gallery.png')}
                      style={styles.galleryActionIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.galleryActionTitle}>
                    {isEnglish ? 'Choose Gallery' : 'गैलरी से चुनें'}
                  </Text>
                  <Text style={styles.galleryActionSub}>
                    {isEnglish ? 'Select saved photo' : 'सुरक्षित तस्वीर अपलोड करें'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ======================================================== */}
          {/* STEP 3: OBSERVED SYMPTOMS & CLINICAL OBSERVATIONS */}
          {/* ======================================================== */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Image
                  source={require('../../../assets/icons/clipboard.png')}
                  style={[styles.cardHeaderIcon, { tintColor: '#B45309' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.cardHeaderTitleCol}>
                <Text style={styles.cardTitle}>
                  {isEnglish ? '3. Observed Symptoms' : '3. देखे गए लक्षण'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isEnglish
                    ? 'Tap to select all matching signs'
                    : 'पशु में दिखने वाले सभी लक्षणों को चुनें'}
                </Text>
              </View>
              {selectedSymptoms.length > 0 && (
                <View style={styles.symptomCountPill}>
                  <Text style={styles.symptomCountText}>
                    {selectedSymptoms.length} {isEnglish ? 'picked' : 'चयनित'}
                  </Text>
                </View>
              )}
            </View>

            {/* 27 Symptoms Grid */}
            <View style={styles.symptomsGrid}>
              {SYMPTOMS_27.map((item: SymptomTag) => {
                const isSelected = selectedSymptoms.includes(item.id);
                const displayLabel =
                  language === 'hi'
                    ? item.labelHi
                    : language === 'mr'
                    ? item.labelMr || item.labelHi
                    : item.labelEn;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.symptomChip,
                      isSelected && styles.symptomChipSelected,
                    ]}
                    onPress={() => toggleSymptom(item.id)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.symptomIndicator,
                        isSelected && styles.symptomIndicatorSelected,
                      ]}
                    >
                      <Image
                        source={
                          isSelected
                            ? require('../../../assets/icons/checkmark.png')
                            : require('../../../assets/icons/plus.png')
                        }
                        style={[
                          styles.symptomIndicatorIcon,
                          isSelected && { tintColor: '#FFFFFF' },
                        ]}
                        resizeMode="contain"
                      />
                    </View>
                    <Text
                      style={[
                        styles.symptomChipLabel,
                        isSelected && styles.symptomChipLabelSelected,
                      ]}
                    >
                      {displayLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Vitals Input Row (Temperature & Duration) */}
            <View style={styles.vitalsInputRow}>
              {/* Temperature */}
              <View style={styles.vitalInputTile}>
                <View style={styles.vitalInputHeader}>
                  <Image
                    source={require('../../../assets/icons/alert.png')}
                    style={[styles.vitalFieldIcon, { tintColor: '#DC2626' }]}
                    resizeMode="contain"
                  />
                  <Text style={styles.vitalFieldLabel}>
                    {isEnglish ? 'Body Temp (°C)' : 'तापमान (°C)'}
                  </Text>
                </View>
                <TextInput
                  style={styles.vitalTextInput}
                  placeholder={isEnglish ? 'e.g. 39.5' : 'उदा. 39.5'}
                  placeholderTextColor="#94A3B8"
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalHintText}>
                  {isEnglish ? 'Normal: 38.5° - 39.5°C' : 'सामान्य: 38.5° - 39.5°C'}
                </Text>
              </View>

              {/* Duration */}
              <View style={styles.vitalInputTile}>
                <View style={styles.vitalInputHeader}>
                  <Image
                    source={require('../../../assets/icons/clock.png')}
                    style={[styles.vitalFieldIcon, { tintColor: '#0284C7' }]}
                    resizeMode="contain"
                  />
                  <Text style={styles.vitalFieldLabel}>
                    {isEnglish ? 'Duration (Hours)' : 'अवधि (घंटे)'}
                  </Text>
                </View>
                <TextInput
                  style={styles.vitalTextInput}
                  placeholder={isEnglish ? 'e.g. 48' : 'उदा. 48'}
                  placeholderTextColor="#94A3B8"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalHintText}>
                  {isEnglish ? 'Hours since onset' : 'लक्षण शुरू होने के बाद'}
                </Text>
              </View>
            </View>

            {/* Free-text Observations */}
            <View style={styles.notesSection}>
              <View style={styles.notesHeaderRow}>
                <Image
                  source={require('../../../assets/icons/chat.png')}
                  style={styles.notesHeaderIcon}
                  resizeMode="contain"
                />
                <Text style={styles.notesLabel}>
                  {isEnglish
                    ? 'Additional Observations & Notes'
                    : 'अतिरिक्त लक्षण या किसान की टिप्पणी'}
                </Text>
              </View>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder={
                  isEnglish
                    ? 'Describe any specific behavior, feeding drop, coughing, or nasal discharge observed...'
                    : 'चारा न खाना, लार गिरना, सुस्ती अथवा अन्य कोई लक्षण दर्ज करें...'
                }
                placeholderTextColor="#94A3B8"
                value={customNotes}
                onChangeText={setCustomNotes}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ======================================================== */}
          {/* MANDATORY MEDICAL DISCLAIMER */}
          {/* ======================================================== */}
          <View style={styles.disclaimerCard}>
            <Image
              source={require('../../../assets/icons/shield.png')}
              style={styles.disclaimerShield}
              resizeMode="contain"
            />
            <View style={styles.disclaimerContent}>
              <Text style={styles.disclaimerTitle}>
                {isEnglish ? 'Important Clinical Notice' : 'महत्वपूर्ण क्लिनिकल सूचना'}
              </Text>
              <Text style={styles.disclaimerBody}>
                {isEnglish
                  ? 'AI preliminary screening supports early disease surveillance and does not replace a physical examination by a certified veterinarian. If conditions are critical, contact your local veterinary dispensary immediately.'
                  : 'यह AI स्क्रीनिंग केवल प्रारंभिक पहचान और अलर्ट के लिए है। यह किसी प्रमाणित पशु चिकित्सक की जांच का विकल्प नहीं है। गंभीर स्थिति में तुरंत नजदीकी पशु चिकित्सालय से संपर्क करें।'}
              </Text>
            </View>
          </View>

          {/* ======================================================== */}
          {/* SUBMIT / ANALYZE BUTTON */}
          {/* ======================================================== */}
          <TouchableOpacity
            style={[styles.analyzeSubmitBtn, isAnalyzing && styles.analyzeBtnDisabled]}
            onPress={handleSubmitScreening}
            disabled={isAnalyzing}
            activeOpacity={0.88}
          >
            {isAnalyzing ? (
              <View style={styles.analyzingStateRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.analyzingStateText}>
                  {analysisStage || (isEnglish ? 'Evaluating livestock health...' : 'जांच की जा रही है...')}
                </Text>
              </View>
            ) : (
              <View style={styles.analyzeContentRow}>
                <Image
                  source={require('../../../assets/icons/icon_sparkle.png')}
                  style={styles.analyzeBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.analyzeBtnText}>
                  {isEnglish ? 'Run AI Health Screening' : 'AI स्वास्थ्य जांच शुरू करें'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Bottom spacing for floating bot and dock */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ======================================================== */}
        {/* 4. FLOATING KISAN SAATHI AI BOT (SMOOTH HOVER LEVITATION) */}
        {/* ======================================================== */}
        <Animated.View
          style={[
            styles.floatingAiBotWrapper,
            { transform: [{ translateY: botFloatAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingAiBot}
            onPress={() => router.push('/(farmer)/kisan-saathi' as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Kisan Saathi AI Assistant"
          >
            <Image
              source={require('../../../assets/icons/floating_bot.png')}
              style={styles.floatingAiIcon}
              resizeMode="contain"
            />
            <View style={styles.floatingAiPill}>
              <Text style={styles.floatingAiPillText}>AI</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ======================================================== */}
        {/* 5. FLOATING BOTTOM NAVIGATION DOCK (SCAN ELEVATED ACTIVE) */}
        {/* ======================================================== */}
        <View style={styles.floatingNavContainer} pointerEvents="box-none">
          <View style={styles.bottomNavDock}>
            {/* Tab 1: Home */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)')}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'Home' : 'होम'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_home.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'Home' : 'होम'}</Text>
            </TouchableOpacity>

            {/* Tab 2: My Herd */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/animals' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'My Herd' : 'मेरे पशु'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_cow.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'My Herd' : 'मेरे पशु'}</Text>
            </TouchableOpacity>

            {/* Tab 3: Center Elevated Scan (ACTIVE) */}
            <TouchableOpacity
              style={styles.navCenterScanItem}
              onPress={() => {}}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={isEnglish ? 'AI Disease Scan' : 'रोग स्कैन'}
            >
              <View style={styles.navCenterScanCircle}>
                <Image
                  source={require('../../../assets/icons/nav_scan.png')}
                  style={styles.navCenterScanIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navCenterScanLabelActive}>
                {isEnglish ? 'Scan' : 'स्कैन'}
              </Text>
            </TouchableOpacity>

            {/* Tab 4: Services */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/cases' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'Services' : 'सेवाएं'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_grid.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'Services' : 'सेवाएं'}</Text>
            </TouchableOpacity>

            {/* Tab 5: Profile */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/profile' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'Profile' : 'प्रोफाइल'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_profile.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'Profile' : 'प्रोफाइल'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ==========================================================
// LUXURY BIOPHILIC STYLESHEET
// ==========================================================
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safeArea: {
    flex: 1,
  },

  /* Top App Bar */
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backArrowIcon: {
    width: 18,
    height: 18,
    tintColor: '#1E293B',
  },
  appBarTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  appBarTitle: {
    fontSize: 16.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  appBarSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  headerBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    gap: 4,
  },
  headerBadgeIcon: {
    width: 12,
    height: 12,
    tintColor: '#0F5132',
  },
  headerBadgeText: {
    color: '#0F5132',
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* Scroll Area */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Hero Banner Card */
  heroBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  heroTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 6,
  },
  heroTagText: {
    color: '#15803D',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    lineHeight: 17,
  },
  heroBotAvatarSquircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  heroBotAvatarImg: {
    width: 48,
    height: 48,
  },

  /* Step Ribbon */
  stepRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDone: {
    backgroundColor: '#0F5132',
  },
  stepNumText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumDoneText: {
    color: '#FFFFFF',
  },
  stepLabelText: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#1E293B',
  },
  stepConnector: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },

  /* Error Box */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    gap: 10,
  },
  errorIcon: {
    width: 18,
    height: 18,
    tintColor: '#DC2626',
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 12.5,
    fontFamily: FONT_MEDIUM,
    lineHeight: 18,
  },

  /* Form Cards */
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderIcon: {
    width: 20,
    height: 20,
  },
  cardHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  cardHeaderTitleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  requiredPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredText: {
    color: '#DC2626',
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* Step 1 Herd Carousel */
  loadingHerdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    justifyContent: 'center',
    gap: 8,
  },
  loadingHerdText: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  emptyHerdBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyHerdIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyHerdIcon: {
    width: 26,
    height: 26,
  },
  emptyHerdTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyHerdSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 12,
    lineHeight: 16,
  },
  registerAnimalBtn: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  registerAnimalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  animalCarousel: {
    gap: 10,
    paddingVertical: 4,
  },
  animalCardTile: {
    width: 140,
    backgroundColor: '#F8FAF8',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  animalCardTileSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0F5132',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  animalTileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    overflow: 'hidden',
  },
  animalTileAvatarSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#0F5132',
  },
  animalTileSpeciesImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  animalTileName: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  animalTileNameSelected: {
    color: '#0F5132',
  },
  animalTileTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  animalTileTagIcon: {
    width: 9,
    height: 9,
    tintColor: '#64748B',
  },
  animalTileTagText: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
  },
  animalTileTagTextSelected: {
    color: '#0F5132',
    fontFamily: FONT_BOLD,
  },
  animalTileBreed: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  animalSelectedCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalCheckmarkIcon: {
    width: 10,
    height: 10,
    tintColor: '#FFFFFF',
  },
  selectedAnimalPillBox: {
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  selectedAnimalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedGreenCheck: {
    width: 13,
    height: 13,
    tintColor: '#16A34A',
  },
  selectedAnimalInfo: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#1E293B',
    flex: 1,
  },

  /* Step 2 Lesion Photo Dual Actions */
  dualPhotoActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  cameraActionCard: {
    flex: 1,
    backgroundColor: '#0F5132',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cameraActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cameraActionIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
  cameraActionTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    textAlign: 'center',
  },
  cameraActionSub: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    textAlign: 'center',
    marginTop: 2,
  },
  galleryActionCard: {
    flex: 1,
    backgroundColor: '#F8FAF8',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  galleryActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  galleryActionIcon: {
    width: 20,
    height: 20,
    tintColor: '#334155',
  },
  galleryActionTitle: {
    color: '#0F172A',
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    textAlign: 'center',
  },
  galleryActionSub: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    textAlign: 'center',
    marginTop: 2,
  },

  /* Preview Container */
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: 190,
  },
  previewOverlayBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 81, 50, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  previewCheckIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
  },
  previewOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  previewActionsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  retakeIcon: {
    width: 14,
    height: 14,
    tintColor: '#334155',
  },
  retakeBtnText: {
    color: '#334155',
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  removePhotoBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#DC2626',
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* Step 3 Symptoms */
  symptomCountPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  symptomCountText: {
    color: '#0F5132',
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  symptomChipSelected: {
    backgroundColor: '#0F5132',
    borderColor: '#0F5132',
  },
  symptomIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomIndicatorSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  symptomIndicatorIcon: {
    width: 8,
    height: 8,
    tintColor: '#64748B',
  },
  symptomChipLabel: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#1E293B',
  },
  symptomChipLabelSelected: {
    color: '#FFFFFF',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* Vitals Inputs */
  vitalsInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  vitalInputTile: {
    flex: 1,
    backgroundColor: '#F8FAF8',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  vitalFieldIcon: {
    width: 13,
    height: 13,
  },
  vitalFieldLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
  },
  vitalTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontFamily: FONT_BOLD,
    color: '#0F172A',
  },
  vitalHintText: {
    fontSize: 9.5,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    marginTop: 4,
  },

  /* Notes */
  notesSection: {
    marginTop: 2,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesHeaderIcon: {
    width: 13,
    height: 13,
    tintColor: '#0F5132',
  },
  notesLabel: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
  },
  notesInput: {
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#0F172A',
    minHeight: 68,
    lineHeight: 18,
  },

  /* Disclaimer Card */
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 13,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 18,
    gap: 10,
  },
  disclaimerShield: {
    width: 18,
    height: 18,
    tintColor: '#B45309',
    marginTop: 2,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  disclaimerBody: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#78350F',
    lineHeight: 16,
  },

  /* Submit / Analyze Button */
  analyzeSubmitBtn: {
    backgroundColor: '#0F5132',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  analyzeBtnDisabled: {
    opacity: 0.75,
  },
  analyzeContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnIcon: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  analyzingStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyzingStateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_MEDIUM,
    fontWeight: '600',
  },

  /* 4. FLOATING AI CHAT BOT */
  floatingAiBotWrapper: {
    position: 'absolute',
    bottom: 92,
    right: 18,
    zIndex: 99,
  },
  floatingAiBot: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#107C41',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  floatingAiIcon: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
  },
  floatingAiPill: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  floatingAiPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },

  /* 5. FLOATING BOTTOM NAVIGATION DOCK */
  floatingNavContainer: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    zIndex: 90,
  },
  bottomNavDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navInactiveIconBox: {
    width: 36,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconImage: {
    width: 22,
    height: 22,
  },
  navTabLabel: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 2,
  },
  navCenterScanItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    marginHorizontal: 4,
  },
  navCenterScanCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  navCenterScanIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  navCenterScanLabelActive: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
    marginTop: 3,
  },
});
