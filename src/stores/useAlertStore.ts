import { create } from 'zustand';
import { SecurityAlert, SystemLog } from '../types';
import { api } from '../lib/api';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  isRead: boolean;
}

interface AlertState {
  alerts: SecurityAlert[];
  logs: SystemLog[];
  notifications: Record<string, AppNotification[]>;
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  addAlert: (alert: SecurityAlert) => Promise<void>;
  markAlertStatus: (alertId: string, status: 'new' | 'investigated' | 'resolved') => Promise<void>;
  addSystemLog: (log: SystemLog) => Promise<void>;
  
  addNotification: (userId: string, title: string, description: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  clearNotifications: (userId: string) => void;
  markNotificationsAsRead: (userId: string) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  logs: [],
  notifications: {},
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      // Pull latest from Admin APIs if the user has auth, otherwise load simulated list
      const alerts = await api.getAdminSecurityAlerts().catch(() => []);
      const logs = await api.getAdminLogs().catch(() => []);
      
      set({ 
        alerts, 
        logs,
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addAlert: async (newAlert: SecurityAlert) => {
    set(state => ({ alerts: [newAlert, ...state.alerts] }));
  },

  markAlertStatus: async (alertId, status) => {
    set(state => ({
      alerts: state.alerts.map(a => a.id === alertId ? { ...a, status } : a)
    }));
  },

  addSystemLog: async (newLog: SystemLog) => {
    set(state => ({ logs: [newLog, ...state.logs] }));
  },

  addNotification: (userId, title, description, type) => {
    const { notifications } = get();
    const newNotif: AppNotification = {
      id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 5),
      userId,
      title,
      description,
      type,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };
    
    const userNotifs = notifications[userId] || [];
    const updatedUserNotifs = [newNotif, ...userNotifs];
    set({
      notifications: { ...notifications, [userId]: updatedUserNotifs }
    });
  },

  clearNotifications: (userId) => {
    const { notifications } = get();
    const updated = { ...notifications };
    delete updated[userId];
    set({ notifications: updated });
  },

  markNotificationsAsRead: (userId) => {
    const { notifications } = get();
    const userNotifs = notifications[userId] || [];
    const updatedUserNotifs = userNotifs.map(n => ({ ...n, isRead: true }));
    set({
      notifications: { ...notifications, [userId]: updatedUserNotifs }
    });
  }
}));
