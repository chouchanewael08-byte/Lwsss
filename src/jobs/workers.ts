// ── src/jobs/workers.ts ──────────────────────────────────────
// Workers لـ BullMQ مع Fallback ذكي لـ setInterval

import { log } from '../lib/logger.js';
import { runAutoCompleteJob } from './autoComplete.js';
import { runAuctionJob } from './auction.js';

export function startWorkers() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    log.warn('⚠️  REDIS_URL غير موجود — BullMQ معطّل، تشغيل بـ setInterval');
    startFallbackJobs();
    return;
  }

  Promise.all([
    import('bullmq'),
    import('ioredis'),
  ]).then(([{ Worker }, { default: IORedis }]) => {
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    new Worker('autoComplete', async () => { await runAutoCompleteJob(); }, { connection, concurrency: 1 });
    new Worker('auction',      async () => { await runAuctionJob(); },      { connection, concurrency: 1 });

    log.info('✅ BullMQ Workers شتغلوا');
  }).catch((err) => {
    log.error('❌ فشل تحميل BullMQ — تشغيل بـ setInterval', { err });
    startFallbackJobs();
  });
}

function startFallbackJobs() {
  setInterval(runAutoCompleteJob, 5 * 60 * 1000); // كل 5 دقائق
  setInterval(runAuctionJob,      60 * 1000);      // كل دقيقة
  log.info('✅ Fallback Jobs شتغلوا بـ setInterval');
}
