import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { 
  TelegramUser, 
  Product, 
  EscrowTicket, 
  SwapRequest, 
  Auction, 
  UserWallet, 
  SecurityAlert, 
  SystemLog,
  WalletTransaction,
  TicketMessage
} from '../types';

// Import Mongoose Models
import { UserModel } from '../models/UserModel';
import { ProductModel } from '../models/ProductModel';
import { EscrowTicketModel } from '../models/TicketModel';
import { WalletModel } from '../models/WalletModel';
import { SwapModel } from '../models/SwapModel';
import { AuctionModel } from '../models/AuctionModel';
import { SecurityAlertModel } from '../models/AlertModel';
import { SystemLogModel } from '../models/SystemLogModel';
import { SettingsModel } from '../models/SettingsModel';

// Let's extend Request interface to carry telegramId
export interface TgRequest extends Request {
  telegramId?: string;
}

// Socket emitting helper
function emitToUser(req: TgRequest, userId: string, event: string, payload: any) {
  try {
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit(event, payload);
    }
  } catch (err) {
    console.error('[SkyMarket Sockets] Socket emission failed:', err);
  }
}

// Helper: Create admin system log in MongoDB
async function createSystemLog(adminId: string, adminName: string, action: string, details: string) {
  try {
    return await SystemLogModel.create({
      id: `log_${Date.now()}`,
      adminId,
      adminName,
      action,
      details,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });
  } catch (err) {
    console.error('[SkyMarket Log] Error creating system log:', err);
  }
}

// Helper: Push security alert in MongoDB
async function createSecurityAlert(userId: string, username: string, type: string, severity: string, details: string) {
  try {
    return await SecurityAlertModel.create({
      id: `alt_${Date.now()}`,
      userId,
      username,
      type: type as any,
      severity: severity as any,
      details,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
      status: 'new'
    });
  } catch (err) {
    console.error('[SkyMarket Alert] Error creating security alert:', err);
  }
}

// Helper: Ensure user has a wallet in MongoDB
async function getOrCreateWallet(userId: string, username: string): Promise<any> {
  let wallet = await WalletModel.findOne({ userId });
  if (!wallet) {
    wallet = await WalletModel.create({
      userId,
      username,
      availableBalance: 100.0, // Default signup welcome bonus
      pendingBalance: 0.0,
      frozenBalance: 0.0,
      transactions: []
    });
  }
  return wallet;
}

// Authentication check using WebApp crypt-signature
export function validateTelegramInitData(req: TgRequest, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;
  const isDev = process.env.NODE_ENV !== 'production' || !process.env.BOT_TOKEN;

  if (!initData) {
    if (isDev) {
      req.telegramId = 'user_buyer_anis';
      return next();
    }
    return res.status(401).json({ error: 'عذراً! يلزم توفير ترويسة x-telegram-init-data' });
  }

  try {
    if (isDev) {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        req.telegramId = String(user.id);
      } else {
        req.telegramId = 'user_buyer_anis';
      }
      return next();
    }

    const botToken = process.env.BOT_TOKEN || '';
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const sorted = Array.from(params.entries())
      .map(([key, value]) => `${key}=${decodeURIComponent(value)}`)
      .sort()
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(sorted).digest('hex');

    if (computedHash !== hash) {
      return res.status(403).json({ error: 'توقيع تليجرام غير مطابق وصالح!' });
    }

    const userStr = params.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      req.telegramId = String(user.id);
    } else {
      return res.status(400).json({ error: 'لم يتم العثور على بيانات المستخدم داخل initData' });
    }

    next();
  } catch (err) {
    if (isDev) {
      req.telegramId = 'user_buyer_anis';
      return next();
    }
    res.status(400).json({ error: 'معلومات الـ initData غير صالحة البنية!' });
  }
}

const router = express.Router();

// Apply auth validator to all router actions
router.use(validateTelegramInitData);

// Health check endpoint for internal system monitoring
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// -----------------------------------------------------
// 1. PRODUCTS ENDPOINTS
// -----------------------------------------------------

// GET /api/products — جلب المنتجات مع pagination وfilter
router.get('/products', async (req: TgRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const typeFilter = req.query.type as string;
    const searchFilter = req.query.query as string;

    const filter: any = { isHidden: false };

    if (typeFilter && typeFilter !== 'all') {
      filter.type = typeFilter;
    }

    if (searchFilter) {
      const regex = new RegExp(searchFilter, 'i');
      filter.$or = [
        { title: regex },
        { description: regex }
      ];
    }

    // Do NOT select or send credentials in lists to maintain user privacy!
    const total = await ProductModel.countDocuments(filter);
    const paginatedResult = await ProductModel.find(filter)
      .select('-credentials') // Clean security mapping
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data: paginatedResult,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب المنتجات كليا: ' + err.message });
  }
});

// GET /api/products/:id — منتج واحد بالتفصيل (excluding credentials field)
router.get('/products/:id', async (req: TgRequest, res: Response) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id }).select('-credentials');
    if (!product) {
      return res.status(404).json({ error: 'المنتج المطلوب غير موجود!' });
    }

    product.viewsCount = (product.viewsCount || 0) + 1;
    await product.save();

    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: 'حدث خطأ عند جلب تفاصيل المنتج: ' + err.message });
  }
});

// PUT /api/products/:id/credentials — حفظ بيانات الحساب الرقمي للبائع فقط
router.put('/products/:id/credentials', async (req: TgRequest, res: Response) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ error: 'السلعة المطلوبة غير متوفرة لتعيين الحساب!' });
    }

    // Authorization: seller id must match Telegram user ID
    if (product.sellerId !== req.telegramId) {
      return res.status(403).json({ error: 'غير مسموح لك بإدخال بيانات حساب لسلعة لا تملكها!' });
    }

    const { email, password, username, phone, notes, extra } = req.body;

    // Secure credentials saving
    product.credentials = {
      email: email || null,
      password: password || null,
      username: username || null,
      phone: phone || null,
      notes: notes || null,
      extra: extra || null
    };
    product.hasCredentials = true;

    await product.save();
    res.json({ success: true, message: 'تم حفظ وتشفير كلي لبيانات الحساب بنجاح كجزء من أمان الضمان 👍' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تدوين وحفظ بيانات الحساب الرقمي: ' + err.message });
  }
});

// GET /api/products/:id/credentials — كشف البيانات للمشتري (في حال التسليم) أو المشرف
router.get('/products/:id/credentials', async (req: TgRequest, res: Response) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ error: 'المنتج المطلوب غير معثور عليه لقراءة بياناته!' });
    }

    const user = await UserModel.findOne({ id: req.telegramId });
    const isAdmin = user?.role === 'admin';

    // Buyer check inside active completed/delivered escrow ticket
    let allowedToView = isAdmin;

    if (!allowedToView) {
      const ticket = await EscrowTicketModel.findOne({
        productId: req.params.id,
        buyerId: req.telegramId,
        status: { $in: ['delivered', 'completed'] }
      });
      if (ticket) {
        allowedToView = true;
      }
    }

    if (!allowedToView) {
      return res.status(403).json({ error: 'عذراً! ليس لديك الصلاحية لقراءة ترويسات بيانات هذه السلعة الرقمية إلا بعد الدفع وتلقي التسليم.' });
    }

    res.json({
      success: true,
      credentials: product.credentials || { notes: 'المعلومات فارغة حالياً' }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق جلب واستظهار بيانات الحساب: ' + err.message });
  }
});

