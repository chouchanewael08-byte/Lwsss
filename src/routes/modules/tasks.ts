import { Router, Response } from 'express';
import { validateTelegramInitData, loadUser, ensureAdmin, TgRequest } from '../../middleware/auth.js';
import { Task, User } from '../../models/index.js';
import { getOrCreateWallet } from '../../lib/helpers.js';
import { checkChannelMembership } from '../../lib/telegram.js';
import { taskLimit } from '../../lib/rateLimits.js';

const router = Router();
const auth = [validateTelegramInitData, loadUser];

router.get('/', auth, async (req: TgRequest, res: Response) => {
  try {
    const tasks = await Task.find({ isActive: true }).select('-completedBy');
    const userId = req.dbUser.telegramId;
    const withStatus = await Promise.all(tasks.map(async t => {
      const completed = t.completedBy.includes(userId);
      return { ...t.toObject(), completed };
    }));
    res.json(withStatus);
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

// Complete task with REAL verification
router.post('/:id/complete', auth, taskLimit, async (req: TgRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.isActive) return res.status(404).json({ error: 'المهمة غير موجودة' });

    const userId = req.dbUser.telegramId;
    if (task.completedBy.includes(userId)) return res.status(400).json({ error: 'أنجزت هذه المهمة من قبل' });

    // Real verification by task type
    if (task.type === 'channel_join') {
      if (!task.channelId) return res.status(400).json({ error: 'لم يتم تحديد القناة' });
      const isMember = await checkChannelMembership(task.channelId, userId);
      if (!isMember) return res.status(400).json({
        error: 'لم يتم التحقق من اشتراكك في القناة. تأكد من الاشتراك ثم حاول مجدداً.',
        verified: false
      });
    }

    if (task.type === 'invite') {
      const referralCount = req.dbUser.referralCount || 0;
      if (referralCount < 1) return res.status(400).json({ error: 'لم تدعُ أي صديق بعد' });
    }

    // Add stars
    await Task.findByIdAndUpdate(req.params.id, { $push: { completedBy: userId } });
    await User.findOneAndUpdate({ telegramId: userId }, { $inc: { stars: task.starsReward } });
    const wallet = await getOrCreateWallet(userId);
    wallet.stars = (wallet.stars || 0) + task.starsReward;
    wallet.transactions.push({
      type: 'stars_earned', amount: task.starsReward, currency: 'stars',
      status: 'completed', description: `مهمة: ${task.title}`, timestamp: new Date()
    });
    await wallet.save();

    res.json({ success: true, starsEarned: task.starsReward, totalStars: wallet.stars });
  } catch { res.status(500).json({ error: 'خطأ في إنجاز المهمة' }); }
});

// Admin: create task
router.post('/', auth, ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    const { title, description, icon, starsReward, type, link, channelId } = req.body;
    if (!title || !starsReward || !type) return res.status(400).json({ error: 'بيانات ناقصة' });
    const task = await Task.create({ title, description, icon: icon || '🎯', starsReward: +starsReward, type, link, channelId });
    res.json({ success: true, task });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

router.put('/:id', auth, ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

router.delete('/:id', auth, ensureAdmin, async (req: TgRequest, res: Response) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ' }); }
});

export default router;
