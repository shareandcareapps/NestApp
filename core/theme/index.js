// core/theme/index.js
export const lightColors = {
  // Brand
  primary: '#F4A833',
  secondary: '#2D1B69',
  accent: '#FF6B6B',

  // Backgrounds
  background: '#FEFAF4',
  surface: '#FFFFFF',
  card: '#FFF8EE',
  inputBackground: '#F5F0E8',

  // Borders
  border: '#E8DFD0',
  borderLight: '#F0EAE0',

  // Text
  textPrimary: '#1A1035',
  textSecondary: '#5A4F6E',
  textLight: '#9B8FAD',
  textWhite: '#FFFFFF',
  textMuted: '#C4B9D4',

  // States
  success: '#00C48C',
  warning: '#F4A833',
  error: '#FF6B6B',
  info: '#0099FF',

  // Feature accent colors
  classifieds: '#FF6B6B',
  rides: '#00C48C',
  news: '#0099FF',
  messages: '#9B59B6',

  // Gradients (arrays for LinearGradient)
  gradientPrimary: ['#F4A833', '#FF6B6B'],
  gradientSecondary: ['#2D1B69', '#4A2D9C'],
  gradientCard: ['#FFF8EE', '#FFF0DC'],
  gradientSuccess: ['#00C48C', '#00A878'],

  // Overlay
  overlay: 'rgba(45, 27, 105, 0.6)',
  overlayLight: 'rgba(45, 27, 105, 0.15)',
  glass: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
};

export const darkColors = {
  // Brand
  primary: '#F4A833',
  secondary: '#1A1035',
  accent: '#FF6B6B',

  // Backgrounds
  background: '#0F0A1E',
  surface: '#1A1035',
  card: '#221650',
  inputBackground: '#1A1035',

  // Borders
  border: '#2D1B69',
  borderLight: '#3D2B79',

  // Text
  textPrimary: '#F5F0FF',
  textSecondary: '#B8ACCC',
  textLight: '#7B6F8F',
  textWhite: '#FFFFFF',
  textMuted: '#4A3F5E',

  // States
  success: '#00C48C',
  warning: '#F4A833',
  error: '#FF6B6B',
  info: '#0099FF',

  // Feature accent colors
  classifieds: '#FF6B6B',
  rides: '#00C48C',
  news: '#0099FF',
  messages: '#9B59B6',

  // Gradients
  gradientPrimary: ['#F4A833', '#FF6B6B'],
  gradientSecondary: ['#2D1B69', '#4A2D9C'],
  gradientCard: ['#1A1035', '#221650'],
  gradientSuccess: ['#00C48C', '#00A878'],

  // Overlay
  overlay: 'rgba(15, 10, 30, 0.8)',
  overlayLight: 'rgba(244, 168, 51, 0.12)',
  glass: 'rgba(26, 16, 53, 0.75)',
  glassBorder: 'rgba(244, 168, 51, 0.2)',
};

export const fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 38,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const shadows = {
  small: {
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  medium: {
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  large: {
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    shadowColor: '#F4A833',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Backward compatible default export
export const colors = lightColors;
