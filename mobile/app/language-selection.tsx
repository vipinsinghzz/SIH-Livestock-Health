/**
 * PashuCare - Language Selection Screen (Step 2 of Onboarding)
 * File: mobile/app/language-selection.tsx
 *
 * Second step of the two-step PashuCare onboarding flow.
 * Displays the language selection UI completely inside the off-white/cream blank
 * area of the dedicated language selection artwork (853 x 1844).
 * Integrates with the centralized i18n system & SecureStore persistence.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/context/AuthContext';
import { useAppLanguage, AppLanguage } from '../src/services/i18n';
import { radii } from '../src/theme';

// Artwork native dimensions: 853 x 1844 (Aspect ratio: 0.46258)
const ARTWORK_NATIVE_WIDTH = 853;
const ARTWORK_NATIVE_HEIGHT = 1844;
const ARTWORK_ASPECT_RATIO = ARTWORK_NATIVE_WIDTH / ARTWORK_NATIVE_HEIGHT;

const LANGUAGE_OPTIONS: { code: AppLanguage; label: string }[] = [
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
];

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const { language, changeLanguage, t } = useAppLanguage();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Local selection state, synchronized with persistent centralized i18n
  const [selectedLang, setSelectedLang] = useState<AppLanguage>(language || 'hi');

  // Entrance animations for the language selection container
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(12)).current;

  // Sync selectedLang if language changes from external source
  useEffect(() => {
    if (language) {
      setSelectedLang(language);
    }
  }, [language]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  // Scale artwork to full screen width while strictly preserving the 853:1844 aspect ratio
  const artworkWidth = windowWidth;
  const artworkHeight = windowWidth / ARTWORK_ASPECT_RATIO;

  // Cream Blank Region exact mathematical coordinates:
  // - Top boundary (immediately below foliage/animals): 61.2% of artwork height (y = 1128px)
  // - Bottom boundary (immediately above rolling green hills): 86.8% of artwork height (y = 1600px)
  const creamZoneTop = artworkHeight * 0.612;
  const creamZoneHeight = artworkHeight * 0.256;

  const handleSelectLanguage = async (code: AppLanguage) => {
    setSelectedLang(code);
    await changeLanguage(code);
  };

  const handleNext = async () => {
    if (selectedLang !== language) {
      await changeLanguage(selectedLang);
    }
    console.log('[PashuCare] Language confirmed (' + selectedLang + '), proceeding from onboarding');
    if (isAuthenticated && user) {
      const role = (user.role || '').toLowerCase();
      if (role === 'farmer') {
        router.replace('/(farmer)');
      } else if (role === 'veterinarian' || role === 'field_worker') {
        router.replace('/(vet)');
      } else if (role === 'officer' || role === 'admin') {
        router.replace('/(officer)');
      } else {
        router.replace('/(farmer)');
      }
    } else {
      router.push('/(auth)/register');
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: windowHeight },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.artworkWrapper, { width: artworkWidth, height: artworkHeight }]}>
          {/* PashuCare Language Selection Artwork with large cream area */}
          <Image
            source={require('../assets/language_selection.png')}
            style={[styles.artworkImage, { width: artworkWidth, height: artworkHeight }]}
            resizeMode="cover"
            accessible={true}
            accessibilityLabel="PashuCare - Healthy Animals, Prosperous Farmers"
          />

          {/* Language Selection UI Container (Completely inside Off-White / Cream Area) */}
          <Animated.View
            style={[
              styles.creamContainer,
              {
                top: creamZoneTop,
                height: creamZoneHeight,
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }],
              },
            ]}
          >
            <View style={styles.languageCardBlock}>
              {/* Header Title */}
              <Text style={styles.title}>{t('common.chooseLanguage', 'Choose Language')}</Text>

              {/* Three Language Choices */}
              <View style={styles.optionsList}>
                {LANGUAGE_OPTIONS.map((item) => {
                  const isSelected = selectedLang === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.languageOption,
                        isSelected ? styles.languageOptionSelected : styles.languageOptionUnselected,
                      ]}
                      onPress={() => handleSelectLanguage(item.code)}
                      activeOpacity={0.75}
                      accessible={true}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={item.label}
                    >
                      <Text
                        style={[
                          styles.languageLabel,
                          isSelected ? styles.languageLabelSelected : styles.languageLabelUnselected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <View style={styles.checkContainer}>
                        {isSelected ? (
                          <Text style={styles.checkMark}>✓</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Next Action Button */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.85}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t('common.next', 'Next')}
                accessibilityHint="Continues to account onboarding and authentication"
              >
                <Text style={styles.nextButtonText}>{t('common.next', 'Next')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#274E18', // Seamlessly matches bottom landscape green
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#274E18',
  },
  artworkWrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F5F5E3',
  },
  artworkImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  creamContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center', // True vertical center alignment inside cream area
    alignItems: 'center',     // Horizontal center alignment
    paddingHorizontal: 28,
  },
  languageCardBlock: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F5132', // Deep natural brand green
    marginBottom: 8,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  optionsList: {
    width: '100%',
    gap: 6,
  },
  languageOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  languageOptionUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#D7E2D9',
  },
  languageOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.8,
    borderColor: '#0F5132',
  },
  languageLabel: {
    fontSize: 14.5,
  },
  languageLabelUnselected: {
    color: '#1E293B',
    fontWeight: '600',
  },
  languageLabelSelected: {
    color: '#0F5132',
    fontWeight: '700',
  },
  checkContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F5132',
  },
  nextButton: {
    backgroundColor: '#0F5132', // Deep natural brand green
    paddingVertical: 9,
    paddingHorizontal: 40,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minWidth: 130,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
