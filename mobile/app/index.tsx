/**
 * PashuCare - Welcome Screen (Initial App Entry)
 * File: mobile/app/index.tsx
 *
 * Full-bleed authentic Indian rural livestock health artwork with organic
 * green/cream visual language, subtle entrance animation, full localization (en/hi/mr),
 * and responsive layout preservation with true vertical center alignment of buttons.
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
import { useAuth } from '../src/context/AuthContext';
import { useAppLanguage } from '../src/services/i18n';
import { typography, radii } from '../src/theme';

// Artwork native aspect ratio: 853 x 1844 (0.46258)
const ARTWORK_NATIVE_WIDTH = 853;
const ARTWORK_NATIVE_HEIGHT = 1844;
const ARTWORK_ASPECT_RATIO = ARTWORK_NATIVE_WIDTH / ARTWORK_NATIVE_HEIGHT; // ~0.46258

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useAppLanguage();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Subtle entrance animation for the action area (fade-in & gentle translate)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(14)).current;

  // Preserve authentication: redirect active authenticated sessions directly to their portal
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const role = (user.role || '').toLowerCase();
      console.log('[PashuCare] Active session detected, directing to portal for role:', role);
      if (role === 'farmer') {
        router.replace('/(farmer)');
      } else if (role === 'veterinarian' || role === 'field_worker') {
        router.replace('/(vet)');
      } else if (role === 'officer' || role === 'admin') {
        router.replace('/(officer)');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  // Reliable responsive dimensions:
  // Render artwork at full screen width, preserving the 853:1844 aspect ratio.
  const artworkWidth = windowWidth;
  const artworkHeight = windowWidth / ARTWORK_ASPECT_RATIO;

  // Reserved Action Zone coordinates:
  // - Top boundary (immediately below the feature icons text): 71.2% of artwork height (y = 1312px)
  // - Bottom boundary (immediately above the rolling green landscape wave): 89.0% of artwork height (y = 1641px)
  // Using flexbox `justifyContent: 'center'` guarantees true vertical center alignment of the buttons
  // within this reserved space across all devices and screen aspect ratios.
  const actionZoneTop = artworkHeight * 0.712;
  const actionZoneHeight = artworkHeight * (0.89 - 0.712);

  const handleStart = () => {
    console.log('[PashuCare] Tapped "Start Using PashuCare" -> navigating to /(auth)/register');
    router.push('/(auth)/register');
  };

  const handleLogin = () => {
    console.log('[PashuCare] Tapped "Login here" -> navigating to /(auth)/login');
    router.push('/(auth)/login');
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

          {/* Reserved Action Zone (Light/Cream Region) with True Vertical Center Alignment */}
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
            {/* Primary Action: Start Using PashuCare */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStart}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('welcome.startUsing', 'Start Using PashuCare')}
              accessibilityHint="Opens account registration and role selection"
            >
              <Text style={styles.primaryButtonText}>
                {t('welcome.startUsing', 'Start Using PashuCare')}
              </Text>
            </TouchableOpacity>

            {/* Secondary Action: Login Here */}
            <View style={styles.secondaryRow}>
              <Text style={styles.secondaryPrompt}>
                {t('welcome.alreadyRegistered', 'Already registered?')}{' '}
              </Text>
              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t('welcome.loginHere', 'Login here')}
                accessibilityHint="Opens sign in screen"
                hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              >
                <Text style={styles.loginLink}>
                  {t('welcome.loginHere', 'Login here')}
                </Text>
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
  actionZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center', // True vertical center alignment of buttons
    alignItems: 'center',     // Horizontal center alignment
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#0F5132', // Rich organic brand emerald green
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  secondaryPrompt: {
    fontSize: typography.sizes.xs + 1,
    color: '#556356', // Warm, calm slate/charcoal over light cream
    fontWeight: typography.weights.medium,
  },
  loginLink: {
    fontSize: typography.sizes.xs + 1,
    color: '#0F5132', // Emphasized brand green
    fontWeight: typography.weights.bold,
    textDecorationLine: 'underline',
  },
});
