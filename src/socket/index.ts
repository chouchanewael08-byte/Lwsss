// ── src/socket/index.ts ──────────────────────────────────────
// إعداد Socket.io مع تحقق حقيقي من هوية المستخدم

import { Server as SocketServer } from 'socket.io';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { setIO } from '../lib/helpers.js';

export function setupSocket(io: SocketServer) {
  setIO(io);

  io.on('connection', (socket) => {
    socket.on('join', async (payload: { userId: string; initData: string }) => {
      try {
        if (!payload || typeof payload.userId !== 'string') return;

        // ✅ تحقق HMAC كامل قبل الانضمام لأي room
        const urlParams = new URLSearchParams(payload.initData || '');
        const hash = urlParams.get('hash');
        if (!hash) return;

        urlParams.delete('hash');
        const dataCheckString = [...urlParams.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('\n');

        const secretKey    = crypto.createHmac('sha256', 'WebAppData').update(ENV.BOT_TOKEN).digest();
        const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        let valid = false;
        try {
          valid = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
        } catch { return; }
        if (!valid) return;

        const user = JSON.parse(urlParams.get('user') || '{}');
        if (String(user.id) !== payload.userId) return; // منع تزوير الـ userId

        // تحقق من انتهاء الجلسة (24 ساعة)
        const authDate = parseInt(urlParams.get('auth_date') || '0');
        if (Date.now() / 1000 - authDate > 86400) return;

        socket.join(`user:${payload.userId}`);
        socket.join('auction_broadcast');

        const { User } = await import('../models/index.js');
        const dbUser = await User.findOne({ telegramId: payload.userId }).select('role').lean();
        if (dbUser && ['admin', 'owner', 'moderator'].includes((dbUser as any).role))
          socket.join('admin_broadcast');

      } catch { /* صمت — لا نعطي معلومات للمهاجم */ }
    });

    socket.on('disconnect', () => {
      // تنظيف تلقائي — Socket.io يتعامل معه
    });
  });
}
