import { Router, Response } from 'express';
import { z } from 'zod';
import { validateTelegramInitData, loadUser, TgRequest } from '../../middleware/auth.js';
import { Product, AccountProduct } from '../../models/index.js';
import { Wishlist } from '../../models/wishlist.js';
const router = Router();
const auth   = [validateTelegramInitData, loadUser];
const Schema = z.object({
  productId:   z.string().length(24),
  productType: z.enum(['market','accounts']).default('market'),
});
router.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const items = await Wishlist.find({ userId: req.dbUser.telegramId }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
router.get('/check/:productId', auth, async (req: TgRequest, res: Response) => {
  try {
    const exists = !!(await Wishlist.findOne({ userId: req.dbUser.telegramId, productId: req.params.productId }));
    res.json({ inWishlist: exists });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
router.post('/', auth, async (req: TgRequest, res: Response) => {
  const p = Schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  try {
    const { productId, productType } = p.data;
    const uid = req.dbUser.telegramId;
    if (await Wishlist.countDocuments({ userId: uid }) >= 50)
      return res.status(400).json({ error: 'الحد الأقصى 50 منتج في المفضلة' });
    const Model   = productType === 'accounts' ? AccountProduct : Product;
    const product = await Model.findById(productId).lean() as any;
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    const item = await Wishlist.findOneAndUpdate(
      { userId: uid, productId },
      { userId: uid, productId, productType, productTitle: product.title,
        productPrice: product.price, productImage: product.images?.[0] ?? null,
        sellerId: product.sellerId, sellerName: product.sellerName },
      { upsert: true, new: true }
    );
    res.json({ success: true, item });
  } catch (e: any) {
    if (e.code === 11000) return res.status(400).json({ error: 'موجود في المفضلة بالفعل' });
    res.status(500).json({ error: 'خطأ' });
  }
});
router.delete('/:productId', auth, async (req: TgRequest, res: Response) => {
  try {
    await Wishlist.deleteOne({ userId: req.dbUser.telegramId, productId: req.params.productId });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
export default router;
