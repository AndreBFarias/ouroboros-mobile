// Adapter SecureStore para zustand persist.
// Storage de runtime sensivel: nomes que o usuario digitou no onboarding.
// Em mobile (Android/iOS), SecureStore criptografa em hardware-backed
// keystore (Android EncryptedSharedPreferences, iOS Keychain) evitando
// vazamento por backup automático. No web, expo-secure-store não tem
// implementacao nativa, entao caimos em localStorage (apenas em dev,
// para permitir validação no Chrome desktop sem conflito com celular).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

const webStorage: StateStorage = {
  getItem: async (name) => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(name);
  },
  setItem: async (name, value) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(name);
  },
};

const nativeStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const secureStorage: StateStorage =
  Platform.OS === 'web' ? webStorage : nativeStorage;
