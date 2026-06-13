// core/database/index.js
// CORE FILE — DO NOT MODIFY STRUCTURE
// This is the single connection point to Supabase
// Every feature uses this — never create another Supabase connection

import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://evdtdsvbaxneywahuxgw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wwRWRTsAwMIg9FdAzvei-A_I-fXt-Rz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // React Native has no localStorage — without this, sessions were lost on
    // every cold start and users had to sign in again.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is foregrounded (Supabase RN best practice)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