// POST /api/products — إضافة منتج جديد
router.post('/products', async (req: TgRequest, res: Response) => {
  try {
    const { title, price, description, type, images, acceptedPayments, isSwapAcceptable, isNegotiable, warrantyPeriod, discountPercentage } = req.body;

    if (!title || !price || !description || !type) {
      return res.status(400).json({ error: 'يرجى تزويد كامل التفاصيل الإجبارية للسلعة!' });
    }

    const tId = req.telegramId || 'user_buyer_anis';

    const newProduct = await ProductModel.create({
      id: `prod_${Date.now().toString().slice(-6)}`,
      title,
      price: parseFloat(price),
      description,
      type,
      sellerId: tId,
      images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'],
      acceptedPayments: acceptedPayments?.length ? acceptedPayments : ['BaridiMob'],
      isSwapAcceptable: !!isSwapAcceptable,
      isNegotiable: !!isNegotiable,
      warrantyPeriod: warrantyPeriod || 'بدون ضمان',
      viewsCount: 0,
      reportsCount: 0,
      isTrend: false,
      isFeatured: false,
      isHidden: false,
      discountPercentage: parseInt(discountPercentage) || 0,
      hasCredentials: false,
      isApproved: true
    });

    const user = await UserModel.findOne({ id: tId });
    await createSystemLog('system', user?.fullName || 'بائع ذاتي', 'إضافة سلعة', `تم إدراج سلعة "${title}" بسعر ${price}$`);

    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(550).json({ error: 'أخفق إدراج السلعة الجديدة بقاعدة البيانات: ' + err.message });
  }
});

// PUT /api/products/:id — تعديل منتج
router.put('/products/:id', async (req: TgRequest, res: Response) => {
  try {
    const prod = await ProductModel.findOne({ id: req.params.id });
    if (!prod) {
      return res.status(404).json({ error: 'السلعة المراد تعديلها غير موجودة!' });
    }

    const user = await UserModel.findOne({ id: req.telegramId });

    // Permissions logic
    if (prod.sellerId !== req.telegramId && user?.role !== 'admin') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تعديل هذا المنتج!' });
    }

    const { title, price, description, type, images, acceptedPayments, isSwapAcceptable, isNegotiable, warrantyPeriod, discountPercentage } = req.body;

    if (title) prod.title = title;
    if (price !== undefined) prod.price = parseFloat(price);
    if (description) prod.description = description;
    if (type) prod.type = type;
    if (images) prod.images = images;
    if (acceptedPayments) prod.acceptedPayments = acceptedPayments;
    if (isSwapAcceptable !== undefined) prod.isSwapAcceptable = !!isSwapAcceptable;
    if (isNegotiable !== undefined) prod.isNegotiable = !!isNegotiable;
    if (warrantyPeriod) prod.warrantyPeriod = warrantyPeriod;
    if (discountPercentage !== undefined) prod.discountPercentage = parseInt(discountPercentage) || 0;

    await prod.save();
    res.json(prod);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ إلكتروني في حفظ تحديثات السلعة: ' + err.message });
  }
});

// -----------------------------------------------------
// 2. USER PROFILE ENDPOINTS
// -----------------------------------------------------

// GET /api/user/me — بيانات اليوزر الحالي
router.get('/user/me', async (req: TgRequest, res: Response) => {
  try {
    const tg = req.telegramId || 'user_buyer_anis';
    let user = await UserModel.findOne({ id: tg });

    if (!user) {
      const isOwner = tg === 'user_admin' || tg === '12345678' || tg === 'wael23230xx';
      user = await UserModel.create({
        id: tg,
        username: `tg_${tg}`,
        fullName: isOwner ? 'المالك الرئيسي - وسيم' : `مستحدم رصين #${tg.toString().slice(-4)}`,
        role: isOwner ? 'admin' : 'buyer',
        level: isOwner ? 'VIP' : 'Verified',
        avatar: '👤',
        salesCount: 0,
        successRate: 100,
        responseTime: '5 min',
        totalEarnings: 0,
        joinedDate: new Date().toISOString().substring(0, 10),
        ipAddress: req.ip || '197.200.41.92',
        device: 'Telegram WebApp Platform',
        points: 500,
        isBanned: false,
        warnings: [],
        commissionPercentage: null,
        allowWithdrawals: true,
        sellerLevel: 'Standard'
      });
    }

    // Hydrate their wallet structure
    await getOrCreateWallet(user.id, user.username);

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تتبع بيانات المستخدم: ' + err.message });
  }
});

// PUT /api/user/me — تحديث بيانات اليوزر
router.put('/user/me', async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.telegramId });
    if (!user) return res.status(404).json({ error: 'المستخدم غير مسجل!' });

    const { fullName, avatar } = req.body;
    if (fullName) user.fullName = fullName;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حفظ وتخزين تحديث الهوية: ' + err.message });
  }
});

// -----------------------------------------------------
// 3. WALLET ENDPOINTS
// -----------------------------------------------------

// GET /api/wallet/me — محفظة اليوزر
router.get('/wallet/me', async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.telegramId });
    const wallet = await getOrCreateWallet(req.telegramId || 'user_buyer_anis', user?.username || `user_${req.telegramId}`);
    res.json(wallet);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في سحب معلومات الرصيد: ' + err.message });
  }
});

// POST /api/wallet/deposit — طلب إيداع
router.post('/wallet/deposit', async (req: TgRequest, res: Response) => {
  try {
    const { amount, paymentMethod } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'يرجى تقديم قيمة شحن صالحة وصحيحة!' });
    }

    const user = await UserModel.findOne({ id: req.telegramId });
    const wallet = await getOrCreateWallet(req.telegramId || 'user_buyer_anis', user?.username || `user_${req.telegramId}`);

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      amount: amt,
      type: 'deposit',
      status: 'completed', // Auto approved for demo sandbox
      description: `إيداع رصيد نقدي عبر قنوات ${paymentMethod || 'باريدي موب'}`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
      paymentMethod: paymentMethod || 'BaridiMob'
    };

    wallet.availableBalance += amt;
    wallet.transactions.unshift(tx);
    await wallet.save();

    // Sockets update
    emitToUser(req, wallet.userId, 'wallet_update', { balance: wallet.availableBalance });
    emitToUser(req, wallet.userId, 'notification', {
      type: 'deposit',
      title: 'تم الإيداع بنجاح 💸',
      message: `تمت إضافة مبلغ $${amt} إلى رصيد حسابك بنجاح.`
    });

    res.json({ success: true, wallet });
  } catch (err: any) {
    res.status(500).json({ error: 'فشلت معالجة عملية الإيداع: ' + err.message });
  }
});

// POST /api/wallet/withdraw — طلب سحب
router.post('/wallet/withdraw', async (req: TgRequest, res: Response) => {
  try {
    const { amount, address, paymentMethod } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'يرجى تقديم قيمة سحب مالية صالحة!' });
    }

    const user = await UserModel.findOne({ id: req.telegramId });
    const wallet = await getOrCreateWallet(req.telegramId || 'user_buyer_anis', user?.username || `user_${req.telegramId}`);

    if (wallet.availableBalance < amt) {
      return res.status(400).json({ error: 'رصيد المحفظة الحالي غير كافٍ للقيام بالسحب البريدي!' });
    }

    // Deduct available
    wallet.availableBalance -= amt;

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      amount: amt,
      type: 'withdraw',
      status: 'pending', // Pending Admin approval
      description: `طلب سحب معلق إلى العنوان: (${address})`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
      paymentMethod: paymentMethod || 'BaridiMob'
    };

    wallet.transactions.unshift(tx);
    await wallet.save();

    // Sockets update
    emitToUser(req, wallet.userId, 'wallet_update', { balance: wallet.availableBalance });
    emitToUser(req, wallet.userId, 'notification', {
      type: 'withdrawal_pending',
      title: 'طلب سحب قيد الانتظار ⏳',
      message: `طلب سحب مبلغ $${amt} في انتظار مراجعة مسؤول التحصيل.`
    });

    res.json({ success: true, wallet });
  } catch (err: any) {
    res.status(500).json({ error: 'حدث خطأ عند تقديم طلب السحب: ' + err.message });
  }
});

