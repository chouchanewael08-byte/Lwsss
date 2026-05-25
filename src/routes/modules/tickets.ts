// ── src/routes/modules/tickets.ts ───────────────────────────
import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { validateTelegramInitData, loadUser, ensureMod, TgRequest } from '../../middleware/auth.js';
import { Ticket, Wallet, User, Product, AccountProduct, Coupon, Transaction } from '../../models/index.js';
import { getCrystalPriceUSD, getCommissionPercent, getSetting, emitToUser } from '../../lib/helpers.js';
import { decryptCredentials } from '../../lib/crypto.js';
import { validate, ticketCreateSchema } from '../../lib/validation.js';
import { purchaseLimit } from '../../lib/rateLimits.js';

const router = Router();
const auth = [validateTelegramInitData, loadUser];

// Helper — يُنشئ Transaction بدون $push
async function createTx(userId: string, type: string, amount: number, currency: string, description: string, status = 'completed', session?: any) {
  return Transaction.create([{ userId, type, amount, currency, status, description }], session ? { session } : undefined);
}

router.get('/', auth, async (req: TgRequest, res: Response) => {
  const { role, telegramId } = req.dbUser;
  const filter = ['admin','owner','moderator'].includes(role)
    ? {}
    : { $or: [{ buyerId: telegramId }, { sellerId: telegramId }] };
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).select('-messages'),
    Ticket.countDocuments(filter),
  ]);
  res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
});

router.get('/:id', auth, async (req: TgRequest, res: Response) => {
  const { role, telegramId } = req.dbUser;
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'الطلب غير موجود' });
  const canView = ['admin','owner','moderator'].includes(role)
    || ticket.buyerId === telegramId || ticket.sellerId === telegramId;
  if (!canView) return res.status(403).json({ error: 'غير مصرح' });

  let credentials = null;
  if (['payment_confirmed','partial_revealed','full_revealed','completed','auto_completed'].includes(ticket.status)
    && (ticket.buyerId === telegramId || ['admin','owner'].includes(role))) {
    const prod = await (ticket.productType === 'accounts'
      ? AccountProduct.findById(ticket.productId).select('+credentialsEncrypted')
      : Product.findById(ticket.productId).select('+credentialsEncrypted'));
    if (prod?.credentialsEncrypted) credentials = decryptCredentials(prod.credentialsEncrypted);
  }
  res.json({ ...ticket.toObject(), credentials });
});

