import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useAuctionStore } from '../../stores/useAuctionStore';
import { useUserStore } from '../../stores/useUserStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { Gavel, Clock, ArrowUp, Plus, ShieldCheck } from 'lucide-react';
import { Auction } from '../../types';
import toast from 'react-hot-toast';

export default function AuctionTab() {
  const auctions = useAuctionStore(state => state.auctions);
  const placeBid = useAuctionStore(state => state.placeBid);
  const createAuction = useAuctionStore(state => state.createAuction);
  const completeAuction = useAuctionStore(state => state.completeAuction);

  const currentUser = useUserStore(state => state.currentUser);
  const wallets = useWalletStore(state => state.wallets);
  const holdEscrowFunds = useWalletStore(state => state.holdEscrowFunds);
  const addNotification = useAlertStore(state => state.addNotification);
  const addSystemLog = useAlertStore(state => state.addSystemLog);

  // States
  const [newAuctionTitle, setNewAuctionTitle] = useState('');
  const [newAuctionStartingPrice, setNewAuctionStartingPrice] = useState('');
  const [newAuctionDurationMinutes, setNewAuctionDurationMinutes] = useState('30');
  const [customBidValues, setCustomBidValues] = useState<Record<string, string>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Filter Active Auctions
  const activeAuctions = useMemo(() => {
    return auctions.filter(a => !a.isCompleted);
  }, [auctions]);

  const completedAuctions = useMemo(() => {
    return auctions.filter(a => a.isCompleted);
  }, [auctions]);

  // Periodic Timer scanner to auto-settle expired auctions
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = new Date();
      auctions.forEach(auc => {
        if (!auc.isCompleted && new Date(auc.endTime) <= now) {
          completeAuction(auc.id);
          
          if (auc.highestBidderId) {
            addNotification(auc.sellerId, '🔨 المزاد انتهى بنجاح!', `انتهى مزادك لـ ${auc.productTitle} بإرسائه ومجموع ${auc.highestBid}$! تواصل مع المشتري للتسليم.`, 'success');
            addNotification(auc.highestBidderId, '🔨 الفوز بمزاد علني في البوت!', `مبروك! لقد فزت بمزاد لـ ${auc.productTitle} كأعلى مزايد ومبلغ ${auc.highestBid}$. تم حجز الضمان!`, 'success');
          } else {
            addNotification(auc.sellerId, '🔨 المزاد انتهى بلا عروض', `انتهت مدة المزاد لـ ${auc.productTitle} دون تقديم مزايدات.`, 'info');
          }

          toast.success(`🔨 تم إغلاق وتصفية المزاد للسلعة: ${auc.productTitle}`);
        }
      });
    }, 10000); // scan every 10s

    return () => clearInterval(timerInterval);
  }, [auctions, completeAuction, addNotification]);

  // Create Auction
  const handleCreateAuctionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const sanitizedTitle = DOMPurify.sanitize(newAuctionTitle.trim());

    if (!sanitizedTitle || !newAuctionStartingPrice.trim()) {
      toast.error('⚠️ يرجى تزويد عنوان معنون وسعر المزاد الأدنى!');
      return;
    }

    const startPr = parseFloat(newAuctionStartingPrice);
    if (isNaN(startPr) || startPr <= 0) {
      toast.error('⚠️ يرجى وضع سعر بدء صحيح أكبر من 0');
      return;
    }

    const durMin = parseInt(newAuctionDurationMinutes) || 10;
    const endT = new Date(Date.now() + durMin * 60 * 1000).toISOString();

    createAuction({
      id: 'auc_' + Date.now().toString().slice(-4),
      productId: 'prod_auc_' + Date.now().toString().slice(-4),
      productTitle: sanitizedTitle,
      sellerId: currentUser.id,
      sellerName: currentUser.fullName,
      startingPrice: startPr,
      highestBid: startPr,
      endTime: endT,
      bidsCount: 0,
      isCompleted: false,
      createdAt: new Date().toISOString()
    });

    // Logging
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'محرر المزادات',
      action: 'إطلاق مزاد جديد',
      details: `@${currentUser.username} وضع مزاداً لـ ${sanitizedTitle} بسعر بدء ${startPr}$ لمده ${durMin} دقيقة`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setNewAuctionTitle('');
    setNewAuctionStartingPrice('');
    setShowCreateForm(false);
    toast.success('🔨 تم نشر وإطلاق المزاد الرقمي الخاص بك بنجاح! ننتظر مشاركة المزايدين.');
  }, [currentUser, newAuctionTitle, newAuctionStartingPrice, newAuctionDurationMinutes, createAuction, addSystemLog]);

  // Submit Bid
  const handlePlaceBidSubmit = useCallback(async (auc: Auction) => {
    if (!currentUser) {
      toast.error('⚠️ يرجى تفعيل حسابك كبائع أو مشتري أولاً!');
      return;
    }

    if (currentUser.id === auc.sellerId) {
      toast.error('❌ لا يمكنك المزايدة على سلعك والضمانات الخاصة بك لفبركة السعر!');
      return;
    }

    const customBidStr = customBidValues[auc.id] || '';
    const parsedBid = customBidStr ? parseFloat(customBidStr) : (auc.highestBid + 5);

    if (isNaN(parsedBid) || parsedBid <= auc.highestBid) {
      toast.error(`⚠️ يرجى وضع مزايدة تفوق السعر العالي الحالي بمبلغ صحيح! (الحد الأدنى: ${auc.highestBid + 1}$)`);
      return;
    }

    // Verify wallet balance
    const userWallet = wallets.find(w => w.userId === currentUser.id);
    if (!userWallet || userWallet.availableBalance < parsedBid) {
      toast.error(`❌ رصيد محفظتك غير كافٍ! تحتاج ${parsedBid}$، والمتوفر: ${userWallet?.availableBalance || 0}$.`);
      return;
    }

    // Lock bid funds in escrow so players don't cheat
    const lockSuccess = await holdEscrowFunds(
      currentUser.id,
      parsedBid,
      `حجز مؤقت لضمان حجز المزايدة لسلعة: ${auc.productTitle}`
    );

    if (!lockSuccess) {
      toast.error('❌ عذراً، فشل تأمين كفالة حشو المزايدة.');
      return;
    }

    // Process place bid
    placeBid(auc.id, currentUser.id, currentUser.fullName, parsedBid);

    // Notify original owner & outbid alerts
    if (auc.highestBidderId && auc.highestBidderId !== currentUser.id) {
       addNotification(auc.highestBidderId, '🔨 تم تجاوز مزايدتك بالبث!', `قام عميل أخر برفع السعر لـ ${parsedBid}$ على ${auc.productTitle}. قف في المزايدة لتسترجع كفالتك!`, 'warning');
    }

    addNotification(auc.sellerId, '🔨 مزايدة مرتفعة على سلعك!', `العضو @${currentUser.username} رفع المزايدة لمبلغ ${parsedBid}$ على السلعة: ${auc.productTitle}!`, 'success');

    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'مستشعر المزايدات',
      action: 'تسجيل مزايدة مزاد',
      details: `@${currentUser.username} زايد بـ ${parsedBid}$ على السلعة #${auc.productId}`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setCustomBidValues(prev => ({ ...prev, [auc.id]: '' }));
    toast.success(`🔨 مذهل! اعتليت صدارة المزاد بمبلغ ${parsedBid}$ وسيتم إشعار الجميع.`);
  }, [currentUser, customBidValues, wallets, holdEscrowFunds, placeBid, addNotification, addSystemLog]);

  return (
    <div className="space-y-6 text-right font-sans">
      
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0d1527] to-[#121c33] border border-slate-850 rounded-2xl p-5 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1">
          <span className="text-amber-400 font-extrabold text-xs block">🔨 الحسابات النادرة واليوزرات المميزة عارضة عاجلة</span>
          <h2 className="text-base sm:text-lg font-black text-slate-100">مزادات البوت الحية (SkyAuctions Live)</h2>
          <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xl">
            اعرض حسابات فالورانت النادرة خاصتك للمزايدة بـ $ أو بالنقاط. المزايدات يتم التحقق من توفر أرصدة كفلائها بمحافظ البوت لمنع المزايدات الوهمية، ويتحول المبلغ فوراً للإسكرو عند انتهاء مدة ساعة المزاد تلقائياً.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column Create Auction */}
        <div className="lg:col-span-4 bg-[#0d1627] border border-slate-800 p-4 md:p-5 rounded-2xl space-y-4">
          <h4 className="text-xs sm:text-sm font-black text-slate-100 border-b border-slate-80 pb-2 flex items-center justify-end gap-1.5">
            <span>انشر مزاداً فريداً من نوعك</span>
            <Gavel className="w-4 h-4 text-amber-400" />
          </h4>

          <form onSubmit={handleCreateAuctionSubmit} className="space-y-3 text-xs">
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">عنوان ومسمى السلعة النادرة:</label>
              <input
                type="text"
                required
                value={newAuctionTitle}
                onChange={(e) => setNewAuctionTitle(e.target.value)}
                placeholder="مثلاً: يوزر تيليجرام ثلاثي نادر @X_X"
                className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-bold text-slate-205 focus:border-amber-505 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 block font-bold">سعر الدخول الأدنى ($):</label>
                <input
                  type="number"
                  required
                  value={newAuctionStartingPrice}
                  onChange={(e) => setNewAuctionStartingPrice(e.target.value)}
                  placeholder="مثلاً: 20$"
                  className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-black text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-455 block font-bold">المدة المسموح المزايدة بها:</label>
                <select
                  value={newAuctionDurationMinutes}
                  onChange={(e) => setNewAuctionDurationMinutes(e.target.value)}
                  className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-bold"
                >
                  <option value="5">5 دقائق (أرقام سريعة)</option>
                  <option value="15">15 دقيقة</option>
                  <option value="30">30 دقيقة</option>
                  <option value="60">ساعة كاملة</option>
                  <option value="120">ساعتين</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-115 text-slate-950 font-black rounded-lg"
            >
              أطلق المزاد الرقمي الآن 🔨
            </button>

          </form>
        </div>

        {/* Right Column Active Tournaments list of auctions */}
        <div className="lg:col-span-8 space-y-4">
          <span className="text-[10.5px] text-slate-400 font-bold block pb-1 border-b border-[#121c32]">المزادات النشطة والحية بالبوت ({activeAuctions.length})</span>

          {activeAuctions.length === 0 ? (
            <div className="text-center py-20 bg-[#0c1324] border border-slate-850 rounded-xl p-6">
              <span className="text-2xl block">🔨</span>
              <h5 className="text-xs sm:text-sm font-extrabold text-slate-350">لا توجد أي مزادات علنية نشطة في هذا الوقت</h5>
              <p className="text-[9.5px] text-slate-500">جرب عرض حساباتك النادرة أو قسائم ديسكورد نيترو بمزاد علني خاص بك على اليسار.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeAuctions.map(auc => {
                const clockVal = new Date(auc.endTime).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div key={auc.id} className="bg-[#0e1726]/85 border border-amber-500/10 hover:border-amber-505/30 rounded-xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/15">نشط للجمهور</span>
                        <span className="text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>ينتهي: {clockVal}</span>
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-100 text-xs sm:text-sm">{auc.productTitle}</h4>
                      
                      <div className="bg-[#070b16] p-2.5 rounded-xl border border-slate-900 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-slate-550 block">أعلى مزايدة مسجلة</span>
                          <span className="text-base font-black text-amber-400 font-mono tracking-tight">${auc.highestBid}</span>
                        </div>
                        {auc.highestBidderName && (
                          <div className="text-left">
                            <span className="text-[9px] text-slate-553 block text-right">المتصدر الحالي:</span>
                            <span className="text-[10px] text-indigo-400 font-bold">@{auc.highestBidderName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-850/85 mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        value={customBidValues[auc.id] || ''}
                        onChange={(e) => setCustomBidValues({ ...customBidValues, [auc.id]: e.target.value })}
                        placeholder={`مثال: ${(auc.highestBid + 5)}$`}
                        className="w-24 bg-slate-950 p-1.5 rounded-lg border border-slate-850 font-black text-xs font-mono text-center text-slate-200"
                        id={`bid-amt-${auc.id}`}
                      />
                      <button
                        onClick={() => handlePlaceBidSubmit(auc)}
                        className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-[10.5px] rounded-lg transition overflow-hidden flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-slate-950" />
                        <span>تقديم مزايدة عاجلة 🔨</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