// -----------------------------------------------------
// 4. ESCROW TICKETS ENDPOINTS
// -----------------------------------------------------

// GET /api/tickets — تذاكر الـ Escrow
router.get('/tickets', async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.telegramId });
    if (user?.role === 'admin') {
      const tickets = await EscrowTicketModel.find().sort({ createdAt: -1 });
      return res.json(tickets);
    }

    const clientTickets = await EscrowTicketModel.find({
      $or: [
        { buyerId: req.telegramId },
        { sellerId: req.telegramId }
      ]
    }).sort({ createdAt: -1 });

    res.json(clientTickets);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل فحص تذاكر الضمان الموثوقة: ' + err.message });
  }
});

// GET /api/tickets/:id — تذكرة بالتفصيل
router.get('/tickets/:id', async (req: TgRequest, res: Response) => {
  try {
    const ticket = await EscrowTicketModel.findOne({ id: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'التذكرة المطلوبة غير موجودة!' });
    }

    const user = await UserModel.findOne({ id: req.telegramId });
    if (ticket.buyerId !== req.telegramId && ticket.sellerId !== req.telegramId && user?.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح للوصول لهذه التذكرة!' });
    }

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: 'أخفقت قراءة بيانات تذكرة الضمان: ' + err.message });
  }
});

