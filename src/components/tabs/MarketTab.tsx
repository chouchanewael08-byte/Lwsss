import React, { useState, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Product, ProductType } from '../../types';
import { useProductStore } from '../../stores/useProductStore';
import { useUserStore } from '../../stores/useUserStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useTicketStore } from '../../stores/useTicketStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { ProductCard } from '../shared/ProductCard';
import { Search, Filter, ShieldCheck, Tag, Heart, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface MarketTabProps {
  onNavigateToTab: (tab: string) => void;
  setActiveTicketId: (ticketId: string | null) => void;
}

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'الكل', icon: '🔍' },
  { id: 'game_account', label: 'حسابات ألعاب', icon: '🎮' },
  { id: 'subscription', label: 'اشتراكات رقمية', icon: '📺' },
  { id: 'digital_service', label: 'خدمات ديجيتال', icon: '⚡' },
  { id: 'game_currency', label: 'رصيد ألعاب', icon: '💎' },
  { id: 'social_media', label: 'سوشيال ميديا', icon: '📲' },
  { id: 'design_dev', label: 'تصميم وبرمجة', icon: '💻' }
];

export default function MarketTab({
  onNavigateToTab,
  setActiveTicketId
}: MarketTabProps) {
  const products = useProductStore(state => state.products);
  const reportProduct = useProductStore(state => state.reportProduct);
  const users = useUserStore(state => state.users);
  const currentUser = useUserStore(state => state.currentUser);
  const updateUserPoints = useUserStore(state => state.updateUserPoints);
  const wallets = useWalletStore(state => state.wallets);
  const holdEscrowFunds = useWalletStore(state => state.holdEscrowFunds);
  const createTicket = useTicketStore(state => state.createTicket);
  const addNotification = useAlertStore(state => state.addNotification);
  const addSystemLog = useAlertStore(state => state.addSystemLog);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Computed and MEMOIZED filterings
  const filteredProducts = useMemo(() => {
    const cleanQuery = DOMPurify.sanitize(searchQuery).toLowerCase();
    return products.filter(p => {
      if (p.isHidden) return false;
      const typeMatch = selectedCategory === 'all' || p.type === selectedCategory;
      const queryMatch = p.title.toLowerCase().includes(cleanQuery) || 
                         p.description.toLowerCase().includes(cleanQuery);
      return typeMatch && queryMatch;
    });
  }, [products, selectedCategory, searchQuery]);

  const getProductDiscountsAndPrices = useCallback((prod: Product) => {
    const discount = prod.discountPercentage || 0;
    const originalPriceUSD = prod.price;
    const finalPriceUSD = originalPriceUSD * (1 - discount / 100);
    const originalPricePoints = originalPriceUSD * 100;
    const finalPricePoints = Math.round(finalPriceUSD * 100);
    return {
      discount,
      originalPriceUSD,
      finalPriceUSD: Number(finalPriceUSD.toFixed(1)),
      originalPricePoints,
      finalPricePoints
    };
  }, []);

  const handleReport = useCallback((prodId: string) => {
    reportProduct(prodId);
    toast.success('📢 تم إرسال بلاغك للإشراف بنجاح. سنراجع تفاصيل السلعة للتأكد من نزاهتها.');
  }, [reportProduct]);

  // 🛒 Purchase with Points
  const handleBuyProductPoints = useCallback((prod: Product) => {
    if (!currentUser) return;
    const { finalPricePoints } = getProductDiscountsAndPrices(prod);
    const userPoints = currentUser.points || 0;

    if (userPoints < finalPricePoints) {
      toast.error(`❌ رصيد نقاط النشاط غير كافي! سعر السلعة: ${finalPricePoints}⭐ ورصيدك: ${userPoints}⭐.`);
      return;
    }

    // Process Points deduction via auth store
    updateUserPoints(currentUser.id, -finalPricePoints);

    // Generate Ticket
    const tktId = 'tkt_pts_' + Math.floor(100 + Math.random() * 900);
    const sellerUser = users.find(u => u.id === prod.sellerId);
    
    createTicket({
      id: tktId,
      productId: prod.id,
      productTitle: prod.title,
      price: 0, // 0 for wallet money, paid fully with points
      buyerId: currentUser.id,
      buyerName: currentUser.fullName,
      sellerId: prod.sellerId,
      sellerName: sellerUser ? sellerUser.fullName : 'Wael Store',
      status: 'waiting_delivery',
      createdAt: new Date().toISOString(),
      buyerConfirmed: false,
      sellerConfirmed: false,
      messages: [
        {
          id: 'msg_1',
          senderId: 'bot',
          senderName: 'الوسيط التلقائي 🛡',
          senderRole: 'admin',
          text: `🎉 صفقة نقاط ممتازة! تم خصم ${finalPricePoints} نقطة من المشتري بنجاح وتحويل الطلب كـ "مدفوع بالنقاط" لشراء: ${prod.title}.\nالبائع مطالب بتسليمه في غضون 4 ساعات للتذكرة #${tktId}.`,
          timestamp: 'الآن'
        }
      ]
    });

    // Notify & Log
    addNotification(prod.sellerId, '🛒 طلب سلعة جديد (بالنقاط)', `اشترى العميل @${currentUser.username} سلعتك: ${prod.title} بالنقاط! قف بإنهاء التسليم.`, 'success');
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'الوسيط',
      action: 'شراء منتج بالنقاط',
      details: `@${currentUser.username} اشترى ${prod.title} مقابل ${finalPricePoints} نقطة`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setSelectedProduct(null);
    setActiveTicketId(tktId);
    onNavigateToTab('tickets');
    toast.success('🎉 تم الشراء بالنقاط بنجاح! تم حجز التذكرة.');
  }, [currentUser, users, getProductDiscountsAndPrices, updateUserPoints, createTicket, addNotification, addSystemLog, onNavigateToTab, setActiveTicketId]);

  // 🛒 Purchase with Wallet
  const handleBuyProductUSD = useCallback(async (prod: Product) => {
    if (!currentUser) return;
    const { finalPriceUSD } = getProductDiscountsAndPrices(prod);
    const userWallet = wallets.find(w => w.userId === currentUser.id);

    if (!userWallet || userWallet.availableBalance < finalPriceUSD) {
      toast.error(`❌ رصيدك الحالي غير كافي! سعر السلعة: ${finalPriceUSD}$ ورصيدك: ${userWallet?.availableBalance || 0}$. شحن محفظتك من تبويب "المحفظة".`);
      return;
    }

    // Lock funds in escrow
    const success = await holdEscrowFunds(
      currentUser.id,
      finalPriceUSD,
      `حجز ضمان لشراء: ${prod.title} (بعد الخصم)`
    );

    if (!success) {
      toast.error('❌ عذراً، فشل حجز مبالغ الإسكرو بالضمان.');
      return;
    }

    // Generate Escrow Ticket
    const tktId = 'tkt_' + Math.floor(100 + Math.random() * 900);
    const sellerUser = users.find(u => u.id === prod.sellerId);

    createTicket({
      id: tktId,
      productId: prod.id,
      productTitle: prod.title,
      price: finalPriceUSD,
      buyerId: currentUser.id,
      buyerName: currentUser.fullName,
      sellerId: prod.sellerId,
      sellerName: sellerUser ? sellerUser.fullName : 'Wael Store',
      status: 'waiting_delivery',
      createdAt: new Date().toISOString(),
      buyerConfirmed: false,
      sellerConfirmed: false,
      messages: [
        {
          id: 'msg_1',
          senderId: 'bot',
          senderName: 'الوسيط التلقائي 🛡',
          senderRole: 'admin',
          text: `تم تأكيد دفع مبلغ ${finalPriceUSD}$ وحجزه في حساب الضمان للمنصة أوتوماتيكياً (بعد خصم التخفيض).\nالبائع مطالب الآن بتسليمه في غضون 4 ساعات للتذكرة #${tktId}.`,
          timestamp: 'الآن'
        }
      ]
    });

    // Notify & Log
    addNotification(prod.sellerId, '💳 مبيعة كاش جديدة بالضمان', `تم شراء منتجك ${prod.title} بمبلغ ${finalPriceUSD}$. والمال معلق بأمان في الإسكرو بانتظار تسليمك.`, 'success');
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'الوسيط',
      action: 'شراء منتج كاش',
      details: `@${currentUser.username} دفع ${finalPriceUSD}$ لشراء ${prod.title}`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setSelectedProduct(null);
    setActiveTicketId(tktId);
    onNavigateToTab('tickets');
    toast.success('💳 تم خصم الضمان وحجز التذكرة بنجاح! انتقل للمحادثة لإنهاء التسليم.');
  }, [currentUser, users, wallets, getProductDiscountsAndPrices, holdEscrowFunds, createTicket, addNotification, addSystemLog, onNavigateToTab, setActiveTicketId]);

  return (
    <div className="space-y-5 text-right">
      
      {/* 🌟 Modern Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-[#0d1527] to-[#121c33] border border-slate-800 rounded-2xl p-5 md:p-6 text-right relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-550/10 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1 z-10 relative">
          <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-xs">
            <span>🇩🇿 أول سوق وإسكرو جزائري آمن 100٪ بالتيليجرام</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-450 animate-pulse" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-100">ابحث عن أفضل الحسابات والاشتراكات لخدماتك</h2>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
            نحن نضمن حماية أموالك بالكامل في محفظتك الموثقة. لا يستلم البائع أي مليم إلا بعد تأكdegك التام لسلامة الحساب المشترى وتغيير بيانات الإيميل بالكامل.
          </p>
        </div>
      </div>

      {/* 🔍 Search Bar & Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن: حساب فالورانت، شدات ببجي، فيزا كارد..."
            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl py-3 pr-10 pl-4 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold placeholder-slate-500 transition-all text-right"
          />
          <Search className="w-4 h-4 text-slate-500 absolute top-3.5 right-3.5" />
        </div>
      </div>

      {/* 🎒 Interactive Category Badges Grid */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrolls-none max-w-full">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[10.5px] font-black border transition-all duration-250 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-950/20'
                : 'bg-[#0d1627] text-slate-400 hover:text-slate-200 border-slate-850 hover:bg-[#111c33]'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 🚀 Grid Products Viewer */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-[#0c1324] border border-slate-850 rounded-2xl space-y-2 p-6">
          <span className="text-3xl block">📦</span>
          <h4 className="text-xs sm:text-sm font-extrabold text-[#f1f5f9]">لا توجد سلع متوفرة بهذا التصنيف حالياً</h4>
          <p className="text-[10px] text-slate-500">جرب كتابة كلمات بحث أخرى أو تصفح الأقسام الشاملة الأخرى بالأعلى.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(p => {
            const seller = users.find(u => u.id === p.sellerId);
            const { finalPricePoints, finalPriceUSD } = getProductDiscountsAndPrices(p);
            const userPoints = currentUser?.points || 0;
            const canAffordPoints = userPoints >= finalPricePoints;
            
            return (
              <ProductCard
                key={p.id}
                product={p}
                seller={seller}
                onClickDetails={setSelectedProduct}
                onBuyPoints={handleBuyProductPoints}
                onBuyUSD={handleBuyProductUSD}
                canAffordPoints={canAffordPoints}
                currentUserPoints={userPoints}
                finalPricePoints={finalPricePoints}
                finalPriceUSD={finalPriceUSD}
              />
            );
          })}
        </div>
      )}

      {/* 🔮 SLIDEOVER PRODUCT DETAILS PANEL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          
          <div className="bg-[#0c1221] border border-slate-800 rounded-2xl w-full max-w-xl mx-auto overflow-hidden relative z-10 text-right flex flex-col max-h-[90vh]">
            
            {/* Slide Images panel */}
            <div className="relative aspect-video bg-slate-950 border-b border-slate-850">
              <img 
                src={selectedProduct.images[activeImageIdx]} 
                className="w-full h-full object-cover" 
                alt={selectedProduct.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent" />
              
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 left-3 bg-slate-900/90 text-slate-350 hover:text-white border border-slate-800 p-2 rounded-xl transition cursor-pointer font-bold text-xs"
              >
                ✕ إغلاق
              </button>
            </div>

            {/* Content area */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Product title tags */}
              <div className="space-y-1.5">
                <span className="text-[10px] bg-indigo-505/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold font-sans">
                  {CATEGORIES.find(c => c.id === selectedProduct.type)?.label || 'خدمة'}
                </span>
                <h3 className="text-base font-black text-slate-100">{selectedProduct.title}</h3>
              </div>

              {/* Description box */}
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-905 space-y-1">
                <span className="text-[10px] text-slate-500 block font-bold">وصف ومميزات السلعة:</span>
                <p className="text-xs text-slate-350 leading-relaxed font-sans">{selectedProduct.description}</p>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                  <span className="text-slate-500 text-[10px] block">مدة الضمان وتأمين الحماية:</span>
                  <span className="font-extrabold text-slate-300 block pt-0.5">{selectedProduct.warrantyPeriod}</span>
                </div>
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                  <span className="text-slate-500 text-[10px] block">حالة التفاوض:</span>
                  <span className="font-extrabold text-indigo-400 block pt-0.5">{selectedProduct.isNegotiable ? 'قابل للتفاوض البسيط 🗣️' : 'سعر نهائي ثابت 🔒'}</span>
                </div>
              </div>

              {/* Safe Escrow Check logo */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
                <span className="text-emerald-400 font-bold text-xl p-1 bg-emerald-500/10 rounded-lg">🛡️</span>
                <div className="space-y-0.5">
                  <h5 className="text-[11px] font-extrabold text-emerald-300">نظام الإسكرو الآمن متجر البوت المعتمد</h5>
                  <p className="text-[9.5px] text-slate-400">
                    أنت محمي تماماً. يحتجز البوت المبلغ في صندوق الضمان ولا تفرج عنه للمطور أو البائع إلا بعد قيامك بتأكيد التسليم.
                  </p>
                </div>
              </div>

              {/* Selection prices & rapid actions */}
              <div className="pt-3 border-t border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">السعر الصافي المطلوب:</span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-lg font-black text-emerald-400">
                      ${getProductDiscountsAndPrices(selectedProduct).finalPriceUSD}
                    </span>
                    <span className="text-xs text-slate-500">أو</span>
                    <span className="text-xs font-bold text-amber-400">
                      {getProductDiscountsAndPrices(selectedProduct).finalPricePoints} ⭐
                    </span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleBuyProductUSD(selectedProduct)}
                    className="py-2 px-4 bg-indigo-650 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow cursor-pointer transition active:scale-95"
                  >
                    شراء كاش 💳
                  </button>

                  <button
                    onClick={() => handleBuyProductPoints(selectedProduct)}
                    disabled={currentUser ? (currentUser.points || 0) < getProductDiscountsAndPrices(selectedProduct).finalPricePoints : true}
                    className={`py-2 px-4 font-black text-xs rounded-xl transition cursor-pointer active:scale-95 ${
                      currentUser && (currentUser.points || 0) >= getProductDiscountsAndPrices(selectedProduct).finalPricePoints
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                        : 'bg-slate-850 text-slate-500'
                    }`}
                  >
                    استبدال بالنقاط ⭐
                  </button>
                  
                  <button
                    onClick={() => handleReport(selectedProduct.id)}
                    className="p-2.5 bg-slate-900 hover:bg-rose-950/20 text-slate-505 hover:text-rose-400 border border-slate-800 rounded-xl transition"
                    title="بلغ عن السلعة لمخالفتها"
                  >
                    🚨
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
