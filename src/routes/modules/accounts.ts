import { Router, Response } from 'express';
import { validateTelegramInitData, loadUser, TgRequest } from '../../middleware/auth.js';
import { AccountProduct } from '../../models/index.js';
import { upload, uploadToCloudinary } from '../../lib/upload.js';
import { encryptCredentials } from '../../lib/crypto.js';
import { getSetting, getCrystalPriceUSD } from '../../lib/helpers.js';
import { uploadLimit } from '../../lib/rateLimits.js';

const router = Router();
const auth = [validateTelegramInitData, loadUser];

router.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const open = await getSetting('accountsStoreOpen', true);
    if (!open) return res.json({ products: [], message: 'متجر الحسابات مغلق حالياً' });

    const { page = 1, limit = 20, platform, search, sort = 'newest' } = req.query;
    const filter: any = { isHidden: false, isApproved: true };
    if (platform) filter.platform = platform;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { platform: { $regex: search, $options: 'i' } }
    ];

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }
    };

    const products = await AccountProduct.find(filter)
      .sort(sortMap[sort as string] || { createdAt: -1 })
      .skip((+page - 1) * +limit).limit(+limit)
      .select('-credentialsEncrypted');

    const total = await AccountProduct.countDocuments(filter);
    res.json({ products, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

router.get('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const p = await AccountProduct.findById(req.params.id).select('-credentialsEncrypted');
    if (!p || p.isHidden) return res.status(404).json({ error: 'غير موجود' });
    await AccountProduct.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });
    res.json(p);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

router.post('/', auth, upload.array('images', 5), uploadLimit, async (req: TgRequest, res: Response) => {
  try {
    const { title, description, price, platform, accountAge, accountLevel,
      followersCount, region, extras, isNegotiable, warrantyPeriod, credentials } = req.body;

    if (!title || !description || !price || !platform) return res.status(400).json({ error: 'بيانات ناقصة' });

    const autoApprove = await getSetting('autoApproveProducts', false);
    const crystalPrice = await getCrystalPriceUSD();
    const files = req.files as Express.Multer.File[];
    const images: string[] = [];

    for (const f of (files || [])) {
      images.push(await uploadToCloudinary(f.buffer, 'marketplace/accounts'));
    }

    let credentialsEncrypted = null;
    if (credentials) {
      const creds = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
      credentialsEncrypted = encryptCredentials(creds);
    }

    const product = await AccountProduct.create({
      title: title.slice(0, 100), description: description.slice(0, 1000),
      price: +price, priceUSD: +(+price * crystalPrice).toFixed(2),
      platform, sellerId: req.dbUser.telegramId, sellerName: req.dbUser.username,
      images, accountAge: accountAge || '', accountLevel: accountLevel || '',
      followersCount: followersCount || '', region: region || '', extras: extras || '',
      isNegotiable: isNegotiable === 'true', warrantyPeriod: warrantyPeriod || 'بدون ضمان',
      acceptedPayments: req.body.acceptedPayments ? JSON.parse(req.body.acceptedPayments) : [],
      isApproved: autoApprove, credentialsEncrypted,
    });

    res.json({ success: true, product: { ...product.toObject(), credentialsEncrypted: undefined }, autoApprove });
  } catch (err: any) { res.status(500).json({ error: err.message || 'خطأ' }); }
});

router.put('/:id', auth, upload.array('images', 5), async (req: TgRequest, res: Response) => {
  try {
    const p = await AccountProduct.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'غير موجود' });
    if (p.sellerId !== req.dbUser.telegramId && !['admin', 'owner'].includes(req.dbUser.role))
      return res.status(403).json({ error: 'غير مصرح' });

    const files = req.files as Express.Multer.File[];
    const images = files?.length
      ? [...p.images, ...await Promise.all(files.map(f => uploadToCloudinary(f.buffer, 'marketplace/accounts')))].slice(0, 5)
      : p.images;

    let credentialsEncrypted = p.credentialsEncrypted;
    if (req.body.credentials) {
      credentialsEncrypted = encryptCredentials(JSON.parse(req.body.credentials));
    }

    await AccountProduct.findByIdAndUpdate(req.params.id, { ...req.body, images, credentialsEncrypted, isApproved: false });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

router.delete('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const p = await AccountProduct.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'غير موجود' });
    if (p.sellerId !== req.dbUser.telegramId && !['admin', 'owner'].includes(req.dbUser.role))
      return res.status(403).json({ error: 'غير مصرح' });
    await AccountProduct.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

export default router;
