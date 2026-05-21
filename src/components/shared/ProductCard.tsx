import React from 'react';
import { Product, TelegramUser } from '../../types';
import { Tag, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  seller: TelegramUser | undefined;
  onClickDetails: (product: Product) => void;
  onBuyPoints: (product: Product) => void;
  onBuyUSD: (product: Product) => void;
  canAffordPoints: boolean;
  currentUserPoints: number;
  finalPricePoints: number;
  finalPriceUSD: number;
}

const ProductCardComponent = ({
  product,
  seller,
  onClickDetails,
  onBuyPoints,
  onBuyUSD,
  canAffordPoints,
  currentUserPoints,
  finalPricePoints,
  finalPriceUSD
}: ProductCardProps) => {
  const discount = product.discountPercentage || 0;
  
  // Parse seller level styling
  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'VIP': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Verified': return 'bg-indigo-505/10 text-indigo-400 border border-indigo-500/20';
      case 'Trusted': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'High Risk': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Scam Suspected': return 'bg-rose-500/10 text-rose-450 border border-rose-500/20 animate-pulse';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  const getPaymentBadgeColor = (method: string) => {
    const norm = method.toLowerCase();
    if (norm.includes('baridi')) return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    if (norm.includes('ccp')) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    if (norm.includes('usdt') || norm.includes('crypto') || norm.includes('binance')) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-505/20';
    if (norm.includes('flexy')) return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    return 'bg-slate-800/80 text-slate-400 border border-slate-700/50';
  };

  const getProductTypeAr = (type: string) => {
    switch (type) {
      case 'game_account': return 'حساب لعبة 🎮';
      case 'subscription': return 'اشتراك رقمي 📺';
      case 'digital_service': return 'خدمة ديجيتال ⚡';
      case 'game_currency': return 'رصيد ألعاب 💎';
      case 'social_media': return 'سوشيال ميديا 📲';
      case 'design_dev': return 'تصميم وبرمجة 💻';
      case 'swap_item': return 'مبادلة 🔁';
      default: return 'سلعة رقمية 📦';
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#0d1627] to-[#090f1d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-350 hover:shadow-xl hover:-translate-y-1 relative group overflow-hidden">
      
      {/* Discount Tag */}
      {discount > 0 && (
        <span className="absolute top-3 right-3 z-10 bg-rose-600 text-white font-mono font-black text-[10px] px-2.5 py-1 rounded-lg shadow-md animate-pulse">
          {discount}% تخفيض-
        </span>
      )}

      {/* Product Type Icon */}
      <span className="absolute top-3 left-3 z-10 bg-slate-900/90 text-slate-200 text-[9px] font-bold px-2 py-1 rounded-lg border border-slate-850">
        {getProductTypeAr(product.type)}
      </span>

      {/* Image Container */}
      <div 
        onClick={() => onClickDetails(product)}
        className="aspect-video w-full rounded-xl overflow-hidden mb-3 relative bg-slate-950 border border-slate-850 cursor-pointer"
      >
        <img 
          src={product.images[0]} 
          alt={product.title} 
          loading="lazy" 
          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
      </div>

      <div className="space-y-2 flex-1 flex flex-col justify-between">
        
        {/* Title and stats */}
        <div className="space-y-1">
          <h4 
            onClick={() => onClickDetails(product)}
            className="text-xs sm:text-sm font-black text-slate-100 line-clamp-1 group-hover:text-indigo-400 transition cursor-pointer"
          >
            {product.title}
          </h4>
          <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Payments accepted badges */}
        <div className="flex flex-wrap gap-1.5 py-1.5">
          {product.acceptedPayments.map(pay => (
            <span key={pay} className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${getPaymentBadgeColor(pay)}`}>
              {pay}
            </span>
          ))}
          {product.isSwapAcceptable && (
            <span className="text-[8.5px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">
              مقبول المقايضة 🔁
            </span>
          )}
        </div>

        {/* Seller Info line */}
        {seller && (
          <div className="flex items-center justify-between bg-slate-950/40 p-1.5 rounded-lg border border-slate-900 text-[10px] py-1">
            <div className="flex items-center gap-1">
              <span className="text-xs">{seller.avatar}</span>
              <span className="font-bold text-slate-305 truncate max-w-[90px]">@{seller.username}</span>
            </div>
            <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded ${getLevelStyle(seller.level)}`}>
              {seller.level === 'Scam Suspected' ? '⚠️ مشبوه النصب' : seller.level}
            </span>
          </div>
        )}

        {/* Prices and buttons */}
        <div className="pt-2 border-t border-slate-905 flex flex-col gap-2 mt-auto">
          
          {/* Prices Grid */}
          <div className="flex items-center justify-between text-right">
            <div>
              <span className="text-[9px] text-slate-500 block">سعر رصيد المحفظة</span>
              <div className="flex items-baseline gap-1 font-mono">
                {discount > 0 && (
                  <span className="text-[10px] text-slate-500 line-through">${product.price}</span>
                )}
                <span className="text-sm font-black text-emerald-400">${finalPriceUSD}</span>
              </div>
            </div>

            <div className="text-left">
              <span className="text-[9px] text-slate-500 block text-right">أو استبدل فوراً بالنقاط ⭐</span>
              <span className="text-xs font-bold text-amber-400 font-mono flex items-center justify-end gap-0.5">
                {finalPricePoints} <span className="text-[10px]">⭐</span>
              </span>
            </div>
          </div>

          {/* Buttons Action */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onBuyUSD(product)}
              className="py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10.5px] rounded-lg transition active:scale-95 cursor-pointer shadow-md shadow-indigo-950/20"
            >
              دفع محفظة 💳
            </button>
            
            <button
              onClick={() => onBuyPoints(product)}
              disabled={!canAffordPoints}
              className={`py-1.5 font-bold text-[10.5px] rounded-lg transition active:scale-95 cursor-pointer text-center ${
                canAffordPoints 
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' 
                  : 'bg-slate-850/80 text-slate-500 hover:bg-slate-800'
              }`}
            >
              استبدال بالنقاط 🛍️
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export const ProductCard = React.memo(ProductCardComponent);