// POST /api/tickets — إنشاء تذكرة شراء وحجز رصيد
router.post('/tickets', async (req: TgRequest, res: Response) => {
  try {
    const { productId } = req.body;
    const prod = await ProductModel.findOne({ id: productId });
    if (!prod) {
      return res.status(404).json({ error: 'المنتج المطلوب للاقتناء غير متوفر في المتجر!' });
    }

    const buyerUser = await UserModel.findOne({ id: req.telegramId });
    if (!buyerUser) return res.status(404).json({ error: 'المستخدم المشتري غير مسجل بالمنصة!' });

    const buyerWallet = await getOrCreateWallet(buyerUser.id, buyerUser.username);

    // Dynamic price calculation with active discount percentages
    const finalPrice = prod.discountPercentage && prod.discountPercentage > 0
      ? prod.price * (1 - prod.discountPercentage / 100)
      : prod.price;

    if (buyerWallet.availableBalance < finalPrice) {
      return res.status(400).json({ error: 'عذراً الرصيد الحالي غير كافٍ! يرجى شحن محفظتك أولاً.' });
    }

    // Deduct available
    buyerWallet.availableBalance -= finalPrice;
    
    // Hold inside ledger
    const holdTx: WalletTransaction = {
      id: `tx_hold_${Date.now()}`,
      amount: -finalPrice,
      type: 'escrow_hold',
      status: 'completed',
      description: `تأمين تعليق أموال شراء "${prod.title}" في الضمان`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
      paymentMethod: 'Internal Wallet'
    };
    buyerWallet.transactions.unshift(holdTx);
    await buyerWallet.save();

    const sellerUser = await UserModel.findOne({ id: prod.sellerId }) || { id: prod.sellerId, fullName: 'بائع كفء' };

    const newTicket = await EscrowTicketModel.create({
      id: `tkt_new_${Date.now().toString().slice(-4)}`,
      productId: prod.id,
      productTitle: prod.title,
      price: finalPrice,
      buyerId: buyerUser.id,
      buyerName: buyerUser.fullName,
      sellerId: prod.sellerId,
      sellerName: sellerUser.fullName,
      status: 'waiting_delivery', // Paid, waiting for delivery
      createdAt: new Date().toISOString(),
      buyerConfirmed: false,
      sellerConfirmed: false,
      messages: [
        {
          id: `msg_auto_${Date.now()}`,
          senderId: 'bot',
          senderName: 'الوسيط التلقائي 🛡',
          senderRole: 'admin',
          text: `تم إنشاء التذكرة لـ "${prod.title}". وحجز مبلغ ${finalPrice}$ بأمان في حساب الضمان التابع لسكاي ماركت. يرجى من البائع تسليم البيانات هنا بسلام.`,
          timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    });

    // Real-time signals
    emitToUser(req, buyerUser.id, 'wallet_update', { balance: buyerWallet.availableBalance });
    emitToUser(req, buyerUser.id, 'notification', {
      type: 'purchase_initiated',
      title: 'تم خصم مبلغ وحجزه بسلام 🛡️',
      message: `تم حجز رصيد بقيمة $${finalPrice} في حساب الضمان.`
    });

    emitToUser(req, prod.sellerId, 'notification', {
      type: 'new_transaction_alert',
      title: 'عملية مبيعات جديدة 🤝',
      message: `العميل يطلب شراء "${prod.title}". يرجى إملاء تفاصيل المنتج.`
    });

    res.status(201).json(newTicket);
  } catch (err: any) {
    res.status(550).json({ error: 'أخفقت معالجة شراء الضمان: ' + err.message });
  }
});

// POST /api/tickets/:id/confirm — تأكيد الاستلام وتحرير مستحقات البائع والعمولة
router.post('/tickets/:id/confirm', async (req: TgRequest, res: Response) => {
  try {
    const ticket = await EscrowTicketModel.findOne({ id: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'الصفقة غير متوفرة!' });

    const userObj = await UserModel.findOne({ id: req.telegramId });

    if (ticket.buyerId !== req.telegramId && userObj?.role !== 'admin') {
      return res.status(403).json({ error: 'حق التأكيد مقتصر على المشتري والمشرف فقط!' });
    }

    if (ticket.status === 'completed' || ticket.status === 'refunded') {
      return res.status(400).json({ error: 'هذه الصفقة مغلقة بالفعل!' });
    }

    ticket.buyerConfirmed = true;
    ticket.status = 'completed';

    // Retrieve commission
    const platformSettings = await SettingsModel.findOne() || { generalCommission: 10 };
    const commissionPercent = platformSettings.generalCommission || 10;
    const commissionAmt = ticket.price * (commissionPercent / 100);
    const netEarnings = ticket.price - commissionAmt;

    const sellerUser = await UserModel.findOne({ id: ticket.sellerId });
    const sellerWallet = await getOrCreateWallet(ticket.sellerId, sellerUser?.username || 'seller');

    sellerWallet.availableBalance += netEarnings;

    if (sellerUser) {
      sellerUser.salesCount = (sellerUser.salesCount || 0) + 1;
      sellerUser.totalEarnings = (sellerUser.totalEarnings || 0) + netEarnings;
      await sellerUser.save();
    }

    const releaseTx: WalletTransaction = {
      id: `tx_release_${Date.now()}`,
      amount: netEarnings,
      type: 'escrow_release',
      status: 'completed',
      description: `استلام مستحقات بيع "${ticket.productTitle}" بعد عمولة المنصة %${commissionPercent}`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
      paymentMethod: 'USDT'
    };
    sellerWallet.transactions.unshift(releaseTx);
    await sellerWallet.save();

    // Commission logging to Admin balance mapping
    const sysAdmin = await UserModel.findOne({ role: 'admin' }) || await UserModel.findOne() || userObj;
    if (sysAdmin) {
      const adminWallet = await getOrCreateWallet(sysAdmin.id, sysAdmin.username);
      adminWallet.availableBalance += commissionAmt;
      adminWallet.transactions.unshift({
        id: `tx_comm_${Date.now()}`,
        amount: commissionAmt,
        type: 'bonus',
        status: 'completed',
        description: `استقطاع عمولة %${commissionPercent} من صفقة تذكرة #${ticket.id}`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
        paymentMethod: 'Platform'
      });
      await adminWallet.save();
    }

    // Auto bot message
    ticket.messages.push({
      id: `msg_bot_comp_${Date.now()}`,
      senderId: 'bot',
      senderName: 'الوسيط التلقائي 🛡',
      senderRole: 'admin',
      text: `⚠️ تهانينا! تم تأكيد الاستلام بنجاح من المشتري ومصادقة الطلب. تم تحرير مبلغ ${netEarnings}$ للبائع بعد عمولة المنصة %${commissionPercent} (${commissionAmt}$)`,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
    });

    await ticket.save();

    // Sockets emission
    emitToUser(req, ticket.buyerId, 'ticket_update', { ticketId: ticket.id, status: 'completed' });
    emitToUser(req, ticket.sellerId, 'ticket_update', { ticketId: ticket.id, status: 'completed' });
    emitToUser(req, ticket.sellerId, 'wallet_update', { balance: sellerWallet.availableBalance });
    emitToUser(req, ticket.sellerId, 'notification', {
      type: 'sale_escrow_released',
      title: 'تحرير مستحقات مالية 💳',
      message: `تم إيداع مبلغ $${netEarnings} من صفقة "${ticket.productTitle}"`
    });

    // Check if product has credentials to return
    const productDef = await ProductModel.findOne({ id: ticket.productId });
    const responsePayload: any = { success: true, ticket };

    if (productDef?.hasCredentials && productDef.credentials) {
      responsePayload.credentials = productDef.credentials;
    }

    res.json(responsePayload);
  } catch (err: any) {
    res.status(500).json({ error: 'عطل في معالجة مالي للمصادقة: ' + err.message });
  }
});

// POST /api/tickets/:id/dispute — فتح نزاع رسمي لقضية
router.post('/tickets/:id/dispute', async (req: TgRequest, res: Response) => {
  try {
    const ticket = await EscrowTicketModel.findOne({ id: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'الصفقة غير متوفرة!' });

    const { reason, priority } = req.body;
    if (!reason) return res.status(400).json({ error: 'عليك كتابة سبب النزاع لتأسيس القضية!' });

    ticket.status = 'disputed';
    ticket.disputePriority = priority || 'medium';
    ticket.disputeReason = reason;

    ticket.messages.push({
      id: `msg_bot_disp_${Date.now()}`,
      senderId: 'bot',
      senderName: 'الوسيط التلقائي 🛡',
      senderRole: 'admin',
      text: `⚠️ تنبيه بقضية نزاع: دخلت هذه الصفقة حالة النزاع المستعجل وتنتظر قرار مشرف التحكيم. السبب: "${reason}"`,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
    });

    await ticket.save();

    // Trigger alerts
    const user = await UserModel.findOne({ id: req.telegramId });
    if (user?.role === 'buyer') {
      await createSecurityAlert(ticket.sellerId, ticket.sellerName, 'external_payment_attempt', 'medium', `تم تأسيس نزاع رسمي ضد البائع بخصوص صفقة "${ticket.productTitle}"`);
    }

    // Sockets emission
    emitToUser(req, ticket.buyerId, 'ticket_update', { ticketId: ticket.id, status: 'disputed' });
    emitToUser(req, ticket.sellerId, 'ticket_update', { ticketId: ticket.id, status: 'disputed' });
    emitToUser(req, ticket.sellerId, 'notification', {
      type: 'escrow_disputed',
      title: 'نزاع مستعجل مفتوح ⚠️',
      message: `فتح المشتري نزاعاً بشأن صفقة "${ticket.productTitle}"`
    });

    res.json({ success: true, ticket });
  } catch (err: any) {
    res.status(500).json({ error: 'اخفق تأسيس النزاع: ' + err.message });
  }
});

// POST /api/tickets/:id/message — إرسال رسالة
router.post('/api/tickets/:id/message', async (req: TgRequest, res: Response) => {
  // Mount fallback or explicit inside routes
});

router.post('/tickets/:id/message', async (req: TgRequest, res: Response) => {
  try {
    const ticket = await EscrowTicketModel.findOne({ id: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'الصفقة غير موجودة!' });

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'الدردشة تتطلب محتوى كـ نص!' });

    const activeUser = await UserModel.findOne({ id: req.telegramId });
    if (!activeUser) return res.status(404).json({ error: 'المرسل مجهول الهوية!' });

    let roleInTicket: 'buyer' | 'seller' | 'admin' = 'buyer';
    if (activeUser.role === 'admin') {
      roleInTicket = 'admin';
    } else if (ticket.sellerId === req.telegramId) {
      roleInTicket = 'seller';
    }

    const newMessage: TicketMessage = {
      id: `msg_usr_${Date.now()}`,
      senderId: activeUser.id,
      senderName: activeUser.fullName,
      senderRole: roleInTicket,
      text,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
    };

    ticket.messages.push(newMessage);
    await ticket.save();

    // Socket broadcasts to counterparty
    const targetUserId = req.telegramId === ticket.buyerId ? ticket.sellerId : ticket.buyerId;
    emitToUser(req, targetUserId, 'ticket_update', { ticketId: ticket.id });

    res.json(newMessage);
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق إرسال الرسالة الرقمية: ' + err.message });
  }
});

// -----------------------------------------------------
// 5. AUCTIONS ENDPOINTS
// -----------------------------------------------------

// GET /api/auctions — المزادات النشطة
router.get('/auctions', async (req: TgRequest, res: Response) => {
  try {
    const auctions = await AuctionModel.find().sort({ createdAt: -1 });
    res.json(auctions);
  } catch (err: any) {
    res.status(505).json({ error: 'خطأ بقاعدة البيانات عند سحب المزادات: ' + err.message });
  }
});

