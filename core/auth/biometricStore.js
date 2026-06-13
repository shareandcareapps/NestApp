// core/auth/biometricStore.js
// Single owner of the biometric refresh-token. The token is stored with
// requireAuthentication, so the OS itself demands Face ID / fingerprint before
// the token can be read — the biometric gate is enforced by the keychain, not
// by UI code. Callers must NOT pre-prompt with LocalAuthentication before
// reading (that would double-prompt); reading the token IS the prompt.
//
// A separate non-secret AsyncStorage flag tracks "is biometric login enabled"
// so screens can check availability without triggering a biometric prompt.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Not available in Expo Go — lazy-loaded with fallback
let SecureStore = null;
try { SecureStore = require('expo-secure-store'); } catch (_) {}

const TOKEN_KEY    = 'nest_biometric_session';
const ENABLED_FLAG = '@nest_biometric_enabled';

function secureOpts(promptMessage) {
  return {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    authenticationPrompt: promptMessage || 'Sign in to NestApp',
  };
}

export function biometricStoreAvailable() {
  return !!SecureStore;
}

// Cheap check — never prompts. Also cleans up tokens saved by older app
// versions without access control (the flag didn't exist back then).
export async function isBiometricSessionSaved() {
  if (!SecureStore) return false;
  try {
    const flag = await AsyncStorage.getItem(ENABLED_FLAG);
    if (flag === 'true') return true;
    // Legacy cleanup: token written before access control existed
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch (_) {}
    return false;
  } catch (_) { return false; }
}

export async function saveBiometricToken(refreshToken) {
  if (!SecureStore || !refreshToken) return false;
  try {
    // Delete first — access-control options can't be changed on an existing item
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch (_) {}
    await SecureStore.setItemAsync(TOKEN_KEY, refreshToken, secureOpts());
    await AsyncStorage.setItem(ENABLED_FLAG, 'true');
    return true;
  } catch (_) {
    // e.g. no device passcode set — biometric login can't be secured
    return false;
  }
}

// Triggers the OS biometric prompt. Returns the token, or null if the user
// cancelled / failed authentication / nothing is stored.
export async function readBiometricToken(promptMessage) {
  if (!SecureStore) return null;
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY, secureOpts(promptMessage));
  } catch (_) {
    return null;
  }
}

export async function clearBiometricToken() {
  try {
    if (SecureStore) await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (_) {}
  try { await AsyncStorage.removeItem(ENABLED_FLAG); } catch (_) {}
}
