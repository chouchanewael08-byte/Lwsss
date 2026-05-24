// ── src/routes/modules/admin.ts ──────────────────────────────
import { Router, Response } from 'express';
import { validateTelegramInitData, loadUser, ensureAdmin, ensureOwner, TgRequest } from '../../middleware/auth.js';
import { User, Product, AccountProduct, Ticket, Wallet, Settings, SystemLog, Review, SellerSubscription, Transaction } from '../../models/index.js';
import { addSystemLog, getSetting, setSetting, invalidateSettingsCache, emitToUser } from '../../lib/helpers.js';
import { getBot } from '../../lib/botSingleton.js';
import { validate, banSchema, roleSchema, adjustSchema } from '../../lib/validation.js';

const router = Router();
const auth  = [validateTelegramInitData, loadUser];
const admin = [...auth, ensureAdmin];
const owner = [...auth, ensureOwner];

// ─── Stats ────────────────────────────────────────────────────
router.get('/stats', ...admin, async (req: TgRequest, res: Response) => {
  const [totalUsers, newUsers24h, pendingMarket, pendingAccounts, activeTickets, disputedTickets, revenue] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now()-86400000) } }),
    Product.countDocuments({ isApproved: false, isHidden: false }),
    AccountProduct.countDocuments({ isApproved: false, isHidden: false }),
    Ticket.countDocuments({ status: { $in: ['payment_confirmed','partial_revealed','full_revealed'] } }),
    Ticket.countDocuments({ status: 'disputed' }),
    Ticket.aggregate([{ $match: { status: { $in: ['completed','auto_completed'] } } },
                      { $group: { _id: null, total: { $sum: '$commission' } } }]),
  ]);
  res.json({ users: { total: totalUsers, new24h: newUsers24h }, products: { pendingMarket, pendingAccounts }, tickets: { active: activeTickets, disputed: disputedTickets }, revenue: { totalCommission: revenue[0]?.total || 0 } });
});

// ─── Users ────────────────────────────────────────────────────
router.get('/users', ...admin, async (req: TgRequest, res: Response) => {
  const page   = Math.max(1, +((req.query.page as string)||1));
  const limit  = Math.min(50, +((req.query.limit as string)||20));
  const search = req.query.search as string;
  const filter = search ? { $or: [{ username: { $regex: search, $options: 'i' } }, { telegramId: search }] } : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, pages: Math.ceil(total/limit) });
});

router.patch('/users/:id/ban', ...admin, validate(banSchema), async (req: TgRequest, res: Response) => {
  const user = await User.findOneAndUpdate(
    { telegramId: req.params.id, role: { $nin: ['admin','owner'] } },
    { isBanned: true, banReason: req.body.reason },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'غير موجود أو لا يمكن حظره' });
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'BAN_USER', `${req.params.id}: ${req.body.reason}`);
  res.json({ success: true });
});

router.patch('/users/:id/unban', ...admin, async (req: TgRequest, res: Response) => {
  await User.findOneAndUpdate({ telegramId: req.params.id }, { isBanned: false, banReason: '' });
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'UNBAN_USER', req.params.id);
  res.json({ success: true });
});

router.patch('/users/:id/role', ...owner, validate(roleSchema), async (req: TgRequest, res: Response) => {
  await User.findOneAndUpdate({ telegramId: req.params.id, role: { $nin: ['owner'] } }, { role: req.body.role });
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'CHANGE_ROLE', `${req.params.id} → ${req.body.role}`);
  res.json({ success: true });
});

// ─── Balance Adjust ───────────────────────────────────────────
router.post('/users/:id/adjust-balance', ...admin, validate(adjustSchema), async (req: TgRequest, res: Response) => {
  const { amount, currency, description, type = 'admin_adjust' } = req.body;
  const userId = req.params.id;
  const field = currency === 'stars' ? 'stars' : 'crystals';
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { [field]: amount } },
    { new: true, runValidators: true }
  );
  if (!wallet) return res.status(404).json({ error: 'المحفظة غير موجودة' });
  await Transaction.create({ userId, type, amount: Math.abs(amount), currency, status: 'completed', description });
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'ADJUST_BALANCE', `${userId}: ${amount > 0 ? '+' : ''}${amount} ${currency} — ${description}`);
  emitToUser(`user:${userId}`, 'balance_adjusted', { amount, currency });
  res.json({ success: true, newBalance: wallet[field] });
});

// ─── Products ─────────────────────────────────────────────────
router.get('/products/pending', ...admin, async (req: TgRequest, res: Response) => {
  const [market, accounts] = await Promise.all([
    Product.find({ isApproved: false, isHidden: false }).sort({ createdAt: 1 }).limit(50).select('-credentialsEncrypted'),
    AccountProduct.find({ isApproved: false, isHidden: false }).sort({ createdAt: 1 }).limit(50).select('-credentialsEncrypted'),
  ]);
  res.json({ market, accounts });
});

router.patch('/products/:id/approve', ...admin, async (req: TgRequest, res: Response) => {
  const Model = req.query.type === 'accounts' ? AccountProduct : Product;
  const product = await Model.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  if (!product) return res.status(404).json({ error: 'غير موجود' });
  emitToUser(`user:${product.sellerId}`, 'product_approved', { productId: product._id, productTitle: product.title });
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'APPROVE_PRODUCT', product.title);
  res.json({ success: true });
});

router.patch('/products/:id/reject', ...admin, async (req: TgRequest, res: Response) => {
  const Model = req.body.type === 'accounts' ? AccountProduct : Product;
  const product = await Model.findByIdAndUpdate(req.params.id, { isHidden: true }, { new: true });
  if (!product) return res.status(404).json({ error: 'غير موجود' });
  emitToUser(`user:${product.sellerId}`, 'product_rejected', { productId: product._id, reason: req.body.reason||'' });
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'REJECT_PRODUCT', `${product.title}: ${req.body.reason||''}`);
  res.json({ success: true });
});

