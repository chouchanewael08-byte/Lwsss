// ── src/jobs/auction.ts ─────────────────────────────────────
import { Auction, Wallet, User, Ticket, Transaction } from '../models/index.js';
import { getCrystalPriceUSD, getCommissionPercent } from '../lib/helpers.js';
import { log } from '../lib/logger.js';
import { tgSend } from '../lib/telegram.js';

let running = false;

export async function runAuctionJob() {
  if (running) return;
  running = true;
  try {
    const ended = await Auction.find({ isCompleted: false, endAt: { $lte: new Date() } }).lean();
    if (!ended.length) return;

    const [commission, crystalPrice] = await Promise.all([getCommissionPercent(), getCrystalPriceUSD()]);

    for (const auction of ended) {
      // بدون مزايد — أغلق فقط
      if (!auction.currentBidderId) {
        await Auction.findByIdAndUpdate(auction._id, { isCompleted: true });
        continue;
      }

      const winAmount = auction.currentBid;
      const commAmt   = Math.ceil(winAmount * commission / 100);
      const netAmount = winAmount - commAmt;

      // ① خصم من المجمّد — atomic check
      const winnerWallet = await Wallet.findOneAndUpdate(
        { userId: auction.currentBidderId, frozenCrystals: { $gte: winAmount } },
        { $inc: { frozenCrystals: -winAmount } },
        { new: true }
      );
      if (!winnerWallet) {
        await Auction.findByIdAndUpdate(auction._id, { isCompleted: true });
        continue;
      }

      // ② كلّ العمليات بـ Promise.all
      await Promise.all([
        Wallet.findOneAndUpdate({ userId: auction.sellerId }, { $inc: { crystals: netAmount, totalEarned: netAmount } }),
        Transaction.create({ userId: auction.currentBidderId, type: 'auction_win', amount: winAmount, currency: 'crystals', status: 'completed', description: `فوز مزاد: ${auction.productTitle}` }),
        Transaction.create({ userId: auction.sellerId, type: 'auction_sale', amount: netAmount, currency: 'crystals', status: 'completed', description: `بيع مزاد: ${auction.productTitle}` }),
        Ticket.create({
          productId: auction.productId, productTitle: auction.productTitle, productType: 'market',
          buyerId: auction.currentBidderId, buyerName: auction.currentBidderName,
          sellerId: auction.sellerId, sellerName: auction.sellerName,
          amount: winAmount, amountUSD: +(winAmount * crystalPrice).toFixed(2),
          commission: commAmt, netAmount, paymentMethod: 'crystals', status: 'payment_confirmed',
          messages: [{ senderId: 'system', senderName: 'النظام', senderRole: 'system',
            text: `🏆 فزت بالمزاد: ${auction.productTitle}\n💎${winAmount}`, isSystemMessage: true, timestamp: new Date() }],
        }),
        Auction.findByIdAndUpdate(auction._id, { isCompleted: true, winnerId: auction.currentBidderId }),
        User.findOneAndUpdate({ telegramId: auction.currentBidderId }, { $inc: { purchasesCount: 1 } }),
        User.findOneAndUpdate({ telegramId: auction.sellerId },        { $inc: { salesCount: 1 } }),
        tgSend(auction.currentBidderId, `🏆 فزت بالمزاد!\n${auction.productTitle}\n💎${winAmount}`).catch(() => {}),
        tgSend(auction.sellerId, `✅ مزادك انتهى!\n${auction.productTitle}\nالفائز دفع 💎${winAmount} — صافيك 💎${netAmount}`).catch(() => {}),
      ]);
    }
    log.info(`[AuctionJob] عولج ${ended.length} مزاد`);
  } catch (err) {
    log.error('[AuctionJob] فشل', { err });
  } finally {
    running = false;
  }
}

export function startAuctionJob() {
  setInterval(runAuctionJob, 60 * 1000);
  log.info('✅ Auction Job شغال');
}
