/**
 * Estado global de autenticación.
 * El JWT se persiste en SecureStore (equivalente al Keychain/Keystore del SO).
 * Zustand maneja el estado en memoria.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../api/client';
import type { MerchantProfile } from '../api/auth';

interface AuthState {
  token: string | null;
  merchant: MerchantProfile | null;
  isLoading: boolean;

  // Acciones
  setAuth: (token: string, merchant: MerchantProfile) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  merchant: null,
  isLoading: true,

  setAuth: async (token, merchant) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, merchant, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, merchant: null, isLoading: false });
  },

  loadStoredToken: async () => {
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!stored) {
        set({ isLoading: false });
        return null;
      }
      set({ token: stored, isLoading: false });
      return stored;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },
}));
