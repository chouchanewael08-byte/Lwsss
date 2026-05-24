// ── __tests__/wallet.test.ts ──────────────────────────────────
// اختبارات منطق المحفظة بدون DB

function calcNetAmount(amount: number, commissionPercent: number): { commission: number; net: number } {
  const commission = Math.ceil(amount * commissionPercent / 100);
  return { commission, net: amount - commission };
}

function isBalanceSufficient(balance: number, amount: number): boolean {
  return balance >= amount;
}

function generateReference(type: 'DEP' | 'WIT', userId: string): string {
  return `${type}-${Date.now()}-${userId.slice(-4)}`;
}

describe('Wallet Logic', () => {
  describe('حساب العمولة', () => {
    it('5% على 1000 = 50 عمولة', () => {
      expect(calcNetAmount(1000, 5)).toEqual({ commission: 50, net: 950 });
    });
    it('يُقرّب لأعلى (Math.ceil)', () => {
      const r = calcNetAmount(101, 5); // 5.05 → 6
      expect(r.commission).toBe(6);
      expect(r.net).toBe(95);
    });
    it('0% عمولة = كل المبلغ للبائع', () => {
      expect(calcNetAmount(500, 0)).toEqual({ commission: 0, net: 500 });
    });
  });

  describe('فحص الرصيد', () => {
    it('رصيد كافٍ', () => expect(isBalanceSufficient(1000, 500)).toBe(true));
    it('رصيد بالضبط', () => expect(isBalanceSufficient(500, 500)).toBe(true));
    it('رصيد غير كافٍ', () => expect(isBalanceSufficient(499, 500)).toBe(false));
    it('رصيد صفر', () => expect(isBalanceSufficient(0, 1)).toBe(false));
  });

  describe('توليد المرجع', () => {
    it('يبدأ بالنوع الصحيح', () => {
      expect(generateReference('DEP', '123456789')).toMatch(/^DEP-/);
      expect(generateReference('WIT', '123456789')).toMatch(/^WIT-/);
    });
    it('كل مرجع فريد', () => {
      const r1 = generateReference('DEP', '123');
      const r2 = generateReference('DEP', '123');
      // احتمال تكرار مستحيل تقريباً
      expect(r1).not.toBe(r2);
    });
  });
});