router.post('/', auth, purchaseLimit, validate(ticketCreateSchema), async (req: TgRequest, res: Response) => {
  let responded = false;
  try {
    await (async () => {
      const { productId, productType, paymentMethod, couponCode } = req.body;
      const buyer = req.dbUser;

      const prod = await (productType === 'accounts'
        ? AccountProduct.findById(productId)
        : Product.findById(productId)).session(session);
      if (!prod || !prod.isApproved || prod.isHidden)
        throw Object.assign(new Error('المنتج غير متاح'), { status: 404 });
      if (prod.sellerId === buyer.telegramId)
        throw Object.assign(new Error('لا يمكنك شراء منتجك'), { status: 400 });

      const seller = await User.findOne({ telegramId: prod.sellerId }).session(session);
      if (!seller) throw Object.assign(new Error('البائع غير موجود'), { status: 404 });

      let finalPrice = prod.price;
      let discountApplied = 0;
      if (couponCode) {
        const coupon = await Coupon.findOneAndUpdate(
          { code: couponCode.toUpperCase(), isActive: true, expiresAt: { $gt: new Date() },
            $expr: { $lt: ['$usedCount','$maxUses'] }, usedBy: { $nin: [buyer.telegramId] },
            $or: [{ appliesTo: 'all' }, { appliesTo: productType }] },
          { $inc: { usedCount: 1 }, $push: { usedBy: buyer.telegramId } },
          { new: true},
        );
        if (!coupon) throw Object.assign(new Error('الكوبون غير صالح أو مستخدم'), { status: 400 });
        discountApplied = coupon.discountType === 'percent'
          ? Math.floor(prod.price * coupon.discountValue / 100)
          : Math.min(coupon.discountValue, prod.price - 1);
        finalPrice = Math.max(1, prod.price - discountApplied);
      }

      const [crystalPrice, commissionPct] = await Promise.all([getCrystalPriceUSD(), getCommissionPercent()]);
      const commission = Math.ceil(finalPrice * commissionPct / 100);
      const netAmount  = finalPrice - commission;

      if (paymentMethod === 'crystals') {
        const buyerWallet = await Wallet.findOneAndUpdate(
          { userId: buyer.telegramId, crystals: { $gte: finalPrice } },
          { $inc: { crystals: -finalPrice, frozenCrystals: finalPrice } },
          { new: true},
        );
        if (!buyerWallet)
          throw Object.assign(new Error(`رصيدك غير كافٍ. المطلوب 💎${finalPrice}`), { status: 400 });

        await createTx(buyer.telegramId, 'purchase_hold', finalPrice, 'crystals', `حجز شراء: ${prod.title}`, 'frozen', session);

        const [ticket] = await Ticket.create([{
          productId, productTitle: prod.title, productType,
          buyerId: buyer.telegramId, buyerName: buyer.username,
          sellerId: prod.sellerId, sellerName: seller.username,
          amount: finalPrice, amountUSD: +(finalPrice * crystalPrice).toFixed(2),
          commission, netAmount, paymentMethod: 'crystals', status: 'payment_confirmed',
          autoCompleteAt: new Date(Date.now() + 3*24*60*60*1000),
          messages: [{ senderId: 'system', senderName: 'النظام', senderRole: 'system',
            text: `✅ تم تأكيد الدفع: 💎${finalPrice}${discountApplied ? ` (خصم 💎${discountApplied})` : ''}`, isSystemMessage: true, timestamp: new Date() }],
        }]);

        emitToUser(`user:${prod.sellerId}`, 'new_ticket', { ticketId: ticket._id, productTitle: prod.title, amount: finalPrice, buyerName: buyer.username });
        if (!responded) { responded = true; res.json({ success: true, ticket, paymentConfirmed: true }); }
        return;
      }

      if (['baridimob','ccp','usdt','binance','flexy'].includes(paymentMethod)) {
        const paymentInfo = await getSetting('ownerPaymentInfo', {});
        const [ticket] = await Ticket.create([{
          productId, productTitle: prod.title, productType,
          buyerId: buyer.telegramId, buyerName: buyer.username,
          sellerId: prod.sellerId, sellerName: seller.username,
          amount: finalPrice, amountUSD: +(finalPrice * crystalPrice).toFixed(2),
          commission, netAmount, paymentMethod, status: 'pending_payment',
          autoCompleteAt: new Date(Date.now() + 5*24*60*60*1000),
          messages: [{ senderId: 'system', senderName: 'النظام', senderRole: 'system',
            text: `📋 أرسل إيصال التحويل للأدمن لتأكيد الدفع.`, isSystemMessage: true, timestamp: new Date() }],
        }]);
        if (!responded) { responded = true; res.json({ success: true, ticket, paymentConfirmed: false, paymentInfo }); }
        return;
      }
      throw Object.assign(new Error('طريقة دفع غير مدعومة'), { status: 400 });
    })();
  } catch (err: any) {
    if (!responded) res.status(err.status || 500).json({ error: err.message || 'خطأ في إنشاء الطلب' });
  } catch(e:any){throw e;}
});

