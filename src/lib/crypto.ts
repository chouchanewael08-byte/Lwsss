// ── src/lib/crypto.ts ─────────────────────────────────────────
import crypto from 'crypto';
import { ENV } from '../config/env.js';

const ALGO = 'aes-256-gcm';

// مفتاح يُحسب مرة واحدة — ENV يتحقق من وجود ENCRYPTION_SALT عند الإقلاع
let _key: Buffer | null = null;
function getKey(): Buffer {
  if (_key) return _key;
  _key = crypto.scryptSync(ENV.ENCRYPTION_KEY, ENV.ENCRYPTION_SALT, 32);
  return _key;
}

export function encryptCredentials(obj: Record<string, string>): string {
  const key       = getKey();
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag       = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredentials(encrypted: string): Record<string, string> | null {
  try {
    const key = getKey();
    const [ivHex, tagHex, dataHex] = encrypted.split(':');
    if (!ivHex || !tagHex || !dataHex) return null;
    const iv       = Buffer.from(ivHex,  'hex');
    const tag      = Buffer.from(tagHex, 'hex');
    const data     = Buffer.from(dataHex,'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'));
  } catch { return null; }
}
