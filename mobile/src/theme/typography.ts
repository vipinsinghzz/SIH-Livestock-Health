/**
 * PashuCare - Design Tokens: Typography
 * Scaled and accessible typography configuration for Android screens.
 */

import { Platform } from 'react-native';

export const typography = {
  fonts: {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    semibold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    extrabold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  },
  sizes: {
    xs: 12,
    sm: 13.5,
    base: 15,
    lg: 17.5,
    xl: 20,
    xxl: 24,
    display: 28,
    hero: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.48,
    relaxed: 1.65,
  },
};

export type Typography = typeof typography;
