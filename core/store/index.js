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
  profileName: '',
  profileEmail: '',

  setLoading: (isLoading) => set({ isLoading }),
  setCurrentCity: (city) => set({ currentCity: city }),
  setProfileName: (profileName) => set({ profileName }),
  setProfileEmail: (profileEmail) => set({ profileEmail }),

  // ─── Theme ────────────────────────────────────
  // 'light', 'dark', 'auto'
  themeMode: 'auto',
  setThemeMode: (themeMode) => set({ themeMode }),

  // ─── Notifications ────────────────────────────
  unreadMessages: 0,
  unreadConversationIds: [],
  readConversationIds: [], // tracks conversations explicitly read this session
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  addUnreadConversation: (id) => set((state) => {
    if (state.unreadConversationIds.includes(id)) return state;
    const ids = [...state.unreadConversationIds, id];
    // New message arrived — remove from readConversationIds so refresh won't suppress it
    const readIds = state.readConversationIds.filter(r => r !== id);
    return { unreadConversationIds: ids, unreadMessages: ids.length, readConversationIds: readIds };
  }),
  clearUnreadConversation: (id) => set((state) => {
    const ids = state.unreadConversationIds.filter(c => c !== id);
    const readIds = state.readConversationIds.includes(id)
      ? state.readConversationIds
      : [...state.readConversationIds, id];
    return { unreadConversationIds: ids, unreadMessages: ids.length, readConversationIds: readIds };
  }),
  setInitialUnread: (ids) => set((state) => {
    // Filter out conversations already read this session
    const filtered = ids.filter(id => !state.readConversationIds.includes(id));
    return { unreadConversationIds: filtered, unreadMessages: filtered.length };
  }),

}));

export default useAppStore;