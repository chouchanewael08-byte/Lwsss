import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import BottomNav from './components/shared/BottomNav.js';
import { apiGet, getTgUser } from './lib/api.js';
import { Spinner } from './components/shared/components.js';

export type TabName = 'market'|'accounts'|'points'|'mystore'|'tasks'|'wallet'|'profile'|'escrow'|'auction'|'swap'|'admin';

// Lazy imports للأداء
import MarketTab       from './components/tabs/MarketTab.js';
import AccountsTab     from './components/tabs/AccountsStoreTab.js';
import WalletTab       from './components/tabs/WalletTab.js';
import ProfileTab      from './components/tabs/ProfileTab.js';
import EscrowTab       from './components/tabs/EscrowTab.js';
import TasksTab        from './components/tabs/TasksTab.js';
import MyStoreTab      from './components/tabs/MyStoreTab.js';
import AuctionTab      from './components/tabs/AuctionTab.js';
import AdminTab        from './components/tabs/AdminTab.js';
import PointsStoreTab  from './components/tabs/PointsStoreTab.js';
import SwapTab         from './components/tabs/SwapTab.js';

export default function App() {
  const [tab, setTab]         = useState<TabName>('market');
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const data = await apiGet('/user/me');
      setUser(data);
      setupSocket(data);
    } catch (e: any) {
      setError(e.message || 'تعذّر تحميل البيانات');
    } finally { setLoading(false); }
  }

  function setupSocket(u: any) {
    const tg = getTgUser();
    if (!tg || !window.Telegram?.WebApp?.initData) return;
    const socket = io({ transports: ['websocket'] });
    socket.on('connect', () => {
      socket.emit('join', { userId: String(tg.id), initData: window.Telegram.WebApp.initData });
    });
    socket.on('new_ticket_message', (d: any) => toast(`💬 رسالة جديدة: ${d.preview}`, { duration: 4000 }));
    socket.on('deposit_confirmed',  (d: any) => { toast.success(`✅ تم تأكيد الإيداع: 💎${d.amount}`); init(); });
    socket.on('product_approved',   (d: any) => toast.success(`✅ تمت الموافقة على: ${d.productTitle}`));
    socket.on('ticket_completed',   ()       => toast.success('🎉 اكتملت الصفقة!'));
  }

  if (loading) return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🏪</div>
      <div className="grad" style={{ fontSize: 20, fontWeight: 800 }}>السوق الرقمي</div>
      <Spinner size={28} />
    </div>
  );

  if (error) return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ color: 'var(--red)', fontWeight: 700 }}>{error}</div>
      <button className="btn btn-primary" onClick={init}>إعادة المحاولة</button>
    </div>
  );

  const props = { user, onUserUpdate: setUser, onNavigate: setTab };
  const TABS: Record<TabName, React.ReactNode> = {
    market:   <MarketTab      {...props} />,
    accounts: <AccountsTab    {...props} />,
    wallet:   <WalletTab      {...props} />,
    profile:  <ProfileTab     {...props} />,
    escrow:   <EscrowTab      {...props} />,
    tasks:    <TasksTab       {...props} />,
    mystore:  <MyStoreTab     {...props} />,
    auction:  <AuctionTab     {...props} />,
    admin:    <AdminTab       {...props} />,
    points:   <PointsStoreTab {...props} />,
    swap:     <SwapTab        {...props} />,
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#1a1a2e', color: '#F1F1F8', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, fontSize: 13 } }} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="fade-in">
        {TABS[tab]}
      </div>
      <BottomNav active={tab} onTab={setTab} user={user} />
    </div>
  );
}
