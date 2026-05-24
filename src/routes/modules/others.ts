import { Router, Response } from 'express';
import { validateTelegramInitData, loadUser, ensureAdmin, TgRequest } from '../../middleware/auth.js';
import { PointsItem, User, Wallet, Coupon, Auction, Swap, Transaction } from '../../models/index.js';
import { upload, uploadToCloudinary } from '../../lib/upload.js';
import { decryptCredentials, encryptCredentials } from '../../lib/crypto.js';
import { bidLimit } from '../../lib/rateLimits.js';
import { getOrCreateWallet, getSetting, emitToUser, getCrystalPriceUSD, getCommissionPercent } from '../../lib/helpers.js';

const auth = [validateTelegramInitData, loadUser];

// ── POINTS STORE ──────────────────────────────────────────
export const pointsRouter = Router();

pointsRouter.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const open = await getSetting('pointsStoreOpen', true);
    if (!open) return res.json({ items: [], message: 'متجر النقاط مغلق' });
    const items = await PointsItem.find({ isActive: true, $or: [{ stock: -1 }, { stock: { $gt: 0 } }] }).select('-credentialsEncrypted').sort({ starsCost: 1 });
    res.json(items);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

pointsRouter.post('/:id/redeem', auth, async (req: TgRequest, res: Response) => {
  try {
    const item = await PointsItem.findOne({ _id: req.params.id, isActive: true, $or: [{ stock: -1 }, { stock: { $gt: 0 } }] });
    if (!item) return res.status(404).json({ error: 'المنتج غير متاح' });
    const updatedUser = await User.findOneAndUpdate(
      { telegramId: req.dbUser.telegramId, stars: { $gte: item.starsCost } },
      { $inc: { stars: -item.starsCost } }, { new: true });
    if (!updatedUser) return res.status(400).json({ error: `نجومك غير كافية. لديك ⭐${req.dbUser.stars} والمطلوب ⭐${item.starsCost}` });
    if (item.stock > 0) {
      const updated = await PointsItem.findOneAndUpdate({ _id: req.params.id, stock: { $gt: 0 } }, { $inc: { stock: -1, soldCount: 1 } }, { new: true });
      if (!updated) {
        await User.findOneAndUpdate({ telegramId: req.dbUser.telegramId }, { $inc: { stars: item.starsCost } });
        return res.status(400).json({ error: 'نفد المخزون للتو، تم إعادة نجومك' });
      }
    } else { await PointsItem.findByIdAndUpdate(req.params.id, { $inc: { soldCount: 1 } }); }
    const wallet = await getOrCreateWallet(req.dbUser.telegramId);
    await Wallet.findOneAndUpdate({ userId: req.dbUser.telegramId }, { $inc: { stars: -item.starsCost } });
    await Transaction.create({ userId: req.dbUser.telegramId, type: 'stars_spent', amount: item.starsCost, currency: 'stars', status: 'completed', description: `استبدال: ${item.title}` });
    const credentials = item.credentialsEncrypted ? decryptCredentials(item.credentialsEncrypted) : null;
    res.json({ success: true, credentials, message: `✅ تم استبدال ${item.title}!` });
  } catch (err) { console.error('[redeem]', err); res.status(500).json({ error: 'خطأ في الاستبدال' }); }
});

pointsRouter.post('/', auth, ensureAdmin, upload.array('images', 3), async (req: TgRequest, res: Response) => {
  try {
    const { title, description, category, starsCost, stock, credentials } = req.body;
    if (!title || !starsCost) return res.status(400).json({ error: 'عنوان والتكلفة مطلوبان' });
    const files  = req.files as Express.Multer.File[];
    const images = await Promise.all((files||[]).map(f => uploadToCloudinary(f.buffer, 'marketplace/points')));
    const credentialsEncrypted = credentials ? encryptCredentials(JSON.parse(credentials)) : '';
    const item = await PointsItem.create({ title, description, category, starsCost: +starsCost, stock: +stock||-1, images, credentialsEncrypted });
    res.json({ success: true, item: { ...item.toObject(), credentialsEncrypted: undefined } });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

pointsRouter.put('/:id', auth, ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const ALLOWED = ['title','description','category','starsCost','stock','isActive'];
    const update: any = {};
    for (const f of ALLOWED) { if (f in req.body) update[f] = req.body[f]; }
    await PointsItem.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

pointsRouter.delete('/:id', auth, ensureAdmin, async (req: TgRequest, res: Response) => {
  try { await PointsItem.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'خطأ' }); }
});

// ── COUPONS ───────────────────────────────────────────────
export const couponRouter = Router();

couponRouter.get('/my', auth, async (req: TgRequest, res: Response) => {
  try {
    const coupons = await Coupon.find({ createdBy: req.dbUser.telegramId }).sort({ createdAt: -1 });
    res.json(coupons);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

couponRouter.post('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const { code, discountType, discountValue, minPurchase, maxUses, expiresAt, appliesTo } = req.body;
    if (!code || !discountType || !discountValue || !expiresAt) return res.status(400).json({ error: 'بيانات ناقصة' });
    if (!['percent','fixed'].includes(discountType)) return res.status(400).json({ error: 'نوع خصم غير صحيح' });
    if (+discountValue <= 0 || (discountType === 'percent' && +discountValue > 100)) return res.status(400).json({ error: 'قيمة الخصم غير صحيحة' });
    const isAdmin  = ['admin','owner'].includes(req.dbUser.role);
    const safeMax  = isAdmin ? +maxUses||100 : Math.min(+maxUses||50, 50);
    const safeDisc = isAdmin ? +discountValue : (discountType === 'percent' ? Math.min(+discountValue, 30) : +discountValue);
    const coupon = await Coupon.create({
      code: code.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,20),
      discountType, discountValue: safeDisc,
      minPurchase: +minPurchase||0, maxUses: safeMax,
      expiresAt: new Date(expiresAt), appliesTo: appliesTo||'all',
      sellerId: isAdmin ? null : req.dbUser.telegramId,
      createdBy: req.dbUser.telegramId,
    });
    res.json({ success: true, coupon });
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ error: 'الكود مستخدم من قبل' });
    res.status(500).json({ error: 'خطأ' });
  }
});

