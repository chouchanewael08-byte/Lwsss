import { create } from 'zustand';
import { EscrowTicket, TicketMessage, TicketStatus, DisputePriority } from '../types';
import { api } from '../lib/api';

interface TicketState {
  tickets: EscrowTicket[];
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  createTicket: (ticket: EscrowTicket) => Promise<any>;
  sendMessage: (ticketId: string, message: TicketMessage) => Promise<void>;
  confirmTicketReceipt: (ticketId: string, role: 'buyer' | 'seller') => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  disputeTicket: (ticketId: string, reason: string, priority: DisputePriority) => Promise<void>;
  updateTicketDetails: (ticketId: string, updates: Partial<EscrowTicket>) => Promise<void>;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const tickets = await api.getTickets();
      set({ tickets, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل التذاكر والطلبات الرقمية', loading: false });
    }
  },

  createTicket: async (ticket: EscrowTicket) => {
    set({ loading: true, error: null });
    try {
      const newTkt = await api.createTicket(ticket);
      set(state => ({
        tickets: [newTkt, ...state.tickets],
        loading: false
      }));
      return newTkt;
    } catch (err: any) {
      set({ error: err.message || 'فشل فتح تذكرة الشراء', loading: false });
      throw err;
    }
  },

  sendMessage: async (ticketId, message) => {
    try {
      // Send message to Express API
      const responseMsg = await api.sendTicketMessage(ticketId, message.text);
      set(state => ({
        tickets: state.tickets.map(t => {
          if (t.id === ticketId) {
            // Check if already in array
            const exists = t.messages.some(m => m.id === responseMsg.id);
            return {
              ...t,
              messages: exists ? t.messages : [...t.messages, responseMsg]
            };
          }
          return t;
        })
      }));
    } catch (err) {
      console.error(err);
      // Fallback local append for stability fallback
      set(state => ({
        tickets: state.tickets.map(t => 
          t.id === ticketId ? { ...t, messages: [...t.messages, { id: `local_${Date.now()}`, ...message }] } : t
        )
      }));
    }
  },

  confirmTicketReceipt: async (ticketId, role) => {
    try {
      const resp = await api.confirmDelivery(ticketId);
      set(state => ({
        tickets: state.tickets.map(t => t.id === ticketId ? resp.ticket : t)
      }));
    } catch (err) {
      console.error(err);
      set(state => ({
        tickets: state.tickets.map(t => {
          if (t.id === ticketId) {
            return role === 'buyer' ? { ...t, buyerConfirmed: true, status: 'completed' } : { ...t, sellerConfirmed: true };
          }
          return t;
        })
      }));
    }
  },

  updateTicketStatus: async (ticketId, status) => {
    // Admin resolutions or automatic triggers
    set(state => ({
      tickets: state.tickets.map(t => t.id === ticketId ? { ...t, status } : t)
    }));
  },

  disputeTicket: async (ticketId, reason, priority) => {
    try {
      const resp = await api.disputeTicket(ticketId, reason, priority);
      set(state => ({
        tickets: state.tickets.map(t => t.id === ticketId ? resp.ticket : t)
      }));
    } catch (err) {
      console.error(err);
      set(state => ({
        tickets: state.tickets.map(t => 
          t.id === ticketId ? { ...t, status: 'disputed', disputeReason: reason, disputePriority: priority } : t
        )
      }));
    }
  },

  updateTicketDetails: async (ticketId, updates) => {
    set(state => ({
      tickets: state.tickets.map(t => t.id === ticketId ? { ...t, ...updates } : t)
    }));
  }
}));
