import { Router, Response } from 'express';
import { validateTelegramInitData, loadUser, TgRequest } from '../../middleware/auth.js';
import { User } from '../../models/index.js';
import rateLimit from 'express-rate-limit';
const router  = Router();
const auth    = [validateTelegramInitData, loadUser];
const lbLimit = rateLimit({ windowMs: 60_000, max: 20, message: { error: 'كثير' } });
router.get('/', auth, lbLimit, async (req: TgRequest, res: Response) => {
  try {
    const { type = 'sellers' } = req.query;
    if (type === 'buyers') {
      const buyers = await User.find({ purchasesCount: { $gt: 0 } })
        .sort({ purchasesCount: -1 }).limit(20)
        .select('username fullName purchasesCount').lean();
      return res.json(buyers);
    }
    const sellers = await User.find({ salesCount: { $gt: 0 } })
      .sort({ salesCount: -1 }).limit(20)
      .select('username fullName salesCount sellerLevel avgRating reviewCount').lean();
    res.json(sellers);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
export default router;
