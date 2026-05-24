# 🏪 Marketplace — Telegram Mini App

سوق رقمي متكامل يعمل كـ Telegram Mini App مع نظام إيسكرو، دردشة فورية، ومزادات.

---

## ⚡ التشغيل السريع

```bash
# 1. نسخ إعدادات البيئة
cp .env.example .env
# ثم عدّل .env بقيمك الحقيقية

# 2. توليد مفاتيح التشفير الآمنة
node -e "console.log('KEY:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SALT:', require('crypto').randomBytes(32).toString('hex'))"

# 3. تثبيت الحزم
npm install

# 4. تشغيل التطوير
npm run dev
```

---

## 🏗️ بنية المشروع

```
marketplace/
├── server.ts              # نقطة الإقلاع — Express + Bot + Socket.io
├── src/
│   ├── bot/
│   │   ├── handlers.ts    # كل handlers البوت
│   │   └── state.ts       # إدارة حالة المحادثة (MongoDB)
│   ├── config/
│   │   ├── env.ts         # متغيرات البيئة — يرمي خطأ فورياً إن غابت
│   │   └── database.ts    # اتصال MongoDB
│   ├── jobs/
│   │   ├── auction.ts     # job إغلاق المزادات
│   │   ├── autoComplete.ts # job الإكمال التلقائي (24 ساعة)
│   │   ├── queues.ts      # إعداد BullMQ
│   │   └── workers.ts     # Workers مع Fallback لـ setInterval
│   ├── lib/
│   │   ├── botSingleton.ts # نسخة واحدة من البوت — الحل الرسمي
│   │   ├── crypto.ts      # AES-256-GCM تشفير/فك تشفير
│   │   ├── helpers.ts     # Socket.io emit، Settings cache، Wallet
│   │   ├── rateLimits.ts  # Rate limiting منفصل لكل عملية
│   │   ├── telegram.ts    # Telegram API helpers
│   │   └── validation.ts  # Zod schemas + validate middleware
│   ├── middleware/
│   │   └── auth.ts        # HMAC verification + loadUser + roles
│   ├── models/
│   │   ├── index.ts       # re-export مركزي فقط
│   │   ├── user.ts
│   │   ├── product.ts     # Product + AccountProduct
│   │   ├── wallet.ts      # Wallet + Transaction (مستقلة)
│   │   ├── ticket.ts
│   │   ├── chat.ts
│   │   ├── auction.ts
│   │   ├── botState.ts    # TTL: 24 ساعة تلقائياً
│   │   └── misc.ts        # Task, Coupon, Swap, Settings ...
│   ├── routes/modules/    # Route لكل وحدة
│   └── socket/
│       └── index.ts       # Socket.io مع HMAC verification
├── __tests__/             # Jest tests
├── .env.example           # قالب — بدون بيانات حقيقية أبداً
└── migrate_transactions.ts # هجرة بيانات لمرة واحدة
```

---

## 🔐 الأمان

| الطبقة | الآلية |
|--------|--------|
| هوية المستخدم | HMAC-SHA256 + timingSafeEqual |
| التشفير | AES-256-GCM + IV عشوائي |
| HTTP | Helmet CSP + CORS محدود |
| API | Rate Limiting منفصل لكل endpoint |
| Socket | HMAC verification قبل join |
| DB | MongoDB Transactions للعمليات الحرجة |

---

## 🔑 متغيرات البيئة المهمة

| المتغير | الوصف | إلزامي |
|---------|-------|--------|
| `MONGODB_URI` | رابط MongoDB | ✅ |
| `BOT_TOKEN` | توكن البوت من @BotFather | ✅ |
| `ENCRYPTION_KEY` | مفتاح تشفير — 32 حرف على الأقل | ✅ |
| `ENCRYPTION_SALT` | salt التشفير — 16 حرف على الأقل | ✅ |
| `APP_URL` | رابط التطبيق | ✅ |
| `REDIS_URL` | Redis لـ BullMQ (اختياري) | ⬜ |

> ⚠️ لا تضع قيماً حقيقية في `.env.example` — فقط في `.env` المُضاف للـ `.gitignore`

---

## 🗄️ الهجرة من الإصدار القديم

إذا كان عندك بيانات قديمة بـ transactions مدمجة في Wallet:

```bash
npx tsx migrate_transactions.ts
```

---

## 🧪 الاختبارات

```bash
npm test            # كل الاختبارات
npm run test:watch  # وضع المراقبة
npm run test:cov    # مع تغطية الكود
```

---

## 🚀 النشر على Railway

```bash
railway login
railway init
railway up
```

تأكد من ضبط متغيرات البيئة في لوحة Railway قبل النشر.

---

## 📡 API

جميع الـ endpoints متاحة على `/api/` و `/api/v1/` (متكافئان).

| المسار | الوصف |
|--------|-------|
| `GET /api/v1/wallet` | رصيد المحفظة |
| `GET /api/v1/wallet/transactions` | سجل المعاملات (paginated) |
| `POST /api/v1/tickets` | إنشاء طلب شراء |
| `GET /api/v1/products` | قائمة المنتجات |
| `GET /api/v1/auctions` | المزادات النشطة |
| `GET /health` | فحص الخادم |
