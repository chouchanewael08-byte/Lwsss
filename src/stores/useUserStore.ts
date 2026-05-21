import { create } from 'zustand';
import { TelegramUser } from '../types';
import { api } from '../lib/api';

interface UserState {
  users: TelegramUser[];
  currentUser: TelegramUser | null;
  loading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  setCurrentUser: (user: TelegramUser) => Promise<void>;
  switchUserById: (userId: string) => Promise<void>;
  updateUserPoints: (userId: string, addedPoints: number) => Promise<void>;
  updateUserBalance: (userId: string, amount: number) => Promise<void>;
  addUser: (user: TelegramUser) => Promise<void>;
  setUsers: (users: TelegramUser[]) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  currentUser: null,
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const authUser = await api.getCurrentUser();
      
      // Fetch users list for admin switch support
      let allUsers: TelegramUser[] = [authUser];
      if (authUser.role === 'admin') {
        const paginated = await api.getAdminUsers(1, 100);
        allUsers = paginated.data || [authUser];
      }

      set({ 
        currentUser: authUser, 
        users: allUsers,
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل بيانات العضو', loading: false });
    }
  },

  setCurrentUser: async (user: TelegramUser) => {
    set({ currentUser: user });
  },

  switchUserById: async (userId: string) => {
    // In full-stack backend, simulated switch user header could be passed in testing,
    // but on client cache we update the local reference:
    const { users } = get();
    const found = users.find(u => u.id === userId);
    if (found) {
      set({ currentUser: found });
    }
  },

  updateUserPoints: async (userId: string, addedPoints: number) => {
    const { currentUser } = get();
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, points: (currentUser.points || 0) + addedPoints };
      set({ currentUser: updatedUser });
      // update backend
      await api.updateCurrentUser({ points: updatedUser.points }).catch(() => {});
    }
  },

  updateUserBalance: async (userId: string, amount: number) => {
    // Handled directly inside wallet store
  },

  addUser: async (newUser: TelegramUser) => {
    // Backend creates on signup / first load, we update local list
    set(state => ({ users: [...state.users, newUser] }));
  },

  setUsers: (usersList: TelegramUser[]) => {
    set({ users: usersList });
  }
}));
