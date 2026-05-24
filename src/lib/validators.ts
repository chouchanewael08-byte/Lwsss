import { z } from 'zod';

export const depositSchema = z.object({
  amount:        z.number().positive().min(1).max(1_000_000),
  paymentMethod: z.enum(['baridimob','ccp','usdt','binance','flexy','telegram_stars']),
  proofImage:    z.string().url().optional(),
});

export const withdrawSchema = z.object({
  amount:  z.number().positive().min(1).max(1_000_000),
  method:  z.enum(['baridimob','ccp','usdt','binance','flexy']),
  details: z.string().max(500).optional(),
});

export const productSchema = z.object({
  title:       z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  price:       z.number().positive().min(1).max(999_999),
  type:        z.string().min(1),
});

export const bidSchema = z.object({
  amount: z.number().positive().min(1),
});

export const reviewSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// Middleware
import { Request, Response, NextFunction } from 'express';
export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: result.error.issues[0].message });
    req.body = result.data;
    next();
  };
}
