import mongoose, { Schema } from 'mongoose';

const BotStateSchema = new Schema({
  chatId:    { type: String, required: true, unique: true, index: true },
  step:      { type: String, required: true },
  data:      { type: Schema.Types.Mixed, default: {} },
  images:    { type: [String], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ TTL: يحذف تلقائياً بعد 24 ساعة من عدم النشاط
BotStateSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export const BotState = mongoose.models.BotState || mongoose.model('BotState', BotStateSchema);
