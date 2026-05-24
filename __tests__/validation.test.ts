// ── __tests__/validation.test.ts ─────────────────────────────
import { depositSchema, withdrawSchema, productSchema, banSchema } from '../src/lib/validation.js';

describe('Deposit Schema', () => {
  it('يقبل إيداعاً صحيحاً', () => {
    const r = depositSchema.safeParse({ amount: 500, paymentMethod: 'usdt' });
    expect(r.success).toBe(true);
  });
  it('يرفض مبلغاً سالباً', () => {
    expect(depositSchema.safeParse({ amount: -1, paymentMethod: 'usdt' }).success).toBe(false);
  });
  it('يرفض طريقة دفع غير مدعومة', () => {
    expect(depositSchema.safeParse({ amount: 100, paymentMethod: 'paypal' }).success).toBe(false);
  });
  it('يرفض مبلغاً أكبر من الحد', () => {
    expect(depositSchema.safeParse({ amount: 2_000_000, paymentMethod: 'usdt' }).success).toBe(false);
  });
  it('يقبل proofImage اختيارياً', () => {
    const r = depositSchema.safeParse({ amount: 100, paymentMethod: 'baridimob', proofImage: 'https://example.com/img.jpg' });
    expect(r.success).toBe(true);
  });
});

describe('Withdraw Schema', () => {
  it('يقبل سحباً صحيحاً', () => {
    expect(withdrawSchema.safeParse({ amount: 1000, method: 'usdt' }).success).toBe(true);
  });
  it('يرفض 0', () => {
    expect(withdrawSchema.safeParse({ amount: 0, method: 'usdt' }).success).toBe(false);
  });
  it('يرفض telegram_stars (غير مدعوم للسحب)', () => {
    expect(withdrawSchema.safeParse({ amount: 100, method: 'telegram_stars' }).success).toBe(false);
  });
});

describe('Product Schema', () => {
  it('يقبل منتجاً صحيحاً', () => {
    const r = productSchema.safeParse({ title: 'حساب فيسبوك', description: 'وصف تفصيلي للمنتج هنا', price: 500, type: 'social' });
    expect(r.success).toBe(true);
  });
  it('يرفض عنواناً قصيراً', () => {
    expect(productSchema.safeParse({ title: 'ab', description: 'وصف طويل بما يكفي', price: 100, type: 'x' }).success).toBe(false);
  });
  it('يرفض سعراً سالباً', () => {
    expect(productSchema.safeParse({ title: 'عنوان صحيح', description: 'وصف طويل بما يكفي', price: -5, type: 'x' }).success).toBe(false);
  });
  it('يقطع المسافات (trim)', () => {
    const r = productSchema.safeParse({ title: '  عنوان  ', description: 'وصف طويل بما يكفي', price: 100, type: 'x' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe('عنوان');
  });
});

describe('Ban Schema', () => {
  it('يرفض سبباً قصيراً جداً', () => {
    expect(banSchema.safeParse({ reason: 'ab' }).success).toBe(false);
  });
  it('يقبل سبباً معقولاً', () => {
    expect(banSchema.safeParse({ reason: 'انتهاك قواعد المجتمع' }).success).toBe(true);
  });
});
