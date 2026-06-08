/**
 * Cobros rápidos — presets guardados localmente.
 * Se persisten en AsyncStorage para sobrevivir reinicios de la app.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Preset {
  id: string;
  label: string;
  amount: number;
  description: string;
}

const STORAGE_KEY = 'medianetpay_presets';

interface PresetsState {
  presets: Preset[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (label: string, amount: number, description: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const usePresetsStore = create<PresetsState>((set, get) => ({
  presets: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const presets: Preset[] = raw ? JSON.parse(raw) : [];
      set({ presets, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  add: async (label, amount, description) => {
    const preset: Preset = {
      id: Date.now().toString(),
      label,
      amount,
      description,
    };
    const next = [...get().presets, preset];
    set({ presets: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  remove: async (id) => {
    const next = get().presets.filter(p => p.id !== id);
    set({ presets: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
}));
