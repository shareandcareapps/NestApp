// core/theme/ThemeContext.js
import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import useAppStore from '../store/index';
import { lightColors, darkColors } from './index';

// Extend with semantic tokens used across components
const buildTheme = (base, isDark) => ({
  ...base,
  isDark,
  // surface variants
  surfaceSecondary: isDark ? '#221650' : '#F5F0E8',
  navBackground: isDark ? '#0F0A1E' : '#2D1B69',
  navText: '#FFFFFF',
  tabBackground: isDark ? '#1A1035' : '#FFFFFF',
  // state semantic backgrounds
  successBackground: isDark ? '#003D2E' : '#E0FAF2',
  successText: '#00C48C',
  warningBackground: isDark ? '#3D2800' : '#FFF8E6',
  warningText: '#F4A833',
  errorBackground: isDark ? '#3D0A0A' : '#FFF0F0',
  infoBackground: isDark ? '#00214D' : '#E6F4FF',
  // overlay
  overlay: isDark ? 'rgba(15,10,30,0.8)' : 'rgba(45,27,105,0.6)',
  // keep legacy keys for screens not yet revamped
  textInverse: isDark ? '#000000' : '#FFFFFF',
});

const ThemeContext = createContext(buildTheme(lightColors, false));

export function ThemeProvider({ children }) {
  const systemTheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemTheme === 'dark');
  const theme = buildTheme(isDark ? darkColors : lightColors, isDark);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