couponRouter.delete('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const c = await Coupon.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'غير موجود' });
    if (c.createdBy !== req.dbUser.telegramId && !['admin','owner'].includes(req.dbUser.role))
      return res.status(403).json({ error: 'غير مصرح' });
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

// ── AUCTIONS ──────────────────────────────────────────────
export const auctionRouter = Router();

auctionRouter.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const open = await getSetting('auctionsOpen', true);
    if (!open) return res.json({ auctions: [], message: 'المزادات مغلقة' });
    const auctions = await Auction.find({ isCompleted: false, endAt: { $gt: new Date() } }).sort({ endAt: 1 });
    res.json(auctions);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

auctionRouter.post('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const { productTitle, startingPrice, endAt, productImages } = req.body;
    if (!productTitle || !startingPrice || !endAt) return res.status(400).json({ error: 'بيانات ناقصة' });
    if (new Date(endAt) <= new Date()) return res.status(400).json({ error: 'تاريخ انتهاء غير صحيح' });
    if (+startingPrice <= 0) return res.status(400).json({ error: 'سعر البداية يجب أن يكون أكبر من 0' });
    const auction = await Auction.create({
      productId: req.dbUser.telegramId + '_' + Date.now(),
      productTitle: productTitle.slice(0,100), productImages: productImages||[],
      sellerId: req.dbUser.telegramId, sellerName: req.dbUser.username,
      startingPrice: +startingPrice, currentBid: +startingPrice, endAt: new Date(endAt),
    });
    res.json({ success: true, auction });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

auctionRouter.post('/:id/bid', auth, bidLimit, async (req: TgRequest, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || +amount <= 0) return res.status(400).json({ error: 'مبلغ غير صحيح' });
    const auction = await Auction.findById(req.params.id);
    if (!auction || auction.isCompleted) return res.status(404).json({ error: 'المزاد غير موجود أو منتهٍ' });
    if (new Date() > auction.endAt) return res.status(400).json({ error: 'انتهى وقت المزاد' });
    if (auction.sellerId === req.dbUser.telegramId) return res.status(400).json({ error: 'لا يمكنك المزايدة على مزادك' });
    if (+amount <= auction.currentBid) return res.status(400).json({ error: `يجب أن يكون عرضك أعلى من 💎${auction.currentBid}` });

    const bidAmount    = +amount;
    const prevBidderId = auction.currentBidderId;
    const prevBid      = auction.currentBid;

    // FIX: Atomic — خصم من المزايد الجديد
    const bidderWallet = await Wallet.findOneAndUpdate(
      { userId: req.dbUser.telegramId, crystals: { $gte: bidAmount } },
      { $inc: { crystals: -bidAmount, frozenCrystals: bidAmount },
        $push: { transactions: { type: 'auction_bid_hold', amount: bidAmount, currency: 'crystals', status: 'frozen', description: `حجز مزايدة: ${auction.productTitle}`, timestamp: new Date() } } },
      { new: true });
    if (!bidderWallet) return res.status(400).json({ error: `رصيدك غير كافٍ. المطلوب 💎${bidAmount}` });

    // FIX: أعد كريستال المزايد السابق
    if (prevBidderId && prevBidderId !== req.dbUser.telegramId) {
      await Wallet.findOneAndUpdate({ userId: prevBidderId },
        { $inc: { crystals: prevBid, frozenCrystals: -prevBid },
          $push: { transactions: { type: 'auction_bid_refund', amount: prevBid, currency: 'crystals', status: 'completed', description: `استرجاع مزايدة: ${auction.productTitle}`, timestamp: new Date() } } });
      emitToUser(`user:${prevBidderId}`, 'auction_outbid', { auctionId: auction._id, productTitle: auction.productTitle, newBid: bidAmount });
    }

    await Auction.findByIdAndUpdate(req.params.id, {
      currentBid: bidAmount, currentBidderId: req.dbUser.telegramId, currentBidderName: req.dbUser.username,
      $push: { bids: { userId: req.dbUser.telegramId, username: req.dbUser.username, amount: bidAmount, timestamp: new Date() } },
    });
    emitToUser('auction_broadcast', 'new_bid', { auctionId: auction._id, newBid: bidAmount, bidderName: req.dbUser.username });
    res.json({ success: true, message: `✅ تم قبول مزايدتك بـ 💎${bidAmount}` });
  } catch (err) { console.error('[bid]', err); res.status(500).json({ error: 'خطأ في المزايدة' }); }
});

