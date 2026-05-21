import { 
  TelegramUser, 
  Product, 
  EscrowTicket, 
  SwapRequest, 
  Auction, 
  UserWallet, 
  SecurityAlert, 
  SystemLog 
} from './types';

// Mock Users
export const initialUsers: TelegramUser[] = [
  {
    id: 'user_admin',
    username: 'dz_owner',
    fullName: 'المالك الرئيسي - وسيم',
    role: 'admin',
    level: 'VIP',
    avatar: '👑',
    salesCount: 0,
    successRate: 100,
    responseTime: '1 min',
    totalEarnings: 4500,
    joinedDate: '2025-01-01',
    ipAddress: '197.200.41.92',
    device: 'iPhone 15 Pro Max (Telegram Web)',
    points: 9999
  },
  {
    id: 'user_seller_wael',
    username: 'WaelStore',
    fullName: 'وائل للخدمات الرقمية',
    role: 'seller',
    level: 'Verified',
    avatar: '🎮',
    salesCount: 142,
    successRate: 98,
    responseTime: '4 min',
    totalEarnings: 820,
    joinedDate: '2025-02-14',
    ipAddress: '105.103.111.95',
    device: 'Desktop client (Windows 11)',
    points: 350
  },
  {
    id: 'user_seller_sofiane',
    username: 'SofianeSmm',
    fullName: 'سفيان لخدمات وبطاقات الشحن',
    role: 'seller',
    level: 'Trusted',
    avatar: '⚡',
    salesCount: 298,
    successRate: 99.1,
    responseTime: '2 min',
    totalEarnings: 1950,
    joinedDate: '2024-11-20',
    ipAddress: '197.221.32.14',
    device: 'Telegram Lite (Android 14)',
    points: 420
  },
  {
    id: 'user_seller_scammer',
    username: 'CheaterDz',
    fullName: 'مجهول للتسويق الديجيتال',
    role: 'seller',
    level: 'High Risk',
    avatar: '⚠️',
    salesCount: 3,
    successRate: 40,
    responseTime: '45 min',
    totalEarnings: 30,
    joinedDate: '2026-05-18',
    ipAddress: '197.55.12.189',
    device: 'Unknown Client (Emulator/Tor)',
    points: 15
  },
  {
    id: 'user_buyer_anis',
    username: 'AnisDz7',
    fullName: 'أنيس الجزائري',
    role: 'buyer',
    level: 'Trusted',
    avatar: '🛒',
    salesCount: 12,
    successRate: 100,
    responseTime: '15 min',
    totalEarnings: 0,
    joinedDate: '2025-03-01',
    ipAddress: '41.201.12.87',
    device: 'Redmi Note 12 (Android)',
    points: 1250 // Has enough points to test buy from bot shop!
  }
];

