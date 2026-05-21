import toast from 'react-hot-toast';

// Base API URL resolver
const getBaseUrl = () => {
  // If env variable is defined use it, otherwise fallback to root URL
  const env = (import.meta as any).env;
  if (env && env.VITE_API_URL) {
    return env.VITE_API_URL;
  }
  return window.location.origin;
};

export const BASE_API_URL = getBaseUrl();

// Dynamic extraction of Telegram initData or simulation header
export const getTelegramInitData = (): string => {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initData) {
    return tg.initData;
  }
  
  // Custom sandbox mock string matching default test account Anis
  const mockUserObj = {
    id: 412011287, // 'user_buyer_anis' equivalent integer
    first_name: 'أنيس',
    last_name: 'الجزائري',
    username: 'AnisDz7'
  };
  return `query_id=AAEq_74FAwEAAAn_vgX4&user=${encodeURIComponent(JSON.stringify(mockUserObj))}&auth_date=1716300000&hash=mockhash_development`;
};

// Unified Unified Fetch wrapper
export async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-telegram-init-data', getTelegramInitData());

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `خطأ في الاتصال بالسيرفر: ${response.status}`;
      throw new Error(errorMsg);
    }

    return await response.json() as T;
  } catch (err: any) {
    console.error(`[API Error] Details for ${endpoint}:`, err);
    toast.error(err.message || '⚠️ فشل الاتصال بخادم بوابات المشروع!');
    throw err;
  }
}

// -----------------------------------------------------
// API ROUTING CONTRACTS EXPORTS
// -----------------------------------------------------

