// ─── ROLES ────────────────────────────────────────────────
export type UserRole = 'user' | 'moderator' | 'admin' | 'owner';
export type UserLevel = 'New' | 'Trusted' | 'Verified' | 'VIP' | 'High Risk' | 'Scam';

// ─── USER ─────────────────────────────────────────────────
export interface IUser {
  telegramId: string;
  username: string;
  fullName: string;
  avatar: string;
  role: UserRole;
  level: UserLevel;
  // Stats
  salesCount: number;
  purchasesCount: number;
  successRate: number;
  responseTime: string;
  totalEarnings: number;
  // Currencies
  stars: number;      // نجوم - earned from tasks only
  crystals: number;   // كريستال - purchased with real money
  // Seller info
  sellerLevel: 'Standard' | 'Silver' | 'Gold' | 'VIP';
  sellerPaymentInfo: {
    baridimob: string;
    ccp: string;
    usdt: string;
    binance: string;
    flexy: string;
  };
  // Moderation
  isBanned: boolean;
  banReason: string;
  warnings: string[];
  // Meta
  joinedAt: Date;
  lastActiveAt: Date;
  referredBy?: string;
  referralCount: number;
}

// ─── PRODUCT ──────────────────────────────────────────────
export type ProductType = 'game_account' | 'subscription' | 'digital_service' | 'game_currency' | 'social_media' | 'design_dev';

export interface IProduct {
  _id?: string;
  title: string;
  description: string;
  price: number; // in crystals
  priceUSD: number; // calculated
  type: ProductType;
  sellerId: string;
  sellerName: string;
  images: string[];
  acceptedPayments: string[];
  isSwapAcceptable: boolean;
  isNegotiable: boolean;
  warrantyPeriod: string;
  discountPercent: number;
  viewsCount: number;
  reportsCount: number;
  isTrend: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  isApproved: boolean;
  credentials: {
    email: string;
    password: string;
    username: string;
    phone: string;
    notes: string;
    extra: string;
  } | null;
  createdAt?: Date;
}

// ─── ACCOUNT PRODUCT ──────────────────────────────────────
export type AccountPlatform = 'pubg' | 'freefire' | 'valorant' | 'fortnite' | 'cod' | 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'netflix' | 'spotify' | 'osn' | 'other';

export interface IAccountProduct {
  _id?: string;
  title: string;
  description: string;
  platform: AccountPlatform;
  price: number;
  sellerId: string;
  sellerName: string;
  images: string[];
  acceptedPayments: string[];
  // Technical card
  accountAge: string;
  accountLevel: string;
  followersCount: string;
  region: string;
  extras: string;
  isNegotiable: boolean;
  warrantyPeriod: string;
  discountPercent: number;
  viewsCount: number;
  isFeatured: boolean;
  isHidden: boolean;
  isApproved: boolean;
  credentials: {
    email: string;
    password: string;
    username: string;
    notes: string;
  } | null;
  createdAt?: Date;
}

// ─── POINTS STORE ─────────────────────────────────────────
export interface IPointsItem {
  _id?: string;
  title: string;
  description: string;
  category: 'gift_card' | 'subscription' | 'game_currency' | 'custom';
  starsCost: number;
  images: string[];
  stock: number; // -1 = unlimited
  isActive: boolean;
  credentials: string; // sent to buyer after purchase (encrypted)
  soldCount: number;
  createdAt?: Date;
}

// ─── TASK ─────────────────────────────────────────────────
export type TaskType = 'channel_join' | 'bot_start' | 'invite' | 'purchase' | 'custom';

export interface ITask {
  _id?: string;
  title: string;
  description: string;
  icon: string;
  starsReward: number;
  type: TaskType;
  link: string;
  channelId?: string; // for channel_join verification
  isActive: boolean;
  completedBy: string[];
  createdAt?: Date;
}

// ─── ESCROW TICKET ────────────────────────────────────────
export type TicketStatus = 'pending_payment' | 'payment_confirmed' | 'partial_revealed' | 'full_revealed' | 'completed' | 'disputed' | 'refunded' | 'auto_completed';
export type PaymentMethod = 'crystals' | 'baridimob' | 'ccp' | 'usdt' | 'binance' | 'flexy' | 'telegram_stars';