auctionRouter.delete('/:id', auth, ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'غير موجود' });
    if (auction.currentBidderId)
      await Wallet.findOneAndUpdate({ userId: auction.currentBidderId },
        { $inc: { crystals: auction.currentBid, frozenCrystals: -auction.currentBid } });
    await Auction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

// ── SWAP ─────────────────────────────────────────────────
export const swapRouter = Router();
swapRouter.get('/', auth, async (req: TgRequest, res: Response) => {
  try { res.json(await Swap.find({ status: 'open' }).sort({ createdAt: -1 }).limit(50)); }
  catch { res.status(500).json({ error: 'خطأ' }); }
});
swapRouter.post('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const { have, want } = req.body;
    if (!have || !want) return res.status(400).json({ error: 'بيانات ناقصة' });
    const swap = await Swap.create({ userId: req.dbUser.telegramId, username: req.dbUser.username, have: have.slice(0,200), want: want.slice(0,200) });
    res.json({ success: true, swap });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
swapRouter.delete('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const swap = await Swap.findById(req.params.id);
    if (!swap) return res.status(404).json({ error: 'غير موجود' });
    if (swap.userId !== req.dbUser.telegramId && !['admin','owner'].includes(req.dbUser.role))
      return res.status(403).json({ error: 'غير مصرح' });
    await Swap.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

// ── USER PROFILE ─────────────────────────────────────────
export const userRouter = Router();

// BUG FIX: /me — الـ endpoint الرئيسي اللي يستخدمه App.tsx
userRouter.get('/me', auth, async (req: TgRequest, res: Response) => {
  try {
    const { User, Wallet } = await import('../../models/index.js');
    const [user, wallet] = await Promise.all([
      User.findOne({ telegramId: req.dbUser.telegramId }).select('-warnings'),
      Wallet.findOne({ userId: req.dbUser.telegramId }).select('-transactions'),
    ]);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({
      ...user.toObject(),
      crystals: wallet?.crystals ?? 0,
      stars: wallet?.stars ?? 0,
      pendingCrystals: wallet?.pendingCrystals ?? 0,
      frozenCrystals: wallet?.frozenCrystals ?? 0,
    });
  } catch { res.status(500).json({ error: 'خطأ في تحميل البيانات' }); }
});

// BUG FIX: /my-products — اللي يستخدمه MyStoreTab
userRouter.get('/my-products', auth, async (req: TgRequest, res: Response) => {
  try {
    const { Product, AccountProduct } = await import('../../models/index.js');
    const [products, accounts] = await Promise.all([
      Product.find({ sellerId: req.dbUser.telegramId }).sort({ createdAt: -1 }).select('-credentialsEncrypted'),
      AccountProduct.find({ sellerId: req.dbUser.telegramId }).sort({ createdAt: -1 }).select('-credentialsEncrypted'),
    ]);
    res.json({ products, accounts });
  } catch { res.status(500).json({ error: 'خطأ في تحميل المنتجات' }); }
});

userRouter.get('/profile', auth, async (req: TgRequest, res: Response) => {
  try {
    const { User } = await import('../../models/index.js');
    res.json(await User.findOne({ telegramId: req.dbUser.telegramId }).select('-sellerPaymentInfo -warnings'));
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
userRouter.get('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const { User } = await import('../../models/index.js');
    const user = await User.findOne({ telegramId: req.params.id }).select('username fullName avatar role level salesCount purchasesCount successRate sellerLevel joinedAt');
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(user);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
userRouter.put('/profile', auth, async (req: TgRequest, res: Response) => {
  try {
    const { User } = await import('../../models/index.js');
    const ALLOWED = ['avatar','sellerPaymentInfo','responseTime'];
    const update: any = {};
    for (const f of ALLOWED) { if (f in req.body) update[f] = req.body[f]; }
    res.json(await User.findOneAndUpdate({ telegramId: req.dbUser.telegramId }, update, { new: true }));
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
