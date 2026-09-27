/**
 * Livestock Saathi - Kisan Saathi AI Conversational Assistant
 * File: mobile/app/(farmer)/kisan-saathi/index.tsx
 * 
 * Production-ready mobile interface connecting to POST /api/kisan-saathi/consult.
 * Supports trilingual consultations (English, Hindi, Marathi), animal context selection,
 * conversation history, suggested actions, emergency 1962 hotline, and clinical fallback.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  SafeAreaView
} from 'react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import animalService from '../../../src/services/animalService';
import kisanSaathiService from '../../../src/services/kisanSaathiService';
import { Animal } from '../../../src/types/animal';
import {
  KisanSaathiLanguage,
  ChatMessage,
  RiskLevel
} from '../../../src/types/kisanSaathi';

const QUICK_PROMPTS: Record<KisanSaathiLanguage, string[]> = {
  en: [
    'My animal is not eating',
    'Vaccination due',
    'How to improve milk production',
    'My animal has fever',
  ],
  hi: [
    'पशु चारा नहीं खा रहा',
    'टीकाकरण कब है?',
    'दूध बढ़ाने के उपाय',
    'पशु को बुखार है',
  ],
  mr: [
    'जनावर चारा खात नाही',
    'लसीकरण कधी आहे?',
    'दूध वाढवण्याचे उपाय',
    'जनावराला ताप आहे',
  ],
};

const INITIAL_GREETINGS: Record<KisanSaathiLanguage, string> = {
  en: 'Greetings! I am Kisan Saathi, your livestock health assistant. You can ask me about animal symptoms, vaccination, milk yield, or government schemes. How may I help you today?',
  hi: 'राम-राम! मैं किसान साथी, आपका पशु स्वास्थ्य सहायक। आप मुझसे पशु की बीमारी, लक्षण, टीकाकरण, दूध उत्पादन या सरकारी योजनाओं के बारे में पूछ सकते हैं। आज मैं आपकी क्या सेवा करूँ?',
  mr: 'नमस्कार! मी किसान साथी, आपला पशु आरोग्य सहाय्यक. आपण जनावरांचे आजार, लक्षणे, लसीकरण, दूध उत्पादन किंवा शासकीय योजनांबद्दल विचारू शकता. आज मी आपली काय मदत करू?',
};

const PLACEHOLDER_TEXT: Record<KisanSaathiLanguage, string> = {
  en: 'Type your livestock question here...',
  hi: 'पशु के लक्षण, चारा या बीमारी के बारे में पूछें...',
  mr: 'जनावराचे लक्षण, चारा किंवा आजाराबद्दल विचारा...',
};

export default function KisanSaathiScreen() {
  const { user } = useAuth();
  const { language: globalLang, changeLanguage: setGlobalLanguage, t } = useAppLanguage();

  // Language State (Defaults to global app language if valid, else user preference or 'en')
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

  // Herd Animal Selection Context
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [animalModalVisible, setAnimalModalVisible] = useState(false);

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
        defaultLang === 'hi' ? 'टीकाकरण सारणी' : defaultLang === 'mr' ? 'लसीकरण वेळापत्रक' : 'Vaccination Schedule',
      ],
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load Farmer's Herd Animals
  useEffect(() => {
    let isMounted = true;
    const loadHerd = async () => {
      setLoadingAnimals(true);
      try {
        const herd = await animalService.getAnimals();
        if (isMounted && Array.isArray(herd)) {
          setAnimals(herd);
        }
      } catch (err) {
        console.warn('KisanSaathi: Could not load herd animals:', err);
      } finally {
        if (isMounted) setLoadingAnimals(false);
      }
    };
    loadHerd();
    return () => {
      isMounted = false;
    };
  }, []);

  // When language changes, update greeting if no conversation has occurred yet
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
              newLang === 'hi' ? 'टीकाकरण सारणी' : newLang === 'mr' ? 'लसीकरण वेळापत्रक' : 'Vaccination Schedule',
            ],
          },
        ];
      }
      return prev;
    });
  };

  useEffect(() => {
    if (globalLang && (globalLang === 'en' || globalLang === 'hi' || globalLang === 'mr')) {
      if (globalLang !== language) {
        handleLanguageChange(globalLang as KisanSaathiLanguage);
      }
    }
  }, [globalLang]);

  // Scroll to latest message
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Send Message Handler
  const handleSendMessage = async (queryToSend?: string) => {
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

    // Update message thread immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    scrollToBottom();
    setLoading(true);

    try {
      // Build conversation history (limit to last 8 turns)
      const historyPayload = updatedMessages.slice(-8).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      // Build animal context if selected
      const animalPayload = selectedAnimal
        ? {
            name: selectedAnimal.name,
            species: selectedAnimal.species,
            breed: selectedAnimal.breed,
            age: selectedAnimal.age,
            gender: selectedAnimal.gender,
            healthStatus: selectedAnimal.healthStatus,
            milkYield: selectedAnimal.milkYieldDaily,
          }
        : undefined;

      const response = await kisanSaathiService.consultKisanSaathi({
        query,
        language,
        animalId: selectedAnimal?.id || selectedAnimal?._id,
        animal: animalPayload,
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
        isAIPowered: response.isAIPowered,
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

  // Handle Suggested Action Tap
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

  // Handle Voice Button (Honest fallback: Option B)
  const handleVoicePress = () => {
    Alert.alert(
      language === 'hi' ? 'वॉयस इनपुट' : language === 'mr' ? 'व्हॉइस इनपुट' : 'Voice Input',
      language === 'hi'
        ? 'वॉयस इनपुट जल्द आ रहा है। कृपया अपना प्रश्न टाइप करें।'
        : language === 'mr'
        ? 'व्हॉइस इनपुट लवकरच उपलब्ध होईल. कृपया आपला प्रश्न टाइप करा.'
        : 'Voice input is coming soon in the next release. Please type your query in the meantime.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Top Control Bar: Language Selector & Animal Context */}
        <View style={styles.topControlBar}>
          {/* Language Selector */}
          <View style={styles.languageContainer}>
            {(['en', 'hi', 'mr'] as KisanSaathiLanguage[]).map((langCode) => {
              const label =
                langCode === 'en' ? 'English' : langCode === 'hi' ? 'हिंदी' : 'मराठी';
              const isActive = language === langCode;
              return (
                <TouchableOpacity
                  key={langCode}
                  style={[styles.langChip, isActive && styles.langChipActive]}
                  onPress={() => handleLanguageChange(langCode)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Switch language to ${label}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.langChipText, isActive && styles.langChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Animal Picker Button */}
          <TouchableOpacity
            style={[styles.animalPickerButton, selectedAnimal && styles.animalPickerButtonActive]}
            onPress={() => setAnimalModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Select animal for context"
            accessibilityRole="button"
          >
            <Text style={styles.animalPickerIcon}>🐄</Text>
            <Text
              style={[
                styles.animalPickerText,
                selectedAnimal && styles.animalPickerTextActive,
              ]}
              numberOfLines={1}
            >
              {selectedAnimal ? `${selectedAnimal.name} (${selectedAnimal.species})` : 'Herd Context'}
            </Text>
            {selectedAnimal ? (
              <TouchableOpacity
                onPress={() => setSelectedAnimal(null)}
                style={styles.clearAnimalButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear animal selection"
              >
                <Text style={styles.clearAnimalText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.dropdownArrow}>▼</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Persistent Safety Disclaimer */}
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerText}>
            ⚠️ Kisan Saathi provides AI-assisted preliminary guidance and does not replace a registered veterinarian. In emergency, call 1962.
          </Text>
        </View>

        {/* Chat Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((item) => {
            const isUser = item.sender === 'user';
            return (
              <View
                key={item.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowSaathi,
                ]}
              >
                {!isUser && (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarEmoji}>🤖</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.saathiBubble,
                  ]}
                >
                  {/* Model & AI/Rule-based Badge for Saathi Messages */}
                  {!isUser && (
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.sourceBadge,
                          item.isAIPowered
                            ? styles.aiPoweredBadge
                            : styles.clinicalEngineBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sourceBadgeText,
                            item.isAIPowered
                              ? styles.aiPoweredBadgeText
                              : styles.clinicalEngineBadgeText,
                          ]}
                        >
                          {item.isAIPowered ? '✨ AI-Assisted (Gemini)' : '🛡️ Clinical Rule Guidance'}
                        </Text>
                      </View>

                      {/* Risk Level Badge */}
                      {item.riskLevel && (
                        <View
                          style={[
                            styles.riskBadge,
                            item.riskLevel === 'High'
                              ? styles.riskHigh
                              : item.riskLevel === 'Moderate'
                              ? styles.riskModerate
                              : styles.riskLow,
                          ]}
                        >
                          <Text
                            style={[
                              styles.riskBadgeText,
                              item.riskLevel === 'High'
                                ? styles.riskHighText
                                : item.riskLevel === 'Moderate'
                                ? styles.riskModerateText
                                : styles.riskLowText,
                            ]}
                          >
                            {item.riskLevel === 'High'
                              ? 'Risk: High (Urgent Vet Care)'
                              : `Risk: ${item.riskLevel}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Main Message Text */}
                  <Text style={[styles.messageText, isUser ? styles.userText : styles.saathiText]}>
                    {item.text}
                  </Text>

                  {/* Key Advice Bullet Points */}
                  {!isUser && item.keyAdvice && item.keyAdvice.length > 0 && (
                    <View style={styles.keyAdviceCard}>
                      <Text style={styles.keyAdviceTitle}>
                        {language === 'hi' ? 'मुख्य सलाह:' : language === 'mr' ? 'मुख्य सल्ला:' : 'Key Advice:'}
                      </Text>
                      {item.keyAdvice.map((advice, idx) => (
                        <View key={idx} style={styles.adviceItemRow}>
                          <Text style={styles.adviceBullet}>✓</Text>
                          <Text style={styles.adviceItemText}>{advice}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Suggested Actions */}
                  {!isUser && item.suggestedActions && item.suggestedActions.length > 0 && (
                    <View style={styles.actionsContainer}>
                      {item.suggestedActions.map((action, aIdx) => {
                        const actionText = typeof action === 'string' ? action : ((action as any)?.label || (action as any)?.text || '');
                        const is1962 = actionText.includes('1962');
                        return (
                          <TouchableOpacity
                            key={aIdx}
                            style={[styles.actionChip, is1962 && styles.actionChipEmergency]}
                            onPress={() => handleActionTap(actionText)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Suggested action: ${actionText}`}
                          >
                            <Text
                              style={[
                                styles.actionChipText,
                                is1962 && styles.actionChipEmergencyText,
                              ]}
                            >
                              {is1962 ? `📞 ${actionText}` : `💬 ${actionText}`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Message Timestamp */}
                  <Text
                    style={[
                      styles.timestampText,
                      isUser ? styles.userTimestamp : styles.saathiTimestamp,
                    ]}
                  >
                    {item.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>🤖</Text>
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.light.primary} />
                <Text style={styles.loadingText}>
                  {language === 'hi'
                    ? 'किसान साथी सोच रहा है...'
                    : language === 'mr'
                    ? 'किसान साथी विचार करत आहे...'
                    : 'Kisan Saathi is thinking...'}
                </Text>
              </View>
            </View>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => handleSendMessage()}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
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
                activeOpacity={0.7}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputSection}>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleVoicePress}
            activeOpacity={0.7}
            accessibilityLabel="Voice query coming soon"
            accessibilityRole="button"
          >
            <Text style={styles.voiceButtonIcon}>🎤</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={PLACEHOLDER_TEXT[language]}
            placeholderTextColor={colors.light.textMuted}
            multiline
            maxLength={500}
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.light.textInverse} />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Animal Selection Modal */}
      <Modal
        visible={animalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnimalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'hi' ? 'पशु चुनें (संदर्भ)' : language === 'mr' ? 'जनावर निवडा (संदर्भ)' : 'Select Animal Context'}
              </Text>
              <TouchableOpacity
                onPress={() => setAnimalModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {language === 'hi'
                ? 'विशिष्ट पशु की जानकारी शामिल करने के लिए नीचे से चुनें:'
                : language === 'mr'
                ? 'विशिष्ट जनावराची माहिती समाविष्ट करण्यासाठी निवडा:'
                : 'Provide patient context for personalized medical advice:'}
            </Text>

            <ScrollView style={styles.modalList}>
              {/* General / No Animal Option */}
              <TouchableOpacity
                style={[
                  styles.animalOption,
                  !selectedAnimal && styles.animalOptionActive,
                ]}
                onPress={() => {
                  setSelectedAnimal(null);
                  setAnimalModalVisible(false);
                }}
              >
                <Text style={styles.animalOptionEmoji}>🌾</Text>
                <View style={styles.animalOptionInfo}>
                  <Text style={styles.animalOptionName}>
                    {language === 'hi' ? 'सामान्य प्रश्न (कोई विशिष्ट पशु नहीं)' : language === 'mr' ? 'सामान्य प्रश्न (कोणतेही विशिष्ट जनावर नाही)' : 'General Livestock (No Specific Animal)'}
                  </Text>
                  <Text style={styles.animalOptionSub}>
                    {language === 'hi' ? 'समस्त कळप या सामान्य जानकारी' : language === 'mr' ? 'कळप किंवा सामान्य माहिती' : 'General herd management & inquiries'}
                  </Text>
                </View>
                {!selectedAnimal && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>

              {loadingAnimals ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={colors.light.primary} />
                </View>
              ) : animals.length === 0 ? (
                <Text style={styles.noAnimalsText}>
                  No registered animals found in herd.
                </Text>
              ) : (
                animals.map((anim) => {
                  const isSelected = selectedAnimal?._id === anim._id || selectedAnimal?.id === anim.id;
                  return (
                    <TouchableOpacity
                      key={anim._id || anim.id}
                      style={[
                        styles.animalOption,
                        isSelected && styles.animalOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedAnimal(anim);
                        setAnimalModalVisible(false);
                      }}
                    >
                      <Text style={styles.animalOptionEmoji}>
                        {anim.species === 'Buffalo' ? '🐃' : anim.species === 'Goat' ? '🐐' : '🐄'}
                      </Text>
                      <View style={styles.animalOptionInfo}>
                        <Text style={styles.animalOptionName}>{anim.name}</Text>
                        <Text style={styles.animalOptionSub}>
                          {anim.species} • {anim.breed || 'Indigenous'} • {anim.age} yrs • Tag: {anim.tagId}
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    flex: 1,
  },

  // Top Control Bar
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  languageContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.xxs,
  },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  langChipActive: {
    backgroundColor: colors.light.primary,
  },
  langChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textSecondary,
  },
  langChipTextActive: {
    color: colors.light.textInverse,
  },

  // Animal Context Picker
  animalPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 160,
  },
  animalPickerButtonActive: {
    backgroundColor: colors.light.primarySubtle,
    borderColor: colors.light.primaryLight,
  },
  animalPickerIcon: {
    fontSize: typography.sizes.sm,
    marginRight: spacing.xs,
  },
  animalPickerText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
  },
  animalPickerTextActive: {
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
  },
  clearAnimalButton: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  clearAnimalText: {
    fontSize: typography.sizes.xs,
    color: colors.light.danger,
    fontWeight: typography.weights.bold,
  },
  dropdownArrow: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginLeft: spacing.xs,
  },

  // Disclaimer
  disclaimerBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },

  // Messages Container
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowSaathi: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.light.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  userBubble: {
    backgroundColor: colors.light.primary,
    borderBottomRightRadius: radii.xs,
  },
  saathiBubble: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderBottomLeftRadius: radii.xs,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  sourceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  aiPoweredBadge: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  aiPoweredBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#1B5E20',
  },
  clinicalEngineBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  clinicalEngineBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#0369A1',
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  riskLow: {
    backgroundColor: colors.light.successBg,
  },
  riskLowText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.success,
  },
  riskModerate: {
    backgroundColor: colors.light.warningBg,
  },
  riskModerateText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.warning,
  },
  riskHigh: {
    backgroundColor: colors.light.dangerBg,
  },
  riskHighText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
  },

  // Text inside bubbles
  messageText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  userText: {
    color: colors.light.textInverse,
  },
  saathiText: {
    color: colors.light.textPrimary,
  },

  // Key Advice Card
  keyAdviceCard: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.light.primary,
  },
  keyAdviceTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primaryDark,
    marginBottom: spacing.xxs,
  },
  adviceItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  adviceBullet: {
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
    marginRight: spacing.xs,
    fontSize: typography.sizes.xs,
  },
  adviceItemText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    flexShrink: 1,
    lineHeight: 18,
  },

  // Suggested Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionChip: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionChipText: {
    fontSize: 11,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
  },
  actionChipEmergency: {
    backgroundColor: colors.light.dangerBg,
    borderColor: '#FCA5A5',
  },
  actionChipEmergencyText: {
    color: colors.light.danger,
    fontWeight: typography.weights.bold,
  },

  // Timestamp
  timestampText: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
  userTimestamp: {
    color: '#D1E7DD',
    textAlign: 'right',
  },
  saathiTimestamp: {
    color: colors.light.textMuted,
    textAlign: 'left',
  },

  // Loading indicator row
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },

  // Error Banner
  errorContainer: {
    backgroundColor: colors.light.dangerBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.light.danger,
    flex: 1,
    marginRight: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.light.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.xs,
  },
  retryButtonText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },

  // Quick Prompts
  quickPromptsSection: {
    backgroundColor: colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingVertical: spacing.xs,
  },
  quickPromptsList: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  quickPromptChip: {
    backgroundColor: colors.light.primarySubtle,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  quickPromptText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.medium,
  },

  // Input Section
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    gap: spacing.sm,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  voiceButtonIcon: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.light.textMuted,
  },
  sendButtonText: {
    fontSize: 18,
    color: colors.light.textInverse,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalCloseText: {
    fontSize: typography.sizes.base,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.md,
  },
  modalList: {
    maxHeight: 320,
  },
  modalLoading: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noAnimalsText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    textAlign: 'center',
    padding: spacing.md,
  },
  animalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.light.surfaceAlt,
  },
  animalOptionActive: {
    backgroundColor: colors.light.primarySubtle,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  animalOptionEmoji: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  animalOptionInfo: {
    flex: 1,
  },
  animalOptionName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  animalOptionSub: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  checkmark: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
    marginLeft: spacing.sm,
  },
});
