// core/theme/index.js
// CORE FILE — DO NOT MODIFY STRUCTURE
// All app colors, fonts and sizes live here

export const lightColors = {
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#457B9D',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  textWhite: '#FFFFFF',
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',
  classifieds: '#E63946',
  rides: '#2ECC71',
  news: '#3498DB',
  messages: '#9B59B6',
  card: '#FFFFFF',
  inputBackground: '#F8F9FA',
};

export const darkColors = {
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#457B9D',
  background: '#121212',
  surface: '#1E1E1E',
  border: '#333333',
  textPrimary: '#F5F5F5',
  textSecondary: '#AAAAAA',
  textLight: '#777777',
  textWhite: '#FFFFFF',
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',
  classifieds: '#E63946',
  rides: '#2ECC71',
  news: '#3498DB',
  messages: '#9B59B6',
  card: '#2A2A2A',
  inputBackground: '#2A2A2A',
};

export const fonts = {
  regular: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
};

// Backward compatible default export
export const colors = lightColors;