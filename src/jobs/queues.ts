// Redis/BullMQ اختياري — يشتغل بس إذا REDIS_URL موجود
export async function setupQueues() {
  if (!process.env.REDIS_URL) {
    console.log('⚠️  REDIS_URL غير موجود — BullMQ معطّل');
    return;
  }
  const { Queue }   = await import('bullmq');
  const { default: IORedis } = await import('ioredis');
  const connection  = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  const autoQ = new Queue('autoComplete', { connection });
  const aucQ  = new Queue('auction',      { connection });
  await autoQ.add('run', {}, { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: true });
  await aucQ.add('run',  {}, { repeat: { every: 60 * 1000 },     removeOnComplete: true });
  console.log('✅ BullMQ Queues جاهزة');
}
