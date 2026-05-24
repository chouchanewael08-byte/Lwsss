import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const keyByUser = (req: Request): string => {
  const userId = (req as any).telegramUser?.id || (req as any).dbUser?.telegramId;
  return userId || req.ip || 'unknown';
};
const jsonError = (msg: string) => (_: Request, res: Response) =>
  res.status(429).json({ error: msg });

export const generalLimit   = rateLimit({ windowMs: 15*60*1000,    max: 200, keyGenerator: keyByUser, handler: jsonError('طلبات كثيرة، انتظر قليلاً'),          standardHeaders: true, legacyHeaders: false });
export const authLimit      = rateLimit({ windowMs:    60*1000,    max: 30,  keyGenerator: keyByUser, handler: jsonError('محاولات كثيرة، انتظر دقيقة')          });
export const purchaseLimit  = rateLimit({ windowMs:    60*1000,    max: 5,   keyGenerator: keyByUser, handler: jsonError('اشتريت كثيراً، انتظر دقيقة')           });
export const bidLimit       = rateLimit({ windowMs:    60*1000,    max: 10,  keyGenerator: keyByUser, handler: jsonError('مزايدات كثيرة، انتظر قليلاً')          });
export const messageLimit   = rateLimit({ windowMs:    60*1000,    max: 30,  keyGenerator: keyByUser, handler: jsonError('رسائل كثيرة جداً')                     });
export const uploadLimit    = rateLimit({ windowMs: 10*60*1000,    max: 10,  keyGenerator: keyByUser, handler: jsonError('رفعت ملفات كثيرة، انتظر')              });
export const broadcastLimit = rateLimit({ windowMs: 60*60*1000,    max: 3,   keyGenerator: keyByUser, handler: jsonError('يمكنك 3 broadcasts كل ساعة فقط')       });
export const withdrawLimit  = rateLimit({ windowMs: 24*60*60*1000, max: 3,   keyGenerator: keyByUser, handler: jsonError('يمكنك 3 طلبات سحب يومياً فقط')         });

export const chatLimit = rateLimit({ windowMs: 60*1000, max: 40, keyGenerator: keyByUser, handler: jsonError('رسائل كثيرة جداً') });
export const taskLimit = rateLimit({ windowMs: 60*1000, max: 20, keyGenerator: keyByUser, handler: jsonError('طلبات كثيرة، انتظر قليلاً') });
