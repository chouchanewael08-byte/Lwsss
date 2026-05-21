import { create } from 'zustand';
import { UserWallet } from '../types';
import { api } from '../lib/api';

interface WalletState {
  wallets: UserWallet[];
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  depositFunds: (userId: string, amount: number, paymentMethod: string) => Promise<void>;
  withdrawFunds: (userId: string, amount: number, paymentMethod: string) => Promise<boolean>;
  holdEscrowFunds: (buyerId: string, amount: number, description: string) => Promise<boolean>;
  releaseEscrowFunds: (buyerId: string, sellerId: string, amount: number, commission: number, description: string) => Promise<void>;
  refundEscrowFunds: (buyerId: string, amount: number, description: string) => Promise<void>;
  toggleFreezeWallet: (userId: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const wallet = await api.getWallet();
      set({ wallets: [wallet], loading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل بيانات المحفظة', loading: false });
    }
  },

  depositFunds: async (userId, amount, paymentMethod) => {
    set({ loading: true });
    try {
      const resp = await api.depositFunds(amount, paymentMethod);
      if (resp.success) {
        set({ wallets: [resp.wallet], loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  withdrawFunds: async (userId, amount, paymentMethod) => {
    set({ loading: true });
    try {
      // In this system, address format can be obtained or simulated from user details
      const resp = await api.withdrawFunds(amount, 'التحويل البريدي الجزائري المحمول', paymentMethod);
      if (resp.success) {
        set({ wallets: [resp.wallet], loading: false });
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  holdEscrowFunds: async (buyerId, amount, description) => {
    // Escrow holding handles directly on the backend during ticket creation!
    // No explicit client action needed. Just refresh wallet
    try {
      const wallet = await api.getWallet();
      set({ wallets: [wallet] });
      return true;
    } catch {
      return false;
    }
  },

  releaseEscrowFunds: async (buyerId, sellerId, amount, commission, description) => {
    // Handled on backend during ticket confirm
    try {
      const wallet = await api.getWallet();
      set({ wallets: [wallet] });
    } catch {}
  },

  refundEscrowFunds: async (buyerId, amount, description) => {
    // Handled on backend during ticket dispute resolution
    try {
      const wallet = await api.getWallet();
      set({ wallets: [wallet] });
    } catch {}
  },

  toggleFreezeWallet: async (userId) => {
    // Handled by Admin panel API
    try {
      const wallet = await api.freezeSellerWallet(userId, true);
      set({ wallets: [wallet.wallet] });
    } catch {}
  }
}));
