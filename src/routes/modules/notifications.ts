import { Router, Response } from 'express';
import { validateTelegramInitData, loadUser, TgRequest } from '../../middleware/auth.js';
import { Notification } from '../../models/notification.js';
const router = Router();
const auth = [validateTelegramInitData, loadUser];
router.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const uid  = req.dbUser.telegramId;
    const list = await Notification.find({ userId: uid })
      .sort({ createdAt: -1 }).skip((+page-1)*+limit).limit(+limit).lean();
    const unread = await Notification.countDocuments({ userId: uid, isRead: false });
    res.json({ notifications: list, unreadCount: unread });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
router.patch('/:id/read', auth, async (req: TgRequest, res: Response) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.dbUser.telegramId }, { isRead: true });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
router.patch('/read-all', auth, async (req: TgRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.dbUser.telegramId, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
router.delete('/clear', auth, async (req: TgRequest, res: Response) => {
  try {
    await Notification.deleteMany({ userId: req.dbUser.telegramId });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});
export default router;
