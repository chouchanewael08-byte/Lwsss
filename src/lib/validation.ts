// ── src/lib/validation.ts ────────────────────────────────────
// جميع Zod schemas + validate middleware

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ─── Wallet ───────────────────────────────────────────────────
export const depositSchema = z.object({
  amount:        z.coerce.number().positive().min(1).max(1_000_000),
  paymentMethod: z.enum(['baridimob','ccp','usdt','binance','flexy','telegram_stars']),
  proofImage:    z.string().url().optional().nullable(),
});

export const withdrawSchema = z.object({
  amount:  z.coerce.number().positive().min(1).max(1_000_000),
  paymentMethod: z.enum(['baridimob','ccp','usdt','binance','flexy']),
  accountInfo: z.string().max(500).optional(),
});

// ─── Ticket ───────────────────────────────────────────────────
export const ticketCreateSchema = z.object({
  productId:     z.string().min(1).max(100),
  productType:   z.enum(['market','accounts']),
  paymentMethod: z.enum(['crystals','baridimob','ccp','usdt','binance','flexy']),
  couponCode:    z.string().max(30).optional().nullable(),
});

// ─── Admin ────────────────────────────────────────────────────
export const adjustSchema = z.object({
  userId:      z.string().min(1),
  amount:      z.coerce.number().min(-1_000_000).max(1_000_000),
  currency:    z.enum(['crystals','stars']),
  type:        z.string().optional(),
  description: z.string().min(1).max(300),
});

export const banSchema = z.object({
  reason: z.string().min(3).max(300),
});

export const roleSchema = z.object({
  role: z.enum(['user','moderator','admin']),
});

// ─── Product ──────────────────────────────────────────────────
export const productSchema = z.object({
  title:       z.string().min(3).max(100).trim(),
  description: z.string().min(10).max(1000),
  price:       z.coerce.number().positive().max(999_999),
  type:        z.string().min(1).max(50),
});

export const accountProductSchema = z.object({
  title:         z.string().min(3).max(100).trim(),
  description:   z.string().min(10).max(1000),
  platform:      z.string().min(1).max(50),
  price:         z.coerce.number().positive().max(999_999),
  isNegotiable:  z.boolean().optional(),
  warrantyPeriod: z.string().max(50).optional(),
});

// ─── Chat ─────────────────────────────────────────────────────
export const chatMessageSchema = z.object({
  text: z.string().min(1).max(1000).trim(),
});

// ─── Review ───────────────────────────────────────────────────
export const reviewSchema = z.object({
  ticketId: z.string().min(1),
  rating:   z.number().int().min(1).max(5),
  comment:  z.string().max(500).optional(),
  type:     z.enum(['seller','buyer']),
});

// ─── Middleware ───────────────────────────────────────────────
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message || 'بيانات غير صحيحة';
      return res.status(400).json({ error: msg, details: result.error.issues });
    }
    req.body = result.data; // بيانات محققة ونظيفة
    next();
  };
}

// ─── Type exports ─────────────────────────────────────────────
export type DepositInput        = z.infer<typeof depositSchema>;
export type WithdrawInput       = z.infer<typeof withdrawSchema>;
export type TicketCreateInput   = z.infer<typeof ticketCreateSchema>;
export type ProductInput        = z.infer<typeof productSchema>;
