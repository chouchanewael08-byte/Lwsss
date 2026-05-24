import type { TabName } from '../../App.js';

const TABS: { id: TabName; icon: string; label: string; adminOnly?: boolean }[] = [
  { id: 'market',   icon: '🛒', label: 'السوق' },
  { id: 'accounts', icon: '🎮', label: 'حسابات' },
  { id: 'escrow',   icon: '🔐', label: 'صفقاتي' },
  { id: 'wallet',   icon: '💎', label: 'محفظة' },
  { id: 'mystore',  icon: '🏪', label: 'متجري' },
  { id: 'tasks',    icon: '🎯', label: 'مهام' },
  { id: 'auction',  icon: '⚡', label: 'مزاد' },
  { id: 'profile',  icon: '👤', label: 'ملفي' },
  { id: 'admin',    icon: '⚙️', label: 'إدارة', adminOnly: true },
];

export default function BottomNav({ active, onTab, user }: { active: TabName; onTab: (t: TabName) => void; user: any }) {
  const isAdmin = ['admin','owner','moderator'].includes(user?.role);
  const visible = TABS.filter(t => !t.adminOnly || isAdmin);
  return (
    <div className="bottom-nav overflow-x-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {visible.map(t => (
        <button key={t.id} className={`nav-btn ${active === t.id ? 'active' : ''}`} onClick={() => onTab(t.id)}>
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
