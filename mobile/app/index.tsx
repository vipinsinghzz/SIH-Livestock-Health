/**
 * PashuCare - Welcome Screen (Step 1 of Onboarding)
 * File: mobile/app/index.tsx
 *
 * Full-bleed authentic Indian rural livestock health artwork with organic
 * green/cream visual language, preserving full composition and aspect ratio (853 x 1844).
 * Screen 1 of 2-step onboarding: Displays ONLY the PashuCare artwork and a prominent
 * centered "Next" button inside the reserved cream/off-white area.
 * Zero login actions on this screen.
 */

import React, { useEffect, useRef } from 'react';
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
import { useAppLanguage } from '../src/services/i18n';
import { radii } from '../src/theme';

// Artwork native aspect ratio: 853 x 1844 (0.46258)
const ARTWORK_NATIVE_WIDTH = 853;
const ARTWORK_NATIVE_HEIGHT = 1844;
const ARTWORK_ASPECT_RATIO = ARTWORK_NATIVE_WIDTH / ARTWORK_NATIVE_HEIGHT;

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useAppLanguage();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Subtle entrance animation for the action button
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(12)).current;

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

  // Render artwork at full screen width while strictly preserving the 853:1844 aspect ratio
  const artworkWidth = windowWidth;
  const artworkHeight = windowWidth / ARTWORK_ASPECT_RATIO;

  // Reserved Action Zone coordinates:
  // - Top boundary (immediately below feature icons): 71.2% of artwork height (y = 1312px)
  // - Bottom boundary (immediately above rolling green landscape): 88.0% of artwork height (y = 1622px)
  // Total cream region height is ~16.8% of artwork height.
  // Using flexbox `justifyContent: 'center'` guarantees true vertical center alignment of the Next button
  // within this reserved space across all devices and screen aspect ratios.
  const actionZoneTop = artworkHeight * 0.712;
  const actionZoneHeight = artworkHeight * 0.168;

  const handleNext = () => {
    console.log('[PashuCare] Tapped "Next" -> navigating to /language-selection');
    router.push('/language-selection' as any);
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
          {/* Welcome Background Artwork */}
          <Image
            source={require('../assets/pashucare-welcome.png')}
            style={[styles.artworkImage, { width: artworkWidth, height: artworkHeight }]}
            resizeMode="cover"
            accessible={true}
            accessibilityLabel="PashuCare - Healthy Animals, Prosperous Farmers"
          />

          {/* Reserved Action Zone (Light/Cream Region) with True Center Alignment */}
          <Animated.View
            style={[
              styles.actionZone,
              {
                top: actionZoneTop,
                height: actionZoneHeight,
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }],
              },
            ]}
          >
            {/* Sole Action: Next Button */}
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('common.next', 'Next')}
              accessibilityHint="Proceeds to language selection"
            >
              <Text style={styles.nextButtonText}>
                {t('common.next', 'Next')}
              </Text>
            </TouchableOpacity>
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
  actionZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center', // True vertical center alignment of button inside cream area
    alignItems: 'center',     // Horizontal center alignment
    paddingHorizontal: 28,
  },
  nextButton: {
    backgroundColor: '#0F5132', // Rich organic brand emerald green
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 210,
    maxWidth: 300,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 7,
      },
      android: {
        elevation: 3.5,
      },
    }),
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
