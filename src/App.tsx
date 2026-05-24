import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

import BottomNav from './components/shared/BottomNav.js';
import MarketTab from './components/tabs/MarketTab.js';
import AccountsStoreTab from './components/tabs/AccountsStoreTab.js';
import PointsStoreTab from './components/tabs/PointsStoreTab.js';
import MyStoreTab from './components/tabs/MyStoreTab.js';
import TasksTab from './components/tabs/TasksTab.js';
import WalletTab from './components/tabs/WalletTab.js';
import ProfileTab from './components/tabs/ProfileTab.js';
import EscrowTab from './components/tabs/EscrowTab.js';
import AuctionTab from './components/tabs/AuctionTab.js';
import SwapTab from './components/tabs/SwapTab.js';
import AdminTab from './components/tabs/AdminTab.js';
import { apiGet, getTgUser } from './lib/api.js';

export type TabName = 'market' | 'accounts' | 'points' | 'mystore' | 'tasks' | 'wallet' | 'profile' | 'escrow' | 'auction' | 'swap' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('market');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    loadUser();
    setupSocket();
  }, []);

  // أنيميشن نقاط التحميل
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, [loading]);

  async function loadUser() {
    try {
      const data = await apiGet('/user/me');
      setUser(data);
    } catch (e: any) {
      if (e.message?.includes('صيانة')) setMaintenance(true);
      // أعد المحاولة مرة واحدة بعد ثانية
      else {
        await new Promise(r => setTimeout(r, 1500));
        try {
          const data = await apiGet('/user/me');
          setUser(data);
        } catch {}
      }
    } finally { setLoading(false); }
  }

  function setupSocket() {
    const tgUser = getTgUser();
    if (!tgUser) return;
    const socket = io('/', { transports: ['websocket'] });
    // BUG FIX: server يتوقع { userId, initData } مش string مجرد
    socket.on('connect', () => {
      const initData = (window as any).Telegram?.WebApp?.initData || '';
      socket.emit('join', { userId: String(tgUser.id), initData });
    });
    socket.on('new_chat_message',  () => toast('💬 رسالة جديدة', { icon: '💬' }));
    socket.on('ticket_updated',    () => toast('🔔 تحديث في صفقة', { icon: '🔔' }));
    socket.on('ticket_completed',  () => toast.success('✅ اكتملت الصفقة!'));
    socket.on('deposit_confirmed', (d: any) => toast.success(`✅ تم إيداع 💎${d.amount}`));
    socket.on('withdrawal_rejected',(d: any) => toast.error(`❌ رُفض السحب: ${d.reason || ''}`));
    socket.on('product_approved',  (d: any) => toast.success(`✅ قُبل منتجك: ${d.productTitle}`));
    socket.on('balance_adjusted',  (d: any) => toast(`💰 ${d.amount > 0 ? '+' : ''}${d.amount} ${d.currency}`, { icon: '💰' }));
    socket.on('new_bid',           (d: any) => toast(`🔨 عرض: 💎${d.amount} — ${d.bidder}`, { icon: '🔨' }));
  }

  /* ── LOADING ── */
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-bg-orb orb1" />
      <div className="loading-bg-orb orb2" />
      <div className="loading-content">
        <div className="loading-logo">🏪</div>
        <div className="loading-title">Lws Chop</div>
        <div className="loading-sub">المتجر الرقمي المتكامل</div>
        <div className="loading-bar-wrap">
          <div className="loading-bar-fill" />
        </div>
        <div className="loading-dots">جار التحميل{dots}</div>
      </div>
    </div>
  );

  /* ── MAINTENANCE ── */
  if (maintenance) return (
    <div className="flex items-center justify-center h-full bg-slate-950 p-6 text-center">
      <div>
        <div className="text-6xl mb-4 animate-pulse">🔧</div>
        <div className="text-white text-xl font-bold mb-2">وضع الصيانة</div>
        <div className="text-slate-400 text-sm">المتجر تحت الصيانة حالياً. عد قريباً.</div>
      </div>
    </div>
  );

  const tabs: Record<TabName, JSX.Element> = {
    market:   <MarketTab user={user} onNavigate={setActiveTab} />,
    accounts: <AccountsStoreTab user={user} onNavigate={setActiveTab} />,
    points:   <PointsStoreTab user={user} />,
    mystore:  <MyStoreTab user={user} />,
    tasks:    <TasksTab user={user} onUserUpdate={setUser} />,
    wallet:   <WalletTab user={user} onUserUpdate={setUser} />,
    profile:  <ProfileTab user={user} onNavigate={setActiveTab} />,
    escrow:   <EscrowTab user={user} />,
    auction:  <AuctionTab user={user} />,
    swap:     <SwapTab user={user} />,
    admin:    <AdminTab user={user} />,
  };

  return (
    <div className="flex flex-col h-full bg-app">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#0f1929', color: '#f8fafc', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '14px', fontSize: '13px' },
        duration: 3000,
      }} />
      <div className="flex-1 overflow-hidden">
        {tabs[activeTab] || tabs.market}
      </div>
      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        isAdmin={['admin','owner','moderator'].includes(user?.role)}
        crystals={user?.crystals}
      />
    </div>
  );
}