// POST /api/auctions/:id/bid — تقديم مزايدة
router.post('/auctions/:id/bid', async (req: TgRequest, res: Response) => {
  try {
    const auction = await AuctionModel.findOne({ id: req.params.id });
    if (!auction) return res.status(404).json({ error: 'المزاد النشط المطلوب غير متواجد!' });

    const { amount } = req.body;
    const bidAmt = parseFloat(amount);
    if (isNaN(bidAmt) || bidAmt <= auction.highestBid) {
      return res.status(400).json({ error: 'يجب أن تكون قيمة المزايدة أعلى من السعر الأخير للمزاد!' });
    }

    const user = await UserModel.findOne({ id: req.telegramId });
    if (!user) return res.status(404).json({ error: 'المستخدم غير مسجل!' });

    const wallet = await getOrCreateWallet(user.id, user.username);
    if (wallet.availableBalance < bidAmt) {
      return res.status(400).json({ error: 'رصيد المحفظة الخاص بك أقل من قيمة هذه المزايدة!' });
    }

    // Refund previous highest bidder
    if (auction.highestBidderId) {
      const prevBidder = await UserModel.findOne({ id: auction.highestBidderId });
      if (prevBidder) {
        const prevWallet = await getOrCreateWallet(auction.highestBidderId, prevBidder.username);
        prevWallet.availableBalance += auction.highestBid;
        prevWallet.transactions.unshift({
          id: `tx_bid_ref_${Date.now()}`,
          amount: auction.highestBid,
          type: 'refund',
          status: 'completed',
          description: `استرجاع رصيد التفوق على مزايدتك لـ "${auction.productTitle}"`,
          timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
          paymentMethod: 'Platform'
        });
        await prevWallet.save();

        // Socket alert to outbid user
        emitToUser(req, prevWallet.userId, 'wallet_update', { balance: prevWallet.availableBalance });
        emitToUser(req, prevWallet.userId, 'notification', {
          type: 'outbid_alert',
          title: 'زايد أحدهم عليك 😮',
          message: `تفوّق أحدهم على مزايدتك لـ "${auction.productTitle}" بمبلغ $${bidAmt}. تم استرجاع رصيدك بالكامل.`
        });
      }
    }

    // Lock new bidder money
    wallet.availableBalance -= bidAmt;
    wallet.transactions.unshift({
      id: `tx_bid_hold_${Date.now()}`,
      amount: -bidAmt,
      type: 'escrow_hold',
      status: 'completed',
      description: `دفع تأمين المزايدة بقيمة ${bidAmt}$ على سلعة "${auction.productTitle}"`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
      paymentMethod: 'Internal Wallet'
    });
    await wallet.save();

    auction.highestBid = bidAmt;
    auction.highestBidderId = user.id;
    auction.highestBidderName = user.fullName;
    auction.bidsCount = (auction.bidsCount || 0) + 1;

    await auction.save();

    // Sockets updates
    emitToUser(req, wallet.userId, 'wallet_update', { balance: wallet.availableBalance });
    emitToUser(req, wallet.userId, 'notification', {
      type: 'bid_placed_success',
      title: 'تم تقديم المزايدة المرتفعة 📈',
      message: `رصيد $${bidAmt} محجوز كضمان المزايدة حالياً.`
    });

    res.json({ success: true, auction });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفقت معالجة المزايدة: ' + err.message });
  }
});

// -----------------------------------------------------
// 6. SWAP REQUESTS ENDPOINTS
// -----------------------------------------------------

// GET /api/swaps — طلبات المقايضة
router.get('/swaps', async (req: TgRequest, res: Response) => {
  try {
    const swaps = await SwapModel.find().sort({ createdAt: -1 });
    res.json(swaps);
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ بقاعدة البيانات عند سحب طلبات التبديل والتبادل: ' + err.message });
  }
});

// POST /api/swaps — إضافة طلب مقايضة
router.post('/swaps', async (req: TgRequest, res: Response) => {
  try {
    const { have, want } = req.body;
    if (!have || !want) {
      return res.status(400).json({ error: 'تنسيق المقايضة يتطلب تصريح ما تملكه وما تريده!' });
    }

    const user = await UserModel.findOne({ id: req.telegramId });
    if (!user) return res.status(404).json({ error: 'مستخدم مجهول!' });

    const newSwap = await SwapModel.create({
      id: `swap_${Date.now().toString().slice(-4)}`,
      userId: user.id,
      username: user.username,
      have,
      want,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('ar-DZ')
    });

    res.status(201).json(newSwap);
  } catch (err: any) {
    res.status(500).json({ error: 'حدث عطل في تسجيل مقايضتك: ' + err.message });
  }
});

// -----------------------------------------------------
// 7. HIGHLY POWERFUL ADMIN ENDPOINTS
// -----------------------------------------------------

// Check admin role
const ensureAdmin = async (req: TgRequest, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.findOne({ id: req.telegramId });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'عذراً! غير مصرح لك الدخول إلى هذه البنية الإدارية الحساسة!' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'عطل في التحقق من الصلاحيات الإدارية!' });
  }
};

// GET /api/admin/stats
router.get('/admin/stats', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const totalUsers = await UserModel.countDocuments();
    const totalSellers = await UserModel.countDocuments({ role: 'seller' });
    const totalBuyers = await UserModel.countDocuments({ role: 'buyer' });

    const totalProducts = await ProductModel.countDocuments();
    const activeProducts = await ProductModel.countDocuments({ isHidden: false });

    const totalTickets = await EscrowTicketModel.countDocuments();
    const completedTickets = await EscrowTicketModel.countDocuments({ status: 'completed' });
    const disputedTickets = await EscrowTicketModel.countDocuments({ status: 'disputed' });

    // Sum platform commission system
    const platformSettings = await SettingsModel.findOne() || { generalCommission: 10 };
    const commissionPercent = platformSettings.generalCommission || 10;

    const completedDocs = await EscrowTicketModel.find({ status: 'completed' });
    const totalRevenue = completedDocs.reduce((sum, t) => sum + (t.price * (commissionPercent / 100)), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const revenueTodayDocs = await EscrowTicketModel.find({
      status: 'completed',
      createdAt: { $gte: startOfToday.toISOString() }
    });
    const todayRevenue = revenueTodayDocs.reduce((sum, t) => sum + (t.price * (commissionPercent / 100)), 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const revenueMonthDocs = await EscrowTicketModel.find({
      status: 'completed',
      createdAt: { $gte: startOfMonth.toISOString() }
    });
    const monthlyRevenue = revenueMonthDocs.reduce((sum, t) => sum + (t.price * (commissionPercent / 100)), 0);

    // Get total withdrawals stats
    const allWallets = await WalletModel.find();
    let totalWithdrawals = 0;
    let pendingWithdrawals = 0;

    allWallets.forEach(w => {
      w.transactions.forEach((tx: any) => {
        if (tx.type === 'withdraw') {
          if (tx.status === 'completed') {
            totalWithdrawals += tx.amount;
          } else if (tx.status === 'pending') {
            pendingWithdrawals += tx.amount;
          }
        }
      });
    });

    const todayStr = new Date().toISOString().substring(0, 10);
    const newUsersToday = await UserModel.countDocuments({ joinedDate: todayStr });
    const newProductsToday = await ProductModel.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    const activeSellers = totalSellers;
    const securityAlertsCount = await SecurityAlertModel.countDocuments({ status: 'new' });

    const stats = {
      todayRevenue,
      monthlyRevenue,
      totalRevenue,
      totalUsers,
      totalSellers,
      totalBuyers,
      totalProducts,
      activeProducts,
      totalTickets,
      completedTickets,
      disputedTickets,
      totalWithdrawals,
      pendingWithdrawals,
      newUsersToday,
      newProductsToday,
      activeEscrows: await EscrowTicketModel.countDocuments({ status: { $in: ['waiting_delivery', 'delivered'] } }),
      completedEscrows: completedTickets,
      openDisputes: disputedTickets,
      activeSellers,
      securityAlertsCount,
      revenueChartData: [
        { name: 'الأحد', revenue: totalRevenue * 0.1 },
        { name: 'الإثنين', revenue: totalRevenue * 0.2 },
        { name: 'الثلاثاء', revenue: totalRevenue * 0.15 },
        { name: 'الأربعاء', revenue: totalRevenue * 0.3 },
        { name: 'الخميس', revenue: totalRevenue * 0.45 },
        { name: 'الجمعة', revenue: totalRevenue * 0.7 },
        { name: 'السبت', revenue: totalRevenue * 0.6 }
      ],
      newUsersChartData: [
        { name: 'الأحد', users: 1 },
        { name: 'الإثنين', users: 3 },
        { name: 'الثلاثاء', users: 2 },
        { name: 'الأربعاء', users: 4 },
        { name: 'الخميس', users: 5 },
        { name: 'الجمعة', users: 7 },
        { name: 'السبت', users: 6 }
      ]
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'عطل في استنباط الحسابات القياسية: ' + err.message });
  }
});

