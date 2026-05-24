// ── __tests__/auth.test.ts ────────────────────────────────────
import * as crypto from 'crypto';

function verifyInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;
    urlParams.delete('hash');
    const dataCheckString = [...urlParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expected  = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}

function makeInitData(userId: number, botToken: string, ageSeconds = 0): string {
  const user     = JSON.stringify({ id: userId, first_name: 'Test' });
  const authDate = Math.floor(Date.now() / 1000) - ageSeconds;
  const params   = new URLSearchParams({ user, auth_date: String(authDate) });
  const dcs      = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash      = crypto.createHmac('sha256', secretKey).update(dcs).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

const BOT_TOKEN = 'test_bot_token_123';

describe('Telegram initData verification', () => {
  it('يتحقق من initData صحيح', () => {
    expect(verifyInitData(makeInitData(123456, BOT_TOKEN), BOT_TOKEN)).toBe(true);
  });
  it('يرفض initData مزور', () => {
    expect(verifyInitData('user=fake&hash=abc123', BOT_TOKEN)).toBe(false);
  });
  it('يرفض hash فارغ', () => {
    expect(verifyInitData('user=test', BOT_TOKEN)).toBe(false);
  });
  it('يرفض توكن مختلف', () => {
    expect(verifyInitData(makeInitData(123456, BOT_TOKEN), 'wrong_token')).toBe(false);
  });
  it('يرفض hash قصير جداً (يمنع Buffer length mismatch crash)', () => {
    expect(verifyInitData('user=test&hash=abc', BOT_TOKEN)).toBe(false);
  });
  it('يتحقق من مستخدمين مختلفين', () => {
    const d1 = makeInitData(111, BOT_TOKEN);
    const d2 = makeInitData(222, BOT_TOKEN);
    expect(verifyInitData(d1, BOT_TOKEN)).toBe(true);
    expect(verifyInitData(d2, BOT_TOKEN)).toBe(true);
    expect(d1).not.toBe(d2);
  });
});
