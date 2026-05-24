import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

export interface TgRequest extends Request {
  telegramUser?: { id: string; username: string; fullName: string; };
  dbUser?: any;
}

const DEV_SECRET = process.env.DEV_SECRET || 'change_this_in_env';

export function validateTelegramInitData(req: TgRequest, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;
  if (ENV.NODE_ENV === 'development') {
    if (!initData || initData === `dev:${DEV_SECRET}`) {
      req.telegramUser = { id: 'dev_user_1', username: 'dev_user', fullName: 'Dev User' };
      return next();
    }
  }
  if (!initData || initData.length === 0) {
    // initData فارغ — تيليغرام أحياناً يعطيها فارغة في أول تحميل
    return res.status(401).json({ error: 'أعد فتح التطبيق من تيليغرام', code: 'RELOAD' });
  }
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return res.status(401).json({ error: 'hash مفقود' });
    urlParams.delete('hash');
    const dataCheckString = [...urlParams.entries()]
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k,v]) => `${k}=${v}`).join('\n');
    const secretKey    = crypto.createHmac('sha256','WebAppData').update(ENV.BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hash,'hex'), Buffer.from(expectedHash,'hex')))
      return res.status(401).json({ error: 'بيانات غير صحيحة' });
    if (Date.now()/1000 - parseInt(urlParams.get('auth_date') || '0') > 86400)
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة، أعد فتح التطبيق' });
    const user = JSON.parse(urlParams.get('user') || '{}');
    req.telegramUser = {
      id:       String(user.id),
      username: user.username || `user${user.id}`,
      fullName: `${user.first_name||''} ${user.last_name||''}`.trim(),
    };
    next();
  } catch { return res.status(401).json({ error: 'فشل التحقق من الهوية' }); }
}

export async function loadUser(req: TgRequest, res: Response, next: NextFunction) {
  if (!req.telegramUser) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const { User, Wallet } = await import('../models/index.js');
    let user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) {
      user = await User.create({
        telegramId: req.telegramUser.id,
        username:   req.telegramUser.username,
        fullName:   req.telegramUser.fullName,
      });
      await Wallet.create({ userId: req.telegramUser.id });
    }
    if (user.isBanned) return res.status(403).json({ error: 'حسابك محظور. السبب: ' + user.banReason });
    User.findOneAndUpdate({ telegramId: req.telegramUser.id }, { lastActiveAt: new Date() }).catch(()=>{});
    if (req.telegramUser.id === ENV.OWNER_ID && user.role !== 'owner') {
      await User.findOneAndUpdate({ telegramId: req.telegramUser.id }, { role: 'owner' });
      user.role = 'owner';
    }
    req.dbUser = user;
    next();
  } catch {
    if (req.telegramUser?.id === ENV.OWNER_ID) {
      req.dbUser = { telegramId: req.telegramUser.id, username: req.telegramUser.username, fullName: req.telegramUser.fullName, role: 'owner', isBanned: false, stars: 0, crystals: 0 };
      return next();
    }
    return res.status(500).json({ error: 'خطأ في تحميل بيانات المستخدم' });
  }
}

export async function ensureAdmin(req: TgRequest, res: Response, next: NextFunction) {
  if (!req.dbUser || !['admin','owner'].includes(req.dbUser.role))
    return res.status(403).json({ error: 'صلاحيات غير كافية' });
  next();
}
export async function ensureOwner(req: TgRequest, res: Response, next: NextFunction) {
  if (!req.dbUser || req.dbUser.role !== 'owner')
    return res.status(403).json({ error: 'للمالك فقط' });
  next();
}
export async function ensureMod(req: TgRequest, res: Response, next: NextFunction) {
  if (!req.dbUser || !['moderator','admin','owner'].includes(req.dbUser.role))
    return res.status(403).json({ error: 'صلاحيات غير كافية' });
  next();
}