router.post('/products/:id/feature', ...admin, async (req: TgRequest, res: Response) => {
  const Model = req.body.type === 'accounts' ? AccountProduct : Product;
  const days  = Math.min(30, Math.max(1, +req.body.days || 7));
  const featuredUntil = new Date(Date.now() + days*24*60*60*1000);
  const product = await Model.findByIdAndUpdate(req.params.id, { isFeatured: true, featuredUntil }, { new: true });
  if (!product) return res.status(404).json({ error: 'غير موجود' });
  emitToUser(`user:${product.sellerId}`, 'product_featured', { productTitle: product.title, days });
  res.json({ success: true, featuredUntil });
});

// ─── Subscriptions ────────────────────────────────────────────
const PLANS: Record<string, { price: number; commission: number; durationDays: number }> = {
  standard: { price: 0,  commission: 7, durationDays: 36500 },
  silver:   { price: 3,  commission: 5, durationDays: 30 },
  gold:     { price: 10, commission: 3, durationDays: 30 },
  vip:      { price: 25, commission: 1, durationDays: 30 },
};

router.post('/subscriptions/activate', ...admin, async (req: TgRequest, res: Response) => {
  const { userId, plan, paymentRef } = req.body;
  const p = PLANS[plan];
  if (!p) return res.status(400).json({ error: 'خطة غير صحيحة' });
  const expiresAt = new Date(Date.now() + p.durationDays*24*60*60*1000);
  await SellerSubscription.findOneAndUpdate(
    { userId }, { plan, priceUSD: p.price, commission: p.commission, startedAt: new Date(), expiresAt, isActive: true, paymentRef },
    { upsert: true }
  );
  await User.findOneAndUpdate({ telegramId: userId }, { sellerLevel: plan.charAt(0).toUpperCase()+plan.slice(1) });
  emitToUser(`user:${userId}`, 'subscription_activated', { plan, expiresAt });
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'ACTIVATE_SUB', `${userId} → ${plan}`);
  res.json({ success: true });
});

// ─── Broadcast ────────────────────────────────────────────────
router.post('/broadcast', ...admin, async (req: TgRequest, res: Response) => {
  const { message, targetRole, image } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'الرسالة فارغة' });
  if (message.length > 4096) return res.status(400).json({ error: 'الرسالة طويلة جداً (max 4096)' });

  const filter = targetRole && targetRole !== 'all'
    ? { role: targetRole, isBanned: false } : { isBanned: false };
  const users = await User.find(filter).select('telegramId').lean();

  res.json({ success: true, total: users.length, message: `📢 بدأ الإرسال لـ ${users.length} مستخدم` });

  // ✅ Throttle: 25 رسالة/ثانية لتجنب حظر تيليغرام
  const bot = getBot();
  let sent = 0, failed = 0;
  const BATCH = 25;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(u =>
      image ? bot.sendPhoto(u.telegramId, image, { caption: message, parse_mode: 'Markdown' })
            : bot.sendMessage(u.telegramId, message, { parse_mode: 'Markdown' })
    ));
    results.forEach(r => r.status === 'fulfilled' ? sent++ : failed++);
    if (i + BATCH < users.length) await new Promise(r => setTimeout(r, 1000));
  }
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'BROADCAST',
    `${users.length} مستخدم — نجح: ${sent} فشل: ${failed}`);
});

// ─── Disputes ─────────────────────────────────────────────────
router.get('/disputes', ...admin, async (_req, res: Response) => {
  res.json(await Ticket.find({ status: 'disputed' }).sort({ disputeOpenedAt: 1 }).limit(50));
});

// ─── Settings ─────────────────────────────────────────────────
router.get('/settings', ...admin, async (_req, res: Response) => {
  const docs = await Settings.find({}).lean();
  const obj: Record<string,any> = {};
  docs.forEach(d => { obj[d.key] = d.value; });
  res.json(obj);
});

const ALLOWED_SETTINGS = ['crystalPriceUSD','commissionPercent','minWithdrawCrystals',
  'maxWithdrawCrystals','minDepositCrystals','maxDepositCrystals','marketOpen',
  'accountsStoreOpen','pointsStoreOpen','auctionsOpen','maintenanceMode',
  'autoApproveProducts','welcomeMessage','supportUsername','termsText',
  'ownerPaymentInfo','starsPaymentEnabled'];

router.put('/settings', ...admin, async (req: TgRequest, res: Response) => {
  const updated: string[] = [];
  for (const key of ALLOWED_SETTINGS) {
    if (key in req.body) { await setSetting(key, req.body[key]); updated.push(key); }
  }
  invalidateSettingsCache();
  await addSystemLog(req.dbUser.telegramId, req.dbUser.username, 'UPDATE_SETTINGS', updated.join(', '));
  res.json({ success: true, updated });
});


// ─── Pending Deposits ────────────────────────────────────────
router.get('/deposits/pending', ...admin, async (_req, res: Response) => {
  const txs = await Transaction.find({ type: 'deposit_request', status: 'pending' })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json(txs);
});
// ─── Logs ─────────────────────────────────────────────────────
router.get('/logs', ...admin, async (req: TgRequest, res: Response) => {
  const page  = Math.max(1, +((req.query.page as string)||1));
  const limit = Math.min(100, +((req.query.limit as string)||50));
  const [logs, total] = await Promise.all([
    SystemLog.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
    SystemLog.countDocuments(),
  ]);
  res.json({ logs, total, pages: Math.ceil(total/limit) });
});

export default router;
