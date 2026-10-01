/**
 * PashuCare - Design Tokens: Colors
 * Theme inspired by agricultural vitality, veterinary health, and high-trust clinical care.
 */

export const colors = {
  light: {
    // Brand primary palette
    primary: '#0F5132',         // Deep Emerald Green (Official brand color)
    primaryLight: '#198754',    // Mid Emerald Green
    primaryDark: '#0A3822',     // Dark Forest Green
    primarySubtle: '#E8F5E9',   // Light mint background
    primaryHighlight: '#D1E7DD',// Mint border & badge tint

    // Secondary & Supporting
    secondary: '#20C997',       // Teal wellness
    secondarySubtle: '#E6F9F4', // Pale teal background
    
    // Status & Clinical Triage
    success: '#198754',         // Healthy / Routine
    successBg: '#D1E7DD',
    warning: '#D97706',         // Amber / Precaution / Moderate Risk
    warningBg: '#FEF3C7',
    danger: '#DC3545',          // High Risk / Outbreak Alert
    dangerBg: '#F8D7DA',
    info: '#0D6EFD',            // Advisory / Informational
    infoBg: '#CFE2FF',

    // Neutral Surfaces & Typography
    background: '#F8F9FA',      // Main screen background
    surface: '#FFFFFF',         // Card & modal background
    surfaceAlt: '#F1F3F5',      // Secondary surface / input background
    border: '#E2E8F0',          // Subtle divider line
    borderFocus: '#0F5132',     // Active input border

    // Text & Content Hierarchy
    textPrimary: '#1E293B',     // Heading & high-emphasis text
    textSecondary: '#475569',   // Subheading & body text
    textMuted: '#94A3B8',       // Captions & helper text
    textInverse: '#FFFFFF',     // Text on primary buttons/bars

    // Role-specific badges
    farmerBadge: '#0F5132',
    farmerBadgeBg: '#E8F5E9',
    vetBadge: '#0D6EFD',
    vetBadgeBg: '#CFE2FF',
    officerBadge: '#7C3AED',
    officerBadgeBg: '#EDE9FE',
  },
  dark: {
    primary: '#22C55E',
    primaryLight: '#4ADE80',
    primaryDark: '#15803D',
    primarySubtle: '#14291E',
    primaryHighlight: '#1E3A2B',

    secondary: '#2DD4BF',
    secondarySubtle: '#132E2B',

    success: '#22C55E',
    successBg: '#14291E',
    warning: '#F59E0B',
    warningBg: '#332308',
    danger: '#EF4444',
    dangerBg: '#381313',
    info: '#3B82F6',
    infoBg: '#14243B',

    background: '#0F172A',
    surface: '#1E293B',
    surfaceAlt: '#334155',
    border: '#334155',
    borderFocus: '#22C55E',

    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    textInverse: '#0F172A',

    farmerBadge: '#4ADE80',
    farmerBadgeBg: '#14291E',
    vetBadge: '#60A5FA',
    vetBadgeBg: '#14243B',
    officerBadge: '#A78BFA',
    officerBadgeBg: '#2E1A47',
  }
} as const;

export type ThemeColors = typeof colors.light;