export const api = {
  // Products
  getProducts: (page = 1, limit = 12, type = 'all', query = '') => 
    apiCall<{ data: any[]; total: number; page: number; totalPages: number }>(
      `/api/products?page=${page}&limit=${limit}&type=${type}&query=${encodeURIComponent(query)}`
    ),
  getProductById: (id: string) => 
    apiCall<any>(`/api/products/${id}`),
  createProduct: (body: any) => 
    apiCall<any>('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: any) => 
    apiCall<any>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // User
  getCurrentUser: () => 
    apiCall<any>('/api/user/me'),
  updateCurrentUser: (body: any) => 
    apiCall<any>('/api/user/me', { method: 'PUT', body: JSON.stringify(body) }),

  // Wallet
  getWallet: () => 
    apiCall<any>('/api/wallet/me'),
  depositFunds: (amount: number, paymentMethod: string) => 
    apiCall<any>('/api/wallet/deposit', { 
      method: 'POST', 
      body: JSON.stringify({ amount, paymentMethod }) 
    }),
  withdrawFunds: (amount: number, address: string, paymentMethod: string) => 
    apiCall<any>('/api/wallet/withdraw', { 
      method: 'POST', 
      body: JSON.stringify({ amount, address, paymentMethod }) 
    }),

  // Tickets (Escrow)
  getTickets: () => 
    apiCall<any[]>('/api/tickets'),
  getTicketById: (id: string) => 
    apiCall<any>(`/api/tickets/${id}`),
  createTicket: (body: any) => 
    apiCall<any>('/api/tickets', { 
      method: 'POST', 
      body: JSON.stringify(body) 
    }),
  confirmDelivery: (id: string) => 
    apiCall<any>(`/api/tickets/${id}/confirm`, { method: 'POST' }),
  disputeTicket: (id: string, reason: string, priority: string) => 
    apiCall<any>(`/api/tickets/${id}/dispute`, { 
      method: 'POST', 
      body: JSON.stringify({ reason, priority }) 
    }),
  sendTicketMessage: (id: string, text: string) => 
    apiCall<any>(`/api/tickets/${id}/message`, { 
      method: 'POST', 
      body: JSON.stringify({ text }) 
    }),

  // Auctions
  getAuctions: () => 
    apiCall<any[]>('/api/auctions'),
  bidOnAuction: (id: string, amount: number) => 
    apiCall<any>(`/api/auctions/${id}/bid`, { 
      method: 'POST', 
      body: JSON.stringify({ amount }) 
    }),

  // Swaps
  getSwaps: () => 
    apiCall<any[]>('/api/swaps'),
  createSwap: (have: string, want: string) => 
    apiCall<any>('/api/swaps', { 
      method: 'POST', 
      body: JSON.stringify({ have, want }) 
    }),

  // -----------------------------------------------------
  // ADMIN DASHBOARD CONSOLE WRAPPERS
  // -----------------------------------------------------
  getAdminStats: () => 
    apiCall<any>('/api/admin/stats'),
  getAdminUsers: (page = 1, limit = 10, query = '') => 
    apiCall<any>(`/api/admin/users?page=${page}&limit=${limit}&query=${encodeURIComponent(query)}`),
  banUser: (id: string, ban: boolean) => 
    apiCall<any>(`/api/admin/users/${id}/ban`, { 
      method: 'POST', 
      body: JSON.stringify({ ban }) 
    }),
  adjustUserBalance: (id: string, amount: number) => 
    apiCall<any>(`/api/admin/users/${id}/balance`, { 
      method: 'POST', 
      body: JSON.stringify({ amount }) 
    }),
  warnUser: (id: string, warning: string) => 
    apiCall<any>(`/api/admin/users/${id}/warn`, { 
      method: 'POST', 
      body: JSON.stringify({ warning }) 
    }),
  getAdminSellers: () => 
    apiCall<any[]>('/api/admin/sellers'),
  setSellerLevel: (id: string, level: string) => 
    apiCall<any>(`/api/admin/sellers/${id}/level`, { 
      method: 'POST', 
      body: JSON.stringify({ level }) 
    }),
  freezeSellerWallet: (id: string, freeze: boolean) => 
    apiCall<any>(`/api/admin/sellers/${id}/wallet/freeze`, { 
      method: 'POST', 
      body: JSON.stringify({ freeze }) 
    }),
  toggleSellerWithdraw: (id: string) => 
    apiCall<any>(`/api/admin/sellers/${id}/withdraw/toggle`, { method: 'POST' }),
  setSellerCommission: (id: string, commission: number) => 
    apiCall<any>(`/api/admin/sellers/${id}/commission`, { 
      method: 'POST', 
      body: JSON.stringify({ commission }) 
    }),
  getAdminProducts: () => 
    apiCall<any[]>('/api/admin/products'),
  approveProduct: (id: string) => 
    apiCall<any>(`/api/admin/products/${id}/approve`, { method: 'POST' }),
  rejectProduct: (id: string, reason: string) => 
    apiCall<any>(`/api/admin/products/${id}/reject`, { 
      method: 'POST', 
      body: JSON.stringify({ reason }) 
    }),
  setProductFeature: (id: string, isFeatured: boolean) => 
    apiCall<any>(`/api/admin/products/${id}/feature`, { 
      method: 'POST', 
      body: JSON.stringify({ isFeatured }) 
    }),
  deleteProduct: (id: string) => 
    apiCall<any>(`/api/admin/products/${id}/delete`, { method: 'POST' }),
  setProductFlashSale: (id: string, discount: number, durationMini: number) => 
    apiCall<any>(`/api/admin/products/${id}/flash-sale`, { 
      method: 'POST', 
      body: JSON.stringify({ discount, durationMini }) 
    }),
  getAdminDisputes: () => 
    apiCall<any[]>('/api/admin/disputes'),
  resolveDispute: (id: string, resolution_type: 'release_seller' | 'refund_buyer' | 'split_equal' | 'refund_partial', refund_percentage?: number) => 
    apiCall<any>(`/api/admin/disputes/${id}/resolve`, { 
      method: 'POST', 
      body: JSON.stringify({ resolution_type, refund_percentage }) 
    }),
  getAdminWithdrawals: () => 
    apiCall<any[]>('/api/admin/withdrawals'),
  processWithdrawalAction: (id: string, decision: 'approve' | 'reject') => 
    apiCall<any>(`/api/admin/withdrawals/${id}/action`, { 
      method: 'POST', 
      body: JSON.stringify({ decision }) 
    }),
  broadcastAnnouncement: (text: string, target: string) => 
    apiCall<any>('/api/admin/broadcast', { 
      method: 'POST', 
      body: JSON.stringify({ text, target }) 
    }),
  getAdminSecurityAlerts: (severity = 'all') => 
    apiCall<any[]>(`/api/admin/security?severity=${severity}`),
  triggerSecurityScan: () => 
    apiCall<any>('/api/admin/security/scan', { method: 'POST' }),
  getAdminLogs: () => 
    apiCall<any[]>('/api/admin/logs'),
  updatePlatformSettings: (body: any) => 
    apiCall<any>('/api/admin/settings', { 
      method: 'POST', 
      body: JSON.stringify(body) 
    })
};
