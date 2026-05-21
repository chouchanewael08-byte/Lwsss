import React, { useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useUserStore } from '../../stores/useUserStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { ShieldCheck, User, Sparkles, RefreshCw, Key, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileTab() {
  const currentUser = useUserStore(state => state.currentUser);
  const users = useUserStore(state => state.users);
  const setCurrentUser = useUserStore(state => state.setCurrentUser);
  const wallets = useWalletStore(state => state.wallets);
  const notifications = useAlertStore(state => state.notifications);
  const clearNotifications = useAlertStore(state => state.clearNotifications);

  // Filter local notifications for active client
  const activeNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications[currentUser.id] || [];
  }, [notifications, currentUser]);

  const activeWallet = useMemo(() => {
    if (!currentUser) return null;
    return wallets.find(w => w.userId === currentUser.id) || null;
  }, [wallets, currentUser]);

  // Switch sandbox role
  const handleSwitchSandboxAccount = useCallback((userId: string) => {
    const matched = users.find(u => u.id === userId);
    if (matched) {
      setCurrentUser(matched);
      toast.success(`👤 تم تبديل الحساب التجريبي النشط بنجاح إلى: @${matched.username} (${matched.role === 'admin' ? 'إدارة' : 'عضو'})`);
    }
  }, [users, setCurrentUser]);

  return (
    <div className="space-y-6 text-right font-sans">
      
      {/* Visual profile view */}
      {currentUser && (
        <div className="bg-gradient-to-r from-[#0d1527] to-[#121b33] border border-slate-800 rounded-2xl p-5 md:p-6 text-right relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
            {/* Visual Avatar */}
            <span className="text-5xl p-4 bg-slate-950/60 rounded-full border-2 border-slate-800 animate-pulse">
              {currentUser.avatar}
            </span>

            <div className="space-y-1.5 flex-1 text-center sm:text-right">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-100">{currentUser.fullName}</h2>
                <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-lg ${
                  currentUser.role === 'admin' 
                    ? 'bg-rose-500/15 text-rose-450 border border-rose-500/20' 
                    : 'bg-indigo-505/15 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {currentUser.role === 'admin' ? 'مدير النظام 🛡️' : 'عضو مفعل'}
                </span>
              </div>

              <span className="font-mono text-xs text-indigo-400 block pb-1">@{currentUser.username} (ID: {currentUser.id})</span>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[10.5px] text-slate-450 pt-1">
                <span>تاريخ الالتحاق: <b className="text-slate-300 font-mono">{currentUser.joinedDate}</b></span>
                <span className="hidden sm:inline">•</span>
                <span>النجاح والتقييم: <b className="text-emerald-450 font-mono">{currentUser.successRate}%</b></span>
                <span className="hidden sm:inline">•</span>
                <span>مستوى الثقة: <b className="text-amber-400">{currentUser.level}</b></span>
              </div>
            </div>

            {/* Quick Balances Stats column */}
            <div className="bg-[#070b16] border border-slate-850 p-4 rounded-xl text-center min-w-[155px] shrink-0 font-sans shadow">
              <span className="text-[9px] text-slate-400 block font-bold mb-1">الرصيد المتاح والادخار</span>
              <div className="text-lg font-mono font-black text-emerald-400">
                ${activeWallet?.availableBalance.toFixed(2) || '0.00'}
              </div>
              <span className="text-[9px] text-amber-450 font-bold block pt-1.5 border-t border-slate-900 mt-1">
                ⭐ {currentUser.points || 0} نقطة نشاط
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left column sandbox switches */}
        <div className="lg:col-span-5 bg-[#0d1627] border border-slate-800 p-4 md:p-5 rounded-2xl space-y-4 font-sans">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 justify-end">
            <h4 className="text-xs sm:text-sm font-black text-slate-100">محاكي حساب ومحدد الأدوار (Sandbox Sandbox Role)</h4>
            <Key className="w-4 h-4 text-indigo-400" />
          </div>

          <p className="text-[10px] text-slate-450 leading-relaxed text-right">
            استخدم هذه اللوحة الرائعة لتبديل حسابك في بيئة المطورين، لكي تتمكن من تقمص دور البائع لرفع سلعتك، ثم دور المشتري لشرائها والتحقق من صندوق الضمان والتشات فورا!
          </p>

          <div className="space-y-2.5">
            {users.map(u => {
              const isActive = u.id === currentUser?.id;
              
              return (
                <button
                  key={u.id}
                  onClick={() => handleSwitchSandboxAccount(u.id)}
                  className={`w-full p-3 rounded-xl border text-right transition flex justify-between items-center cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-650/10 border-indigo-500 text-indigo-400 ring-1 ring-indigo-505' 
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-205'
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-xs block">{u.fullName}</span>
                    <span className="text-[9px] text-slate-500 font-sans font-bold">دور الحساب: {u.role === 'admin' ? 'مشرف فني 🛡️' : (u.id === 'user_wael' ? 'بائع معتمد 🏪' : 'مشتري جزائري 🛒')}</span>
                  </div>
                  {isActive && <span className="text-[9px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-lg">نشط حالياً</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column local profile notifications */}
        <div className="lg:col-span-7 bg-[#0d1627] border border-slate-800 p-4 md:p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2 flex-wrap gap-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-100">لوحة الإخطارات والتنبيهات المستلمة للعميل ({activeNotifications.length})</h4>
            
            {activeNotifications.length > 0 && (
              <button
                onClick={() => {
                  if (currentUser) {
                    clearNotifications(currentUser.id);
                    toast.success('✔️ تم تصفية كافة التنبيهات المقروءة!');
                  }
                }}
                className="text-[9px] bg-slate-950 border border-slate-850 rounded px-2 py-1 text-slate-450 hover:text-slate-200 transition"
              >
                تصفية الكل
              </button>
            )}
          </div>

          {activeNotifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              لا توجد أي إشعارات أو تنبيهات غير مقروءة في تذكرة الاستلام لديك.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5 text-xs sm:text-sm leading-relaxed text-right">
              {activeNotifications.map(notif => (
                <div key={notif.id} className="bg-slate-950/50 hover:bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-start gap-3">
                  <span className="text-xl shrink-0 pt-0.5">🔔</span>
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-[#f1f5f9] text-[11px] sm:text-xs">{notif.title}</h5>
                    <p className="text-[10px] text-slate-400 font-sans">{notif.description}</p>
                    <span className="text-[8.5px] text-slate-500 font-mono block">{notif.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
