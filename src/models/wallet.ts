// ── src/models/wallet.ts ────────────────────────────────────
// Transaction انتقلت لـ Collection منفصلة بدلاً من embedded array
// هذا يمنع نمو الـ Wallet document بشكل لا نهائي

import mongoose, { Schema } from 'mongoose';

// ─── Transaction (Collection منفصلة) ─────────────────────────
const TransactionSchema = new Schema({
  userId:        { type: String, required: true, index: true },
  type:          { type: String, required: true },
  amount:        { type: Number, required: true },
  currency:      { type: String, enum: ['crystals','stars','usd'], required: true },
  status:        { type: String, enum: ['pending','completed','failed','frozen'], default: 'pending' },
  description:   { type: String, required: true, maxlength: 300 },
  paymentMethod: { type: String, default: null },
  reference:     { type: String, default: null },
  proofImage:    { type: String, default: null },
}, { timestamps: true }); // createdAt بدلاً من timestamp يدوي

TransactionSchema.index({ userId: 1, createdAt: -1 }); // للترتيب السريع
TransactionSchema.index({ reference: 1 }, { sparse: true });

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

// ─── Wallet ───────────────────────────────────────────────────
const WalletSchema = new Schema({
  userId:          { type: String, required: true, unique: true, index: true },
  crystals:        { type: Number, default: 0, min: 0 },
  pendingCrystals: { type: Number, default: 0, min: 0 },
  frozenCrystals:  { type: Number, default: 0, min: 0 },
  stars:           { type: Number, default: 0, min: 0 },
  totalEarned:     { type: Number, default: 0, min: 0 },
  totalSpent:      { type: Number, default: 0, min: 0 },
  // transactions محذوفة — الآن في Collection منفصلة
}, { timestamps: true });

export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
