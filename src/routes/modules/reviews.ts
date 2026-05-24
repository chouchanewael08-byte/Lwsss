import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validateTelegramInitData, loadUser, TgRequest } from '../../middleware/auth.js';
import { Ticket, User } from '../../models/index.js';
import { Review } from '../../models/review.js';
import { createNotification } from '../../lib/notify.js';
const router = Router();
const auth   = [validateTelegramInitData, loadUser];
const rlimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'تجاوزت حد المراجعات' } });
const CreateSchema = z.object({
  ticketId: z.string().length(24),
  rating:   z.number().int().min(1).max(5),
  comment:  z.string().max(500).optional().default(''),
});
router.post('/', auth, rlimit, async (req: TgRequest, res: Response) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const { ticketId, rating, comment } = parsed.data;
    const uid = req.dbUser.telegramId;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'الصفقة غير موجودة' });
    if (ticket.buyerId !== uid) return res.status(403).json({ error: 'فقط المشتري يمكنه التقييم' });
    if (!['completed','auto_completed'].includes(ticket.status))
      return res.status(400).json({ error: 'لا يمكن التقييم قبل اكتمال الصفقة' });
    if (await Review.findOne({ ticketId }))
      return res.status(400).json({ error: 'قيّمت هذه الصفقة من قبل' });
    const review = await Review.create({
      reviewerId: uid, reviewerName: req.dbUser.username,
      sellerId: ticket.sellerId, productId: ticket.productId,
      productTitle: ticket.productTitle, ticketId, rating, comment,
    });
    const all = await Review.find({ sellerId: ticket.sellerId });
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    const sr  = Math.round((all.filter(r => r.rating >= 3).length / all.length) * 100);
    await User.findOneAndUpdate({ telegramId: ticket.sellerId },
      { avgRating: +avg.toFixed(1), reviewCount: all.length, successRate: sr });
    await createNotification(ticket.sellerId, 'review', '⭐',
      'تقييم جديد', `${req.dbUser.username} قيّم صفقتك بـ ${rating}/5 ⭐`, 'profile');
    res.json({ success: true, review });
  } catch (e: any) { res.status(500).json({ error: e.message || 'خطأ' }); }
});
router.get('/seller/:sellerId', auth, async (req: TgRequest, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const reviews = await Review.find({ sellerId: req.params.sellerId })
      .sort({ createdAt: -1 }).skip((+page-1)*+limit).limit(+limit).lean();
    const total   = await Review.countDocuments({ sellerId: req.params.sellerId });
    const avg     = reviews.length ? +(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : 0;
    res.json({ reviews, total, avgRating: avg });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
router.get('/can-review/:ticketId', auth, async (req: TgRequest, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId).lean() as any;
    if (!ticket) return res.json({ canReview: false });
    const done  = ['completed','auto_completed'].includes(ticket.status);
    const mine  = ticket.buyerId === req.dbUser.telegramId;
    const used  = !!(await Review.findOne({ ticketId: req.params.ticketId }));
    res.json({ canReview: done && mine && !used });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
router.post('/:id/reply', auth, async (req: TgRequest, res: Response) => {
  const { reply } = req.body;
  if (!reply || reply.length > 300) return res.status(400).json({ error: 'الرد بين 1-300 حرف' });
  try {
    const r = await Review.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'غير موجود' });
    if (r.sellerId !== req.dbUser.telegramId) return res.status(403).json({ error: 'غير مصرح' });
    if (r.sellerReply) return res.status(400).json({ error: 'ردّيت من قبل' });
    r.sellerReply = reply; r.sellerReplyAt = new Date();
    await r.save();
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
export default router;