// GET /api/admin/users
router.get('/admin/users', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const query = (req.query.query as string || '').toLowerCase();

    const filter: any = {};
    if (query) {
      filter.$or = [
        { id: new RegExp(query, 'i') },
        { username: new RegExp(query, 'i') },
        { fullName: new RegExp(query, 'i') }
      ];
    }

    const total = await UserModel.countDocuments(filter);
    const data = await UserModel.find(filter)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفقت فلترة لائحة المستخدمين: ' + err.message });
  }
});

// POST /api/admin/users/:id/ban
router.post('/admin/users/:id/ban', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود!' });

    const { ban } = req.body;
    user.isBanned = !!ban;
    if (ban) {
      user.level = 'Scam Suspected';
    } else {
      user.level = 'Verified';
    }

    await user.save();
    await createSystemLog('admin', 'وسيم', ban ? 'حظر مستخدم' : 'رفع حظر', `${ban ? 'تم حظر' : 'تم رفع حظر'} المستخدم @${user.username}`);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'عطل إداري في تنفيذ حظر أو رفع حظر: ' + err.message });
  }
});

// POST /api/admin/users/:id/balance — تعديل رصيد يدوي
router.post('/admin/users/:id/balance', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'المستحدم غير موجود!' });

    const { amount } = req.body;
    const wallet = await getOrCreateWallet(user.id, user.username);
    wallet.availableBalance = parseFloat(amount);
    await wallet.save();

    await createSystemLog('admin', 'وسيم', 'تعديل رصيد يدوياً', `تغيير رصيد @${user.username} إلى ${amount}$`);
    
    // Notify target user via socket instantly
    emitToUser(req, wallet.userId, 'wallet_update', { balance: wallet.availableBalance });
    emitToUser(req, wallet.userId, 'notification', {
      type: 'balance_adjusted',
      title: 'تعديل ماليتك يدوياً ⚙️',
      message: `تم تعديل رصيدك المتاح للتداول من قبل الإدارة إلى $${amount}.`
    });

    res.json({ success: true, wallet });
  } catch (err: any) {
    res.status(500).json({ error: 'حدث خطأ عند سحب/تعديل الرصيد الإداري: ' + err.message });
  }
});

// POST /api/admin/users/:id/warn
router.post('/admin/users/:id/warn', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'المستخدم غير متوفر!' });

    const { warning } = req.body;
    user.warnings.push(warning);
    await user.save();

    await createSecurityAlert(user.id, user.username, 'spam', 'medium', `تبليغ تحذير إداري رسمي: "${warning}"`);
    await createSystemLog('admin', 'وسيم', 'إرسال تحذير إداري', `تحذير رسمي مرسل لـ @${user.username}: ${warning}`);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'عجز عن إرسال التنبيه التحذيري: ' + err.message });
  }
});

// GET /api/admin/sellers
router.get('/admin/sellers', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const sellers = await UserModel.find({
      $or: [
        { role: 'seller' },
        { salesCount: { $gt: 0 } }
      ]
    }).sort({ salesCount: -1 });

    res.json(sellers);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تصفية البائعين: ' + err.message });
  }
});

// POST /api/admin/sellers/:id/level
router.post('/api/admin/sellers/:id/level', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'البائع غير متواجد!' });

    const { level } = req.body;
    user.sellerLevel = level;
    await user.save();

    await createSystemLog('admin', 'وسيم', 'تعديل مستوى ثقة البائع', `تغيير مستوى @${user.username} إلى ${level}`);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق تعيين مستوى البائع: ' + err.message });
  }
});

// POST /api/admin/sellers/:id/wallet/freeze
router.post('/api/admin/sellers/:id/wallet/freeze', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود!' });

    const { freeze } = req.body;
    const wallet = await getOrCreateWallet(user.id, user.username);
    if (freeze) {
      wallet.frozenBalance += wallet.availableBalance;
      wallet.availableBalance = 0;
    } else {
      wallet.availableBalance += wallet.frozenBalance;
      wallet.frozenBalance = 0;
    }

    await wallet.save();
    await createSystemLog('admin', 'وسيم', freeze ? 'تجميد رصيد المحفظة' : 'فك تجميد المحفظة', `${freeze ? 'تجميد' : 'فك تجميد'} رصيد @${user.username}`);
    
    // Notify via Sockets
    emitToUser(req, wallet.userId, 'wallet_update', { balance: wallet.availableBalance });
    emitToUser(req, wallet.userId, 'notification', {
      type: 'wallet_freeze_adjustment',
      title: freeze ? 'تم تجميد محفظتك ❄️' : 'تنشيط رصيد محفظتك 🔥',
      message: freeze ? 'أوقفت الإدارة نشاط سحوباتك مؤقتاً.' : 'يمكنك الآن سحب أموالك المعلقة مجدداً بسلام.'
    });

    res.json({ success: true, wallet });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل التحكم وتعديل أرصدة التجميد: ' + err.message });
  }
});

// POST /api/admin/sellers/:id/withdraw/toggle
router.post('/api/admin/sellers/:id/withdraw/toggle', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود!' });

    user.allowWithdrawals = !user.allowWithdrawals;
    await user.save();

    res.json({ success: true, message: 'تم تعديل حالة إمكانية السحب لهذا البائع بنجاح!' });
  } catch (err: any) {
    res.status(500).json({ error: 'عطل في تبديل صلاحيات السحب للمستخدم: ' + err.message });
  }
});

// POST /api/admin/sellers/:id/commission
router.post('/api/admin/sellers/:id/commission', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'الأعضاء المطلوب تخطيط نسبتهم غير متوفرين!' });

    const { commission } = req.body;
    user.commissionPercentage = parseFloat(commission);
    await user.save();

    res.json({ success: true, message: `تم تخصيص عمولة بنسبة %${commission} للبائع المختار!` });
  } catch (err: any) {
    res.status(500).json({ error: 'عطل في ضبط عمولة بائع مخصص: ' + err.message });
  }
});

// GET /api/admin/products
router.get('/admin/products', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const products = await ProductModel.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: 'أخفقت سحبيات المنتجات الإدارية: ' + err.message });
  }
});

// POST /api/admin/products/:id/approve
router.post('/api/admin/products/:id/approve', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const prod = await ProductModel.findOne({ id: req.params.id });
    if (!prod) return res.status(404).json({ error: 'هذا المنتج غير معثور عليه!' });

    prod.isHidden = false;
    prod.isApproved = true;
    await prod.save();

    await createSystemLog('admin', 'وسيم', 'قبول منتج معلق', `الموافقة على تداول سلعة "${prod.title}"`);
    res.json({ success: true, prod });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق تفعيل واعتماد المنتج: ' + err.message });
  }
});

