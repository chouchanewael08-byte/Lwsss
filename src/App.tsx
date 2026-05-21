import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Terminal, 
  UserCheck, 
  CheckCircle2, 
  AlertOctagon, 
  HelpCircle, 
  Coins, 
  RefreshCw, 
  Globe, 
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Users
} from 'lucide-react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import { useUserStore } from './stores/useUserStore';
import { useWalletStore } from './stores/useWalletStore';
import { useTicketStore } from './stores/useTicketStore';
import { useProductStore } from './stores/useProductStore';
import { useAlertStore } from './stores/useAlertStore';
import { useAuctionStore } from './stores/useAuctionStore';
import { useSwapStore } from './stores/useSwapStore';
import TelegramSimulator from './components/TelegramSimulator';
import MiniAppUI from './components/MiniAppUI';

export default function App() {
  const users = useUserStore(state => state.users);
  const currentUser = useUserStore(state => state.currentUser);
  const setCurrentUser = useUserStore(state => state.setCurrentUser);
  const initializeUserStore = useUserStore(state => state.initialize);
  const initializeWalletStore = useWalletStore(state => state.initialize);
  const initializeTicketStore = useTicketStore(state => state.initialize);
  const initializeProductStore = useProductStore(state => state.initialize);
  const initializeAlertStore = useAlertStore(state => state.initialize);
  const initializeAuctionStore = useAuctionStore(state => state.initialize);
  const initializeSwapStore = useSwapStore(state => state.initialize);
  const wallets = useWalletStore(state => state.wallets);

  const [activeMiniAppTab, setActiveMiniAppTab] = useState<string>('market');
  const [selectedMobileView, setSelectedMobileView] = useState<'both' | 'bot' | 'miniapp'>('both');
  const [showHelper, setShowHelper] = useState(true);

  // Connect to live Socket.io and register notifications + state sync
  useEffect(() => {
    if (!currentUser?.id) return;

    // Connect to websocket backend
    const socket = io();

    // Authenticate/Join user's personal channel room
    socket.emit('join_user', currentUser.id);

    // 1. Listen for real-time notifications
    socket.on('notification', (data: { type: string; title: string; message: string }) => {
      console.log('[SkyMarket Client Socket] Received notification:', data);
      toast(
        (t) => (
          <div className="text-right">
            <p className="font-bold text-slate-100 flex items-center gap-1.5 font-sans">
              <span>{data.title}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1 font-sans">{data.message}</p>
          </div>
        ),
        {
          duration: 5000,
          icon: '🔔',
          style: {
            border: '1px solid #6366f1',
            padding: '12px',
            background: '#0d1527',
          }
        }
      );
    });

    // 2. Listen for ticket status changes to update state store
    socket.on('ticket_update', (data) => {
      console.log('[SkyMarket Client Socket] Ticket updated, reloading store...', data);
      useTicketStore.getState().initialize();
    });

    // 3. Listen for wallet status changes to update state store
    socket.on('wallet_update', (data) => {
      console.log('[SkyMarket Client Socket] Wallet updated, reloading store...', data);
      useWalletStore.getState().initialize();
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.id]);

  // Initialize and load users from state store & connect Telegram SDK
  useEffect(() => {
    initializeUserStore();
    initializeWalletStore();
    initializeTicketStore();
    initializeProductStore();
    initializeAlertStore();
    initializeAuctionStore();
    initializeSwapStore();
  }, [
    initializeUserStore,
    initializeWalletStore,
    initializeTicketStore,
    initializeProductStore,
    initializeAlertStore,
    initializeAuctionStore,
    initializeSwapStore
  ]);

  const handleProfileSwitch = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      // Coordinate active tab based on target role
      if (target.role === 'admin') {
        setActiveMiniAppTab('admin');
      } else if (target.role === 'seller') {
        setActiveMiniAppTab('seller');
      } else {
        setActiveMiniAppTab('market');
      }
    }
  };

  // Reset database simulator memory
  const handleResetDatabase = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-100 font-mono text-xs">
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-505" />
          <span>جاري تهيئة خوادم سوق جزائري المتكامل بالوساطة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-[#f1f5f9] flex flex-col font-sans" style={{ direction: 'rtl' }}>
      
      {/* 🚀 Dynamic Toast and notifications system */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#0d1627',
            color: '#f1f5f9',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            fontSize: '12.5px',
            fontFamily: 'sans-serif'
          }
        }} 
      />

      {/* 🌌 High Tech Platform Dashboard Navigation bar */}
      <header className="bg-slate-900 border-b border-indigo-900/40 px-4 py-4 md:px-6 shadow-lg z-25 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand titles */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-2xl shadow-md glow-border-indigo text-white font-black">
              🇩🇿
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">المركز التجاري تيليجرام | WebApp Market</h1>
                <span className="bg-gradient-to-r from-red-650 to-amber-600 text-[10px] text-white font-black px-2.5 py-1 rounded-full animate-pulse shadow">إسكرو ذكي 🛡️</span>
              </div>
              <p className="text-xs text-slate-400">نظام أمان متقدم، مزادات لايف، مقايضة حسابات (Swap)، وبوابات الإدارة والتحكم المتطورة</p>
            </div>
          </div>

          {/* Core control actions & sandbox account switch */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Account Switch Dropdown panel */}
            <div className="bg-[#0b1220] border border-slate-800/85 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm shrink-0">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300 font-bold">المحاكي الحسابي:</span>
              </div>
              <select
                value={currentUser.id}
                onChange={(e) => handleProfileSwitch(e.target.value)}
                className="bg-slate-900 text-slate-200 text-xs rounded-lg p-1.5 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
              >
                <option value="user_buyer_anis">🛒 أنيس الجزائري (المشتري / Buyer)</option>
                <option value="user_seller_wael">🎮 وائل الرقمي (بائع معتمد / Seller)</option>
                <option value="user_seller_sofiane">⚡ سفيان SMM (بائع توب / VIP Seller)</option>
                <option value="user_seller_scammer">⚠️ المجهول الخبيث (بائع عالي الخطورة / Risk Seller)</option>
                <option value="user_admin">👑 وسيم (المالك والمشرف الرئيسي / Super Admin)</option>
              </select>
            </div>

            {/* Reset memory */}
            <button
              onClick={handleResetDatabase}
              className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-rose-450 text-slate-400 rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 font-bold"
              title="إعادة تهيئة مخزن الذاكرة التلقائي"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة ضبط الذاكرة</span>
            </button>
            
          </div>

        </div>
      </header>

      {/* 🛠 Interactive Controls Helper Box */}
      {showHelper && (
        <div className="bg-slate-900/90 border-b border-indigo-900/10 px-4 py-2.5 text-xs text-slate-300 relative z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-right">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="bg-indigo-900/60 text-indigo-300 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded font-mono">البيئة التجريبية:</span>
                <span className="text-slate-200">💡 غير حساب المعاينة من الهيدر! يمكنك الشراء كـ <strong>"أنيس المعتمد"</strong>، ثم تسليم السلعة بالدخول كـ <strong>"وائل البائع"</strong>، أو التحكم بالدفعات كـ <strong>"وسيم الإدارة"</strong>.</span>
              </div>
              <button 
                onClick={() => setShowHelper(false)} 
                className="text-slate-400 hover:text-rose-400 font-bold px-2 py-1 rounded bg-slate-950/40 border border-slate-800 transition text-[11px]"
                title="إخفاء التلميح"
              >
                ✕ إخفاء التلميح
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400">إسكرو تلقائي: 10%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] text-slate-405">الضمان: مؤمن</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📱 Mobile view Switch Tabs */}
      <div className="lg:hidden bg-[#0d1527] border-b border-slate-850 p-2 text-xs flex items-center justify-center gap-2 shrink-0">
        <button
          onClick={() => setSelectedMobileView('both')}
          className={`flex-1 py-2 text-center rounded-lg font-bold transition-all ${
            selectedMobileView === 'both' ? 'bg-indigo-600 text-white' : 'bg-[#060a13] text-slate-400 border border-slate-900'
          }`}
        >
          🖼️ عرض ثنائي
        </button>
        <button
          onClick={() => setSelectedMobileView('bot')}
          className={`flex-1 py-2 text-center rounded-lg font-bold transition-all ${
            selectedMobileView === 'bot' ? 'bg-indigo-950/40 border border-indigo-900/50 text-indigo-300' : 'bg-[#060a13] text-slate-400 border border-slate-900'
          }`}
        >
          🤖 غرف البوت
        </button>
        <button
          onClick={() => setSelectedMobileView('miniapp')}
          className={`flex-1 py-2 text-center rounded-lg font-bold transition-all ${
            selectedMobileView === 'miniapp' ? 'bg-indigo-600 text-white' : 'bg-[#060a13] text-slate-400 border border-slate-900'
          }`}
        >
          🚀 تطبيق الـ Mini App
        </button>
      </div>

      {/* 🚀 Main Operational Body Grid split screen layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 overflow-hidden">
        
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[640px]">
          
          {/* LEFT: Simulated Telegram Chat client (Span 5) */}
          <div className={`col-span-1 lg:col-span-5 flex flex-col ${
            selectedMobileView === 'both' || selectedMobileView === 'bot' ? 'block' : 'hidden lg:flex'
          }`}>
            <div className="flex-1 h-full min-h-[500px] flex flex-col">
              <div className="mb-2 flex items-center justify-between text-xs px-1">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>محاكي محادثات تلغرام الأصلي (Telegram Bot Client)</span>
                </span>
                <span className="text-[#a1a1aa] text-[10px] font-mono">Status: Sandbox Live</span>
              </div>
              
              <div className="flex-1">
                <TelegramSimulator
                  currentUser={currentUser}
                  onStateChange={() => {}}
                  onNavigateToMiniApp={(tab) => {
                    setActiveMiniAppTab(tab);
                    setSelectedMobileView('miniapp');
                  }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: High End Modern UI Telegram Mini-App simulator (Span 7) */}
          <div className={`col-span-1 lg:col-span-7 flex flex-col ${
            selectedMobileView === 'both' || selectedMobileView === 'miniapp' ? 'block' : 'hidden lg:flex'
          }`}>
            <div className="flex-1 h-full min-h-[500px] flex flex-col">
              <div className="mb-2 flex items-center justify-between text-xs px-1">
                <span className="text-slate-400 font-bold flex items-center gap-1 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>تطبيق تلغرام المصغر المتطور (Telegram Mini App Client UI)</span>
                </span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full font-bold">بوابة المستهلك والوسيط</span>
              </div>

              <div className="flex-1">
                <MiniAppUI
                  currentUser={currentUser}
                  activeTab={activeMiniAppTab}
                  onStateChange={() => {}}
                  onNavigateToTab={(tab) => setActiveMiniAppTab(tab)}
                />
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Bottom status credits */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 p-3 text-center text-xs text-slate-500 shrink-0 font-sans">
        <p>جميع معالجات الصفقات والإسكرو والتبادلات تتم عبر تشفير الضمان التماثلي للمنصة ومؤمنة بالكامل 🛡️ 2026.</p>
      </footer>

    </div>
  );
}