router.post('/:id/confirm', auth, async (req: TgRequest, res: Response) => {
  try {
    await (async () => {
      const ticket = await Ticket.findById(req.params.id).session(session);
      if (!ticket) throw Object.assign(new Error('غير موجود'), { status: 404 });
      if (ticket.buyerId !== req.dbUser.telegramId) throw Object.assign(new Error('غير مصرح'), { status: 403 });
      if (!['full_revealed','partial_revealed'].includes(ticket.status))
        throw Object.assign(new Error('لا يمكن التأكيد الآن'), { status: 400 });

      await Promise.all([
        Wallet.findOneAndUpdate({ userId: ticket.buyerId },
          { $inc: { frozenCrystals: -ticket.amount } }),
        Wallet.findOneAndUpdate({ userId: ticket.sellerId },
          { $inc: { crystals: ticket.netAmount, totalEarned: ticket.netAmount } }),
        createTx(ticket.buyerId,  'purchase_complete', ticket.amount,    'crystals', `إتمام شراء: ${ticket.productTitle}`, 'completed', session),
        createTx(ticket.sellerId, 'sale',              ticket.netAmount,  'crystals', `بيع ناجح: ${ticket.productTitle}`,   'completed', session),
        Ticket.findByIdAndUpdate(ticket._id,
          { status: 'completed', buyerConfirmed: true, completedAt: new Date(),
            $push: { messages: { senderId: 'system', senderName: 'النظام', senderRole: 'system',
              text: '✅ أكد المشتري الاستلام. تمت الصفقة!', isSystemMessage: true, timestamp: new Date() } } }),
        User.findOneAndUpdate({ telegramId: ticket.sellerId }, { $inc: { salesCount: 1, totalEarnings: ticket.netAmount } }),
        User.findOneAndUpdate({ telegramId: ticket.buyerId  }, { $inc: { purchasesCount: 1 } }),
      ]);
      emitToUser(`user:${ticket.sellerId}`, 'ticket_completed', { ticketId: ticket._id, amount: ticket.netAmount });
    })();
    res.json({ success: true, message: 'تم تأكيد الاستلام وإتمام الصفقة' });
  } catch (err: any) { res.status(err.status || 500).json({ error: err.message || 'خطأ' }); }
  finally { }
});

router.post('/:id/reveal-partial', auth, async (req: TgRequest, res: Response) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'غير موجود' });
  if (ticket.sellerId !== req.dbUser.telegramId) return res.status(403).json({ error: 'غير مصرح' });
  if (ticket.status !== 'payment_confirmed') return res.status(400).json({ error: 'لا يمكن الكشف الآن' });
  await Ticket.findByIdAndUpdate(ticket._id, {
    status: 'partial_revealed', partialRevealed: true,
    $push: { messages: { senderId: 'system', senderName: 'النظام', senderRole: 'seller',
      text: '🔓 تم الكشف الجزئي عن البيانات.', isSystemMessage: true, timestamp: new Date() } },
  });
  emitToUser(`user:${ticket.buyerId}`, 'ticket_partial_revealed', { ticketId: ticket._id });
  res.json({ success: true });
});

router.post('/:id/reveal-full', auth, async (req: TgRequest, res: Response) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'غير موجود' });
  if (ticket.sellerId !== req.dbUser.telegramId) return res.status(403).json({ error: 'غير مصرح' });
  if (!['payment_confirmed','partial_revealed'].includes(ticket.status))
    return res.status(400).json({ error: 'لا يمكن الكشف الآن' });
  await Ticket.findByIdAndUpdate(ticket._id, {
    status: 'full_revealed', fullRevealed: true,
    $push: { messages: { senderId: 'system', senderName: 'النظام', senderRole: 'seller',
      text: '🔑 تم الكشف الكامل. أكّد الاستلام.', isSystemMessage: true, timestamp: new Date() } },
  });
  emitToUser(`user:${ticket.buyerId}`, 'ticket_full_revealed', { ticketId: ticket._id });
  res.json({ success: true });
});

router.post('/:id/dispute', auth, async (req: TgRequest, res: Response) => {
  const { reason } = req.body;
  if (!reason?.trim() || reason.trim().length < 10) return res.status(400).json({ error: 'اذكر سبب النزاع (10 أحرف على الأقل)' });
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'غير موجود' });
  const isParty = ticket.buyerId === req.dbUser.telegramId || ticket.sellerId === req.dbUser.telegramId;
  if (!isParty) return res.status(403).json({ error: 'غير مصرح' });
  if (['completed','auto_completed','refunded','disputed'].includes(ticket.status))
    return res.status(400).json({ error: 'لا يمكن فتح نزاع' });
  await Ticket.findByIdAndUpdate(ticket._id, {
    status: 'disputed', disputeReason: reason.trim().slice(0,500), disputeOpenedAt: new Date(),
    $push: { messages: { senderId: req.dbUser.telegramId, senderName: req.dbUser.username,
      senderRole: ticket.buyerId === req.dbUser.telegramId ? 'buyer' : 'seller',
      text: `⚠️ نزاع: ${reason.trim().slice(0,200)}`, isSystemMessage: true, timestamp: new Date() } },
  });
  emitToUser('admin_broadcast', 'new_dispute', { ticketId: ticket._id, reason: reason.trim().slice(0,200), openedBy: req.dbUser.username });
  res.json({ success: true, message: 'تم فتح النزاع، سيتدخل الأدمن خلال 48 ساعة' });
});

