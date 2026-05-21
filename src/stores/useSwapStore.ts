import { create } from 'zustand';
import { SwapRequest } from '../types';
import { api } from '../lib/api';

interface SwapState {
  swaps: SwapRequest[];
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  addSwapRequest: (swap: SwapRequest) => Promise<void>;
  matchSwaps: (swapId1: string, swapId2: string) => Promise<string>;
  cancelSwapRequest: (swapId: string) => Promise<void>;
  completeSwapRequest: (swapId: string) => Promise<void>;
}

export const useSwapStore = create<SwapState>((set, get) => ({
  swaps: [],
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const swaps = await api.getSwaps();
      set({ swaps, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل طلبات المقايضة', loading: false });
    }
  },

  addSwapRequest: async (swap: SwapRequest) => {
    set({ loading: true, error: null });
    try {
      const created = await api.createSwap(swap.have, swap.want);
      set(state => ({
        swaps: [created, ...state.swaps],
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'فشل إضافة طلب المقايضة', loading: false });
    }
  },

  matchSwaps: async (swapId1, swapId2) => {
    const { swaps } = get();
    const roomId = 'room_swap_' + Date.now().toString().slice(-4);
    
    // update cache states
    set({
      swaps: swaps.map(sw => {
        if (sw.id === swapId1) return { ...sw, status: 'matched', matchedWith: swapId2, roomId };
        if (sw.id === swapId2) return { ...sw, status: 'matched', matchedWith: swapId1, roomId };
        return sw;
      })
    });
    return roomId;
  },

  cancelSwapRequest: async (swapId) => {
    set(state => ({
      swaps: state.swaps.map(sw => sw.id === swapId ? { ...sw, status: 'cancelled' } : sw)
    }));
  },

  completeSwapRequest: async (swapId) => {
    const { swaps } = get();
    const found = swaps.find(sw => sw.id === swapId);
    set({
      swaps: swaps.map(sw => {
        if (sw.id === swapId || (found?.matchedWith && sw.id === found.matchedWith)) {
          return { ...sw, status: 'completed' };
        }
        return sw;
      })
    });
  }
}));
