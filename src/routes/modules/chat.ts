import { Router, Response } from 'express';
import { validateTelegramInitData, loadUser, TgRequest } from '../../middleware/auth.js';
import { Chat } from '../../models/index.js';
import { chatLimit } from '../../lib/rateLimits.js';
import { emitToUser } from '../../lib/helpers.js';
import { notifyNewMessage } from '../../lib/telegram.js';
import { ENV } from '../../config/env.js';

export const chatRouter = Router();
const auth = [validateTelegramInitData, loadUser];

chatRouter.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const uid = req.dbUser.telegramId;
    const chats = await Chat.find({ $or: [{ buyerId: uid }, { sellerId: uid }], isOpen: true })
      .sort({ updatedAt: -1 }).select('-messages');
    res.json(chats);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

chatRouter.get('/:id', auth, async (req: TgRequest, res: Response) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'غير موجود' });
    const uid = req.dbUser.telegramId;
    if (chat.buyerId !== uid && chat.sellerId !== uid) return res.status(403).json({ error: 'غير مصرح' });
    res.json(chat);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

chatRouter.post('/start', auth, async (req: TgRequest, res: Response) => {
  try {
    const { productId, productType, sellerId, sellerName } = req.body;
    const buyerId = req.dbUser.telegramId;
    if (buyerId === sellerId) return res.status(400).json({ error: 'لا يمكنك مراسلة نفسك' });

    let chat = await Chat.findOne({ productId, buyerId, isOpen: true });
    if (!chat) {
      chat = await Chat.create({
        productId, productType: productType || 'market',
        buyerId, sellerId, sellerName,
        messages: [{ senderId: 'system', senderName: 'النظام', text: '💬 بدأت محادثة جديدة. يمكنكما التفاوض على السعر.', isSystem: true, timestamp: new Date() }]
      });
    }
    res.json(chat);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

chatRouter.post('/:id/message', auth, chatLimit, async (req: TgRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'الرسالة فارغة' });
    if (text.length > 1000) return res.status(400).json({ error: 'الرسالة طويلة جداً' });

    // Block external links for security
    const urlPattern = /https?:\/\/|t\.me\/|@\w+/gi;
    if (urlPattern.test(text)) return res.status(400).json({ error: 'لا يسمح بمشاركة روابط خارجية في المحادثة' });

    const chat = await Chat.findById(req.params.id);
    if (!chat || !chat.isOpen) return res.status(404).json({ error: 'المحادثة غير موجودة أو مغلقة' });
    const uid = req.dbUser.telegramId;
    if (chat.buyerId !== uid && chat.sellerId !== uid) return res.status(403).json({ error: 'غير مصرح' });

    const msg = { senderId: uid, senderName: req.dbUser.username, text: text.trim(), isSystem: false, timestamp: new Date() };
    await Chat.findByIdAndUpdate(req.params.id, { $push: { messages: msg } });

    const otherId = uid === chat.buyerId ? chat.sellerId : chat.buyerId;
    emitToUser(otherId, 'new_chat_message', { chatId: req.params.id, message: msg });
    await notifyNewMessage(otherId, req.dbUser.username, 'منتج', ENV.APP_URL);

    res.json({ success: true, message: msg });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

chatRouter.post('/:id/agree', auth, async (req: TgRequest, res: Response) => {
  try {
    const { agreedPrice } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'غير موجود' });
    await Chat.findByIdAndUpdate(req.params.id, { hasDeal: true, agreedPrice: +agreedPrice });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