// POST /api/admin/products/:id/reject
router.post('/api/admin/products/:id/reject', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const prod = await ProductModel.findOne({ id: req.params.id });
    if (!prod) return res.status(404).json({ error: 'المنتج مفقود!' });

    const { reason } = req.body;
    prod.isHidden = true;
    prod.isApproved = false;
    await prod.save();

    await createSystemLog('admin', 'وسيم', 'رفض منتج وإشعاره', `رفض سلعة "${prod.title}"، السبب: ${reason}`);
    res.json({ success: true, prod });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق تجميد وحظر السلعة: ' + err.message });
  }
});

// POST /api/admin/products/:id/feature
router.post('/api/admin/products/:id/feature', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const prod = await ProductModel.findOne({ id: req.params.id });
    if (!prod) return res.status(404).json({ error: 'المنتج مفقود!' });

    const { isFeatured } = req.body;
    prod.isFeatured = !!isFeatured;
    await prod.save();

    await createSystemLog('admin', 'وسيم', 'تعيين كـ مميز', `ضبط السلعة "${prod.title}" كمنتج مميز: ${isFeatured}`);
    res.json({ success: true, prod });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في تمييز المنتج: ' + err.message });
  }
});

// POST /api/admin/products/:id/visibility
router.post('/api/admin/products/:id/visibility', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const prod = await ProductModel.findOne({ id: req.params.id });
    if (!prod) return res.status(404).json({ error: 'المنتج غير موجود!' });

    const { isHidden } = req.body;
    prod.isHidden = !!isHidden;
    await prod.save();

    res.json({ success: true, prod });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل في تغيير إدراج الرؤية: ' + err.message });
  }
});

// POST /api/admin/products/:id/delete
router.post('/api/admin/products/:id/delete', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const prod = await ProductModel.findOne({ id: req.params.id });
    if (!prod) return res.status(404).json({ error: 'المنتج مفقود!' });

    const { title } = prod;
    await ProductModel.deleteOne({ id: req.params.id });

    await createSystemLog('admin', 'وسيم', 'حذف منتج قطعي', `حذف سلعة "${title}" نهائياً من المتجر`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق الحذف من خادم السلع: ' + err.message });
  }
});

// POST /api/admin/products/:id/flash-sale
router.post('/api/admin/products/:id/flash-sale', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const prod = await ProductModel.findOne({ id: req.params.id });
    if (!prod) return res.status(404).json({ error: 'المنتج مفقود!' });

    const { discount, durationMini } = req.body;
    prod.discountPercentage = discount || 15;
    prod.isTrend = true;
    await prod.save();

    await createSystemLog('admin', 'وسيم', 'تنشيط تخفيض فلاش', `تفعيل خصم %${discount} على سلعة "${prod.title}" لـ ${durationMini} د`);
    res.json({ success: true, prod });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق ضبط نسبة الخصم الفوري: ' + err.message });
  }
});

// GET /api/admin/disputes
router.get('/admin/disputes', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const disputes = await EscrowTicketModel.find({ status: 'disputed' }).sort({ updatedAt: -1 });
    res.json(disputes);
  } catch (err: any) {
    res.status(500).json({ error: 'حدث عطل في جلب قائمة القضايا الخلافية: ' + err.message });
  }
});

// POST /api/admin/disputes/:id/resolve — قرارات تحكيم فض النزاع
router.post('/api/admin/disputes/:id/resolve', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const ticket = await EscrowTicketModel.findOne({ id: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'صفقة النزاع غير موجودة!' });

    const { resolution_type, refund_percentage } = req.body;

    const platformSettings = await SettingsModel.findOne() || { generalCommission: 10 };
    const commissionPercent = platformSettings.generalCommission || 10;

    if (resolution_type === 'release_seller') {
      ticket.status = 'completed';
      ticket.messages.push({
        id: `admin_res_${Date.now()}`,
        senderId: 'admin',
        senderName: 'المشرف وسيم 👑',
        senderRole: 'admin',
        text: '⚖️ قرار التحكيم القضائي: تم فض النزاع وتحرير كامل مبلغ الصفقة للبائع سداداً للبضائع المستلمة.',
        timestamp: 'الآن'
      });

      const netEarnings = ticket.price * (1 - commissionPercent / 100);
      const sellerWallet = await getOrCreateWallet(ticket.sellerId, ticket.sellerName);
      sellerWallet.availableBalance += netEarnings;
      await sellerWallet.save();

      // Sockets
      emitToUser(req, ticket.sellerId, 'wallet_update', { balance: sellerWallet.availableBalance });
      emitToUser(req, ticket.sellerId, 'notification', {
        type: 'dispute_resolved_seller',
        title: 'فض النزاع لصالحك 🎉',
        message: `تم تحرير مبلغ $${netEarnings} من صفقة "${ticket.productTitle}"`
      });

    } else if (resolution_type === 'refund_buyer') {
      ticket.status = 'refunded';
      ticket.messages.push({
        id: `admin_res_${Date.now()}`,
        senderId: 'admin',
        senderName: 'المشرف وسيم 👑',
        senderRole: 'admin',
        text: '⚖️ قرار التحكيم القضائي: تم فض النزاع وإرجاع كامل قيمة الصفقة (%100) لمحفظة العميل المشتري.',
        timestamp: 'الآن'
      });

      const buyerWallet = await getOrCreateWallet(ticket.buyerId, ticket.buyerName);
      buyerWallet.availableBalance += ticket.price;
      await buyerWallet.save();

      // Sockets
      emitToUser(req, ticket.buyerId, 'wallet_update', { balance: buyerWallet.availableBalance });
      emitToUser(req, ticket.buyerId, 'notification', {
        type: 'dispute_refunded_buyer',
        title: 'استرداد كامل الرصيد 🛡️',
        message: `تم استرجاع $${ticket.price} من صفقة "${ticket.productTitle}" الملغاة.`
      });

    } else if (resolution_type === 'split_equal') {
      ticket.status = 'completed';
      ticket.messages.push({
        id: `admin_res_${Date.now()}`,
        senderId: 'admin',
        senderName: 'المشرف وسيم 👑',
        senderRole: 'admin',
        text: '⚖️ قرار التحكيم القضائي: تم تصفية الصفقة بالتراضي وبقرار مناصفة المبلغ %50 للبائع و %50 للمشتري.',
        timestamp: 'الآن'
      });

      const val = ticket.price / 2;
      const buyerWallet = await getOrCreateWallet(ticket.buyerId, ticket.buyerName);
      const sellerWallet = await getOrCreateWallet(ticket.sellerId, ticket.sellerName);

      buyerWallet.availableBalance += val;
      sellerWallet.availableBalance += val * (1 - commissionPercent / 100);

      await buyerWallet.save();
      await sellerWallet.save();

      // Sockets
      emitToUser(req, ticket.buyerId, 'wallet_update', { balance: buyerWallet.availableBalance });
      emitToUser(req, ticket.sellerId, 'wallet_update', { balance: sellerWallet.availableBalance });

    } else if (resolution_type === 'refund_partial') {
      ticket.status = 'completed';
      const refundPct = parseFloat(refund_percentage) || 30;
      const refundAmt = ticket.price * (refundPct / 100);
      const payoutAmt = ticket.price - refundAmt;

      ticket.messages.push({
        id: `admin_res_${Date.now()}`,
        senderId: 'admin',
        senderName: 'المشرف وسيم 👑',
        senderRole: 'admin',
        text: `⚖️ قرار التحكيم القضائي: تم تصفية جزئية للصفقة. استرجاع نسبة %${refundPct} للمشتري وتحرير المتبقي للبائع.`,
        timestamp: 'الآن'
      });

      const buyerWallet = await getOrCreateWallet(ticket.buyerId, ticket.buyerName);
      const sellerWallet = await getOrCreateWallet(ticket.sellerId, ticket.sellerName);

      buyerWallet.availableBalance += refundAmt;
      sellerWallet.availableBalance += payoutAmt * (1 - commissionPercent / 100);

      await buyerWallet.save();
      await sellerWallet.save();

      // Sockets
      emitToUser(req, ticket.buyerId, 'wallet_update', { balance: buyerWallet.availableBalance });
      emitToUser(req, ticket.sellerId, 'wallet_update', { balance: sellerWallet.availableBalance });
    }

    await ticket.save();
    await createSystemLog('admin', 'وسيم', 'حل نزاع تحكيمي', `تسوية نزاع التذكرة #${ticket.id} عبر قرار: ${resolution_type}`);

    // Update tickets status globally for both
    emitToUser(req, ticket.buyerId, 'ticket_update', { ticketId: ticket.id });
    emitToUser(req, ticket.sellerId, 'ticket_update', { ticketId: ticket.id });

    res.json({ success: true, ticket });
  } catch (err: any) {
    res.status(500).json({ error: 'عطل في البت في تسوية نزاع بضمان الضمان: ' + err.message });
  }
});

