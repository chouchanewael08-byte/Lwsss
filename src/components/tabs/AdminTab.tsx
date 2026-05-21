import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import * as reactWindow from 'react-window';
const List: any = (reactWindow as any).FixedSizeList || (reactWindow as any).default?.FixedSizeList || (reactWindow as any).default || reactWindow;
import ConfirmModal from '../shared/ConfirmModal';
import { api } from '../../lib/api';

// Virtualized Users List for lists over 10 items
interface UsersListProps {
  items: any[];
  warningText: Record<string, string>;
  setWarningText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  balanceAmount: Record<string, number>;
  setBalanceAmount: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  warnUserMut: any;
  adjustBalanceMut: any;
  handleBanUserClick: (u: any) => void;
  uId?: string;
}

const UsersList = ({
  items,
  warningText,
  setWarningText,
  balanceAmount,
  setBalanceAmount,
  warnUserMut,
  adjustBalanceMut,
  handleBanUserClick
}: UsersListProps) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const u = items[index];
    if (!u) return null;
    return (
      <div style={style} className="pb-3 px-1">
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 h-[135px] flex flex-col justify-between hover:border-slate-850 transition">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg leading-none">{u.avatar}</span>
              <h4 className="font-extrabold text-[#f1f5f9] text-xs leading-none">{u.fullName}</h4>
              <span className="text-[10px] text-indigo-400 font-mono leading-none">@{u.username}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded leading-none ${u.role === 'admin' ? 'bg-red-955 text-red-400' : u.role === 'seller' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-900 text-slate-400'}`}>
                {u.role === 'admin' ? '👑 مدير' : u.role === 'seller' ? '🏪 بائع' : '🛒 مشتري'}
              </span>
              {u.isBanned && (
                <span className="text-[9px] bg-red-650 text-white font-black px-2 py-0.5 rounded leading-none">محظور 🚫</span>
              )}
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 font-mono">
            معرف الحساب: {u.id} | رصيد متوفر: <strong>{u.wallet?.availableBalance?.toFixed(2) || '0.00'}$</strong> | رصيد معلق: {u.wallet?.pendingBalance?.toFixed(2) || '0.00'}$
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="text" 
              placeholder="أدخل نص التنبيه وعقوبة..."
              className="bg-slate-950 p-1 border border-slate-900 text-[10px] rounded-lg max-w-[140px] text-right text-slate-200"
              value={warningText[u.id] || ''}
              onChange={(e) => setWarningText({ ...warningText, [u.id]: e.target.value })}
            />
            <button 
              onClick={() => {
                const w = warningText[u.id];
                if (!w) return toast.error('أدخل سبب الإنذار أولاً');
                warnUserMut.mutate({ id: u.id, warning: w });
                setWarningText({ ...warningText, [u.id]: '' });
              }}
              className="p-1 px-2.5 bg-amber-955 text-amber-300 text-[10px] font-bold rounded-lg hover:bg-amber-950 transition border border-amber-900/50 cursor-pointer"
            >
              إنذار
            </button>

            <input 
              type="number" 
              placeholder="مثلا: 10 أو -20"
              className="bg-slate-950 p-1 border border-slate-900 tracking-tight font-mono text-[10px] rounded-lg max-w-[75px] text-center text-slate-200"
              value={balanceAmount[u.id] || ''}
              onChange={(e) => setBalanceAmount({ ...balanceAmount, [u.id]: Number(e.target.value) })}
            />
            <button 
              onClick={() => {
                const amt = balanceAmount[u.id];
                if (!amt) return toast.error('أدخل القيمة أولاً');
                adjustBalanceMut.mutate({ id: u.id, amount: amt });
                setBalanceAmount({ ...balanceAmount, [u.id]: 0 });
              }}
              className="p-1 px-2.5 bg-emerald-955 text-emerald-300 text-[10px] font-bold rounded-lg hover:bg-emerald-950 transition border border-emerald-900/50 cursor-pointer"
            >
              تعديل رصيد
            </button>

            <button 
              onClick={() => handleBanUserClick(u)}
              className={`p-1 px-3 text-[10px] font-black rounded-lg transition border cursor-pointer ${
                u.isBanned 
                  ? 'bg-rose-955/40 text-rose-400 border-rose-900/30 hover:bg-rose-955' 
                  : 'bg-slate-900 hover:bg-slate-850 hover:text-rose-400 text-slate-400 border-slate-800'
              }`}
            >
              {u.isBanned ? 'فك حظر الحساب' : 'حظر الحساب 🚫'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <List
      height={500}
      itemCount={items.length}
      itemSize={150}
      width="100%"
    >
      {Row}
    </List>
  );
};

// Virtualized Sellers List for lists over 10 items
interface SellersListProps {
  items: any[];
  setSellerLevelMut: any;
  setSellerCommissionMut: any;
  handleFreezeWalletClick: (seller: any) => void;
  toggleSellerWithdrawMut: any;
}

const SellersList = ({
  items,
  setSellerLevelMut,
  setSellerCommissionMut,
  handleFreezeWalletClick,
  toggleSellerWithdrawMut
}: SellersListProps) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const seller = items[index];
    if (!seller) return null;
    const isWalletFrozen = seller.wallet?.frozenBalance > 0;
    return (
      <div style={style} className="pb-3 px-1">
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 h-[175px] flex flex-col justify-between hover:border-slate-850 transition">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-extrabold text-[#f1f5f9] text-xs leading-none">{seller.fullName}</h4>
                <span className="text-[10px] text-indigo-300 font-mono leading-none">@{seller.username}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                  seller.sellerLevel === 'VIP' ? 'bg-amber-900 text-amber-400' : 
                  seller.sellerLevel === 'Verified' ? 'bg-emerald-950 text-emerald-400' : 
                  seller.sellerLevel === 'Trusted' ? 'bg-cyan-950 text-cyan-400' : 
                  seller.sellerLevel === 'High Risk' ? 'bg-rose-955 text-rose-400' : 'bg-red-700 text-white'
                }`}>
                  مستوى: {seller.sellerLevel || 'مستجد'}
                </span>
              </div>
              <span className="text-[9.5px] text-slate-500 font-mono mt-0.5 block leading-none">
                المعرف: {seller.id} | رصيد الإيداع: {seller.wallet?.availableBalance?.toFixed(2) || '0.00'}$ | النسبة الحالية المخصومة: {seller.commissionPercentage || 10}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 leading-none">سماح سحب بريدي:</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded leading-none ${seller.allowWithdrawals !== false ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-955 text-rose-455'}`}>
                {seller.allowWithdrawals !== false ? 'مفعل وجاهز' : 'محظور فوريا'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-905 items-center">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 block font-bold leading-none">تغيير فئة البائع ورتبته:</label>
              <select 
                value={seller.sellerLevel}
                onChange={(e) => setSellerLevelMut.mutate({ id: seller.id, level: e.target.value })}
                className="w-full bg-slate-950 p-1 border border-slate-900 text-[10px] rounded-lg text-slate-300 font-extrabold"
              >
                <option value="Trusted">Trusted (بائع موثوق)</option>
                <option value="Verified">Verified (بائع معتمد)</option>
                <option value="VIP">VIP (بائع توب خاص)</option>
                <option value="High Risk">High Risk (بائع عالي الخطورة)</option>
                <option value="Scam Suspected">Scam Suspected (احتيال مشتبه)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 block font-bold leading-none">رسوم المنصة على المبيعات (%):</label>
              <input 
                type="number"
                defaultValue={seller.commissionPercentage || 10}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val <= 100) {
                    setSellerCommissionMut.mutate({ id: seller.id, commission: val });
                  }
                }}
                className="w-full bg-slate-950 p-1 border border-slate-900 tracking-tight font-mono text-[10px] rounded-lg text-center text-slate-200"
              />
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <button
                type="button"
                onClick={() => handleFreezeWalletClick(seller)}
                className={`py-1.5 px-3 text-[10px] font-black rounded-lg border transition cursor-pointer ${
                  isWalletFrozen 
                    ? 'bg-rose-955/60 text-rose-400 border-rose-900/40 hover:bg-rose-955' 
                    : 'bg-slate-900 text-slate-400 border-slate-850 hover:text-rose-455'
                }`}
              >
                {isWalletFrozen ? '🔓 إطلاق الرصيد المحبوس' : '🔒 تجميد واحتجاز الرصيد'}
              </button>
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <button
                type="button"
                onClick={() => toggleSellerWithdrawMut.mutate(seller.id)}
                className="py-1.5 px-3 text-[11px] font-black bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-850 rounded-lg cursor-pointer"
              >
                {seller.allowWithdrawals !== false ? '⛔ سحب CCP معطل' : '✅ تمكين مكاتب سحب'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <List
      height={500}
      itemCount={items.length}
      itemSize={190}
      width="100%"
    >
      {Row}
    </List>
  );
};
import { 
  ShieldCheck, 
  Users, 
  Ban, 
  Radio, 
  FileText, 
  Settings, 
  ExternalLink, 
  HelpCircle, 
  Download, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  Star, 
  Check, 
  X, 
  Shield, 
  Lock, 
  Unlock, 
  Percent,
  Layers,
  Activity,
  Award,
  BookOpen
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminTab() {
  const queryClient = useQueryClient();
  const [activeSubSection, setActiveSubSection] = useState<'dashboard' | 'users' | 'sellers' | 'products' | 'disputes' | 'finance' | 'broadcast' | 'security' | 'logs' | 'settings'>('dashboard');

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleBanUserClick = (u: any) => {
    const isBanning = !u.isBanned;
    setConfirmModal({
      isOpen: true,
      title: isBanning ? 'تأكيد حظر العضو' : 'تأكيد إلغاء حظر العضو',
      message: isBanning 
        ? `هل أنت متأكد من حظر المستخدم ${u.fullName} (ID: ${u.id})؟ سيمنع هذا العضو من تسجيل الدخول أو استخدام السوق.`
        : `هل أنت متأكد من إلغاء حظر المستخدم ${u.fullName} (ID: ${u.id})؟`,
      confirmText: isBanning ? 'نعم، حظر العضو' : 'نعم، فك الحظر',
      cancelText: 'تراجع',
      type: 'danger',
      onConfirm: () => {
        banUserMut.mutate({ id: u.id, ban: isBanning });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleFreezeWalletClick = (seller: any) => {
    const isWalletFrozen = seller.wallet?.frozenBalance > 0;
    const isFreezing = !isWalletFrozen;
    setConfirmModal({
      isOpen: true,
      title: isFreezing ? 'تأكيد تجميد محفظة البائع' : 'تأكيد إلغاء تجميد محفظة البائع',
      message: isFreezing
        ? `هل أنت متأكد من تجميد رصيد البائع ${seller.fullName} وتجميد أمواله؟`
        : `هل أنت متأكد من إلغاء تجميد رصيد البائع ${seller.fullName}؟`,
      confirmText: isFreezing ? 'نعم، تجميد المحفظة' : 'نعم، فك التجميد',
      cancelText: 'تراجع',
      type: 'danger',
      onConfirm: () => {
        freezeWalletMut.mutate({ id: seller.id, freeze: isFreezing });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteProductClick = (prod: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأكيد شطب وحذف المنتج',
      message: `هل أنت متأكد من حذف وإزالة المنتج "${prod.title}" نهائياً من العرض والسوق؟ هذا الإجراء غير قابل للتراجع.`,
      confirmText: 'نعم، احذف المنتج',
      cancelText: 'تراجع',
      type: 'danger',
      onConfirm: () => {
        deleteProductMut.mutate(prod.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRejectProductClick = (prod: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأكيد رفض السلعة',
      message: `هل أنت متأكد من رفض السلعة "${prod.title}" ومنع عرضها على المتسوقين؟`,
      confirmText: 'نعم، ارفض السلعة',
      cancelText: 'تراجع',
      type: 'warning',
      onConfirm: () => {
        rejectProductMut.mutate({ id: prod.id, reason: 'المورد تالف أو محظور' });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Load Admin Stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.getAdminStats(),
    refetchInterval: 15000 // auto refresh stats every 15s
  });

  // Load Admin Users List
  const [userPage, setUserPage] = useState(1);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', userPage, userSearchQuery],
    queryFn: () => api.getAdminUsers(userPage, 15, userSearchQuery)
  });

  // Load Admin Sellers
  const { data: sellersData, isLoading: sellersLoading, refetch: refetchSellers } = useQuery({
    queryKey: ['adminSellers'],
    queryFn: () => api.getAdminSellers()
  });

  // Load Admin Products
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: () => api.getAdminProducts()
  });

  // Load Admin Disputes
  const { data: disputesData, isLoading: disputesLoading, refetch: refetchDisputes } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: () => api.getAdminDisputes()
  });

  // Load Admin Withdrawals
  const { data: withdrawalsData, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['adminWithdrawals'],
    queryFn: () => api.getAdminWithdrawals()
  });

  // Load Admin Security Alerts
  const [securityFilter, setSecurityFilter] = useState('all');
  const { data: securityAlerts, isLoading: securityLoading, refetch: refetchSecurity } = useQuery({
    queryKey: ['adminSecurity', securityFilter],
    queryFn: () => api.getAdminSecurityAlerts(securityFilter)
  });

  // Load Admin Logs
  const { data: systemLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['adminLogs'],
    queryFn: () => api.getAdminLogs()
  });

  // Mutator triggers for admin workflow actions
  const banUserMut = useMutation({
    mutationFn: ({ id, ban }: { id: string, ban: boolean }) => api.banUser(id, ban),
    onSuccess: (data) => {
      toast.success(data.message || 'تم تحديث حالة حظر العضو!');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    }
  });

  const adjustBalanceMut = useMutation({
    mutationFn: ({ id, amount }: { id: string, amount: number }) => api.adjustUserBalance(id, amount),
    onSuccess: (data) => {
      toast.success('💸 تم تسوية وتعديل رصيد العضو بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    }
  });

  const warnUserMut = useMutation({
    mutationFn: ({ id, warning }: { id: string, warning: string }) => api.warnUser(id, warning),
    onSuccess: () => {
      toast.success('⚠️ تم توجيه إنذار رسمي مغلظ لعضو الحساب!');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    }
  });

  const setSellerLevelMut = useMutation({
    mutationFn: ({ id, level }: { id: string, level: string }) => api.setSellerLevel(id, level),
    onSuccess: () => {
      toast.success('✔️ تم ترقية وتعديل شارة الثقة للبائع ميكانيكياً!');
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
    }
  });

  const freezeWalletMut = useMutation({
    mutationFn: ({ id, freeze }: { id: string, freeze: boolean }) => api.freezeSellerWallet(id, freeze),
    onSuccess: () => {
      toast.success('🔒 تم تغيير حالة حجز وسحب أموال محفظة الجاني!');
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
    }
  });

  const toggleSellerWithdrawMut = useMutation({
    mutationFn: (id: string) => api.toggleSellerWithdraw(id),
    onSuccess: () => {
      toast.success('⚖️ تم تغيير صلاحية مراجعات السحب البريدي للبائع!');
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
    }
  });

  const setSellerCommissionMut = useMutation({
    mutationFn: ({ id, commission }: { id: string, commission: number }) => api.setSellerCommission(id, commission),
    onSuccess: () => {
      toast.success('✔️ تم تعديل النسبة المئوية المخصومة للمنصة لهذا البائع!');
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
    }
  });

  const approveProductMut = useMutation({
    mutationFn: (id: string) => api.approveProduct(id),
    onSuccess: () => {
      toast.success('✨ تم تفعيل منتج العضو وعرضه للمستهلكين بالسوق!');
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    }
  });

  const rejectProductMut = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => api.rejectProduct(id, reason),
    onSuccess: () => {
      toast.error('❌ تم رفض السلعة وإرسال تفسير للمطور/العارض!');
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    }
  });

  const setProductFeatureMut = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string, isFeatured: boolean }) => api.setProductFeature(id, isFeatured),
    onSuccess: () => {
      toast.success('⭐️ تم تعديل ميزة ترويج وعرض السلعة في واجهة العارضين!');
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    }
  });

  const deleteProductMut = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      toast.success('🗑️ تم شطب المنتج أو الملف نهائيا من الخادم!');
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    }
  });

  const setProductFlashSaleMut = useMutation({
    mutationFn: ({ id, discount, durationMini }: { id: string, discount: number, durationMini: number }) => 
      api.setProductFlashSale(id, discount, durationMini),
    onSuccess: () => {
      toast.success('⚡ تم جدول تخفيض الفلاش السريع للمنتج وعمل العداد الزمني!');
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
    }
  });

  const resolveDisputeMut = useMutation({
    mutationFn: ({ id, resolution_type, refund_percentage }: { id: string, resolution_type: any, refund_percentage?: number }) => 
      api.resolveDispute(id, resolution_type, refund_percentage),
    onSuccess: () => {
      toast.success('⚖️ تم إغلاق النزاع وتحرير ميزانية الضمان بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['adminDisputes'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    }
  });

  const processWithdrawalMut = useMutation({
    mutationFn: ({ id, decision }: { id: string, decision: 'approve' | 'reject' }) => 
      api.processWithdrawalAction(id, decision),
    onSuccess: (data) => {
      toast.success(data.message || 'تم حسم الحوالة وإجابة طلب الدفع!');
      queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    }
  });

  const broadcastMut = useMutation({
    mutationFn: ({ text, target }: { text: string, target: string }) => api.broadcastAnnouncement(text, target),
    onSuccess: () => {
      toast.success('🔊 تم نشر النداء الإذاعي فورا في لوحات العملاء!');
    }
  });

  const triggerSecurityScanMut = useMutation({
    mutationFn: () => api.triggerSecurityScan(),
    onSuccess: (data) => {
      toast.success(`⚡ تم إكمال المسح الشامل بنجاح! تم رصد ${data.logsScanned} وثيقة ومستند دردشة.`);
      queryClient.invalidateQueries({ queryKey: ['adminSecurity'] });
    }
  });

  // Local Form Sates
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [refundPercent, setRefundPercent] = useState<Record<string, number>>({});
  const [flashDiscount, setFlashDiscount] = useState<Record<string, number>>({});
  const [flashDuration, setFlashDuration] = useState<Record<string, number>>({});
  const [balanceAmount, setBalanceAmount] = useState<Record<string, number>>({});
  const [warningText, setWarningText] = useState<Record<string, string>>({});

  // Global platform settings state
  const [platformCCP, setPlatformCCP] = useState('RIB: 0079999900012354563 الجزائر');
  const [platformBinance, setPlatformBinance] = useState('USDT-TRC20: TYVbux7Xp89Hns...v455');
  const [minWithdrawal, setMinWithdrawal] = useState(15);
  const [defaultFee, setDefaultFee] = useState(10);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleUpdatePlatformSettings = () => {
    api.updatePlatformSettings({
      ccpDetails: platformCCP,
      binanceDetails: platformBinance,
      minWithdrawLimit: minWithdrawal,
      feePercentage: defaultFee,
      maintenance: maintenanceMode
    }).then(() => {
      toast.success('⚙️ تم تطبيق تعديلات إعدادات خادم سوق جزائري ميكانيكياً!');
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    });
  };

  // Synchronize dynamic local values on statistics load
  useEffect(() => {
    if (stats?.settings) {
      setPlatformCCP(stats.settings.ccpDetails || '');
      setPlatformBinance(stats.settings.binanceDetails || '');
      setMinWithdrawal(stats.settings.minWithdrawLimit || 15);
      setDefaultFee(stats.settings.feePercentage || 10);
      setMaintenanceMode((stats.settings.maintenance === true) || false);
    }
  }, [stats]);

  // Export JSON logs
  const handleExportJSON = () => {
    if (!systemLogs) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(systemLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `skymarket_backend_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('📁 تم تصدير سجلات تدقيق النظام بصيغة JSON متوافقة!');
  };

  // Recharts Revenue Area Data
  const revenueChartData = useMemo(() => {
    if (stats?.revenueStats) {
      return stats.revenueStats;
    }
    return [
      { day: 'السبت', val: 5 },
      { day: 'الأحد', val: 12 },
      { day: 'الإثنين', val: 24 },
      { day: 'الثلاثاء', val: 30 },
      { day: 'الأربعاء', val: 45 },
      { day: 'الخميس', val: 68 },
      { day: 'الجمعة', val: 110 }
    ];
  }, [stats]);

  const renderUsersList = () => {
    const items = usersData?.data || [];
    if (items.length > 10) {
      return (
        <UsersList 
          items={items}
          warningText={warningText}
          setWarningText={setWarningText}
          balanceAmount={balanceAmount}
          setBalanceAmount={setBalanceAmount}
          warnUserMut={warnUserMut}
          adjustBalanceMut={adjustBalanceMut}
          handleBanUserClick={handleBanUserClick}
        />
      );
    }

    return (
      <div className="space-y-3">
        {items.map((u: any) => (
          <div key={u.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-850 transition">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{u.avatar}</span>
                <h4 className="font-extrabold text-[#f1f5f9] text-xs">{u.fullName}</h4>
                <span className="text-[10px] text-indigo-400 font-mono">@{u.username}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-red-955 text-red-405' : u.role === 'seller' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-900 text-slate-400'}`}>
                  {u.role === 'admin' ? '👑 مدير' : u.role === 'seller' ? '🏪 بائع' : '🛒 مشتري'}
                </span>
                {u.isBanned && (
                  <span className="text-[9px] bg-red-650 text-white font-black px-2 py-0.5 rounded">محظور 🚫</span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-500 mt-1 font-mono">
                معرف الحساب: {u.id} | رصيد متوفر: <strong>{u.wallet?.availableBalance?.toFixed(2) || '0.00'}$</strong> | رصيد معلق: {u.wallet?.pendingBalance?.toFixed(2) || '0.00'}$
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input 
                type="text" 
                placeholder="أدخل نص التنبيه وعقوبة..."
                className="bg-slate-950 p-1 border border-slate-900 text-[10px] rounded-lg max-w-[140px] text-right text-slate-250"
                value={warningText[u.id] || ''}
                onChange={(e) => setWarningText({ ...warningText, [u.id]: e.target.value })}
              />
              <button 
                onClick={() => {
                  const w = warningText[u.id];
                  if (!w) return toast.error('أدخل سبب الإنذار أولاً');
                  warnUserMut.mutate({ id: u.id, warning: w });
                  setWarningText({ ...warningText, [u.id]: '' });
                }}
                className="p-1 px-2.5 bg-amber-955 text-amber-300 text-[10px] font-bold rounded-lg hover:bg-amber-950 transition border border-amber-900/50 cursor-pointer"
              >
                إنذار
              </button>

              <input 
                type="number" 
                placeholder="مثلا: 10 أو -20"
                className="bg-slate-950 p-1 border border-slate-900 tracking-tight font-mono text-[10px] rounded-lg max-w-[75px] text-center text-slate-250"
                value={balanceAmount[u.id] || ''}
                onChange={(e) => setBalanceAmount({ ...balanceAmount, [u.id]: Number(e.target.value) })}
              />
              <button 
                onClick={() => {
                  const amt = balanceAmount[u.id];
                  if (!amt) return toast.error('أدخل القيمة أولاً');
                  adjustBalanceMut.mutate({ id: u.id, amount: amt });
                  setBalanceAmount({ ...balanceAmount, [u.id]: 0 });
                }}
                className="p-1 px-2.5 bg-emerald-955 text-emerald-300 text-[10px] font-bold rounded-lg hover:bg-emerald-950 transition border border-emerald-900/50 cursor-pointer"
              >
                تعديل رصيد
              </button>

              <button 
                onClick={() => handleBanUserClick(u)}
                className={`p-1 px-3 text-[10px] font-black rounded-lg transition border cursor-pointer ${
                  u.isBanned 
                    ? 'bg-rose-955/40 text-rose-400 border-rose-900/30 hover:bg-rose-955' 
                    : 'bg-slate-900 hover:bg-slate-850 hover:text-rose-455 text-slate-400 border-slate-800'
                }`}
              >
                {u.isBanned ? 'فك حظر الحساب' : 'حظر الحساب 🚫'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSellersList = () => {
    const items = sellersData || [];
    if (items.length > 10) {
      return (
        <SellersList 
          items={items}
          setSellerLevelMut={setSellerLevelMut}
          setSellerCommissionMut={setSellerCommissionMut}
          handleFreezeWalletClick={handleFreezeWalletClick}
          toggleSellerWithdrawMut={toggleSellerWithdrawMut}
        />
      );
    }

    return (
      <div className="space-y-4">
        {items.map((seller: any) => {
          const isWalletFrozen = seller.wallet?.frozenBalance > 0;
          return (
            <div key={seller.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 space-y-3 hover:border-slate-850 transition">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-extrabold text-[#f1f5f9] text-xs leading-none">{seller.fullName}</h4>
                    <span className="text-[10px] text-indigo-300 font-mono leading-none">@{seller.username}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      seller.sellerLevel === 'VIP' ? 'bg-amber-900 text-amber-400' : 
                      seller.sellerLevel === 'Verified' ? 'bg-emerald-950 text-emerald-400' : 
                      seller.sellerLevel === 'Trusted' ? 'bg-cyan-950 text-cyan-400' : 
                      seller.sellerLevel === 'High Risk' ? 'bg-rose-955 text-rose-400' : 'bg-red-700 text-white'
                    }`}>
                      مستوى: {seller.sellerLevel || 'مستجد'}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-500 font-mono mt-0.5 block leading-none">
                    المعرف: {seller.id} | رصيد الإيداع: {seller.wallet?.availableBalance?.toFixed(2) || '0.00'}$ | النسبة الحالية المخصومة: {seller.commissionPercentage || 10}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 leading-none">سماح سحب بريدي:</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded leading-none ${seller.allowWithdrawals !== false ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-955 text-rose-455'}`}>
                    {seller.allowWithdrawals !== false ? 'مفعل وجاهز' : 'محظور فوريا'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-905 items-center">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 block font-bold leading-none">تغيير فئة البائع ورتبته:</label>
                  <select 
                    value={seller.sellerLevel}
                    onChange={(e) => setSellerLevelMut.mutate({ id: seller.id, level: e.target.value })}
                    className="w-full bg-slate-950 p-1 border border-slate-900 text-[10px] rounded-lg text-slate-300 font-extrabold"
                  >
                    <option value="Trusted">Trusted (بائع موثوق)</option>
                    <option value="Verified">Verified (بائع معتمد)</option>
                    <option value="VIP">VIP (بائع توب خاص)</option>
                    <option value="High Risk">High Risk (بائع عالي الخطورة)</option>
                    <option value="Scam Suspected">Scam Suspected (احتيال مشتبه)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 block font-bold leading-none">رسوم المنصة على المبيعات (%):</label>
                  <input 
                    type="number"
                    defaultValue={seller.commissionPercentage || 10}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 0 && val <= 100) {
                        setSellerCommissionMut.mutate({ id: seller.id, commission: val });
                      }
                    }}
                    className="w-full bg-slate-950 p-1 border border-slate-900 tracking-tight font-mono text-[10px] rounded-lg text-center text-slate-200"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => handleFreezeWalletClick(seller)}
                    className={`py-1.5 px-3 text-[10px] font-black rounded-lg border transition cursor-pointer ${
                      isWalletFrozen 
                        ? 'bg-rose-955/60 text-rose-400 border-rose-900/40 hover:bg-rose-955' 
                        : 'bg-slate-900 text-slate-400 border-slate-850 hover:text-rose-455'
                    }`}
                  >
                    {isWalletFrozen ? '🔓 إطلاق الرصيد المحبوس' : '🔒 تجميد واحتجاز الرصيد'}
                  </button>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => toggleSellerWithdrawMut.mutate(seller.id)}
                    className="py-1.5 px-3 text-[10px] font-black bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-850 rounded-lg cursor-pointer"
                  >
                    {seller.allowWithdrawals !== false ? '⛔ سحب CCP معطل' : '✅ تمكين مكاتب سحب'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#070b14]/50 border border-slate-900 rounded-3xl p-4 sm:p-6 text-right font-sans" dir="rtl">
      
      {/* Upper Navigation Rail headers */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>الكونسول والتحكم المتقدم للإدارة والوسيد (Super Admin Console)</span>
          </h2>
          <p className="text-xs text-slate-400">إدارة البائعين المعتمدين، فض نزاعات الإسكرو، وبوابات CCP والرقابة الأمنية الفورية.</p>
        </div>

        {/* Action Refecher */}
        <button 
          onClick={() => {
            refetchStats();
            refetchUsers();
            refetchSellers();
            refetchProducts();
            refetchDisputes();
            refetchWithdrawals();
            refetchSecurity();
            refetchLogs();
            toast.success('⚡ تم تحديث ومزامنة البيانات في الآن!');
          }}
          className="p-2.5 bg-slate-900 hover:bg-slate-850 hover:text-indigo-400 text-slate-400 rounded-xl transition border border-slate-805 cursor-pointer text-xs flex items-center gap-1.5 font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>مزامنة لايف</span>
        </button>
      </div>

      {/* Tabs administrative Sections selector - Mobile Dropdown */}
      <div className="block md:hidden mb-6">
        <label htmlFor="adminSubSectionSelect" className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block mb-2 px-1">الأقسام الإدارية:</label>
        <select
          id="adminSubSectionSelect"
          value={activeSubSection}
          onChange={(e) => setActiveSubSection(e.target.value as any)}
          className="w-full bg-slate-950/80 border border-slate-850 rounded-xl p-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-600 transition"
        >
          <option value="dashboard">📊 لوحة الإحصائيات العامة</option>
          <option value="users">👤 إدارة الأعضاء</option>
          <option value="sellers">🏅 توثيق البائعين والعمولات</option>
          <option value="products">📦 رقابة وتفعيل السلع</option>
          <option value="disputes">⚠️ فض نزاعات الإسكرو</option>
          <option value="finance">💰 الذمم المالية والـ CCP</option>
          <option value="broadcast">📢 نداءات المذياع والبث</option>
          <option value="security">🛡️ الرقابة الأمنية والدردشات</option>
          <option value="logs">📝 سجلات التحركات</option>
          <option value="settings">⚙️ الإعدادات العامة</option>
        </select>
      </div>

      {/* Tabs administrative Sections selector - Desktop Grid */}
      <div className="hidden md:grid md:grid-cols-5 gap-2.5 mb-6 text-xs text-slate-350 font-bold">
        <button 
          onClick={() => setActiveSubSection('dashboard')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'dashboard' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>لوحة الإحصائيات العامة</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('users')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'users' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>إدارة الأعضاء</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('sellers')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'sellers' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>توثيق البائعين والعمولات</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('products')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'products' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>رقابة وتفعيل السلع</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('disputes')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'disputes' ? 'bg-[#9f1239] text-white border-rose-900 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-350" />
          <span>فض نزاعات الإسكرو</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('finance')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'finance' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>الذمم المالية والـ CCP</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('broadcast')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'broadcast' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>نداءات المذياع والبث</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('security')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'security' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>الرقابة الأمنية والدردشات</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('logs')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'logs' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>سجلات التحركات</span>
        </button>

        <button 
          onClick={() => setActiveSubSection('settings')}
          className={`py-2 px-3 rounded-xl border transition flex items-center gap-1.5 justify-center ${
            activeSubSection === 'settings' ? 'bg-indigo-650 text-white border-indigo-600 shadow-lg' : 'bg-slate-950/40 hover:bg-slate-900 border-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>الإعدادات العامة</span>
        </button>
      </div>

      {/* ----------------------------------------------------- */}
      {/* 1. DASHBOARD OVERVIEW SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] text-slate-400 block font-bold">عمولات المنصة المستقطعة</span>
              <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 pt-1">
                ${stats?.accumulatedFees?.toFixed(2) || '0.00'}
              </div>
              <span className="text-[9px] text-slate-500 block">من إجمالي صفقات الوساطة المؤمنة</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 block font-bold">أرصدة إسكرو بالضمان حالياً</span>
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-400 pt-1">
                ${stats?.escrowLockedVolume?.toFixed(2) || '0.00'}
              </div>
              <span className="text-[9px] text-slate-500 block">صفقات معلقة قيد التسليم</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 block font-bold">إجمالي المستخدمين بالبث</span>
              <div className="text-xl sm:text-2xl font-mono font-black text-indigo-400 pt-1">
                {stats?.totalRegisteredUsers || 0} مواطنين
              </div>
              <span className="text-[9px] text-slate-500 block">بين مشترين، عارضين ومدراء</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 block font-bold">طلبات سحب أموال Pending</span>
              <div className="text-xl sm:text-2xl font-mono font-black text-[#6366f1] pt-1">
                {stats?.pendingWithdrawalCount || 0} سحوبات
              </div>
              <span className="text-[9px] text-slate-500 block">بإجمالي {stats?.pendingWithdrawalSum || 0}$ عبر CCP</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-slate-400">حالة بوابة المدفوعات التلقائية:</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${maintenanceMode ? 'bg-rose-950/50 text-rose-400 border border-rose-955' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-950'}`}>
                {maintenanceMode ? '🚨 الصيانة والتعليق' : '🟢 متصلة تماما'}
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-slate-400">عدد النزاعات المفتوحة:</span>
              <span className="text-xs font-mono font-bold text-rose-450">{stats?.activeDisputeCount || 0} قضايا نزاع</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-slate-400">رسوم المنصة الافتراضية:</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{defaultFee}%</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-slate-400">الحد الأدنى للسحب:</span>
              <span className="text-xs font-mono font-bold text-slate-200">{minWithdrawal}$</span>
            </div>
          </div>

          {/* Revenue Area Chart plotting */}
          <div className="bg-[#0b1322] border border-slate-850 p-4 sm:p-5 rounded-2xl">
            <div className="flex justify-between items-center border-b border-slate-805 pb-2.5 mb-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-black text-slate-205">تحليلات كسب الأرباح والعمولات التراكمية بسوق وساطة الجزائر ($)</h4>
              </div>
              <span className="text-[9px] bg-indigo-950 px-2.5 py-1 text-indigo-300 font-bold border border-indigo-900 rounded-lg">رسم بياني مباشر</span>
            </div>

            <div className="h-[250px] w-full bg-slate-950/50 p-2 rounded-xl border border-slate-900">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAdminRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#10192a" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#070c18', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAdminRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 2. USER MANAGEMENT SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'users' && (
        <div className="space-y-4">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-5 h-5 text-sky-450" />
                <h3 className="text-sm font-black text-slate-100">إدارة وسجلات تفتيش الأعضاء والمشتركين ميكانيكياً</h3>
              </div>

              <div className="relative w-full max-w-xs">
                <input 
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setUserPage(1);
                  }}
                  placeholder="ابحث بالاسم أو المعرف الرقمي..."
                  className="w-full bg-slate-950 p-2 border border-slate-850 text-right pr-9 rounded-xl placeholder-slate-600 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>

            {usersLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">جاري تحميل لائحة المتسوقين...</div>
            ) : (
              <div className="space-y-3">
                {renderUsersList()}

                {false && (
                  [].map((u: any) => (
                  <div key={u.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-850 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{u.avatar}</span>
                        <h4 className="font-extrabold text-[#f1f5f9] text-xs">{u.fullName}</h4>
                        <span className="text-[10px] text-indigo-400 font-mono">@{u.username}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-red-950 text-red-400' : u.role === 'seller' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-900 text-slate-400'}`}>
                          {u.role === 'admin' ? '👑 مدير' : u.role === 'seller' ? '🏪 بائع' : '🛒 مشتري'}
                        </span>
                        {u.isBanned && (
                          <span className="text-[9px] bg-red-650 text-white font-black px-2 py-0.5 rounded">محظور 🚫</span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-1 font-mono">
                        معرف الحساب: {u.id} | رصيد متوفر: <strong>{u.wallet?.availableBalance?.toFixed(2) || '0.00'}$</strong> | رصيد معلق: {u.wallet?.pendingBalance?.toFixed(2) || '0.00'}$
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Warning User */}
                      <input 
                        type="text" 
                        placeholder="أدخل نص التنبيه وعقوبة..."
                        className="bg-slate-950 p-1 border border-slate-900 text-[10px] rounded-lg max-w-[140px] text-right"
                        value={warningText[u.id] || ''}
                        onChange={(e) => setWarningText({ ...warningText, [u.id]: e.target.value })}
                      />
                      <button 
                        onClick={() => {
                          const w = warningText[u.id];
                          if (!w) return toast.error('أدخل سبب الإنذار أولاً');
                          warnUserMut.mutate({ id: u.id, warning: w });
                          setWarningText({ ...warningText, [u.id]: '' });
                        }}
                        className="p-1 px-2.5 bg-amber-955 text-amber-300 text-[10px] font-bold rounded-lg hover:bg-amber-950 transition border border-amber-900/50"
                      >
                        إنذار
                      </button>

                      {/* Balance adjustment */}
                      <input 
                        type="number" 
                        placeholder="مثلا: 10 أو -20"
                        className="bg-slate-950 p-1 border border-slate-900 tracking-tight font-mono text-[10px] rounded-lg max-w-[75px] text-center"
                        value={balanceAmount[u.id] || ''}
                        onChange={(e) => setBalanceAmount({ ...balanceAmount, [u.id]: Number(e.target.value) })}
                      />
                      <button 
                        onClick={() => {
                          const amt = balanceAmount[u.id];
                          if (!amt) return toast.error('أدخل القيمة أولاً');
                          adjustBalanceMut.mutate({ id: u.id, amount: amt });
                          setBalanceAmount({ ...balanceAmount, [u.id]: 0 });
                        }}
                        className="p-1 px-2.5 bg-emerald-955 text-emerald-300 text-[10px] font-bold rounded-lg hover:bg-emerald-950 transition border border-emerald-900/50"
                      >
                        تعديل رصيد
                      </button>

                      {/* Ban / Unban */}
                      <button 
                        onClick={() => banUserMut.mutate({ id: u.id, ban: !u.isBanned })}
                        className={`p-1 px-3 text-[10px] font-black rounded-lg transition border cursor-pointer ${
                          u.isBanned 
                            ? 'bg-rose-950/40 text-rose-400 border-rose-900/30 hover:bg-rose-950' 
                            : 'bg-slate-900 hover:bg-slate-850 hover:text-rose-400 text-slate-400 border-slate-800'
                        }`}
                      >
                        {u.isBanned ? 'فك حظر الحساب' : 'حظر الحساب 🚫'}
                      </button>
                    </div>
                  </div>
                )))}

                {/* Paginations controls */}
                <div className="flex items-center justify-center gap-3 pt-4 text-xs">
                  <button 
                    disabled={userPage <= 1}
                    onClick={() => setUserPage(userPage - 1)}
                    className="p-2 px-3 bg-slate-900 text-slate-400 rounded-lg hover:bg-slate-850 disabled:opacity-40 cursor-pointer font-bold"
                  >
                    السابق
                  </button>
                  <span className="font-mono text-slate-310">صفحة {userPage} من {usersData?.totalPages || 1}</span>
                  <button 
                    disabled={userPage >= (usersData?.totalPages || 1)}
                    onClick={() => setUserPage(userPage + 1)}
                    className="p-2 px-3 bg-slate-900 text-slate-400 rounded-lg hover:bg-slate-850 disabled:opacity-40 cursor-pointer font-bold"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 3. SELLER SHIELD CONTROLS SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'sellers' && (
        <div className="space-y-4">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-3 mb-4">
              <Award className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-black text-slate-100">إدارة شارات توثيق البائعين وتجميد السحب والعمولات المنفردة</h3>
            </div>

            {sellersLoading ? (
              <div className="p-8 text-center text-[11px] text-slate-505">جاري جلب البائعين المعتمدين...</div>
            ) : (
              <div className="space-y-4">
                {renderSellersList()}

                {false && (
                  [].map((seller: any) => {
                  const isWalletFrozen = seller.wallet?.frozenBalance > 0;
                  return (
                    <div key={seller.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 space-y-3 hover:border-slate-850 transition">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-[#f1f5f9] text-xs">{seller.fullName}</h4>
                            <span className="text-[10px] text-indigo-300 font-mono">@{seller.username}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                              seller.sellerLevel === 'VIP' ? 'bg-amber-900 text-amber-400' : 
                              seller.sellerLevel === 'Verified' ? 'bg-emerald-950 text-emerald-400' : 
                              seller.sellerLevel === 'Trusted' ? 'bg-cyan-950 text-cyan-400' : 
                              seller.sellerLevel === 'High Risk' ? 'bg-rose-950 text-rose-400' : 'bg-red-700 text-white'
                            }`}>
                              مستوى: {seller.sellerLevel || 'مستجد'}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-slate-500 font-mono mt-0.5 block">
                            المعرف: {seller.id} | رصيد الإيداع: {seller.wallet?.availableBalance?.toFixed(2) || '0.00'}$ | النسبة الحالية المخصومة: {seller.commissionPercentage || 10}%
                          </span>
                        </div>

                        {/* Withdraw permission state */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">سماح سحب بريدي:</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded ${seller.allowWithdrawals !== false ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-450'}`}>
                            {seller.allowWithdrawals !== false ? 'مفعل وجاهز' : 'محظور فوريا'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-905 items-center">
                        {/* Adjust Level */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 block font-bold">تغيير فئة البائع ورتبته:</label>
                          <select 
                            value={seller.sellerLevel}
                            onChange={(e) => setSellerLevelMut.mutate({ id: seller.id, level: e.target.value })}
                            className="w-full bg-slate-950 p-1.5 border border-slate-900 text-[10px] rounded-lg text-slate-300 font-extrabold"
                          >
                            <option value="Trusted">Trusted (بائع موثوق)</option>
                            <option value="Verified">Verified (بائع معتمد)</option>
                            <option value="VIP">VIP (بائع توب خاص)</option>
                            <option value="High Risk">High Risk (بائع عالي الخطورة)</option>
                            <option value="Scam Suspected">Scam Suspected (احتيال مشتبه)</option>
                          </select>
                        </div>

                        {/* Custom commission */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 block font-bold">رسوم المنصة على المبيعات (%):</label>
                          <input 
                            type="number"
                            defaultValue={seller.commissionPercentage || 10}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val >= 0 && val <= 100) {
                                setSellerCommissionMut.mutate({ id: seller.id, commission: val });
                              }
                            }}
                            className="w-full bg-slate-950 p-1 border border-slate-900 tracking-tight font-mono text-[10px] rounded-lg text-center"
                          />
                        </div>

                        {/* Freeze Funds */}
                        <div className="space-y-1 flex flex-col justify-end">
                          <button
                            onClick={() => freezeWalletMut.mutate({ id: seller.id, freeze: !isWalletFrozen })}
                            className={`py-1.5 px-3 text-[10px] font-black rounded-lg border transition ${
                              isWalletFrozen 
                                ? 'bg-rose-950/60 text-rose-400 border-rose-900/40 hover:bg-rose-950' 
                                : 'bg-slate-900 text-slate-400 border-slate-850 hover:text-rose-455'
                            }`}
                          >
                            {isWalletFrozen ? '🔓 إطلاق الرصيد المحبوس' : '🔒 تجميد واحتجاز الرصيد'}
                          </button>
                        </div>

                        {/* Withdraw switch */}
                        <div className="space-y-1 flex flex-col justify-end">
                          <button
                            onClick={() => toggleSellerWithdrawMut.mutate(seller.id)}
                            className="py-1.5 px-3 text-[11px] font-black bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-850 rounded-lg"
                          >
                            {seller.allowWithdrawals !== false ? '⛔ سحب CCP معطل' : '✅ تمكين مكاتب سحب'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 4. PRODUCT MANAGEMENT SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'products' && (
        <div className="space-y-4">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-3 mb-4">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-black text-slate-100">مراقبة وفحص السلع والخدمات المعروضة وتفعيل قنوات الفلاش</h3>
            </div>

            {productsLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">جاري تحميل المعروضات...</div>
            ) : (
              <div className="space-y-4">
                {productsData?.map((prod: any) => (
                  <div key={prod.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 hover:border-slate-850 transition space-y-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-[#f1f5f9] text-xs">{prod.title}</h4>
                          <span className="text-[10px] text-emerald-450 font-black font-mono">${prod.price}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold ${prod.status === 'approved' ? 'bg-emerald-950 text-emerald-450' : prod.status === 'rejected' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400 animate-pulse'}`}>
                            {prod.status === 'approved' ? 'نشط متجر' : prod.status === 'rejected' ? 'مرفوض السداد' : 'قيد المراجعة الإدارية 🔍'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed mt-1">{prod.description}</p>
                        <span className="text-[9.5px] text-slate-500 block font-mono mt-1">
                          بواسطة: {prod.sellerName} | تقارير الشكاوى: <strong className="text-rose-400">{prod.reportsCount || 0} بلغ</strong> | النوع: {prod.type === 'card' ? 'بطاقة شحن رقمية' : 'حساب ألعاب / خدمة رقمية'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Featured button */}
                        <button
                          onClick={() => setProductFeatureMut.mutate({ id: prod.id, isFeatured: !prod.isFeatured })}
                          className={`p-1 px-2 text-[10px] font-bold rounded-lg transition ${prod.isFeatured ? 'bg-amber-900 text-amber-300' : 'bg-slate-900 text-slate-500 border border-slate-850'}`}
                        >
                          ★ {prod.isFeatured ? 'مروج ممتاز' : 'عادي'}
                        </button>

                        <button
                          onClick={() => handleDeleteProductClick(prod)}
                          className="p-1 px-2.5 bg-rose-950/50 hover:bg-rose-950 text-rose-400 hover:text-rose-350 rounded-lg text-[10px] font-bold border border-rose-900/30 cursor-pointer"
                        >
                          شطب وحذف 🗑️
                        </button>
                      </div>
                    </div>

                    {/* Pending state approval row */}
                    {prod.status === 'pending' && (
                      <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-center justify-between gap-4">
                        <span className="text-[10px] text-slate-350">⚠️ تذكرة سلعة مستجدة تحتاج تصديق لإظهارها على السوق:</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => approveProductMut.mutate(prod.id)}
                            className="p-1 px-3 bg-emerald-600 text-white text-[10px] font-black rounded"
                          >
                            تفعيل فوريا ✨
                          </button>
                          <button 
                            onClick={() => handleRejectProductClick(prod)}
                            className="p-1 px-3 bg-rose-600 text-white text-[10px] font-black rounded cursor-pointer"
                          >
                            رفض الإدراج
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Flash Sale setting segment */}
                    <div className="p-3 bg-[#0d1527]/40 border border-[#13223f] rounded-xl flex flex-wrap items-center justify-between gap-3 pt-2 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-sky-400">⚡ فلاش تخفيض خاطف:</span>
                        <span className="text-[9.5px] text-slate-400">عيّن الخصم ووقت العداد فورا.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          placeholder="الخصم %"
                          className="bg-slate-950 p-1 border border-slate-900 font-mono text-[9px] rounded max-w-[70px] text-center"
                          value={flashDiscount[prod.id] || ''}
                          onChange={(e) => setFlashDiscount({ ...flashDiscount, [prod.id]: Number(e.target.value) })}
                        />
                        <input 
                          type="number"
                          placeholder="الزمن (بالدقائق)"
                          className="bg-slate-950 p-1 border border-slate-900 font-mono text-[9px] rounded max-w-[85px] text-center"
                          value={flashDuration[prod.id] || ''}
                          onChange={(e) => setFlashDuration({ ...flashDuration, [prod.id]: Number(e.target.value) })}
                        />
                        <button
                          onClick={() => {
                            const d = flashDiscount[prod.id] || 0;
                            const t = flashDuration[prod.id] || 0;
                            if (d <= 0 || t <= 0) return toast.error('أدخل الخصم والدقائق');
                            setProductFlashSaleMut.mutate({ id: prod.id, discount: d, durationMini: t });
                          }}
                          className="p-1 px-3 bg-indigo-600 hover:bg-indigo-505 text-white text-[9px] font-black rounded cursor-pointer"
                        >
                          حدد العداد ⚡
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 5. DISPUTE RESOLUTION SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'disputes' && (
        <div className="space-y-4">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-[#fef2f2]/10 pb-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              <h3 className="text-sm font-black text-rose-400">مركز البت بفض نزاعات الإسكرو المعلقة وتصفيد صوص السحب</h3>
            </div>

            {disputesLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">جاري تحميل القضايا المفتوحة...</div>
            ) : (
              <div className="space-y-4">
                {disputesData?.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">🟢 لا يوجد صفقات بنزاعات حالية بالمنصة! المعاملات تسير بسلاسة تامة.</div>
                ) : (
                  disputesData?.map((disp: any) => (
                    <div key={disp.id} className="bg-[#110c14] border border-[#ff0000]/15 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-rose-100 text-xs">نزاع صفقة تذكرة: #{disp.id}</h4>
                            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-900 px-2 py-0.5 rounded font-black">
                              أولوية المخاطر: {disp.disputePriority === 'high' ? 'عالية ومخاطر' : 'عادية'}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-310 leading-relaxed font-bold mt-1.5 text-right font-sans">
                            سبب النزاع: <strong>"{disp.disputeReason || 'المطور لم يسلم البيانات'}"</strong>
                          </p>
                          <span className="text-[9.5px] text-slate-500 block font-mono mt-1">
                            تاريخ الصفقة وميزانيتها: <strong className="text-emerald-400">${disp.dealAmount}</strong> | المشتري: {disp.buyerName} (@{disp.buyerId}) | البائع: {disp.sellerName} (@{disp.sellerId})
                          </span>
                        </div>

                        <span className="text-slate-500 font-mono text-[9px]">{disp.createdAt}</span>
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-xl space-y-2 border border-slate-905">
                        <span className="text-[10px] font-black text-rose-400 block">💡 خيارات الإدارة لحكم الوساطة وفك الضمان:</span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {/* 1. Release completely to seller */}
                          <button
                            onClick={() => resolveDisputeMut.mutate({ id: disp.id, resolution_type: 'release_seller' })}
                            className="p-1.5 bg-emerald-950 text-emerald-400 font-bold rounded-lg border border-emerald-900/40 hover:bg-emerald-900 hover:text-white transition"
                          >
                            ✔️ تفعيل السداد للبائع
                          </button>

                          {/* 2. Refund completely to buyer */}
                          <button
                            onClick={() => resolveDisputeMut.mutate({ id: disp.id, resolution_type: 'refund_buyer' })}
                            className="p-1.5 bg-rose-955 text-rose-400 font-bold rounded-lg border border-rose-900/40 hover:bg-rose-900 hover:text-white transition"
                          >
                            ↩️ رد المبلغ للمشتري
                          </button>

                          {/* 3. Split equally between them */}
                          <button
                            onClick={() => resolveDisputeMut.mutate({ id: disp.id, resolution_type: 'split_equal' })}
                            className="p-1.5 bg-sky-950 text-sky-400 font-bold rounded-lg border border-sky-900/40 hover:bg-sky-900 hover:text-white transition"
                          >
                            ⚖️ اقتسام الوسط بالتساوي
                          </button>

                          {/* 4. Partial refund percentage based */}
                          <div className="flex gap-1.5">
                            <input 
                              type="number" 
                              placeholder="نسبة العميل %"
                              className="bg-slate-950 p-1 border border-slate-900 font-mono text-[10px] rounded-lg max-w-[65px] text-center"
                              value={refundPercent[disp.id] || ''}
                              onChange={(e) => setRefundPercent({ ...refundPercent, [disp.id]: Number(e.target.value) })}
                            />
                            <button
                              onClick={() => {
                                const p = refundPercent[disp.id];
                                if (!p || p < 0 || p > 100) return toast.error('أدخل نسبة بين 0 و 100');
                                resolveDisputeMut.mutate({ id: disp.id, resolution_type: 'refund_partial', refund_percentage: p });
                              }}
                              className="p-1 px-2.5 bg-amber-955 text-amber-300 font-black rounded-lg text-[9px]"
                            >
                              تسوية جزئية
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 6. FINANCIAL LEDGER & WITHDRAWALS SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'finance' && (
        <div className="space-y-4 font-sans">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-3 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-black text-slate-100">سجل المدفوعات وطلبات سحب الأموال عبر البريد الجاري CCP وبطاقات المعاملات</h3>
            </div>

            {withdrawalsLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">جاري تحميل المعاملات الرقمية...</div>
            ) : (
              <div className="space-y-3 text-right">
                {withdrawalsData?.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">🟢 لا يوجد طلبات سحب معلقة حالياً! جميع البائعين مصرح لهم السداد.</div>
                ) : (
                  withdrawalsData?.map((wdr: any) => (
                    <div key={wdr.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-850 transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#f1f5f9]">سحب رقم: ID #{wdr.id}</span>
                          <span className="text-xs text-indigo-400 font-bold">بواسطة: {wdr.username}</span>
                          <span className="text-xs text-emerald-400 font-mono font-black">${wdr.amount}</span>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-805 font-bold">
                            النوع والوسيلة: {wdr.paymentMethod || 'البريد CCP'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-1 font-mono leading-relaxed">
                          📌 عنوان ورقم الدفع والمفتاح: <strong>{wdr.address}</strong>
                        </p>
                        <span className="text-[9.5px] text-slate-500 block font-mono mt-0.5 font-sans">
                          تاريخ المطلب: {wdr.timestamp} | حالة الدفعة المعلقة: <strong className="text-amber-400">تحت البت بالCCP ⏳</strong>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => processWithdrawalMut.mutate({ id: wdr.id, decision: 'approve' })}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs cursor-pointer shadow"
                        >
                          تأكيد الدفع والتجاوز ✅
                        </button>
                        <button
                          onClick={() => processWithdrawalMut.mutate({ id: wdr.id, decision: 'reject' })}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg text-xs cursor-pointer shadow"
                        >
                          رفض الحوالة والرفض
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 7. DYNAMIC BROADCAST ANNOUNCEMENTS SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'broadcast' && (
        <div className="space-y-4">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-3 mb-4">
              <Radio className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-black text-slate-100">بث نداء جماعي بمذياع البوت لكافة المشتركين فورا</h3>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const cleanText = DOMPurify.sanitize(broadcastMessage.trim());
                if (!cleanText) return toast.error('أدخل كتابة الإشهار أولاً');
                broadcastMut.mutate({ text: cleanText, target: broadcastTarget });
                setBroadcastMessage('');
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10.5px] text-slate-400 font-bold block">الفئة والجروب المستهدف من الرعية:</label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    className="w-full bg-slate-950 p-2 border border-slate-850 rounded-xl font-bold"
                  >
                    <option value="all">كافة مستخدمي وعملاء السوق 🌐 (All Clients)</option>
                    <option value="sellers">البائعين والعارضين فقط 🏪 (Sellers Only)</option>
                    <option value="buyers">المشترين النشطين فقط 🛒 (Buyers Only)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] text-slate-400 font-bold block">نص الإشهار والنداء:</label>
                  <input 
                    type="text"
                    required
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="أكثر من 15 حرف: يرجى تفقد بوابات المحفظة تم تغيير الـ CCP..."
                    className="w-full bg-slate-950 p-2.5 border border-slate-850 rounded-xl font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-tr from-indigo-700 to-indigo-505 text-white font-black rounded-xl hover:brightness-110 active:scale-[0.99] transition cursor-pointer text-xs"
              >
                مذياع النداء المركزي للبوت 🔊
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 8. SECURITY MONITOR & SCANS SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'security' && (
        <div className="space-y-4">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
                <h3 className="text-sm font-black text-[#f1f5f9]">رادار فحص التهديدات، المراسلات المسربة وحركات السحوبات المريبة</h3>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={securityFilter}
                  onChange={(e) => setSecurityFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-lg text-[10px] p-1.5 font-bold text-slate-400"
                >
                  <option value="all">كل التصنيفات المريضة</option>
                  <option value="critical">أعلى مخاطر حمراء 🔴</option>
                  <option value="medium">متوسطة 🟡</option>
                </select>

                <button
                  onClick={() => triggerSecurityScanMut.mutate()}
                  className="p-1 px-3 bg-indigo-950 hover:bg-indigo-900 text-indigo-305 border border-indigo-900 rounded-lg font-black text-[10px]"
                >
                  تشغيل أداة مسح وتدقيق المحادثات فوريا ⚡
                </button>
              </div>
            </div>

            {securityLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">جاري قراءة خط المحادثات المسرب...</div>
            ) : (
              <div className="space-y-3">
                {securityAlerts?.map((alt: any) => (
                  <div key={alt.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 space-y-2 hover:border-rose-950/40 transition">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className={`text-[9px] font-black px-1.5 rounded ${alt.severity === 'critical' ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-600 text-white'}`}>
                          {alt.severity.toUpperCase()} RISK
                        </span>
                        <h4 className="font-extrabold text-[#f1f5f9] text-xs pt-1.5">
                          العضو: @{alt.username} - السلوك: {alt.type}
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{alt.timestamp}</span>
                    </div>

                    <p className="text-[10.5px] text-slate-310 leading-relaxed bg-[#ff0000]/5 p-2 rounded-lg border border-[#ff0000]/10">
                      📝 ملخص الخدعة: {alt.details}
                    </p>

                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className={`font-bold ${alt.status === 'resolved' ? 'text-emerald-400' : 'text-amber-500'}`}>
                        مستوى المراجعة: {alt.status === 'resolved' ? 'تجاوز وسويت القضية' : 'قيد التدريس فحص يدوي'}
                      </span>
                      
                      {alt.status !== 'resolved' && (
                        <button
                          onClick={() => {
                            api.banUser(alt.id, true).then(() => {
                              toast.success('🔒 تم رصد وتجميد العضو وحظره تماما!');
                              refetchSecurity();
                            });
                          }}
                          className="px-2.5 py-1 bg-rose-950/40 border border-rose-900 text-[10px] font-black text-rose-400 rounded-lg"
                        >
                          تجميد وحظر فورياً 🚫
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 9. ACTIVITY LOG SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'logs' && (
        <div className="space-y-4 font-mono">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4 flex-wrap gap-2">
              <span className="text-xs text-slate-400 font-bold font-sans">أرشيف سجل تحركات المشرفين والمدراء والعمل الآلي للإسكرو ({systemLogs?.length || 0})</span>
              
              <button
                onClick={handleExportJSON}
                className="p-1 px-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-300 hover:text-indigo-400 text-[10.5px] font-bold cursor-pointer transition flex items-center gap-1.5 font-sans"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل وتصدير الأرشيف المالي للوسائط (JSON)</span>
              </button>
            </div>

            {logsLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">جاري قراءة خط التحركات...</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5 text-[10px]">
                {systemLogs?.map((log: any) => (
                  <div key={log.id} className="p-3 border-b border-slate-900 bg-slate-950/20 rounded flex justify-between gap-5 text-slate-400">
                    <div>
                      <span className="text-indigo-400 font-black">المدير: {log.adminName} (@{log.adminId}) </span>
                      <span className="text-slate-500 font-sans border-r border-slate-800 pr-1 mr-1">[{log.action}]</span>
                      <span className="text-slate-205 pr-2 font-sans">{log.details}</span>
                    </div>
                    <span className="text-slate-505 shrink-0 text-[9px]">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 10. PLATFORM SETTINGS CONTROL SECTION */}
      {/* ----------------------------------------------------- */}
      {activeSubSection === 'settings' && (
        <div className="space-y-4 font-sans text-xs">
          <div className="bg-[#0b1322] border border-slate-850 p-4 rounded-2xl space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-3">
              <Settings className="w-5 h-5 text-[#6366f1]" />
              <h3 className="text-sm font-black text-slate-100">تهيئة المحددات العامة لمنصة وساطة وسوق الجزائر</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold block">إحداثيات حساب التحويل البريدي المركزي CCP:</label>
                <input 
                  type="text"
                  value={platformCCP}
                  onChange={(e) => setPlatformCCP(e.target.value)}
                  className="w-full bg-slate-950 p-2 border border-slate-850 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold block">إحداثيات محفظة Binance Coin المستهدفة للعمولات:</label>
                <input 
                  type="text"
                  value={platformBinance}
                  onChange={(e) => setPlatformBinance(e.target.value)}
                  className="w-full bg-slate-950 p-2 border border-slate-850 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold block">الحد الأدنى لسحب الأرصدة للبائعين والعملاء ($):</label>
                <input 
                  type="number"
                  value={minWithdrawal}
                  onChange={(e) => setMinWithdrawal(Number(e.target.value))}
                  className="w-full bg-slate-950 p-2 border border-slate-850 rounded-xl tracking-tight font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold block">نسبة عمولة منصة الإسكرو الافتراضية (%):</label>
                <input 
                  type="number"
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(Number(e.target.value))}
                  className="w-full bg-slate-950 p-2 border border-slate-850 rounded-xl tracking-tight font-mono text-center"
                />
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-950/60 rounded-xl border border-slate-905">
              <div>
                <span className="text-[11px] font-black text-slate-200 block"> تعليق وتجميد المعاملات للصيانة العامة (Maintenance Mode)</span>
                <span className="text-[10px] text-slate-500 block">عند التشغيل سيتم حظر عمليات شحن وإيداع الرصيد ومنع سحب الـ CCP.</span>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-black cursor-pointer transition ${maintenanceMode ? 'bg-red-650 text-white shadow font-sans' : 'bg-slate-900 hover:bg-slate-850'}`}
              >
                {maintenanceMode ? '🚨 معلق حالياً' : '🟢 متصل ونشط'}
              </button>
            </div>

            <button
              onClick={handleUpdatePlatformSettings}
              className="w-full py-2.5 bg-gradient-to-tr from-indigo-700 to-indigo-550 text-white font-black rounded-xl hover:brightness-110 active:scale-[0.99] transition cursor-pointer text-xs"
            >
              حفظ وتطبيق الخيارات والمحددات الشاملة ⚙️
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
