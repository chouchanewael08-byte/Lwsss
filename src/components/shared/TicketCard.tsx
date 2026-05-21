import React from 'react';
import { EscrowTicket, TicketStatus } from '../../types';
import { MessageSquare, ShieldAlert, Award, ArrowUpRight, CheckCircle } from 'lucide-react';

interface TicketCardProps {
  ticket: EscrowTicket;
  activeTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  currentUserRole: string;
}

const TicketCardComponent = ({
  ticket,
  activeTicketId,
  onSelectTicket,
  currentUserRole
}: TicketCardProps) => {
  const isSelected = activeTicketId === ticket.id;

  const getStatusBadgeAr = (status: TicketStatus) => {
    switch (status) {
      case 'waiting_payment':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-lg">بانتظار الدفع الدفعة شحنت</span>;
      case 'waiting_delivery':
        return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-lg">بانتظار تسليم بيانات السلعة</span>;
      case 'delivered':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-lg">تم التسليم من البائع ✅</span>;
      case 'disputed':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-lg animate-pulse inline-flex items-center gap-1">نزاع نشط للإشراف ⚠️</span>;
      case 'completed':
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-lg">مكتمل ومحرر المبالغ 🎉</span>;
      case 'refunded':
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-extrabold px-2 py-0.5 rounded-lg">مسترجع وملغى ↩️</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 text-[9px] font-extrabold px-2 py-0.5 rounded-lg">تذكرة ضمان</span>;
    }
  };

  const isPointsPur = ticket.price === 0;

  return (
    <div 
      onClick={() => onSelectTicket(ticket.id)}
      className={`bg-slate-900 border text-right rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected 
          ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-xl scale-101' 
          : 'border-slate-800 hover:border-slate-705'
      }`}
    >
      <div className="space-y-1.5">
        
        {/* Top line ID and status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold block">تذكرة الإسكرو #{ticket.id}</span>
          {getStatusBadgeAr(ticket.status)}
        </div>

        {/* Product title */}
        <h4 className="text-xs sm:text-sm font-black text-slate-100 line-clamp-1 py-1">
          {ticket.productTitle}
        </h4>

        {/* Buyer & Seller users columns */}
        <div className="grid grid-cols-2 gap-2 text-[10px] py-1 bg-slate-950/40 p-2 rounded-xl border border-slate-905">
          <div>
            <span className="text-slate-500 block">المشتري:</span>
            <span className="font-extrabold text-indigo-400 truncate block">@{ticket.buyerName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-left">البائع:</span>
            <span className="font-extrabold text-emerald-400 truncate block text-left">@{ticket.sellerName}</span>
          </div>
        </div>

      </div>

      {/* Pricing detail and actions */}
      <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
        <div>
          <span className="text-[9px] text-slate-500 block">قيمة الصفقة</span>
          {isPointsPur ? (
            <span className="text-amber-400 font-mono font-bold text-xs">مدفوع بالكامل بالنقاط ⭐</span>
          ) : (
            <span className="text-emerald-400 font-mono font-black text-sm">${ticket.price}</span>
          )}
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelectTicket(ticket.id);
          }}
          className={`text-[9.5px] font-bold px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer ${
            isSelected 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {isSelected ? 'تحدث مع الوسيط 💬' : 'عرض المحادثة والضمان 👀'}
        </button>
      </div>

    </div>
  );
};

export const TicketCard = React.memo(TicketCardComponent);
