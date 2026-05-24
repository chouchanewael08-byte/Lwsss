import { ENV } from '../config/env.js';

const BASE = `https://api.telegram.org/bot${ENV.BOT_TOKEN}`;

export async function tgSend(chatId: string | number, text: string, extra: Record<string, any> = {}) {
  try {
    const res = await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra })
    });
    return res.ok;
  } catch { return false; }
}

export async function tgSendPhoto(chatId: string | number, photo: string, caption: string) {
  try {
    await fetch(`${BASE}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo, caption, parse_mode: 'HTML' })
    });
  } catch { /* ignore */ }
}

export async function checkChannelMembership(channelId: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, user_id: parseInt(userId) })
    });
    const data = await res.json();
    if (!data.ok) return false;
    const status = data.result?.status;
    return ['member', 'administrator', 'creator'].includes(status);
  } catch { return false; }
}

export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    });
    const data = await res.json();
    if (!data.ok) return null;
    return `https://api.telegram.org/file/bot${ENV.BOT_TOKEN}/${data.result.file_path}`;
  } catch { return null; }
}

// Notification helpers
export async function notifyNewMessage(userId: string, fromName: string, productTitle: string, appUrl: string) {
  await tgSend(userId, `💬 <b>رسالة جديدة</b>\nمن: ${fromName}\nحول: ${productTitle}\n\n<a href="${appUrl}">📲 افتح التطبيق</a>`);
}

export async function notifyPaymentConfirmed(userId: string, productTitle: string, amount: number, appUrl: string) {
  await tgSend(userId, `✅ <b>تم تأكيد الدفع</b>\nالمنتج: ${productTitle}\nالمبلغ: 💎${amount}\n\n<a href="${appUrl}">📲 عرض الصفقة</a>`);
}

export async function notifyNewSale(userId: string, productTitle: string, amount: number, appUrl: string) {
  await tgSend(userId, `🎉 <b>بيع جديد!</b>\nالمنتج: ${productTitle}\nالمبلغ: 💎${amount}\n\n<a href="${appUrl}">📲 عرض الصفقة</a>`);
}

export async function notifyDispute(userId: string, ticketId: string, reason: string, appUrl: string) {
  await tgSend(userId, `⚠️ <b>نزاع مفتوح</b>\nرقم الصفقة: #${ticketId.slice(-6)}\nالسبب: ${reason}\n\n<a href="${appUrl}">📲 عرض التفاصيل</a>`);
}

export async function notifyAutoComplete(userId: string, amount: number) {
  await tgSend(userId, `💰 <b>اكتملت الصفقة تلقائياً</b>\nتم إضافة 💎${amount} لمحفظتك بعد انتهاء مهلة 24 ساعة.`);
}

export async function notifyWithdrawApproved(userId: string, amount: number) {
  await tgSend(userId, `✅ <b>تمت الموافقة على طلب السحب</b>\nالمبلغ: 💎${amount}\nسيتم التحويل خلال 24 ساعة.`);
}

export async function notifyDepositConfirmed(userId: string, amount: number) {
  await tgSend(userId, `✅ <b>تم تأكيد الإيداع</b>\nتمت إضافة 💎${amount} لمحفظتك.`);
}
