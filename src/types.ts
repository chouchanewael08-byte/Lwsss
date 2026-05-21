export type UserRole = 'buyer' | 'seller' | 'admin' | 'moderator';

export type UserLevel = 'Trusted' | 'Verified' | 'VIP' | 'High Risk' | 'Scam Suspected';

export interface TelegramUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  level: UserLevel;
  avatar: string;
  salesCount: number;
  successRate: number; // e.g. 98%
  responseTime: string; // e.g. "5 min"
  totalEarnings: number;
  joinedDate: string;
  ipAddress: string;
  device: string;
  points?: number; // Loyalty / active points earned from bot tasks
}

export type ProductType = 
  | 'game_account'     // حسابات ألعاب
  | 'subscription'     // اشتراكات
  | 'digital_service'  // خدمات رقمية
  | 'game_currency'    // عملات ألعاب
  | 'social_media'     // حسابات سوشيال ميديا
  | 'design_dev'       // تصميم وبرمجة
  | 'swap_item';       // تبادل حسابات

export interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  type: ProductType;
  sellerId: string;
  images: string[];
  acceptedPayments: string[]; // CCP, BaridiMob, USDT, Flexy, Binance
  isSwapAcceptable: boolean;
  isNegotiable: boolean;
  warrantyPeriod: string; // e.g. "30 days"
  viewsCount: number;
  reportsCount: number;
  isTrend: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  discountPercentage?: number; // Optional discount percentage (e.g. 10 for 10% off)
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  text: string;
  timestamp: string;
}

export type TicketStatus = 
  | 'waiting_payment'   // بانتظار الدفع
  | 'waiting_delivery'  // بانتظار التسليم
  | 'delivered'         // تم استلام المنتج
  | 'disputed'          // نزاع نشط
  | 'completed'         // مكتمل ومغلق
  | 'refunded';         // مسترجع ومغلق

export type DisputePriority = 'high' | 'medium' | 'low';

export interface EscrowTicket {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: TicketStatus;
  createdAt: string;
  messages: TicketMessage[];
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  disputePriority?: DisputePriority;
  disputeReason?: string;
  notes?: string;
}

export interface SwapRequest {
  id: string;
  userId: string;
  username: string;
  have: string; // What they have
  want: string; // What they want
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  matchedWith?: string; // SwapRequest ID
  roomId?: string; // Room representation
  createdAt: string;
}

export interface Auction {
  id: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  startingPrice: number;
  highestBid: number;
  highestBidderId?: string;
  highestBidderName?: string;
  endTime: string;
  bidsCount: number;
  isCompleted: boolean;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdraw' | 'escrow_hold' | 'escrow_release' | 'refund' | 'bonus' | 'referral';
  status: 'completed' | 'pending' | 'failed' | 'frozen';
  description: string;
  timestamp: string;
  paymentMethod: string;
}

export interface UserWallet {
  userId: string;
  username: string;
  availableBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  transactions: WalletTransaction[];
}

export interface SecurityAlert {
  id: string;
  userId: string;
  username: string;
  type: 'suspicious_link' | 'multi_account' | 'spam' | 'external_payment_attempt';
  severity: 'low' | 'medium' | 'critical';
  details: string;
  timestamp: string;
  status: 'new' | 'investigated' | 'resolved';
}

export interface SystemLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: string;
}