router.post('/:id/message', auth, async (req: TgRequest, res: Response) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'الرسالة فارغة' });
  if (text.length > 1000) return res.status(400).json({ error: 'الرسالة طويلة جداً' });
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'غير موجود' });
  const { telegramId, username, role } = req.dbUser;
  const isParty = ticket.buyerId === telegramId || ticket.sellerId === telegramId;
  const isStaff = ['admin','owner','moderator'].includes(role);
  if (!isParty && !isStaff) return res.status(403).json({ error: 'غير مصرح' });
  const senderRole = isStaff ? 'admin' : ticket.buyerId === telegramId ? 'buyer' : 'seller';
  const message = { senderId: telegramId, senderName: username, senderRole, text: text.trim(), isSystemMessage: false, timestamp: new Date() };
  await Ticket.findByIdAndUpdate(ticket._id, { $push: { messages: message } });
  const notifyId = ticket.buyerId === telegramId ? ticket.sellerId : ticket.buyerId;
  emitToUser(`user:${notifyId}`, 'new_ticket_message', { ticketId: ticket._id, senderName: username, preview: text.slice(0,50) });
  res.json({ success: true, message });
});

router.post('/:id/resolve', auth, ensureMod, async (req: TgRequest, res: Response) => {
  try {
    await (async () => {
      const { resolution, note } = req.body;
      const ticket = await Ticket.findById(req.params.id).session(session);
      if (!ticket) throw Object.assign(new Error('غير موجود'), { status: 404 });
      if (ticket.status !== 'disputed') throw Object.assign(new Error('الطلب ليس في نزاع'), { status: 400 });

      if (resolution === 'refund') {
        if (ticket.paymentMethod === 'crystals') {
          await Wallet.findOneAndUpdate({ userId: ticket.buyerId },
            { $inc: { crystals: ticket.amount, frozenCrystals: -ticket.amount } });
          await createTx(ticket.buyerId, 'refund', ticket.amount, 'crystals', `استرجاع نزاع: ${ticket.productTitle}`, 'completed', session);
        }
        await Ticket.findByIdAndUpdate(ticket._id,
          { status: 'refunded',
            $push: { messages: { senderId: 'system', senderName: 'النظام', senderRole: 'admin',
              text: `↩️ قرار الأدمن: رد الأموال للمشتري.\n${note||''}`, isSystemMessage: true, timestamp: new Date() } } });
      } else {
        if (ticket.paymentMethod === 'crystals') {
          await Wallet.findOneAndUpdate({ userId: ticket.buyerId }, { $inc: { frozenCrystals: -ticket.amount } });
          await Wallet.findOneAndUpdate({ userId: ticket.sellerId }, { $inc: { crystals: ticket.netAmount } });
          await createTx(ticket.sellerId, 'sale', ticket.netAmount, 'crystals', `إتمام نزاع: ${ticket.productTitle}`, 'completed', session);
        }
        await Ticket.findByIdAndUpdate(ticket._id,
          { status: 'completed', completedAt: new Date(),
            $push: { messages: { senderId: 'system', senderName: 'النظام', senderRole: 'admin',
              text: `✅ قرار الأدمن: إتمام لصالح البائع.\n${note||''}`, isSystemMessage: true, timestamp: new Date() } } });
      }
      emitToUser(`user:${ticket.buyerId}`,  'dispute_resolved', { ticketId: ticket._id, resolution });
      emitToUser(`user:${ticket.sellerId}`, 'dispute_resolved', { ticketId: ticket._id, resolution });
    })();
    res.json({ success: true });
  } catch (err: any) { res.status(err.status||500).json({ error: err.message||'خطأ' }); }
  finally { }
});

export default router;
