import { Router } from 'express';
import { validateTelegramInitData, loadUser, TgRequest } from '../../middleware/auth.js';
import { Product, Coupon } from '../../models/index.js';
import { upload, uploadToCloudinary } from '../../lib/upload.js';
import { encryptCredentials } from '../../lib/crypto.js';
import { getSetting, getCrystalPriceUSD } from '../../lib/helpers.js';
import { uploadLimit } from '../../lib/rateLimits.js';
import { Response } from 'express';

const router = Router();
const auth = [validateTelegramInitData, loadUser];

// GET all products (public)
router.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, search, sort = 'newest' } = req.query;
    const marketOpen = await getSetting('marketOpen', true);
    if (!marketOpen) return res.json({ products: [], message: 'السوق مغلق حالياً' });

    const filter: any = { isHidden: false, isApproved: true };
    if (type) filter.type = type;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      views: { viewsCount: -1 }
    };

    const products = await Product.find(filter)
      .sort({ isFeatured: -1, ...(sortMap[sort as string] || { createdAt: -1 }) })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .select('-credentialsEncrypted');

    const total = await Product.countDocuments(filter);
    res.json({ products, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch { res.status(500).json({ error: 'خطأ في جلب المنتجات' }); }
});

// GET single product
router.get('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).select('-credentialsEncrypted');
    if (!product || product.isHidden) return res.status(404).json({ error: 'المنتج غير موجود' });
    await Product.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });
    res.json(product);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

// POST create product
router.post('/', auth, upload.array('images', 5), uploadLimit, async (req: TgRequest, res: Response) => {
  try {
    const { title, description, price, type, acceptedPayments, isNegotiable, warrantyPeriod,
      isSwapAcceptable, credentials } = req.body;

    if (!title || !description || !price || !type) return res.status(400).json({ error: 'بيانات ناقصة' });
    if (+price <= 0) return res.status(400).json({ error: 'السعر يجب أن يكون أكبر من صفر' });

    const autoApprove = await getSetting('autoApproveProducts', false);
    const crystalPrice = await getCrystalPriceUSD();
    const files = req.files as Express.Multer.File[];
    const images: string[] = [];

    for (const file of (files || [])) {
      const url = await uploadToCloudinary(file.buffer, 'marketplace/products');
      images.push(url);
    }

    let credentialsEncrypted = null;
    if (credentials) {
      const creds = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
      credentialsEncrypted = encryptCredentials(creds);
    }

    const product = await Product.create({
      title: title.slice(0, 100),
      description: description.slice(0, 1000),
      price: +price,
      priceUSD: +(+price * crystalPrice).toFixed(2),
      type,
      sellerId: req.dbUser.telegramId,
      sellerName: req.dbUser.username,
      images,
      acceptedPayments: typeof acceptedPayments === 'string' ? JSON.parse(acceptedPayments) : (acceptedPayments || []),
      isNegotiable: isNegotiable === 'true',
      isSwapAcceptable: isSwapAcceptable === 'true',
      warrantyPeriod: warrantyPeriod || 'بدون ضمان',
      isApproved: autoApprove,
      credentialsEncrypted,
    });

    res.json({ success: true, product: { ...product.toObject(), credentialsEncrypted: undefined }, autoApprove });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطأ في إضافة المنتج' });
  }
});

// PUT update product (owner only)
router.put('/:id', auth, upload.array('images', 5), async (req: TgRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    if (product.sellerId !== req.dbUser.telegramId && !['admin', 'owner'].includes(req.dbUser.role))
      return res.status(403).json({ error: 'غير مصرح' });

    const { title, description, price, isNegotiable, warrantyPeriod, credentials } = req.body;
    const files = req.files as Express.Multer.File[];
    const crystalPrice = await getCrystalPriceUSD();
    let images = product.images;

    if (files && files.length > 0) {
      const newImgs = await Promise.all(files.map(f => uploadToCloudinary(f.buffer, 'marketplace/products')));
      images = [...images, ...newImgs].slice(0, 5);
    }

    let credentialsEncrypted = product.credentialsEncrypted;
    if (credentials) {
      const creds = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
      credentialsEncrypted = encryptCredentials(creds);
    }

    await Product.findByIdAndUpdate(req.params.id, {
      ...(title && { title: title.slice(0, 100) }),
      ...(description && { description: description.slice(0, 1000) }),
      ...(price && { price: +price, priceUSD: +(+price * crystalPrice).toFixed(2) }),
      isNegotiable: isNegotiable === 'true',
      warrantyPeriod: warrantyPeriod || product.warrantyPeriod,
      images,
      credentialsEncrypted,
      isApproved: false, // re-approve after edit
    });

    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في التعديل' }); }
});

// DELETE product
router.delete('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    if (product.sellerId !== req.dbUser.telegramId && !['admin', 'owner'].includes(req.dbUser.role))
      return res.status(403).json({ error: 'غير مصرح' });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

// POST validate coupon
router.post('/coupon/validate', auth, async (req: TgRequest, res: Response) => {
  try {
    const { code, amount, storeType } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ error: 'الكوبون غير موجود أو غير نشط' });
    if (new Date() > coupon.expiresAt) return res.status(400).json({ error: 'انتهت صلاحية الكوبون' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'الكوبون مستنفد' });
    if (coupon.usedBy.includes(req.dbUser.telegramId)) return res.status(400).json({ error: 'استخدمت هذا الكوبون من قبل' });
    if (amount < coupon.minPurchase) return res.status(400).json({ error: `الحد الأدنى للشراء: 💎${coupon.minPurchase}` });
    if (coupon.appliesTo !== 'all' && coupon.appliesTo !== storeType) return res.status(400).json({ error: 'الكوبون لا ينطبق على هذا المتجر' });

    const discount = coupon.discountType === 'percent'
      ? Math.floor(amount * coupon.discountValue / 100)
      : Math.min(coupon.discountValue, amount);

    res.json({ valid: true, discount, finalAmount: amount - discount, coupon: { code: coupon.code, type: coupon.discountType, value: coupon.discountValue } });
  } catch { res.status(500).json({ error: 'خطأ في التحقق من الكوبون' }); }
});

export default router;
