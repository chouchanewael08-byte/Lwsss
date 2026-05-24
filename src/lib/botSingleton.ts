// ── src/lib/botSingleton.ts ────────────────────────────────
// نسخة واحدة فقط من البوت في كل التطبيق

import TelegramBot from 'node-telegram-bot-api';
import { ENV } from '../config/env.js';

let _bot: TelegramBot | null = null;

/**
 * يُهيّئ البوت مرة واحدة ويحدد الوضع (webhook/polling)
 * يجب استدعاؤه مبكراً في start() قبل أي import آخر
 */
export function initBot(): TelegramBot {
  if (_bot) return _bot;

  const isProduction = ENV.NODE_ENV === 'production';

  // في الإنتاج: لا polling — البوت يستقبل updates عبر Webhook فقط
  _bot = new TelegramBot(ENV.BOT_TOKEN, {
    polling: !isProduction,
  });

  return _bot;
}

/**
 * يُعيد نسخة البوت الموجودة — يرمي خطأً إذا لم تُهيَّأ بعد
 */
export function getBot(): TelegramBot {
  if (!_bot) throw new Error('❌ البوت لم يُهيَّأ بعد. استدعِ initBot() أولاً في server.ts');
  return _bot;
}
