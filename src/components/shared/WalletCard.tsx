import React from 'react';
import { UserWallet } from '../../types';
import { Wallet, ShieldAlert, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface WalletCardProps {
  wallet: UserWallet;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

export const WalletCardComponent = ({
  wallet,
  onOpenDeposit,
  onOpenWithdraw
}: WalletCardProps) => {
  const isFrozen = wallet.frozenBalance > 0;

  return (
    <div className="bg-gradient-to-br from-[#0e172a] to-[#070b16] border border-slate-800/80 rounded-2xl p-6 text-right relative overflow-hidden shadow-xl">
      {/* Absolute Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-505/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        
        {/* Balance representation cols */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">SkyWallet المحفظة الرسمية للوساطة</span>
              <h3 className="text-sm font-extrabold text-[#f1f5f9]">رصيدك الحالي المضمون بالدولار الأمريكي</h3>
            </div>
          </div>

          <div className="flex gap-8 items-baseline">
            <div>
              <span className="text-[9px] text-slate-500 block">الرصيد المتاح للسحب</span>
              <span className="text-3xl font-black text-sky-400 font-mono tracking-tight">
                ${wallet.availableBalance.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-slate-500 block">رصيد بالضمان معلق</span>
              <span className="text-lg font-black text-amber-400 font-mono">
                ${wallet.pendingBalance.toFixed(2)}
              </span>
            </div>

            {isFrozen && (
              <div className="bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-xl text-center animate-pulse">
                <span className="text-[8px] text-rose-400 font-black block">محجوز بأمر أمني 🔒</span>
                <span className="text-sm font-black text-rose-450 font-mono">
                  ${wallet.frozenBalance.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rapid deposit / withdrawal buttons */}
        <div className="flex flex-row sm:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={onOpenDeposit}
            className="flex-1 sm:flex-none py-2 px-5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/20 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-sky-200" />
            <span>تعبئة وشحن رصيد ⚡</span>
          </button>
          
          <button
            disabled={wallet.availableBalance <= 0}
            onClick={onOpenWithdraw}
            className={`flex-1 sm:flex-none py-2 px-5 font-extrabold text-xs rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
              wallet.availableBalance > 0
                ? 'bg-slate-905 hover:bg-slate-850 hover:text-slate-100 text-slate-300 border-slate-705'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-slate-500" />
            <span>طلب سحب أرباحك 💸</span>
          </button>
        </div>

      </div>

      {isFrozen && (
        <div className="mt-4 pt-3 border-t border-rose-500/10 flex items-center gap-2 text-[10.5px] text-rose-400 font-bold">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 animate-bounce" />
          <span>تم تجميد بعض أو كامل أموال هذه المحفظة بمعرفة الإدارة لتسوية نزاعات معلقة ولمكافحة النصب والاحتيال.</span>
        </div>
      )}

    </div>
  );
};

export const WalletCard = React.memo(WalletCardComponent);
export default WalletCard;
