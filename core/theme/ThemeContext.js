// core/theme/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import useAppStore from '../store/index';

export const lightColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F0F0',
  card: '#FFFFFF',
  inputBackground: '#F8F9FA',
  navBackground: '#1D3557',
  navText: '#FFFFFF',
  tabBackground: '#FFFFFF',
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#457B9D',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  textWhite: '#FFFFFF',
  textInverse: '#FFFFFF',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  success: '#2ECC71',
  successBackground: '#E8F8F0',
  successText: '#27AE60',
  warning: '#F39C12',
  warningBackground: '#FFF9E6',
  warningText: '#856404',
  error: '#E74C3C',
  errorBackground: '#FFF5F5',
  info: '#3498DB',
  infoBackground: '#E8F4FD',
  classifieds: '#E63946',
  rides: '#2ECC71',
  news: '#3498DB',
  messages: '#9B59B6',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkColors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceSecondary: '#252525',
  card: '#1E1E1E',
  inputBackground: '#252525',
  navBackground: '#0F1F2E',
  navText: '#FFFFFF',
  tabBackground: '#1A1A1A',
  primary: '#E63946',
  secondary: '#457B9D',
  accent: '#457B9D',
  textPrimary: '#F5F5F5',
  textSecondary: '#AAAAAA',
  textLight: '#666666',
  textWhite: '#FFFFFF',
  textInverse: '#000000',
  border: '#333333',
  borderLight: '#2A2A2A',
  success: '#2ECC71',
  successBackground: '#0D2B1A',
  successText: '#2ECC71',
  warning: '#F39C12',
  warningBackground: '#2B1F0A',
  warningText: '#F39C12',
  error: '#E74C3C',
  errorBackground: '#2B0D0D',
  info: '#3498DB',
  infoBackground: '#0D1F2B',
  classifieds: '#E63946',
  rides: '#2ECC71',
  news: '#3498DB',
  messages: '#9B59B6',
  overlay: 'rgba(0,0,0,0.7)',
};

const ThemeContext = createContext(lightColors);

export function ThemeProvider({ children }) {
  const systemTheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);

  const isDark = themeMode === 'dark' ||
    (themeMode === 'auto' && systemTheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}