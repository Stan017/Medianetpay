import { create } from 'zustand';
import {
  CatalogService,
  VitrinaOut,
  getVitrina,
  activateVitrina,
  deleteService,
} from '../api/catalog';

interface CatalogState {
  vitrina: VitrinaOut | null;
  loading: boolean;

  fetchVitrina: () => Promise<void>;
  toggleActive: (active: boolean) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  setVitrina: (v: VitrinaOut) => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  vitrina: null,
  loading: false,

  fetchVitrina: async () => {
    set({ loading: true });
    try {
      const data = await getVitrina();
      set({ vitrina: data });
    } catch {
      // silencioso
    } finally {
      set({ loading: false });
    }
  },

  toggleActive: async (active: boolean) => {
    const result = await activateVitrina(active);
    set((state) => ({
      vitrina: state.vitrina
        ? {
            ...state.vitrina,
            vitrina_active: result.vitrina_active,
            slug: result.slug,
            vitrina_url: result.vitrina_url,
          }
        : null,
    }));
  },

  removeService: async (id: string) => {
    await deleteService(id);
    set((state) => ({
      vitrina: state.vitrina
        ? {
            ...state.vitrina,
            services: state.vitrina.services.filter((s) => s.id !== id),
          }
        : null,
    }));
  },

  setVitrina: (v: VitrinaOut) => set({ vitrina: v }),
}));
