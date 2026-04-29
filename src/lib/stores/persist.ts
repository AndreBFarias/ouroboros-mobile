// Adapter SecureStore para zustand persist.
// Storage de runtime sensivel: nomes que o usuario digitou no onboarding.
// SecureStore criptografa em hardware-backed keystore (Android EncryptedSharedPreferences,
// iOS Keychain), evitando vazamento por backup automatico.
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

export const secureStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
};