// Initial Products
export const initialProducts: Product[] = [
  {
    id: 'prod_valorant',
    title: 'حساب فالورانت دياموند 3 | Valorant Diamond Account',
    price: 15,
    description: 'حساب فالورانت خورافي يحتوي فرسان السكين الحصرية + كوليكشن سكاكين اللوتس وأشكال نادرة، اللفل 142، السيرفر أوروبي مع ضمان 30 يوماً من الاسترجاع.',
    type: 'game_account',
    sellerId: 'user_seller_wael',
    images: ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'],
    acceptedPayments: ['CCP', 'BaridiMob', 'USDT', 'Binance'],
    isSwapAcceptable: true,
    isNegotiable: true,
    warrantyPeriod: 'ضمان 30 يوم',
    viewsCount: 342,
    reportsCount: 0,
    isTrend: true,
    isFeatured: true,
    isHidden: false,
    discountPercentage: 20 // 20% discount applied by Wael (Owner)
  },
  {
    id: 'prod_netflix',
    title: 'اشتراك نتفليكس بريميوم 4K شهر كامل | Netflix 1 Month Premium',
    price: 4,
    description: 'شاشة خاصة بك بالكامل بروفايل مقفل برمز سري ومضمون 100٪ بدون انقطاع، يدعم اللغة العربية وجودة Ultra HD لشخص واحد.',
    type: 'subscription',
    sellerId: 'user_seller_wael',
    images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8fed85?auto=format&fit=crop&w=600&q=80'],
    acceptedPayments: ['Flexy', 'BaridiMob', 'USDT'],
    isSwapAcceptable: false,
    isNegotiable: false,
    warrantyPeriod: 'ضمان كامل المدة (30 يوم)',
    viewsCount: 1240,
    reportsCount: 1,
    isTrend: true,
    isFeatured: false,
    isHidden: false,
    discountPercentage: 15 // 15% discount applied by Wael (Owner)
  },
  {
    id: 'prod_usdt_swap',
    title: 'رصيد ديدكس RedotPay مشحون بقيمة 20$ جاهز',
    price: 18,
    description: 'بطاقة فيزا مشحونة تستعمل للشراء من علي اكسبراس والإعلانات ممتازة، أقبل البيع أو التبديل بحساب نتفلكس ومكمل السعر.',
    type: 'digital_service',
    sellerId: 'user_seller_sofiane',
    images: ['https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=600&q=80'],
    acceptedPayments: ['BaridiMob', 'Crypto', 'Recharge Cards'],
    isSwapAcceptable: true,
    isNegotiable: true,
    warrantyPeriod: 'سنة كاملة للفيزا',
    viewsCount: 198,
    reportsCount: 0,
    isTrend: false,
    isFeatured: true,
    isHidden: false
  },
  {
    id: 'prod_pubg_uc',
    title: 'شدات ببجي 3250 UC شحن فوري بالـ ID مباشر',
    price: 25,
    description: 'شحن شدات ببجي موبايل رسمي ومضمون 100% بدون أي خطورة على الحساب، فقط أرسل الآيدي وسيتم الشحن في 5 دقائق.',
    type: 'game_currency',
    sellerId: 'user_seller_sofiane',
    images: ['https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80'],
    acceptedPayments: ['BaridiMob', 'CCP', 'USDT', 'Flexy'],
    isSwapAcceptable: false,
    isNegotiable: false,
    warrantyPeriod: 'استلام مؤكد خلال 10 د',
    viewsCount: 520,
    reportsCount: 0,
    isTrend: true,
    isFeatured: false,
    isHidden: false
  },
  {
    id: 'prod_logo_design',
    title: 'برمجة موقع متكامل وتصميم هوية بصرية مخصصة',
    price: 150,
    description: 'سأقوم ببرمجة موقع ويب احترافي بالكامل (Next.js & Tailwind CSS) مع تصميم لوغو وواجهات تجربة مستخدم معاصرة وتوفير استضافة مجانية.',
    type: 'design_dev',
    sellerId: 'user_seller_sofiane',
    images: ['https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80'],
    acceptedPayments: ['USDT', 'BaridiMob', 'Binance', 'Crypto'],
    isSwapAcceptable: true,
    isNegotiable: true,
    warrantyPeriod: 'دعم فني وتعديلات 6 أشهر',
    viewsCount: 89,
    reportsCount: 0,
    isTrend: false,
    isFeatured: true,
    isHidden: false
  },
  {
    id: 'prod_instagram_10k',
    title: 'حساب انستغرام 10k متفاعل حقيقي متفاعل ستوري 1k+',
    price: 35,
    description: 'حساب انستغرام نيتش جمال وموضة، مهيأ بالكامل، متابعين حقيقيين من دول الخليج والجزائر، البريد الأصلي متاح.',
    type: 'social_media',
    sellerId: 'user_seller_scammer',
    images: ['https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80'],
    acceptedPayments: ['Flexy', 'Binance'],
    isSwapAcceptable: false,
    isNegotiable: true,
    warrantyPeriod: 'لا يوجد ضمان بعد التسليم',
    viewsCount: 140,
    reportsCount: 4, // 4 Complaints! High danger seller
    isTrend: false,
    isFeatured: false,
    isHidden: false
  }
];

