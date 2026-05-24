// ── __tests__/crypto.test.ts ──────────────────────────────────
import crypto from 'crypto';

// نسخة مبسطة من دوال التشفير للاختبار
const ALGO = 'aes-256-gcm';

function getKey(encryptionKey: string, salt: string): Buffer {
  return crypto.scryptSync(encryptionKey, salt, 32);
}

function encrypt(obj: Record<string, string>, key: string, salt: string): string {
  const k       = getKey(key, salt);
  const iv      = crypto.randomBytes(16);
  const cipher  = crypto.createCipheriv(ALGO, k, iv);
  const enc     = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag     = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decrypt(encrypted: string, key: string, salt: string): Record<string, string> | null {
  try {
    const k = getKey(key, salt);
    const [ivHex, tagHex, dataHex] = encrypted.split(':');
    const decipher = crypto.createDecipheriv(ALGO, k, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8'));
  } catch { return null; }
}

const KEY  = 'a'.repeat(32);
const SALT = 'test_salt_value_16ch';

describe('AES-256-GCM Encryption', () => {
  it('يشفر ويفك تشفير البيانات', () => {
    const data = { username: 'user@example.com', password: 'secret123' };
    const enc  = encrypt(data, KEY, SALT);
    expect(decrypt(enc, KEY, SALT)).toEqual(data);
  });

  it('كل تشفير ينتج نصاً مختلفاً (IV عشوائي)', () => {
    const data = { test: 'value' };
    const e1 = encrypt(data, KEY, SALT);
    const e2 = encrypt(data, KEY, SALT);
    expect(e1).not.toBe(e2);
  });

  it('يرفض فك التشفير بمفتاح خاطئ', () => {
    const enc = encrypt({ x: '1' }, KEY, SALT);
    expect(decrypt(enc, 'b'.repeat(32), SALT)).toBeNull();
  });

  it('يرفض فك التشفير ببيانات مزورة', () => {
    expect(decrypt('fakehex:fakehex:fakehex', KEY, SALT)).toBeNull();
  });

  it('يحفظ Unicode (عربي)', () => {
    const data = { desc: 'منتج رائع 💎' };
    expect(decrypt(encrypt(data, KEY, SALT), KEY, SALT)).toEqual(data);
  });
});
