// ── server.ts ─────────────────────────────────────────────────
// نقطة الإقلاع الرئيسية — مسؤوليته الوحيدة: تهيئة الخادم والتشغيل

import 'dotenv/config';
import 'express-async-errors';
import { log } from './src/lib/logger.js';
import { ENV } from './src/config/env.js';

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './src/config/database.js';
import { initBot } from './src/lib/botSingleton.js';
import { registerBotHandlers } from './src/bot/handlers.js';
import { setupSocket } from './src/socket/index.js';
import { setupQueues } from './src/jobs/queues.js';
import { startWorkers } from './src/jobs/workers.js';
import { getSetting, setSetting } from './src/lib/helpers.js';
import { generalLimit } from './src/lib/rateLimits.js';

// ── Routes ────────────────────────────────────────────────────
import productsRoute  from './src/routes/modules/products.js';
import accountsRoute  from './src/routes/modules/accounts.js';
import tasksRoute     from './src/routes/modules/tasks.js';
import ticketsRoute   from './src/routes/modules/tickets.js';
import walletRoute    from './src/routes/modules/wallet.js';
import adminRoute     from './src/routes/modules/admin.js';
import { chatRouter } from './src/routes/modules/chat.js';
import { pointsRouter, couponRouter, auctionRouter, swapRouter, userRouter } from './src/routes/modules/others.js';
import notificationsRoute from './src/routes/modules/notifications.js';
import leaderboardRoute   from './src/routes/modules/leaderboard.js';
import reviewsRoute       from './src/routes/modules/reviews.js';
import wishlistRoute      from './src/routes/modules/wishlist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Express ───────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// ── Socket.io ─────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: ENV.APP_URL, credentials: true },
});
setupSocket(io);

// ── Security Middleware ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://telegram.org"],
      connectSrc: ["'self'", "wss:", "https:"],
      imgSrc:     ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: (origin, cb) => {
    const ALLOWED = [
      ENV.APP_URL,
      'https://web.telegram.org',
      'https://webk.telegram.org',
    ].filter(Boolean);
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(generalLimit);

// ── API Routes (v1) ───────────────────────────────────────────
const v1 = express.Router();
v1.use('/products',      productsRoute);
v1.use('/accounts',      accountsRoute);
v1.use('/tasks',         tasksRoute);
v1.use('/tickets',       ticketsRoute);
v1.use('/wallet',        walletRoute);
v1.use('/admin',         adminRoute);
v1.use('/chat',          chatRouter);
v1.use('/points-store',  pointsRouter);
v1.use('/coupons',       couponRouter);
v1.use('/auctions',      auctionRouter);
v1.use('/swap',          swapRouter);
v1.use('/user',          userRouter);
v1.use('/notifications', notificationsRoute);
v1.use('/leaderboard',   leaderboardRoute);
v1.use('/reviews',       reviewsRoute);
v1.use('/wishlist',      wishlistRoute);

app.use('/api', v1); // متوافق مع الكود القديم
app.use('/api/v1', v1); // الطريقة الجديدة

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', env: ENV.NODE_ENV }));

// ── Static (Production) ───────────────────────────────────────
if (ENV.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

// ── Telegram Webhook ─────────────────────────────────────────
function setupBotWebhook(bot: any) {
  if (ENV.NODE_ENV === 'production' && ENV.WEBHOOK_URL) {
    const webhookPath = `/bot${ENV.BOT_TOKEN}`;
    bot.setWebHook(`${ENV.WEBHOOK_URL}${webhookPath}`);
    app.post(webhookPath, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });
    log.info('🔗 Webhook تم الإعداد');
  }
}

// ── Global Error Handler ──────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'خطأ داخلي في الخادم';
  if (status >= 500) log.error('[GlobalError]', { status, message, stack: err.stack });
  res.status(status).json({ error: message });
});

// ── Startup ───────────────────────────────────────────────────
async function start() {
  await connectDB();

  // ① هيّئ البوت (نسخة واحدة فقط في كل التطبيق)
  const bot = initBot();
  registerBotHandlers();
  setupBotWebhook(bot);

  // ② إعدادات افتراضية في DB
  const defaults: Record<string, any> = {
    crystalPriceUSD:       ENV.DEFAULT_CRYSTAL_PRICE_USD,
    commissionPercent:     ENV.DEFAULT_COMMISSION_PERCENT,
    minWithdrawCrystals:   500,
    maxWithdrawCrystals:   50000,
    minDepositCrystals:    100,
    maxDepositCrystals:    100000,
    marketOpen:            true,
    accountsStoreOpen:     true,
    pointsStoreOpen:       true,
    auctionsOpen:          true,
    maintenanceMode:       false,
    autoApproveProducts:   false,
    supportUsername:       'support',
    ownerPaymentInfo:      { baridimob: '', ccp: '', usdt: '', binance: '', flexy: '' },
  };
  for (const [k, v] of Object.entries(defaults))
    if (await getSetting(k) === null) await setSetting(k, v);

  // ③ ابدأ الخادم
  httpServer.listen(ENV.PORT, () => {
    log.info(`✅ Server: http://localhost:${ENV.PORT}`);
    log.info(`🤖 Bot: ${ENV.NODE_ENV === 'production' ? 'webhook' : 'polling'}`);
  });
}

start()
  .then(async () => {
    await setupQueues();
    startWorkers();
  })
  .catch((err) => {
    log.error('❌ فشل الإقلاع', { err });
    process.exit(1);
  });

// ── Graceful Shutdown ─────────────────────────────────────────
async function shutdown() {
  log.info('🛑 إيقاف الخادم...');
  const mongoose = await import('mongoose');
  await mongoose.default.connection.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
