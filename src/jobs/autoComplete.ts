// ── src/jobs/autoComplete.ts ─────────────────────────────────
import { Ticket, Wallet, User, Transaction } from '../models/index.js';
import { log } from '../lib/logger.js';
import { tgSend } from '../lib/telegram.js';
import { ENV } from '../config/env.js';

let running = false;

export async function runAutoCompleteJob() {
  if (running) return;
  running = true;
  try {
    const expired = await Ticket.find({
      status: 'full_revealed',
      autoCompleteAt: { $lte: new Date() },
    }).lean();

    if (!expired.length) return;

    const walletOps: any[] = [];
    const userOps:   any[] = [];
    const txDocs:    any[] = [];

    for (const t of expired) {
      walletOps.push({ updateOne: { filter: { userId: t.sellerId }, update: { $inc: { crystals: t.netAmount, totalEarned: t.netAmount } } } });
      if (t.paymentMethod === 'crystals')
        walletOps.push({ updateOne: { filter: { userId: t.buyerId }, update: { $inc: { frozenCrystals: -t.amount } } } });

      userOps.push({ updateOne: { filter: { telegramId: t.sellerId }, update: { $inc: { salesCount: 1, crystals: t.netAmount } } } });
      userOps.push({ updateOne: { filter: { telegramId: t.buyerId  }, update: { $inc: { purchasesCount: 1 } } } });

      txDocs.push({ userId: t.sellerId, type: 'sale_complete', amount: t.netAmount, currency: 'crystals', status: 'completed', description: `اكتمال صفقة: ${t.productTitle}` });
    }

    await Promise.all([
      Wallet.bulkWrite(walletOps),
      User.bulkWrite(userOps),
      Transaction.insertMany(txDocs),
      Ticket.updateMany({ _id: { $in: expired.map((t: any) => t._id) } }, { status: 'auto_completed', completedAt: new Date() }),
    ]);

    // إشعار البائعين
    for (const t of expired) {
      await tgSend(t.sellerId, `💰 <b>اكتملت الصفقة تلقائياً</b>\nتم إضافة 💎${t.netAmount} لمحفظتك.`).catch(() => {});
    }

    log.info(`[AutoComplete] أكمل ${expired.length} طلب`);
  } catch (err) {
    log.error('[AutoComplete] فشل', { err });
  } finally {
    running = false;
  }
}
