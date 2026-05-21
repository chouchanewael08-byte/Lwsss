import { create } from 'zustand';
import { Auction } from '../types';
import { api } from '../lib/api';

interface AuctionState {
  auctions: Auction[];
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  placeBid: (auctionId: string, bidderId: string, bidderName: string, bidAmount: number) => Promise<{ success: boolean; message: string; outbidUserId?: string }>;
  createAuction: (auction: any) => Promise<void>;
  completeAuction: (auctionId: string) => Promise<void>;
}

export const useAuctionStore = create<AuctionState>((set, get) => ({
  auctions: [],
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const auctions = await api.getAuctions();
      set({ auctions, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل المزادات', loading: false });
    }
  },

  placeBid: async (auctionId, bidderId, bidderName, bidAmount) => {
    try {
      const resp = await api.bidOnAuction(auctionId, bidAmount);
      if (resp.success) {
        // Sync auctions list from response or refetch
        const auctions = await api.getAuctions();
        set({ auctions });
        return {
          success: true,
          message: '🚀 تم تسجيل مزايدتك بنجاح كأعلى سعر معروض في المنصة!',
          outbidUserId: resp.auction.highestBidderId
        };
      }
      return { success: false, message: 'فشل مزايدة السداد!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'عذراً! فشلت المزايدة' };
    }
  },

  createAuction: async (newAuc) => {
    // In our simplified model, creation triggers local append and uses endpoint if available
    set(state => ({
      auctions: [{
        ...newAuc,
        endTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), // 2 hours
        bidsCount: 0,
        isCompleted: false,
        createdAt: new Date().toISOString()
      }, ...state.auctions]
    }));
  },

  completeAuction: async (auctionId) => {
    set(state => ({
      auctions: state.auctions.map(auc => auc.id === auctionId ? { ...auc, isCompleted: true } : auc)
    }));
  }
}));