// Initial Tickets
export const initialTickets: EscrowTicket[] = [
  {
    id: 'tkt_001',
    productId: 'prod_valorant',
    productTitle: 'حساب فالورانت دياموند 3',
    price: 15,
    buyerId: 'user_buyer_anis',
    buyerName: 'أنيس الجزائري',
    sellerId: 'user_seller_wael',
    sellerName: 'WaelStore',
    status: 'disputed', // Current dispute!
    createdAt: '2026-05-20T14:20:00Z',
    buyerConfirmed: false,
    sellerConfirmed: true,
    disputePriority: 'high',
    disputeReason: 'البائع يدعي أن الرمز السري تم تسليمه لكنني لم أستطع الدخول للحساب والبريد مغلق.',
    notes: 'تذكرة بحاجة لتدخل مشرف الإسكرو للتحقق من المراسلات والصور المرفقة.',
    messages: [
      {
        id: 'msg_1',
        senderId: 'bot',
        senderName: 'الوسيط التلقائي 🛡',
        senderRole: 'admin',
        text: 'مرحباً بكن في تذكرة الوساطة المؤمنة للطلب #prod_valorant. تم حجز مبلغ 15$ من محفظة المشتري في حساب الوساطة. يرجى من البائع تسليم تفاصيل الحساب هنا بحرية.',
        timestamp: '14:20'
      },
      {
        id: 'msg_2',
        senderId: 'user_seller_wael',
        senderName: 'WaelStore',
        senderRole: 'seller',
        text: 'مرحباً أخي العزيز، تم تعبئة البيانات وإرسالها لك في الخاص، تفضل الإيميل والرمز السري: superadminx@gmx.com / DiamondVal77.',
        timestamp: '14:22'
      },
      {
        id: 'msg_3',
        senderId: 'user_buyer_anis',
        senderName: 'أنيس الجزائري',
        senderRole: 'buyer',
        text: 'أخي الكريم، جربت الحساب للتو ويظهر لي خطأ في كلمة المرور (Invalid credentials). هل يمكنك تفقده مجدداً؟ وأظن أن الإيميل مربوط بحماية تطلب OTP !',
        timestamp: '14:25'
      },
      {
        id: 'msg_4',
        senderId: 'user_seller_wael',
        senderName: 'WaelStore',
        senderRole: 'seller',
        text: 'الحساب سليم 100% وقد فتحته قبل دقائق، أظن المشتري يريد الاحتيال علي والحصول على الحساب مجاناً وتغيير بياناته. أطالب الإدارة بالتدخل الفوري وتحرير الـ 15$ لمحفظتي.',
        timestamp: '14:28'
      },
      {
        id: 'msg_5',
        senderId: 'user_buyer_anis',
        senderName: 'أنيس الجزائري',
        senderRole: 'buyer',
        text: 'لا أخي حاشا لله أن أحرق سمعتي لمبلغ بسيط، أنا مستعد لإثبات ذلك فيديو على المباشر أن الحساب لا يعمل أبداً. يرجى من الأدمن مراجعة الحالة.',
        timestamp: '14:32'
      }
    ]
  },
  {
    id: 'tkt_002',
    productId: 'prod_netflix',
    productTitle: 'اشتراك نتفليكس بريميوم 4K شهر كامل',
    price: 4,
    buyerId: 'user_buyer_anis',
    buyerName: 'أنيس الجزائري',
    sellerId: 'user_seller_wael',
    sellerName: 'WaelStore',
    status: 'completed',
    createdAt: '2026-05-19T10:00:00Z',
    buyerConfirmed: true,
    sellerConfirmed: true,
    messages: [
      {
        id: 'msg_2_1',
        senderId: 'bot',
        senderName: 'الوسيط التلقائي 🛡',
        senderRole: 'admin',
        text: 'تم إنشاء الصفقة لـ اشتراك نتفليكس بريميوم. تم تعليق رصيد 4$ في حساب الضمان.',
        timestamp: '10:01'
      },
      {
        id: 'msg_2_2',
        senderId: 'user_seller_wael',
        senderName: 'WaelStore',
        senderRole: 'seller',
        text: 'تفضل بروفايلك: Netflix4-Profile3 / الرمز: 1099',
        timestamp: '10:04'
      },
      {
        id: 'msg_2_3',
        senderId: 'user_buyer_anis',
        senderName: 'أنيس الجزائري',
        senderRole: 'buyer',
        text: 'ممتاز اشتغل بارك الله فيك، تم تأكيد الاستلام وشكراً للوساطة السريعة.',
        timestamp: '10:07'
      },
      {
        id: 'msg_2_4',
        senderId: 'bot',
        senderName: 'الوسيط التلقائي 🛡',
        senderRole: 'admin',
        text: 'تم تأكيد الاستلام بنجاح ومصادقة الطلب. تم تحرير مبلغ 3.6$ للبائع بعد اقتطاع عمولة السوق 10٪ (0.4$). شكراً لتعاملكم.',
        timestamp: '10:08'
      }
    ]
  },
  {
    id: 'tkt_003',
    productId: 'prod_pubg_uc',
    productTitle: 'شدات ببجي 3250 UC شحن فوري',
    price: 25,
    buyerId: 'user_buyer_anis',
    buyerName: 'أنيس الجزائري',
    sellerId: 'user_seller_sofiane',
    sellerName: 'SofianeSmm',
    status: 'waiting_delivery', // Paid, but waiting for delivery
    createdAt: '2026-05-20T21:00:00Z',
    buyerConfirmed: false,
    sellerConfirmed: false,
    messages: [
      {
        id: 'msg_3_1',
        senderId: 'bot',
        senderName: 'الوسيط التلقائي 🛡',
        senderRole: 'admin',
        text: 'تم تأكيد دفع مبلغ 25$ بنجاح. رصيد الصفقة معلق الآن بأمان في الإسكرو. يرجى من البائع SofianeSmm الشحن للآيدي المرفق من المشتري في غضون 4 ساعات لتفادي الإلغاء التلقائي.',
        timestamp: '21:02'
      },
      {
        id: 'msg_3_2',
        senderId: 'user_buyer_anis',
        senderName: 'أنيس الجزائري',
        senderRole: 'buyer',
        text: 'هذا هو آيدي الحساب الخاص بي لشحنه: 5124900812. في انتظارك أخي الكريم.',
        timestamp: '21:03'
      }
    ]
  }
];

