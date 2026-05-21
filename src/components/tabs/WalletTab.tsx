import React, { useState, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useWalletStore } from '../../stores/useWalletStore';
import { useUserStore } from '../../stores/useUserStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { WalletCard } from '../shared/WalletCard';
import { Wallet, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WalletTab() {
  const wallets = useWalletStore(state => state.wallets);
  const depositFunds = useWalletStore(state => state.depositFunds);
  const withdrawFunds = useWalletStore(state => state.withdrawFunds);
  const currentUser = useUserStore(state => state.currentUser);
  const addSystemLog = useAlertStore(state => state.addSystemLog);

  // States
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('BaridiMob');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Fetch active user wallet
  const userWallet = useMemo(() => {
    if (!currentUser) return null;
    return wallets.find(w => w.userId === currentUser.id) || null;
  }, [wallets, currentUser]);

  // Handle Deposit
  const handleDepositSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('⚠️ يرجى تعيين مبلغ تعبئة مالي صحيح أكبر من صفر');
      return;
    }

    depositFunds(currentUser.id, amt, depositMethod);

    // Logs
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'العميل الذاتي',
      action: 'إيداع تجريبي في المحفظة',
      details: `@${currentUser.username} قام بشحن محفظته بـ ${amt}$ عبر بوابات ${depositMethod}`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setDepositAmount('');
    setShowDepositForm(false);
    toast.success(`🎉 تم تعبئة وشحن محفظتك بـ ${amt}$ بنجاح عبر بوابات ${depositMethod}`);
  }, [currentUser, depositAmount, depositMethod, depositFunds, addSystemLog]);

  // Handle Withdrawal
  const handleWithdrawSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userWallet) return;

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('⚠️ اكتب مبلغ السحب المطلوب');
      return;
    }

    const sanitizedAddress = DOMPurify.sanitize(withdrawAddress.trim());
    if (!sanitizedAddress) {
      toast.error('⚠️ اكتب بيانات استلام الأرباح البريدية أو عنوان المحفظة!');
      return;
    }

    if (userWallet.availableBalance < amt) {
      toast.error('❌ عذراً، رصيدك المتاح حالياً غير كافٍ لإتمام السحب.');
      return;
    }

    const success = await withdrawFunds(currentUser.id, amt, sanitizedAddress);
    if (success) {
      addSystemLog({
        id: 'log_' + Date.now(),
        adminId: 'system',
        adminName: 'العميل الذاتي',
        action: 'طلب سحب أرباح مبيعات',
        details: `@${currentUser.username} طلب سحب ${amt}$ للبيانات: ${withdrawAddress}`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });

      setWithdrawAmount('');
      setWithdrawAddress('');
      setShowWithdrawForm(false);
      toast.success(`💸 تم الرفع بنجاح! طلب سحب بقيمة ${amt}$ مرسل للمراجعة وتعبئة حوالة البريد الآن.`);
    } else {
      toast.error('❌ عذراً، فشل تقديم الطلب.');
    }
  }, [currentUser, userWallet, withdrawAmount, withdrawAddress, withdrawFunds, addSystemLog]);

  const getTxTypeAr = (type: string) => {
    switch (type) {
      case 'deposit': return 'إيداع وشحن ➕';
      case 'withdraw': return 'سحب أرباح ➖';
      case 'escrow_hold': return 'حجز ضمان مؤقت 🔒';
      case 'escrow_release': return 'تحرير ضمان مبيعات 🔓';
      case 'refund': return 'استرجاع مالي ↩️';
      case 'bonus': return 'بونص نقاط 🎁';
      case 'referral': return 'رسوم عمولات ⚖️';
      default: return 'معاملة مالية 💳';
    }
  };

  const getTxStatusAr = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-lg">مكتمل</span>;
      case 'pending':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-lg animate-pulse">قيد المراجعة</span>;
      case 'frozen':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold px-2 py-0.5 rounded-lg">مجمد مع النزاع</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-lg">فاشل</span>;
    }
  };

  return (
    <div className="space-y-6 text-right">

      {/* Wallet visualization Card */}
      {userWallet && (
        <WalletCard
          wallet={userWallet}
          onOpenDeposit={() => {
            setShowDepositForm(!showDepositForm);
            setShowWithdrawForm(false);
          }}
          onOpenWithdraw={() => {
            setShowWithdrawForm(!showWithdrawForm);
            setShowDepositForm(false);
          }}
        />
      )}

      {/* Slide Deposit Form */}
      {showDepositForm && (
        <div className="bg-[#0d1627] border border-slate-800 rounded-2xl p-5 space-y-4 max-w-lg">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <ArrowUpRight className="w-5 h-5 text-sky-450" />
            <h4 className="text-xs sm:text-sm font-black text-slate-100">شحن وتعبئة رصيد تجريبي (Sandbox Refill)</h4>
          </div>

          <form onSubmit={handleDepositSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block font-bold">بوابة الشحن المعتمدة:</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 font-bold"
                >
                  <option value="BaridiMob">تطبيق BaridiMob (بريد الجزائر)</option>
                  <option value="CCP">التحويل البريدي الورقي CCP</option>
                  <option value="USDT">شبكة USDT Tron (TRC20)</option>
                  <option value="Flexy">شرايح فليكسي موبيليس / جيزي</option>
                  <option value="Binance">منصة بايننس (Binance Pay) ID</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#94a3b8] block font-bold">المبلغ للشحن ($):</label>
                <input
                  type="number"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="مثال: 50$"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 font-bold"
                />
              </div>
            </div>

            <p className="text-[9.5px] text-slate-500 leading-relaxed">
              * ملاحظة: هذا نموذج شحن يحاكي الحقيقي ليمكنك من تجربة دور العميل المشتري ودفع الوساطة بشكل تفاعلي.
            </p>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-450 text-white font-black rounded-lg cursor-pointer transition"
            >
              شحن الرصيد فوراً ⚡
            </button>
          </form>
        </div>
      )}

      {/* Slide Withdraw Form */}
      {showWithdrawForm && (
        <div className="bg-[#0d1627] border border-slate-80 w-rounded-2xl p-5 space-y-4 max-w-lg">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-450" />
            <h4 className="text-xs sm:text-sm font-black text-slate-100">سحب وإرسال أرباح المبيعات</h4>
          </div>

          <form onSubmit={handleWithdrawSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-[#94a3b8] block font-bold">المبلغ المراد سحبه ($):</label>
                <input
                  type="number"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="الحد الأقصى: المتوفر"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block font-bold">رقم الحساب البريدي / المحفظة:</label>
                <input
                  type="text"
                  required
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="آيبان الـ RIP، رقم CCP، أو عنوان TRC20"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 font-bold"
                />
              </div>
            </div>

            <p className="text-[9.5px] text-slate-500 leading-relaxed">
              * بعد التأكيد، ستقوم الإدارة بمصادقة الطلب وتحويل المبلغ المالي للـ CCP أو محفظة العملات الرقمية خاصتك في غضون ساعتين.
            </p>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-450 text-white font-black rounded-lg cursor-pointer transition"
            >
              تقديم طلب سحب الأرباح 💸
            </button>
          </form>
        </div>
      )}

      {/* Transactions Table listings index */}
      <div className="bg-[#0d1627] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h4 className="text-xs sm:text-sm font-black text-slate-100">سجل وحركات تفاصيل المعاملات المالية</h4>
        </div>

        {userWallet && userWallet.transactions.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            لا توجد حركات تحويل مسجلة في محفظتك حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-850 text-slate-450">
                  <th className="pb-2.5 font-bold">نوع التحويل المعنون</th>
                  <th className="pb-2.5 font-bold">المبلغ المالي</th>
                  <th className="pb-2.5 font-bold">الآلية وبوابة الدفع</th>
                  <th className="pb-2.5 font-bold">الحالة الأمنية</th>
                  <th className="pb-2.5 font-bold">التوقيت والتاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 leading-relaxed">
                {userWallet?.transactions.map(tx => (
                  <tr key={tx.id} className="text-slate-250 hover:bg-slate-900/40">
                    <td className="py-2.5">
                      <span className="font-extrabold block">{getTxTypeAr(tx.type)}</span>
                      <span className="text-[9.5px] text-slate-500 block max-w-xs truncate">{tx.description}</span>
                    </td>
                    <td className={`py-2.5 font-mono font-black ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.amount >= 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                    </td>
                    <td className="py-2.5 font-bold text-slate-350">{tx.paymentMethod}</td>
                    <td className="py-2.5">{getTxStatusAr(tx.status)}</td>
                    <td className="py-2.5 font-mono text-[10px] text-slate-500">{tx.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
