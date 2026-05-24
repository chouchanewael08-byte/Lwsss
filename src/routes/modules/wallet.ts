// ── src/routes/modules/wallet.ts ────────────────────────────
import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { validateTelegramInitData, loadUser, ensureAdmin, TgRequest } from '../../middleware/auth.js';
import { Wallet, User, Transaction } from '../../models/index.js';
import { upload, uploadToCloudinary } from '../../lib/upload.js';
import { getCrystalPriceUSD, getSetting, emitToUser } from '../../lib/helpers.js';
import { validate, depositSchema, withdrawSchema } from '../../lib/validation.js';
import { withdrawLimit } from '../../lib/rateLimits.js';

const router = Router();
const auth   = [validateTelegramInitData, loadUser];

router.get('/', auth, async (req: TgRequest, res: Response) => {
  const wallet = await Wallet.findOne({ userId: req.dbUser.telegramId });
  if (!wallet) return res.status(404).json({ error: 'المحفظة غير موجودة' });
  const crystalPriceUSD = await getCrystalPriceUSD();
  res.json({ ...wallet.toObject(), crystalsUSD: +(wallet.crystals * crystalPriceUSD).toFixed(2) });
});

router.get('/transactions', auth, async (req: TgRequest, res: Response) => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const [transactions, total] = await Promise.all([
    Transaction.find({ userId: req.dbUser.telegramId }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
    Transaction.countDocuments({ userId: req.dbUser.telegramId }),
  ]);
  res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
});

router.post('/deposit', auth, upload.single('proof'), async (req: TgRequest, res: any, nxt: any) => { if (req.file) { try { req.body.proofImage = await uploadToCloudinary(req.file.buffer, 'marketplace/proofs'); } catch {} } nxt(); }, validate(depositSchema), async (req: TgRequest, res: Response) => {
  const { amount, paymentMethod, proofImage } = req.body;
  const minDeposit = +(await getSetting('minDepositCrystals', 100));
  const maxDeposit = +(await getSetting('maxDepositCrystals', 100000));
  if (+amount < minDeposit || +amount > maxDeposit)
    return res.status(400).json({ error: `المبلغ بين 💎${minDeposit} و 💎${maxDeposit}` });

  const reference = `DEP-${Date.now()}-${req.dbUser.telegramId.slice(-4)}`;
  await Transaction.create({
    userId: req.dbUser.telegramId, type: 'deposit_request', amount: +amount,
    currency: 'crystals', status: 'pending',
    description: `طلب إيداع: 💎${amount} عبر ${paymentMethod}`,
    paymentMethod, proofImage: proofImage || null, reference,
  });

  const [crystalPriceUSD, paymentInfo] = await Promise.all([
    getCrystalPriceUSD(), getSetting('ownerPaymentInfo', {}),
  ]);
  emitToUser('admin_broadcast', 'new_deposit_request', {
    userId: req.dbUser.telegramId, username: req.dbUser.username,
    amount: +amount, amountUSD: +(+amount * crystalPriceUSD).toFixed(2),
    method: paymentMethod, proofImage: proofImage || null,
  });
  res.json({ success: true, message: `✅ تم تسجيل طلب الإيداع\nسيتم التأكيد خلال 24 ساعة`, paymentInfo });
});

router.post('/withdraw', auth, withdrawLimit, validate(withdrawSchema), async (req: TgRequest, res: Response) => {
  const { amount, paymentMethod: method, accountInfo: details } = req.body;
  const [minW, maxW] = await Promise.all([
    getSetting('minWithdrawCrystals', 500).then(Number),
    getSetting('maxWithdrawCrystals', 50000).then(Number),
  ]);
  if (+amount < minW || +amount > maxW)
    return res.status(400).json({ error: `المبلغ بين 💎${minW} و 💎${maxW}` });

  const reference = `WIT-${Date.now()}-${req.dbUser.telegramId.slice(-4)}`;
  const wallet = await Wallet.findOneAndUpdate(
    { userId: req.dbUser.telegramId, crystals: { $gte: +amount } },
    { $inc: { crystals: -amount, frozenCrystals: +amount } },
    { new: true }
  );
  if (!wallet) {
    const cur = await Wallet.findOne({ userId: req.dbUser.telegramId }).select('crystals').lean();
    return res.status(400).json({ error: `رصيدك غير كافٍ. لديك 💎${(cur as any)?.crystals || 0}` });
  }

  await Promise.all([
    Transaction.create({ userId: req.dbUser.telegramId, type: 'withdrawal_request', amount: +amount, currency: 'crystals', status: 'pending', description: `طلب سحب عبر ${method}`, paymentMethod: method, reference }),
    User.findOneAndUpdate({ telegramId: req.dbUser.telegramId }, { $inc: { crystals: -amount } }),
  ]);
  emitToUser('admin_broadcast', 'new_withdrawal_request', { userId: req.dbUser.telegramId, username: req.dbUser.username, amount: +amount, method, details: details || '' });
  res.json({ success: true, message: `✅ تم تسجيل طلب السحب: 💎${amount}`, newBalance: wallet.crystals });
});

router.post('/admin/confirm-deposit', auth, ensureAdmin, async (req: TgRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { userId, amount, reference } = req.body;
      if (!userId || !amount || !reference) throw Object.assign(new Error('بيانات ناقصة'), { status: 400 });
      const tx = await Transaction.findOneAndUpdate(
        { userId, reference, status: 'pending' },
        { status: 'completed' },
        { new: true, session }
      );
      if (!tx) throw Object.assign(new Error('طلب غير موجود أو مُعالَج'), { status: 404 });
      await Wallet.findOneAndUpdate({ userId }, { $inc: { crystals: +amount } }, { session });
      await User.findOneAndUpdate({ telegramId: userId }, { $inc: { crystals: +amount } }, { session });
      emitToUser(`user:${userId}`, 'deposit_confirmed', { amount: +amount });
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'خطأ' });
  } finally {
    session.endSession();
  }
});

export default router;