// Initial Swap Proposals
export const initialSwaps: SwapRequest[] = [
  {
    id: 'swap_001',
    userId: 'user_seller_wael',
    username: 'WaelStore',
    have: 'حساب امبراطور كلاري في كلاش أوف كلانس قاعة مدينة 14 ماكس',
    want: 'حساب تيك توك 30k متابع أو أكثر مهيأ للربح بالتبييت والبيانات الأصلية',
    status: 'pending',
    createdAt: '25-05-2026'
  },
  {
    id: 'swap_002',
    userId: 'user_buyer_anis',
    username: 'AnisDz7',
    have: 'حساب ديسكورد يحتوي شارات قديمة 2017 ومفعل لمدة سنة نيترو',
    want: 'بطاقة باريدي موب تعبئة 3000 دج أو شدات ببجي مكافئة',
    status: 'pending',
    createdAt: '26-05-2026'
  }
];

// Initial Auctions
export const initialAuctions: Auction[] = [
  {
    id: 'auc_001',
    productId: 'prod_instagram_10k',
    productTitle: 'حساب انستغرام 10k متفاعل حقيقي',
    sellerId: 'user_seller_scammer',
    sellerName: 'CheaterDz',
    startingPrice: 20,
    highestBid: 28,
    highestBidderId: 'user_buyer_anis',
    highestBidderName: 'AnisDz7',
    endTime: '2026-05-21T06:00:00Z', // will end soon
    bidsCount: 5,
    isCompleted: false,
    createdAt: '2026-05-19T21:00:00Z'
  },
  {
    id: 'auc_002',
    productId: 'prod_logo_design',
    productTitle: 'هوية بصرية وتصميم موقع ويب متكامل من الصفر',
    sellerId: 'user_seller_sofiane',
    sellerName: 'SofianeSmm',
    startingPrice: 100,
    highestBid: 120,
    highestBidderId: 'user_seller_wael',
    highestBidderName: 'WaelStore',
    endTime: '2026-05-23T20:00:00Z',
    bidsCount: 3,
    isCompleted: false,
    createdAt: '2026-05-20T10:00:00Z'
  }
];

