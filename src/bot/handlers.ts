// ── src/bot/handlers.ts ──────────────────────────────────────
// جميع handlers البوت في ملف واحد منفصل عن server.ts
// لا يُنشئ instance جديد — يستخدم getBot() فقط

import { getBot } from '../lib/botSingleton.js';
import { getBotState, setBotState, deleteBotState } from './state.js';
import { ENV } from '../config/env.js';
import { encryptCredentials } from '../lib/crypto.js';

export function registerBotHandlers() {
  const bot = getBot();

  // ─── /start ────────────────────────────────────────────────
  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ref    = match?.[1]?.trim();
    const { User, Wallet, Transaction } = await import('../models/index.js');
    let user    = await User.findOne({ telegramId: String(chatId) });
    const isNew = !user;

    if (!user) {
      user = await User.create({
        telegramId: String(chatId),
        username:   msg.from?.username || `user${chatId}`,
        fullName:   `${msg.from?.first_name||''} ${msg.from?.last_name||''}`.trim(),
        referredBy: ref || null,
      });
      await Wallet.create({ userId: String(chatId) });

      // مكافأة الإحالة — مع التحقق من عدم الإحالة الذاتية
      if (ref && ref !== String(chatId)) {
        // atomic: نتأكد أن المُحيل موجود قبل المكافأة
        const updated = await Wallet.findOneAndUpdate(
          { userId: ref },
          { $inc: { crystals: 50 } },
          { new: true }
        );
        if (updated) {
          await Transaction.create({
            userId: ref, type: 'referral_bonus', amount: 50,
            currency: 'crystals', status: 'completed', description: 'مكافأة إحالة مستخدم جديد',
          });
          await User.findOneAndUpdate({ telegramId: ref }, { $inc: { referralCount: 1 } });
        }
      }
    }

    const name = msg.from?.first_name || 'صديقي';
    const text = isNew
      ? `👋 أهلاً وسهلاً يا ${name}!\n\n🏪 *مرحباً في السوق الرقمي*\n━━━━━━━━━━━━━━━━━\n🔐 نظام إيسكرو لحماية أموالك\n💎 عملة الكريستال الآمنة\n🏆 مزادات وعروض حصرية\n\n🎁 مكافأة الانضمام: ⭐10 نجوم مجاناً!`
      : `👋 أهلاً بعودتك يا ${name}!\n💎 ${user?.crystals||0} | ⭐ ${user?.stars||0}`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [{ text: '🛒 السوق' }, { text: '💰 محفظتي' }],
          [{ text: '📦 طلباتي' }, { text: '🏪 متجري' }],
          [{ text: '➕ إضافة منتج' }, { text: '📋 منتجاتي' }],
          [{ text: '⚡ مزادات' }, { text: '🔄 تبادل' }],
          [{ text: '💳 الدفع' }, { text: '❓ مساعدة' }],
        ],
        resize_keyboard: true,
      },
    });

    await bot.sendMessage(chatId, '🚀 افتح السوق:', {
      reply_markup: { inline_keyboard: [[{ text: '🏪 فتح السوق الرقمي', web_app: { url: ENV.APP_URL } }]] },
    });

    // مكافأة الانضمام — مرة واحدة فقط
    if (isNew) {
      const walletNew = await Wallet.findOne({ userId: String(chatId) });
      if (walletNew && walletNew.stars === 0) {
        await Wallet.findOneAndUpdate({ userId: String(chatId) }, { $inc: { stars: 10 } });
        const { Transaction } = await import('../models/index.js');
        await Transaction.create({
          userId: String(chatId), type: 'bonus', amount: 10,
          currency: 'stars', status: 'completed', description: 'مكافأة الانضمام',
        });
        await User.findOneAndUpdate({ telegramId: String(chatId) }, { $set: { stars: 10 } });
      }
    }
  });

  // ─── /balance ──────────────────────────────────────────────
  bot.onText(/\/balance/, async (msg) => {
    const { Wallet, User } = await import('../models/index.js');
    const [w, u] = await Promise.all([
      Wallet.findOne({ userId: String(msg.chat.id) }),
      User.findOne({ telegramId: String(msg.chat.id) }),
    ]);
    if (!w) return bot.sendMessage(msg.chat.id, '❌ لا توجد محفظة، ابدأ بـ /start');
    const { getCrystalPriceUSD } = await import('../lib/helpers.js');
    const price = await getCrystalPriceUSD();
    const usd   = (+w.crystals * price).toFixed(2);
    await bot.sendMessage(msg.chat.id,
      `💰 *محفظتك — ${u?.username || 'مستخدم'}*\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `💎 *كريستال:* ${w.crystals.toLocaleString('ar')} ≈ $${usd}\n` +
      `⭐ *نجوم:*    ${w.stars.toLocaleString('ar')}\n` +
      `🔒 *محجوز:*  ${(w.frozenCrystals||0).toLocaleString('ar')}\n` +
      `⏳ *معلّق:*   ${(w.pendingCrystals||0).toLocaleString('ar')}\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `📊 *إجمالي المكاسب:* 💎${(w.totalEarned||0).toLocaleString('ar')}`,
      { parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🏪 فتح المحفظة', web_app: { url: ENV.APP_URL } }]] } }
    );
  });

  // ─── /stats ────────────────────────────────────────────────
  bot.onText(/\/stats/, async (msg) => {
    const { User, Product, AccountProduct, Ticket } = await import('../models/index.js');
    const uid = String(msg.chat.id);
    const [u, prodCount, accCount, tickCount] = await Promise.all([
      User.findOne({ telegramId: uid }),
      Product.countDocuments({ sellerId: uid }),
      AccountProduct.countDocuments({ sellerId: uid }),
      Ticket.countDocuments({ $or: [{ buyerId: uid }, { sellerId: uid }], status: { $in: ['completed','auto_completed'] } }),
    ]);
    if (!u) return bot.sendMessage(msg.chat.id, '❌ سجّل أولاً بـ /start');
    await bot.sendMessage(msg.chat.id,
      `📊 *إحصائياتك — ${u.username}*\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `🏆 *المستوى:* ${u.sellerLevel}\n` +
      `⭐ *معدل النجاح:* ${u.successRate}%\n` +
      `📦 *منتجاتك:* ${prodCount + accCount}\n` +
      `✅ *مبيعات:*  ${u.salesCount}\n` +
      `🛒 *مشتريات:* ${u.purchasesCount}\n` +
      `🤝 *صفقات مكتملة:* ${tickCount}\n` +
      `👥 *إحالات:* ${u.referralCount}`,
      { parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🏪 فتح متجري', web_app: { url: ENV.APP_URL } }]] } }
    );
  });

  // ─── /referral ─────────────────────────────────────────────
  bot.onText(/\/referral/, async (msg) => {
    const { User } = await import('../models/index.js');
    const u    = await User.findOne({ telegramId: String(msg.chat.id) });
    const me   = await bot.getMe();
    const link = `https://t.me/${me.username}?start=${msg.chat.id}`;
    await bot.sendMessage(msg.chat.id,
      `🔗 *رابط إحالتك*\n━━━━━━━━━━━━━━━━━\n` +
      `${link}\n\n` +
      `👥 *إجمالي إحالاتك:* ${u?.referralCount || 0}\n` +
      `🎁 *مكافأة كل إحالة:* 💎50 كريستال للمُحيل`,
      { parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📤 شارك الرابط', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🏪 انضم معي للمتجر الرقمي!')}` }]] } }
    );
  });

  // ─── /help ─────────────────────────────────────────────────
  bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `❓ *قائمة الأوامر*\n━━━━━━━━━━━━━━━━━\n` +
      `🚀 /start — الصفحة الرئيسية\n` +
      `💰 /balance — رصيد محفظتي\n` +
      `📊 /stats — إحصائياتي\n` +
      `🔗 /referral — رابط الإحالة\n` +
      `❓ /help — هذه القائمة\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `للدعم تواصل: @support`,
      { parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🏪 فتح المتجر', web_app: { url: ENV.APP_URL } }]] } }
    );
  });

  // ─── Callback Queries ──────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const chatId = query.message!.chat.id;
    const data   = query.data!;
    const state  = await getBotState(chatId);

    if (data.startsWith('store:') && state?.step === 'store_type') {
      await setBotState(chatId, { step: 'title', data: { storeType: data.split(':')[1] }, images: [] });
      await bot.sendMessage(chatId, '📝 أرسل عنوان المنتج:');
    } else if (data === 'publish' && state?.data) {
      const { Product, AccountProduct } = await import('../models/index.js');
      const d = state.data;
      await deleteBotState(chatId);
      await bot.sendMessage(chatId, '⏳ جار النشر...');
      try {
        const creds = encryptCredentials({ raw: String(d.credentialsRaw || '') });
        if (d.storeType === 'accounts') {
          await AccountProduct.create({
            title: d.title, description: d.description||'', platform: 'other',
            price: d.price, sellerId: String(chatId), sellerName: d.username||String(chatId),
            images: state.images||[], credentialsEncrypted: creds, isApproved: false,
          });
        } else {
          await Product.create({
            title: d.title, description: d.description||'', price: d.price, type: 'other',
            sellerId: String(chatId), sellerName: d.username||String(chatId),
            images: state.images||[], credentialsEncrypted: creds, isApproved: false,
          });
        }
        await bot.sendMessage(chatId, '✅ تم إرسال المنتج للمراجعة!');
      } catch (e: any) {
        await bot.sendMessage(chatId, '❌ خطأ في النشر، حاول مجدداً');
      }
    } else if (data === 'cancel') {
      await deleteBotState(chatId);
      await bot.sendMessage(chatId, '❌ تم الإلغاء');
    }
    await bot.answerCallbackQuery(query.id);
  });

  // ─── رسائل نصية (state machine) ───────────────────────────
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text   = msg.text || '';
    const state  = await getBotState(chatId);
    if (text.startsWith('/')) return;

    if (!state) {
      const { Wallet: W } = await import('../models/index.js');
      if (text.includes('محفظتي')) {
        const w = await W.findOne({ userId: String(chatId) });
        return bot.sendMessage(chatId, w ? `💰 كريستال: ${w.crystals} | نجوم: ${w.stars}` : '❌ لا توجد محفظة');
      }
      if (text.includes('إضافة منتج') || text.includes('اضافة منتج')) {
        await setBotState(chatId, { step: 'store_type', data: {}, images: [] });
        return bot.sendMessage(chatId, '🏪 اختر نوع المتجر:', {
          reply_markup: { inline_keyboard: [[
            { text: '🏠 السوق العام', callback_data: 'store:market' },
            { text: '🎮 الحسابات',    callback_data: 'store:accounts' },
          ]] },
        });
      }
      if (['السوق','متجري','طلباتي','مزادات','تبادل'].some(k => text.includes(k)))
        return bot.sendMessage(chatId, '📱 افتح التطبيق:', {
          reply_markup: { inline_keyboard: [[{ text: '🏪 فتح السوق', web_app: { url: ENV.APP_URL } }]] },
        });
      return;
    }

    const { step, data } = state;
    if (step === 'title') {
      data.title = text.slice(0, 100);
      await setBotState(chatId, { step: 'price', data, images: state.images });
      await bot.sendMessage(chatId, '💰 أرسل السعر بالكريستال:');
    } else if (step === 'price') {
      const price = parseFloat(text);
      if (isNaN(price) || price <= 0 || price > 999999)
        return bot.sendMessage(chatId, '❌ سعر غير صحيح (1 - 999999):');
      data.price = price;
      await setBotState(chatId, { step: 'description', data, images: state.images });
      await bot.sendMessage(chatId, '📄 أرسل وصف المنتج:');
    } else if (step === 'description') {
      data.description = text.slice(0, 500);
      await setBotState(chatId, { step: 'credentials', data, images: state.images });
      await bot.sendMessage(chatId, '🔐 أرسل بيانات الحساب/المنتج:');
    } else if (step === 'credentials') {
      data.credentialsRaw = text;
      await setBotState(chatId, { step: 'confirm', data, images: state.images });
      await bot.sendMessage(chatId,
        `📋 *تأكيد النشر*\n📌 ${data.title}\n💰 💎${data.price}`,
        { parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[
            { text: '✅ نشر', callback_data: 'publish' },
            { text: '❌ إلغاء', callback_data: 'cancel' },
          ]] } }
      );
    }
  });
}
