import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  telegramId:    { type: String, required: true, unique: true, index: true },
  username:      { type: String, required: true },
  fullName:      { type: String, required: true },
  avatar:        { type: String, default: '👤' },
  role:          { type: String, enum: ['user','moderator','admin','owner'], default: 'user' },
  level:         { type: String, enum: ['New','Trusted','Verified','VIP','High Risk','Scam'], default: 'New' },
  salesCount:    { type: Number, default: 0, min: 0 },
  purchasesCount:{ type: Number, default: 0, min: 0 },
  successRate:   { type: Number, default: 100, min: 0, max: 100 },
  responseTime:  { type: String, default: '< 1 ساعة' },
  totalEarnings: { type: Number, default: 0, min: 0 },
  stars:         { type: Number, default: 0, min: 0 },
  crystals:      { type: Number, default: 0, min: 0 },
  sellerLevel:   { type: String, enum: ['Standard','Silver','Gold','VIP'], default: 'Standard' },
  sellerPaymentInfo: {
    baridimob: { type: String, default: '' },
    ccp:       { type: String, default: '' },
    usdt:      { type: String, default: '' },
    binance:   { type: String, default: '' },
    flexy:     { type: String, default: '' },
  },
  isBanned:      { type: Boolean, default: false },
  banReason:     { type: String, default: '' },
  warnings:      { type: [String], default: [] },
  joinedAt:      { type: Date, default: Date.now },
  lastActiveAt:  { type: Date, default: Date.now },
  referredBy:    { type: String, default: null },
  referralCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

UserSchema.index({ username: 1 });
UserSchema.index({ isBanned: 1 });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