// Initial Wallets
export const initialWallets: UserWallet[] = [
  {
    userId: 'user_admin',
    username: 'dz_owner',
    availableBalance: 420.5,
    pendingBalance: 55.0,
    frozenBalance: 0,
    transactions: [
      {
        id: 'tx_ad_1',
        amount: 32.5,
        type: 'escrow_release',
        status: 'completed',
        description: 'عمولة منصة مستقطعة من صفقة بيع ناجحة #tkt_002',
        timestamp: '2026-05-19 12:44',
        paymentMethod: 'System System'
      }
    ]
  },
  {
    userId: 'user_seller_wael',
    username: 'WaelStore',
    availableBalance: 82.0,
    pendingBalance: 15.0, // pending from Valorant dispute
    frozenBalance: 0,
    transactions: [
      {
        id: 'tx_ws_1',
        amount: 3.6,
        type: 'escrow_release',
        status: 'completed',
        description: 'أرباح تذكرة نتفليكس #tkt_002 تم التحرير بعد الخصم',
        timestamp: '2026-05-19 10:08',
        paymentMethod: 'USDT'
      },
      {
        id: 'tx_ws_2',
        amount: 15.0,
        type: 'escrow_hold',
        status: 'pending',
        description: 'بانتظار تسوية النزاع القائم على حساب فالورانت #tkt_001',
        timestamp: '2026-05-20 14:20',
        paymentMethod: 'BaridiMob'
      }
    ]
  },
  {
    userId: 'user_seller_sofiane',
    username: 'SofianeSmm',
    availableBalance: 195.0,
    pendingBalance: 25.0, // pending from PUBG
    frozenBalance: 0,
    transactions: [
      {
        id: 'tx_sf_1',
        amount: 100.0,
        type: 'deposit',
        status: 'completed',
        description: 'إيداع رسمي بالعملة المشفرة Binance ID',
        timestamp: '2026-05-18 20:30',
        paymentMethod: 'Binance API'
      },
      {
        id: 'tx_sf_2',
        amount: 25.0,
        type: 'escrow_hold',
        status: 'pending',
        description: 'رصيد طلب شحن ببجي موبايل معلق في الإسكرو #tkt_003',
        timestamp: '2026-05-20 21:02',
        paymentMethod: 'BaridiMob'
      }
    ]
  },
  {
    userId: 'user_buyer_anis',
    username: 'AnisDz7',
    availableBalance: 45.0,
    pendingBalance: 0,
    frozenBalance: 0,
    transactions: [
      {
        id: 'tx_an_1',
        amount: 200.0,
        type: 'deposit',
        status: 'completed',
        description: 'شحن رصيد نقدي عبر التحويل البريدي الجزائري BaridiMob',
        timestamp: '2026-05-18 11:15',
        paymentMethod: 'BaridiMob'
      },
      {
        id: 'tx_an_2',
        amount: -4.0,
        type: 'escrow_hold',
        status: 'completed',
        description: 'دفع قيمة اشتراك نتفليكس للوساطة #tkt_002',
        timestamp: '2026-05-19 10:00',
        paymentMethod: 'Internal Wallet'
      },
      {
        id: 'tx_an_3',
        amount: -25.0,
        type: 'escrow_hold',
        status: 'completed',
        description: 'دفع قيمة شحن ببجي للوساطة #tkt_003',
        timestamp: '2026-05-20 21:00',
        paymentMethod: 'Internal Wallet'
      }
    ]
  },
  {
    userId: 'user_seller_scammer',
    username: 'CheaterDz',
    availableBalance: 0.0,
    pendingBalance: 0.0,
    frozenBalance: 15.0, // Wallet frozen because of negative reviews and suspicious logins
    transactions: [
      {
        id: 'tx_sc_1',
        amount: 15.0,
        type: 'escrow_hold',
        status: 'frozen',
        description: 'تجميد رصيد المبيعات العالقة لأسباب أمنية وقرار من الإدارة العليا للحد من النصب والتحذير المتكرر',
        timestamp: '2026-05-19 09:00',
        paymentMethod: 'Flexy'
      }
    ]
  }
];