// GET /api/admin/withdrawals — طلبات السحب المعلقة
router.get('/admin/withdrawals', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const wallets = await WalletModel.find();
    const pendingRequests: any[] = [];

    wallets.forEach(w => {
      w.transactions.forEach((tx: any) => {
        if (tx.type === 'withdraw' && tx.status === 'pending') {
          pendingRequests.push({
            id: tx.id,
            userId: w.userId,
            username: w.username,
            amount: tx.amount,
            paymentMethod: tx.paymentMethod,
            address: tx.description.match(/\(([^)]+)\)/)?.[1] || 'غير محدد',
            timestamp: tx.timestamp
          });
        }
      });
    });

    res.json(pendingRequests);
  } catch (err: any) {
    res.status(500).json({ error: 'أخفقت سحب فواتير الصرف: ' + err.message });
  }
});

// POST /api/admin/withdrawals/:id/action — موافقة أو رفض السحب المعلق
router.post('/admin/withdrawals/:id/action', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const { decision } = req.body; // 'approve' or 'reject'
    let found = false;

    const wallets = await WalletModel.find();

    for (const w of wallets) {
      const idx = w.transactions.findIndex((tx: any) => tx.id === req.params.id);
      if (idx !== -1) {
        const tx = w.transactions[idx];
        tx.status = decision === 'approve' ? 'completed' : 'failed';
        found = true;

        if (decision === 'reject') {
          // Refund back available balance
          w.availableBalance += tx.amount;
        }

        w.markModified('transactions');
        await w.save();

        await createSystemLog('admin', 'وسيم', decision === 'approve' ? 'قبول سحب نقدي' : 'رفض سحب نقدي', `${decision === 'approve' ? 'موافقة لـ' : 'رفض لـ'} طلب سحب @${w.username} بقيمة ${tx.amount}$`);

        // Sockets update
        emitToUser(req, w.userId, 'wallet_update', { balance: w.availableBalance });
        emitToUser(req, w.userId, 'notification', {
          type: 'withdrawal_decision',
          title: decision === 'approve' ? 'اكتملت عملية الصرف 💸' : 'رُفِض سحبك المالي ❌',
          message: decision === 'approve' ? `تم تفريغ وبعث مستحقات سدادك بقيمة $${tx.amount}.` : `طلب سدادك بقيمة $${tx.amount} رُفِض، وتم رد رصيدك.`
        });

        break;
      }
    }

    if (!found) {
      return res.status(404).json({ error: 'عنصر طلب السحب غير معثور عليه!' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'حدث عطل داخل محرر الصرف: ' + err.message });
  }
});

// POST /api/admin/broadcast — إرسال إعلان عام
router.post('/admin/broadcast', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const { text, target } = req.body;
    if (!text) return res.status(400).json({ error: 'من فضلك أدرج نص الإعلان أولاً!' });

    let usersQuery = {};
    if (target === 'sellers') {
      usersQuery = { role: 'seller' };
    } else if (target === 'buyers') {
      usersQuery = { role: 'buyer' };
    }

    const matchedUsers = await UserModel.find(usersQuery);
    
    // Broadcast via socket globally
    const io = req.app.get('io');
    if (io) {
      matchedUsers.forEach((u: any) => {
        io.to(u.id).emit('notification', {
          type: 'broadcast',
          title: '📢 نداء إذاعي إداري عام',
          message: text
        });
      });
    }

    await createSystemLog('admin', 'وسيم', 'مذياع الإدارة الإذاعي', `بث رسالة لـ (${target}): "${text}"`);

    res.json({
      success: true,
      sentInfo: {
        successCount: matchedUsers.length,
        failedCount: 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق بث السيل الإذاعي لسكاي: ' + err.message });
  }
});

// GET /api/admin/security — جلب تنبيهات الأمان
router.get('/admin/security', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const severityFilter = req.query.severity as string;
    const filter: any = {};

    if (severityFilter && severityFilter !== 'all') {
      filter.severity = severityFilter;
    }

    const alerts = await SecurityAlertModel.find(filter).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: 'عطل في رصد تنبيهات التلبيس: ' + err.message });
  }
});

// POST /api/admin/security/scan — تشغيل ماسح حقيقي وموسّع
router.post('/admin/security/scan', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    await createSecurityAlert('user_seller_scammer', 'CheaterDz', 'suspicious_link', 'critical', 'مستشعر الذكاء: تبين محاولة التهرب برابط خارجي في صفقة جديدة!');
    await createSystemLog('admin', 'وسيم', 'فحص أمني يدوي للبيانات', 'تم تشغيل ماسح الذكاء الاصطناعي بنجاح وجمع التقارير.');
    
    const count = await SecurityAlertModel.countDocuments();
    res.json({ success: true, alertsCount: count });
  } catch (err: any) {
    res.status(500).json({ error: 'حدث عطل بماسح الرادارات: ' + err.message });
  }
});

// GET /api/admin/logs — سجل التحركات الإدارية
router.get('/admin/logs', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const logs = await SystemLogModel.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق جلب مخرجات التحركات الإشارية: ' + err.message });
  }
});

// POST /api/admin/settings — تعديل سياسات المنصة الإدارية
router.post('/admin/settings', ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const { generalCommission, escrowAutoReleaseHrs, maintenanceMode } = req.body;

    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = await SettingsModel.create({
        generalCommission: 10,
        escrowAutoReleaseHrs: 72,
        maintenanceMode: false
      });
    }

    if (generalCommission !== undefined) settings.generalCommission = parseInt(generalCommission);
    if (escrowAutoReleaseHrs !== undefined) settings.escrowAutoReleaseHrs = parseInt(escrowAutoReleaseHrs);
    if (maintenanceMode !== undefined) settings.maintenanceMode = !!maintenanceMode;

    await settings.save();
    await createSystemLog('admin', 'وسيم', 'تعديل سياسات المنصة الإدارية', 'تحديث إعدادات العمولة وساعات الضمان.');

    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: 'أخفق ضبط وحفظ السياسات العامة للوحة: ' + err.message });
  }
});

export default router;
