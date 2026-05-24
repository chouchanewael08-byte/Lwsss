// ── src/bot/state.ts ─────────────────────────────────────────
// إدارة حالة محادثة البوت في MongoDB (بدلاً من RAM)

import { BotState } from '../models/index.js';

export async function getBotState(chatId: number) {
  const doc = await BotState.findOne({ chatId: String(chatId) }).lean();
  return doc ? { step: (doc as any).step, data: (doc as any).data, images: (doc as any).images } : null;
}

export async function setBotState(chatId: number, state: { step: string; data: any; images: string[] }) {
  await BotState.findOneAndUpdate(
    { chatId: String(chatId) },
    { ...state, updatedAt: new Date() },
    { upsert: true }
  );
}

export async function deleteBotState(chatId: number) {
  await BotState.deleteOne({ chatId: String(chatId) });
}