// Initial Security Alerts
export const initialSecurityAlerts: SecurityAlert[] = [
  {
    id: 'alt_001',
    userId: 'user_seller_scammer',
    username: 'CheaterDz',
    type: 'multi_account',
    severity: 'critical',
    details: 'تم كشف استخدام نفس الآي بي 197.55.12.189 لإنشاء حساب آخر باسم DzSalesX لتجاوز قيود النزاع.',
    timestamp: '2026-05-20 22:45',
    status: 'new'
  },
  {
    id: 'alt_002',
    userId: 'user_seller_scammer',
    username: 'CheaterDz',
    type: 'suspicious_link',
    severity: 'critical',
    details: 'أرسل رابط تليجرام دعوة خارجي مشبوه t.me/free_pubg_uc_giveaway داخل الدرشة الخاصة بالعميل لتخطي الوساطة.',
    timestamp: '2026-05-20 18:30',
    status: 'new'
  },
  {
    id: 'alt_003',
    userId: 'user_seller_wael',
    username: 'WaelStore',
    type: 'external_payment_attempt',
    severity: 'low',
    details: 'المستشعر الذكي رصد كلمة "دفع بريدي خارجي خالي من الرسوم" في محادثة سابقة لتجنب عمولة المنصة.',
    timestamp: '2026-05-19 15:10',
    status: 'investigated'
  }
];

// Initial Logs
export const initialLogs: SystemLog[] = [
  {
    id: 'log_001',
    adminId: 'user_admin',
    adminName: 'وسيم',
    action: 'تنبيه تحذير بائع',
    details: 'إرسال تحذير نهائي للبائع CheaterDz بسبب تأخر التسليم وبلاغ الاحتيال.',
    timestamp: '2026-05-20 20:00'
  },
  {
    id: 'log_002',
    adminId: 'user_admin',
    adminName: 'وسيم',
    action: 'تجميد رصيد محفظة',
    details: 'تجميد محفظة المستخدم CheaterDz احترازياً بعد كشف Spam حسابات.',
    timestamp: '2026-05-20 22:48'
  }
];

// Global DB class that handles persistence automatically
class LocalMarketDB {
  prefix = 'tg_market_db_';

  get<T>(key: string, defaultVal: T): T {
    const raw = localStorage.getItem(this.prefix + key);
    if (!raw) {
      this.set(key, defaultVal);
      return defaultVal;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return defaultVal;
    }
  }

  set<T>(key: string, val: T): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(val));
  }

  // Getters for specific collections
  getUsers(): TelegramUser[] {
    return this.get<TelegramUser[]>('users', initialUsers);
  }

  saveUsers(users: TelegramUser[]): void {
    this.set('users', users);
  }

  getProducts(): Product[] {
    return this.get<Product[]>('products', initialProducts);
  }

  saveProducts(products: Product[]): void {
    this.set('products', products);
  }

  getTickets(): EscrowTicket[] {
    return this.get<EscrowTicket[]>('tickets', initialTickets);
  }

  saveTickets(tickets: EscrowTicket[]): void {
    this.set('tickets', tickets);
  }

  getSwaps(): SwapRequest[] {
    return this.get<SwapRequest[]>('swaps', initialSwaps);
  }

  saveSwaps(swaps: SwapRequest[]): void {
    this.set('swaps', swaps);
  }

  getAuctions(): Auction[] {
    return this.get<Auction[]>('auctions', initialAuctions);
  }

  saveAuctions(auctions: Auction[]): void {
    this.set('auctions', auctions);
  }

  getWallets(): UserWallet[] {
    return this.get<UserWallet[]>('wallets', initialWallets);
  }

  saveWallets(wallets: UserWallet[]): void {
    this.set('wallets', wallets);
  }

  getSecurityAlerts(): SecurityAlert[] {
    return this.get<SecurityAlert[]>('security_alerts', initialSecurityAlerts);
  }

  saveSecurityAlerts(alerts: SecurityAlert[]): void {
    this.set('security_alerts', alerts);
  }

  getLogs(): SystemLog[] {
    return this.get<SystemLog[]>('logs', initialLogs);
  }

  saveLogs(logs: SystemLog[]): void {
    this.set('logs', logs);
  }

  // Helper business operations
  addLog(adminName: string, action: string, details: string) {
    const logs = this.getLogs();
    const newLog: SystemLog = {
      id: 'log_' + Date.now(),
      adminId: 'user_admin',
      adminName,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    logs.unshift(newLog);
    this.saveLogs(logs);
  }

  addSecurityAlert(userId: string, username: string, type: any, severity: any, details: string) {
    const alerts = this.getSecurityAlerts();
    const newAlert: SecurityAlert = {
      id: 'alt_' + Date.now(),
      userId,
      username,
      type,
      severity,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'new'
    };
    alerts.unshift(newAlert);
    this.saveSecurityAlerts(alerts);
  }
}

export const dbInstance = new LocalMarketDB();
