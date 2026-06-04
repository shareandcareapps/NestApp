// core/store/index.js
// CORE FILE — DO NOT MODIFY STRUCTURE
// Global shared state — all features READ from here

import { create } from 'zustand';

const useAppStore = create((set) => ({

  // ─── Auth State ───────────────────────────────
  user: null,
  session: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSession: (session) => set({ session }),
  clearAuth: () => set({ user: null, session: null, isAuthenticated: false }),

  // ─── App State ────────────────────────────────
  isLoading: false,
  currentCity: 'St. Louis',

  setLoading: (isLoading) => set({ isLoading }),
  setCurrentCity: (city) => set({ currentCity: city }),

  // ─── Theme ────────────────────────────────────
  // 'light', 'dark', 'auto'
  themeMode: 'auto',
  setThemeMode: (themeMode) => set({ themeMode }),

  // ─── Notifications ────────────────────────────
  unreadMessages: 0,
  setUnreadMessages: (count) => set({ unreadMessages: count }),

}));

export default useAppStore;