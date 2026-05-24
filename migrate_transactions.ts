// ── migrate_transactions.ts ───────────────────────────────────
// شغّله مرة واحدة فقط على قاعدة البيانات القديمة لنقل المعاملات
// الأمر: npx tsx migrate_transactions.ts

import 'dotenv/config';
import mongoose from 'mongoose';
import { ENV } from './src/config/env.js';

async function migrate() {
  await mongoose.connect(ENV.MONGODB_URI);
  console.log('✅ اتصل بـ MongoDB');

  const db = mongoose.connection.db!;

  // ⚠️ تأكد أن Collection transactions موجودة
  const collExists = await db.listCollections({ name: 'transactions' }).hasNext();
  if (!collExists) await db.createCollection('transactions');

  const wallets = await db.collection('wallets').find({ transactions: { $exists: true, $ne: [] } }).toArray();
  console.log(`📊 ${wallets.length} محفظة تحتوي على معاملات قديمة`);

  let total = 0;
  const BATCH = 200;

  for (const wallet of wallets) {
    const txs = wallet.transactions || [];
    if (!txs.length) continue;

    const docs = txs.map((tx: any) => ({
      userId:        wallet.userId,
      type:          tx.type || 'unknown',
      amount:        tx.amount || 0,
      currency:      tx.currency || 'crystals',
      status:        tx.status || 'completed',
      description:   tx.description || '',
      reference:     tx.reference || null,
      paymentMethod: tx.paymentMethod || null,
      proofImage:    tx.proofImage || null,
      createdAt:     tx.timestamp || new Date(),
      updatedAt:     tx.timestamp || new Date(),
    }));

    // insertMany بـ batches
    for (let i = 0; i < docs.length; i += BATCH) {
      await db.collection('transactions').insertMany(docs.slice(i, i + BATCH), { ordered: false });
      total += Math.min(BATCH, docs.length - i);
    }
  }

  console.log(`✅ تم نقل ${total} معاملة`);

  // ⚠️ بعد التحقق من صحة البيانات، شغّل هذا لإزالة العمود القديم:
  // await db.collection('wallets').updateMany({}, { $unset: { transactions: '' } });
  // console.log('✅ تم حذف المعاملات القديمة من الـ Wallets');

  await mongoose.disconnect();
  console.log('🏁 اكتملت الهجرة');
}

migrate().catch(err => { console.error('❌ فشل:', err); process.exit(1); });