export interface ITicketMessage {
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller' | 'admin' | 'system';
  text: string;
  isSystemMessage: boolean;
  timestamp: Date;
}

export interface ITicket {
  _id?: string;
  productId: string;
  productTitle: string;
  productType: 'market' | 'accounts';
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  amount: number; // in crystals
  amountUSD: number;
  commission: number;
  netAmount: number; // seller receives
  paymentMethod: PaymentMethod;
  paymentProofImage?: string;
  status: TicketStatus;
  partialRevealed: boolean; // email shown
  fullRevealed: boolean;    // password shown
  buyerConfirmed: boolean;
  disputeReason?: string;
  disputeOpenedAt?: Date;
  autoCompleteAt?: Date; // 24h after fullRevealed
  messages: ITicketMessage[];
  createdAt?: Date;
  completedAt?: Date;
}

// ─── CHAT ─────────────────────────────────────────────────
export interface IChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isSystem: boolean;
}

export interface IChat {
  _id?: string;
  ticketId?: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  messages: IChatMessage[];
  isOpen: boolean;
  hasDeal: boolean;
  agreedPrice?: number;
  createdAt?: Date;
}

// ─── WALLET ───────────────────────────────────────────────
export type TxType = 'deposit_crystals' | 'withdraw_crystals' | 'purchase' | 'sale' | 'escrow_hold' | 'escrow_release' | 'refund' | 'bonus' | 'commission' | 'stars_earned' | 'stars_spent' | 'telegram_stars_purchase';
export type TxStatus = 'pending' | 'completed' | 'failed' | 'frozen';

export interface ITransaction {
  type: TxType;
  amount: number;
  currency: 'crystals' | 'stars' | 'usd';
  status: TxStatus;
  description: string;
  reference?: string;
  paymentMethod?: string;
  proofImage?: string;
  timestamp: Date;
}

export interface IWallet {
  userId: string;
  crystals: number;
  pendingCrystals: number;
  frozenCrystals: number;
  stars: number;
  totalEarned: number;
  totalSpent: number;
  transactions: ITransaction[];
}

// ─── COUPON ───────────────────────────────────────────────
export interface ICoupon {
  _id?: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxUses: number;
  usedCount: number;
  usedBy: string[];
  expiresAt: Date;
  isActive: boolean;
  appliesTo: 'all' | 'market' | 'accounts';
  sellerId?: string; // if seller-specific
  createdBy: string;
  createdAt?: Date;
}

// ─── AUCTION ──────────────────────────────────────────────
export interface IAuction {
  _id?: string;
  productId: string;
  productTitle: string;
  productImages: string[];
  sellerId: string;
  sellerName: string;
  startingPrice: number;
  currentBid: number;
  currentBidderId?: string;
  currentBidderName?: string;
  bids: { userId: string; username: string; amount: number; timestamp: Date }[];
  endAt: Date;
  isCompleted: boolean;
  winnerId?: string;
  createdAt?: Date;
}

// ─── SWAP ─────────────────────────────────────────────────
export interface ISwap {
  _id?: string;
  userId: string;
  username: string;
  have: string;
  want: string;
  status: 'open' | 'matched' | 'completed' | 'cancelled';
  matchedWithId?: string;
  createdAt?: Date;
}

// ─── SYSTEM SETTINGS ──────────────────────────────────────
export interface ISettings {
  crystalPriceUSD: number;
  commissionPercent: number;
  minWithdrawCrystals: number;
  maxWithdrawCrystals: number;
  minDepositCrystals: number;
  marketOpen: boolean;
  accountsStoreOpen: boolean;
  pointsStoreOpen: boolean;
  auctionsOpen: boolean;
  maintenanceMode: boolean;
  autoApproveProducts: boolean;
  welcomeMessage: string;
  supportUsername: string;
  termsText: string;
  ownerPaymentInfo: {
    baridimob: string;
    ccp: string;
    usdt: string;
    binance: string;
    flexy: string;
  };
}

// ─── SYSTEM LOG ───────────────────────────────────────────
export interface ISystemLog {
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: Date;
}
