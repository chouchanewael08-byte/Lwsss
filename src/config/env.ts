// ── src/config/env.ts ──────────────────────────────────────
// يُحمَّل مرة واحدة عند الإقلاع — يرمي خطأً فورياً إذا غاب أي متغير إلزامي

function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`❌ متغير بيئة مفقود: ${key}\nأضفه في ملف .env`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const ENV = {
  NODE_ENV:    optional('NODE_ENV', 'development'),
  PORT:        parseInt(optional('PORT', '3000')),

  // ── قاعدة البيانات ──
  MONGODB_URI: require('MONGODB_URI'),

  // ── بوت تيليغرام ──
  BOT_TOKEN:   require('BOT_TOKEN'),
  OWNER_ID:    optional('OWNER_ID', ''),

  // ── روابط التطبيق ──
  APP_URL:     require('APP_URL'),
  WEBHOOK_URL: optional('WEBHOOK_URL', ''),

  // ── التشفير — لا fallback أبداً ──
  ENCRYPTION_KEY:  require('ENCRYPTION_KEY'),
  ENCRYPTION_SALT: require('ENCRYPTION_SALT'),

  // ── جلسة التطوير ──
  DEV_SECRET: optional('DEV_SECRET', 'change_in_dev'),

  // ── Cloudinary ──
  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY:    optional('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET', ''),

  // ── إعدادات العملة ──
  DEFAULT_CRYSTAL_PRICE_USD:  parseFloat(optional('DEFAULT_CRYSTAL_PRICE_USD',  '0.01')),
  DEFAULT_COMMISSION_PERCENT: parseFloat(optional('DEFAULT_COMMISSION_PERCENT', '5')),

  // ── Redis ──
  REDIS_URL: optional('REDIS_URL', ''),
} as const;

// ── تحقق إضافي في runtime ──────────────────────────────────
if (ENV.ENCRYPTION_KEY.length < 32)
  throw new Error('❌ ENCRYPTION_KEY يجب أن يكون 32 حرف على الأقل');
if (ENV.ENCRYPTION_SALT.length < 16)
  throw new Error('❌ ENCRYPTION_SALT يجب أن يكون 16 حرف على الأقل');
