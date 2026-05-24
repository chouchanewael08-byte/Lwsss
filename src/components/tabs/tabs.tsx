import { useState, useEffect, useRef } from 'react';
import { ProductModal } from '../shared/ProductModal.js';
import { apiGet, apiPost, apiPut, apiDelete, apiForm, haptic } from '../../lib/api.js';
import toast from 'react-hot-toast';
import { EmptyState } from '../shared/index.js';
import { Search, X, ShoppingCart, MessageCircle, Send, ShieldCheck, Eye, Plus, Trash2 } from 'lucide-react';

// TasksTab.tsx

export function TasksTab({ user, onUserUpdate }: { user: any; onUserUpdate: (u: any) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    try { const data = await apiGet('/tasks'); setTasks(data); }
    catch { toast.error('خطأ في التحميل'); }
    setLoading(false);
  }

  async function complete(task: any) {
    if (task.completed || completing) return;
    haptic('medium');
    setCompleting(task._id);

    if (task.type === 'channel_join' && task.link) {
      window.open(task.link, '_blank');
      toast('📲 اشترك في القناة ثم سنتحقق تلقائياً', { icon: 'ℹ️', duration: 4000 });
      await new Promise(r => setTimeout(r, 5000));
    }

    try {
      const data = await apiPost(`/tasks/${task._id}/complete`, {});
      toast.success(`⭐ +${task.starsReward} نجمة!`);
      onUserUpdate({ ...user, stars: data.totalStars });
      setTasks(t => t.map(x => x._id === task._id ? { ...x, completed: true } : x));
    } catch (e: any) { toast.error(e.message); }
    setCompleting(null);
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">جار التحميل...</div></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0">
        <div className="text-white font-bold mb-1">🎯 المهام والنقاط</div>
        <div className="flex items-center gap-2">
          <div className="badge-amber">⭐ نجومك: {user?.stars || 0}</div>
          <div className="text-slate-400 text-xs">أنجز مهام واكسب نجوماً</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollable p-3 space-y-3">
        {tasks.length === 0 ? <EmptyState icon="🎯" title="لا توجد مهام حالياً" subtitle="عد لاحقاً" /> : tasks.map(task => (
          <div key={task._id} className={`card p-4 ${task.completed ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{task.icon}</div>
              <div className="flex-1">
                <div className="text-white font-medium">{task.title}</div>
                {task.description && <div className="text-slate-400 text-sm mt-0.5">{task.description}</div>}
                <div className="text-amber-400 text-sm font-bold mt-1">⭐ +{task.starsReward}</div>
              </div>
              {task.completed
                ? <div className="badge-green">✅ منجز</div>
                : <button onClick={() => complete(task)} disabled={completing === task._id}
                    className="bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-xl disabled:opacity-50">
                    {completing === task._id ? '⏳' : 'إنجاز'}
                  </button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// PointsStoreTab.tsx
export function PointsStoreTab({ user }: { user: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => { apiGet('/points-store').then(d => setItems(d)).catch(() => toast.error('خطأ')).finally(() => setLoading(false)); }, []);

  async function redeem(item: any) {
    if (redeeming || (user?.stars || 0) < item.starsCost) { toast.error(`نجومك غير كافية. لديك ⭐${user?.stars || 0}`); return; }
    haptic('medium');
    setRedeeming(item._id);
    try {
      const { credentials, message } = await apiPost(`/points-store/${item._id}/redeem`, {});
      toast.success(message || 'تم الاستبدال!');
      if (credentials) {
        const text = Object.entries(credentials).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
        alert(`🔑 بيانات المنتج:\n\n${text}`);
      }
    } catch (e: any) { toast.error(e.message); }
    setRedeeming(null);
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">جار التحميل...</div></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0">
        <div className="text-white font-bold mb-1">⭐ متجر النقاط</div>
        <div className="badge-amber">رصيدك: ⭐{user?.stars || 0} نجمة</div>
      </div>
      <div className="flex-1 overflow-y-auto scrollable p-3">
        {items.length === 0 ? <EmptyState icon="⭐" title="لا توجد منتجات" subtitle="لا توجد منتجات في متجر النقاط حالياً" /> : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => (
              <div key={item._id} className="card p-3">
                {item.images?.[0] ? <img src={item.images[0]} className="w-full h-28 object-cover rounded-xl mb-2" /> : <div className="w-full h-28 bg-slate-700/50 rounded-xl mb-2 flex items-center justify-center text-3xl">🎁</div>}
                <div className="text-white text-sm font-medium mb-1 truncate">{item.title}</div>
                <div className="text-amber-400 font-bold text-sm mb-2">⭐{item.starsCost.toLocaleString()}</div>
                {item.stock !== -1 && <div className="text-slate-400 text-xs mb-2">المخزون: {item.stock}</div>}
                <button onClick={() => redeem(item)} disabled={redeeming === item._id || (user?.stars || 0) < item.starsCost}
                  className={`w-full py-2 rounded-xl text-xs font-medium transition-all ${(user?.stars || 0) >= item.starsCost ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                  {redeeming === item._id ? '⏳' : 'استبدال'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// AccountsStoreTab.tsx

const PLATFORMS_MAP: Record<string, string> = { pubg: '🎮 PUBG', freefire: '🔥 Free Fire', valorant: '⚡ Valorant', fortnite: '🌪️ Fortnite', cod: '💥 COD', instagram: '📸 Instagram', tiktok: '🎵 TikTok', youtube: '▶️ YouTube', netflix: '📺 Netflix', spotify: '🎵 Spotify', other: '🌐 أخرى' };

export function AccountsStoreTab({ user, onNavigate }: { user: any; onNavigate: (t: any) => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [buying, setBuying] = useState(false);
  const [payMethod, setPayMethod] = useState('crystals');
useEffect(() => { load(); }, [platform]);

  async function load() {
    setLoading(true);
    try { const d = await apiGet(`/accounts?platform=${platform}&limit=30`); setProducts(d.products || []); }
    catch { toast.error('خطأ'); }
    setLoading(false);
  }

  async function buy() {
    if (!selected || buying) return;
    setBuying(true);
    try {
      await apiPost('/tickets', { productId: selected._id, productType: 'accounts', paymentMethod: payMethod });
      toast.success('✅ تم إنشاء الصفقة!');
      setSelected(null);
      onNavigate('escrow');
    } catch (e: any) { toast.error(e.message); }
    setBuying(false);
  }

  const filtered = search ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.platform.includes(search.toLowerCase())) : products;

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0">
        <div className="text-white font-bold mb-2">🔐 متجر الحسابات</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث..." className="input-field text-sm mb-2" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setPlatform('')} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs ${platform === '' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>الكل</button>
          {Object.entries(PLATFORMS_MAP).map(([k, v]) => (
            <button key={k} onClick={() => setPlatform(k)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs ${platform === k ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{v}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollable p-3">
        {loading ? <div className="text-center text-slate-400 mt-8">جار التحميل...</div> : filtered.length === 0 ? <EmptyState icon="🔐" title="لا توجد حسابات" subtitle="لا توجد حسابات متاحة حالياً" /> : (
          <div className="space-y-3">
            {filtered.map(p => (
              <div key={p._id} className="pcard" onClick={() => { haptic(); setSelected(p); }}>
                <div className="pcard-img">
                  {p.images?.[0]
                    ? <img src={p.images[0]} className="pcard-img-inner" />
                    : <div className="pcard-img-placeholder">{PLATFORMS_MAP[p.platform]?.[0] || '🎮'}</div>}
                  <div className="pcard-platform-badge">{PLATFORMS_MAP[p.platform] || p.platform}</div>
                </div>
                <div className="pcard-body">
                  <div className="pcard-title">{p.title}</div>
                  <div className="pcard-meta">
                    {p.accountAge    && <span>📅 {p.accountAge}</span>}
                    {p.accountLevel  && <span>⬆️ {p.accountLevel}</span>}
                    {p.region        && <span>🌍 {p.region}</span>}
                    {p.followersCount && <span>👥 {p.followersCount}</span>}
                  </div>
                  <div className="pcard-footer">
                    <span className="pcard-views">👁 {p.viewsCount || 0}</span>
                    <span className="pcard-price">💎 {p.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ProductModal
          product={selected}
          productType="accounts"
          onClose={() => setSelected(null)}
          onBuy={async (method) => { setPayMethod(method); await buy(); }}
          buying={buying}
        />
      )}
    </div>
  );
}

// WalletTab.tsx
export function WalletTab({ user, onUserUpdate }: { user: any; onUserUpdate: (u: any) => void }) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'main' | 'deposit' | 'withdraw'>('main');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('baridimob');
  const [accountInfo, setAccountInfo] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { apiGet('/wallet').then(setWallet).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function deposit() {
    if (!amount || !proofFile) return toast.error('المبلغ وإيصال الدفع مطلوبان');
    setSubmitting(true);
    const fd = new FormData();
    fd.append('amount', amount);
    fd.append('paymentMethod', method);
    fd.append('proof', proofFile);
    try {
      await apiForm('/wallet/deposit', fd);
      toast.success('✅ تم إرسال طلب الإيداع');
      setTab('main');
    } catch (e: any) { toast.error(e.message); }
    setSubmitting(false);
  }

  async function withdraw() {
    if (!amount || !accountInfo) return toast.error('المبلغ ومعلومات الحساب مطلوبان');
    setSubmitting(true);
    try {
      await apiPost('/wallet/withdraw', { amount, paymentMethod: method, accountInfo });
      toast.success('✅ تم إرسال طلب السحب');
      setTab('main');
    } catch (e: any) { toast.error(e.message); }
    setSubmitting(false);
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">جار التحميل...</div></div>;

  if (tab === 'deposit') return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0 flex items-center gap-3"><button onClick={() => setTab('main')} className="text-emerald-400">← رجوع</button><div className="text-white font-bold">إيداع كريستال</div></div>
      <div className="flex-1 overflow-y-auto scrollable p-4 space-y-4">
        <div className="card p-3"><div className="text-slate-400 text-sm mb-1">معلومات الدفع</div>{['baridimob', 'ccp', 'usdt', 'binance', 'flexy'].map(m => (
          <button key={m} onClick={() => setMethod(m)} className={`w-full py-2 px-3 rounded-xl mb-1 text-sm text-right ${method === m ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-500'}`}>{m === 'baridimob' ? '🏦 BaridiMob' : m === 'ccp' ? '🏧 CCP' : m === 'usdt' ? '💵 USDT TRC20' : m === 'binance' ? '🟡 Binance Pay' : '📱 Flexy'}</button>
        ))}</div>
        <div><label className="text-slate-400 text-xs mb-1 block">المبلغ بالكريستال 💎</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" placeholder="100" /></div>
        <div><label className="text-slate-400 text-xs mb-1 block">إيصال الدفع 📸 (من هاتفك)</label>
          <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)} className="input-field text-sm" /></div>
        <button onClick={deposit} disabled={submitting} className="btn-primary">{submitting ? '⏳ جار الإرسال...' : '📤 إرسال طلب الإيداع'}</button>
      </div>
    </div>
  );

  if (tab === 'withdraw') return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0 flex items-center gap-3"><button onClick={() => setTab('main')} className="text-emerald-400">← رجوع</button><div className="text-white font-bold">سحب كريستال</div></div>
      <div className="flex-1 overflow-y-auto scrollable p-4 space-y-4">
        <div className="card p-3 text-center"><div className="text-slate-400 text-sm">رصيدك المتاح</div><div className="text-emerald-400 font-bold text-2xl">💎{wallet?.crystals?.toLocaleString() || 0}</div></div>
        {['baridimob', 'ccp', 'usdt', 'binance', 'flexy'].map(m => (
          <button key={m} onClick={() => setMethod(m)} className={`w-full py-2 px-3 rounded-xl text-sm text-right ${method === m ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 card' : 'card text-slate-500'}`}>{m}</button>
        ))}
        <div><label className="text-slate-400 text-xs mb-1 block">المبلغ 💎</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" /></div>
        <div><label className="text-slate-400 text-xs mb-1 block">رقم الحساب / العنوان</label><input value={accountInfo} onChange={e => setAccountInfo(e.target.value)} className="input-field" placeholder="رقم الحساب..." /></div>
        <button onClick={withdraw} disabled={submitting} className="btn-primary">{submitting ? '⏳' : '💸 طلب السحب'}</button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-4 flex-shrink-0">
        <div className="text-slate-400 text-sm mb-1">محفظتي</div>
        <div className="text-4xl font-bold text-emerald-400">💎{wallet?.crystals?.toLocaleString() || 0}</div>
        <div className="text-slate-400 text-sm mt-1">⭐ {wallet?.stars?.toLocaleString() || 0} نجمة</div>
        {wallet?.frozenCrystals > 0 && <div className="text-amber-400 text-xs mt-1">🔒 محجوز: 💎{wallet.frozenCrystals.toLocaleString()}</div>}
      </div>
      <div className="flex gap-3 px-4 py-3 flex-shrink-0">
        <button onClick={() => setTab('deposit')} className="btn-primary text-sm">📥 إيداع</button>
        <button onClick={() => setTab('withdraw')} className="btn-secondary text-sm">📤 سحب</button>
      </div>
      <div className="flex-1 overflow-y-auto scrollable px-4">
        <div className="text-slate-400 text-xs mb-2">آخر المعاملات</div>
        {(wallet?.transactions || []).slice().reverse().slice(0, 30).map((tx: any, i: number) => (
          <div key={i} className="card p-3 mb-2 flex justify-between items-center">
            <div>
              <div className="text-white text-sm">{tx.description}</div>
              <div className="text-slate-500 text-xs">{new Date(tx.timestamp).toLocaleDateString('ar')}</div>
            </div>
            <div className={`font-bold text-sm ${tx.type.includes('deposit') || tx.type.includes('sale') || tx.type.includes('release') ? 'text-emerald-400' : 'text-red-400'}`}>
              {tx.currency === 'stars' ? '⭐' : '💎'}{tx.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// EscrowTab.tsx
export function EscrowTab({ user }: { user: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => { apiGet('/tickets').then(setTickets).catch(() => {}).finally(() => setLoading(false)); }, []);

  const STATUS: Record<string, { label: string; color: string }> = {
    pending_payment: { label: 'بانتظار الدفع', color: 'badge-amber' },
    payment_confirmed: { label: 'دفع مؤكد', color: 'badge-green' },
    partial_revealed: { label: 'مرحلة 1 ✅', color: 'badge-blue' },
    full_revealed: { label: 'بيانات كاملة', color: 'badge-green' },
    completed: { label: 'مكتملة ✅', color: 'badge-green' },
    disputed: { label: 'نزاع ⚠️', color: 'badge-red' },
    refunded: { label: 'مسترد 💰', color: 'badge-blue' },
    auto_completed: { label: 'مكتملة تلقائياً', color: 'badge-green' },
  };

  async function uploadProof() {
    if (!selected || !proofFile) return toast.error('الإيصال مطلوب');
    setSubmitting(true);
    const fd = new FormData(); fd.append('proof', proofFile);
    try { await apiForm(`/tickets/${selected._id}/proof`, fd); toast.success('✅ تم رفع الإيصال'); setSelected(null); }
    catch (e: any) { toast.error(e.message); }
    setSubmitting(false);
  }

  async function action(endpoint: string, body: any = {}) {
    setSubmitting(true);
    try { await apiPost(`/tickets/${selected._id}/${endpoint}`, body); toast.success('✅ تم'); setSelected(null); await apiGet('/tickets').then(setTickets); }
    catch (e: any) { toast.error(e.message); }
    setSubmitting(false);
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">جار التحميل...</div></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0"><div className="text-white font-bold">🛡️ صفقاتي</div></div>
      <div className="flex-1 overflow-y-auto scrollable p-3 space-y-3">
        {tickets.length === 0 ? <EmptyState icon="🛡️" title="لا توجد صفقات" subtitle="صفقاتك ستظهر هنا" /> : tickets.map(t => (
          <div key={t._id} className="card p-3 cursor-pointer" onClick={() => setSelected(t)}>
            <div className="flex justify-between items-start mb-1">
              <div className="text-white font-medium text-sm flex-1 truncate">{t.productTitle}</div>
              <div className={STATUS[t.status]?.color || 'badge-amber'}>{STATUS[t.status]?.label || t.status}</div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{t.buyerId === user?.telegramId ? '🛒 مشتري' : '🏪 بائع'}</span>
              <span>💎{t.amount.toLocaleString()}</span>
              <span>{new Date(t.createdAt).toLocaleDateString('ar')}</span>
            </div>
            {t.autoCompleteAt && t.status === 'full_revealed' && (
              <div className="text-amber-400 text-xs mt-1">⏰ سيكتمل تلقائياً: {new Date(t.autoCompleteAt).toLocaleString('ar')}</div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setSelected(null)}>
          <div className="w-full bg-slate-900 rounded-t-3xl p-4 slide-up max-h-[90vh] overflow-y-auto scrollable" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h2 className="text-white font-bold">تفاصيل الصفقة</h2><button onClick={() => setSelected(null)} className="text-slate-400">✕</button></div>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between card p-2"><span className="text-slate-400">المنتج</span><span className="text-white">{selected.productTitle}</span></div>
              <div className="flex justify-between card p-2"><span className="text-slate-400">المبلغ</span><span className="text-emerald-400">💎{selected.amount}</span></div>
              <div className="flex justify-between card p-2"><span className="text-slate-400">الحالة</span><span className={STATUS[selected.status]?.color}>{STATUS[selected.status]?.label}</span></div>
            </div>

            {/* Actions based on status and role */}
            {selected.status === 'pending_payment' && selected.buyerId === user?.telegramId && (
              <div className="space-y-2">
                <div><label className="text-slate-400 text-xs mb-1 block">إيصال الدفع 📸</label><input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)} className="input-field text-sm" /></div>
                <button onClick={uploadProof} disabled={submitting} className="btn-primary">{submitting ? '⏳' : '📤 رفع الإيصال'}</button>
              </div>
            )}
            {selected.status === 'partial_revealed' && selected.buyerId === user?.telegramId && (
              <div className="space-y-2">
                <div className="card p-3 bg-amber-500/10 border-amber-500/30">
                  <div className="text-amber-400 text-sm font-medium mb-1">⚠️ مهم</div>
                  <div className="text-slate-300 text-xs">تحقق من المعلومات الجزئية المرسلة في الرسائل. إذا كانت صحيحة، اضغط "أكمل" للحصول على كامل البيانات. إذا كانت خاطئة، اضغط "رفض" لاسترداد أموالك.</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => action('reject')} disabled={submitting} className="btn-danger text-sm">❌ رفض واسترداد</button>
                  <button onClick={() => action('confirm-partial')} disabled={submitting} className="btn-primary text-sm">✅ أكمل</button>
                </div>
              </div>
            )}
            {selected.status === 'full_revealed' && selected.buyerId === user?.telegramId && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { if (!disputeReason) { toast.error('اكتب سبب النزاع'); return; } action('dispute', { reason: disputeReason }); }} disabled={submitting} className="btn-danger text-sm">⚠️ نزاع</button>
                  <button onClick={() => action('complete')} disabled={submitting} className="btn-primary text-sm">✅ تأكيد الاستلام</button>
                </div>
                <input value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="سبب النزاع (إذا أردت فتح نزاع)" className="input-field text-sm" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ProfileTab.tsx
export function ProfileTab({ user, onNavigate }: { user: any; onNavigate: (t: any) => void }) {
  if (!user) return null;
  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl">{typeof user.avatar === 'string' && user.avatar.startsWith('http') ? <img src={user.avatar} className="w-full h-full rounded-2xl object-cover" /> : user.avatar || '👤'}</div>
          <div>
            <div className="text-white font-bold text-lg">{user.fullName}</div>
            <div className="text-slate-400 text-sm">@{user.username}</div>
            <div className="flex gap-2 mt-1">
              <span className="badge-blue">{user.sellerLevel}</span>
              <span className="badge-green">{user.level}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollable p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[['💎', user.crystals?.toLocaleString() || 0, 'كريستال'], ['⭐', user.stars?.toLocaleString() || 0, 'نجمة'], ['✅', user.salesCount || 0, 'مبيعات']].map(([icon, val, label]) => (
            <div key={label} className="card p-3 text-center"><div className="text-xl">{icon}</div><div className="text-white font-bold text-sm">{val}</div><div className="text-slate-400 text-xs">{label}</div></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="card p-3 text-center"><div className="text-slate-400 text-xs">المشتريات</div><div className="text-white font-bold">{user.purchasesCount || 0}</div></div>
          <div className="card p-3 text-center"><div className="text-slate-400 text-xs">نسبة النجاح</div><div className="text-emerald-400 font-bold">{user.successRate || 100}%</div></div>
        </div>
        <button onClick={() => onNavigate('escrow')} className="btn-secondary text-sm">🛡️ صفقاتي</button>
        <button onClick={() => onNavigate('mystore')} className="btn-secondary text-sm">🏪 متجري</button>
        <button onClick={() => onNavigate('wallet')} className="btn-secondary text-sm">💰 محفظتي</button>
      </div>
    </div>
  );
}

// AuctionTab.tsx
export function AuctionTab({ user }: { user: any }) {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [bid, setBid] = useState('');

  useEffect(() => { apiGet('/auctions').then(d => setAuctions(d)).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function placeBid() {
    if (!bid || !selected) return;
    try { await apiPost(`/auctions/${selected._id}/bid`, { amount: +bid }); toast.success('✅ تم تقديم العرض!'); setBid(''); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">جار التحميل...</div></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0"><div className="text-white font-bold">🔨 المزادات</div></div>
      <div className="flex-1 overflow-y-auto scrollable p-3 space-y-3">
        {auctions.length === 0 ? <EmptyState icon="🔨" title="لا توجد مزادات" subtitle="لا توجد مزادات نشطة حالياً" /> : auctions.map(a => (
          <div key={a._id} className="card p-3 cursor-pointer" onClick={() => setSelected(a)}>
            <div className="text-white font-medium mb-1">{a.productTitle}</div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400 font-bold">💎{a.currentBid.toLocaleString()}</span>
              <span className="text-slate-400">⏰ {new Date(a.endAt).toLocaleDateString('ar')}</span>
            </div>
            {a.currentBidderName && <div className="text-slate-400 text-xs mt-1">آخر عرض: @{a.currentBidderName}</div>}
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setSelected(null)}>
          <div className="w-full bg-slate-900 rounded-t-3xl p-4 slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-3"><h2 className="text-white font-bold">{selected.productTitle}</h2><button onClick={() => setSelected(null)} className="text-slate-400">✕</button></div>
            <div className="card p-3 text-center mb-4"><div className="text-slate-400 text-sm">العرض الحالي</div><div className="text-emerald-400 font-bold text-2xl">💎{selected.currentBid.toLocaleString()}</div></div>
            <input type="number" value={bid} onChange={e => setBid(e.target.value)} placeholder={`أدخل عرضك (أكثر من 💎${selected.currentBid})`} className="input-field mb-3" />
            <button onClick={placeBid} className="btn-primary">🔨 تقديم العرض</button>
          </div>
        </div>
      )}
    </div>
  );
}

// SwapTab.tsx
export function SwapTab({ user }: { user: any }) {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [have, setHave] = useState('');
  const [want, setWant] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet('/swaps').then(setSwaps).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function add() {
    if (!have || !want) return toast.error('اكتب ما تملك وما تريد');
    try { const data = await apiPost('/swaps', { have, want }); setSwaps(s => [data.swap, ...s]); setHave(''); setWant(''); toast.success('✅ تم إضافة طلب التبادل'); }
    catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    try { await apiDelete(`/swaps/${id}`); setSwaps(s => s.filter(x => x._id !== id)); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">جار التحميل...</div></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-3 flex-shrink-0">
        <div className="text-white font-bold mb-3">🔄 التبادل</div>
        <div className="space-y-2">
          <input value={have} onChange={e => setHave(e.target.value)} placeholder="ماذا تملك؟" className="input-field text-sm" />
          <input value={want} onChange={e => setWant(e.target.value)} placeholder="ماذا تريد؟" className="input-field text-sm" />
          <button onClick={add} className="btn-primary text-sm">➕ إضافة طلب</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollable p-3 space-y-2">
        {swaps.length === 0 ? <EmptyState icon="🔄" title="لا توجد طلبات تبادل" /> : swaps.map(s => (
          <div key={s._id} className="card p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-emerald-400 text-sm">✅ يملك: {s.have}</div>
                <div className="text-blue-400 text-sm">🔍 يريد: {s.want}</div>
                <div className="text-slate-400 text-xs mt-1">@{s.username}</div>
              </div>
              {s.userId === user?.telegramId && <button onClick={() => remove(s._id)} className="text-red-400 text-xs">حذف</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// AdminTab.tsx (simplified panel)
export function AdminTab({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState('stats');
  const [pendingProducts, setPendingProducts] = useState<any>({ products: [], accounts: [] });
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [broadcast, setBroadcast] = useState('');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() { try { const d = await apiGet('/admin/stats'); setStats(d); } catch {} }
  async function loadPending() { try { const d = await apiGet('/admin/products/pending'); setPendingProducts(d); } catch {} }
  async function loadUsers() { try { const d = await apiGet('/admin/users?limit=30'); setUsers(d.users || []); } catch {} }
  async function loadSettings() { try { const d = await apiGet('/admin/settings'); setSettings(d); } catch {} }
  async function loadTickets() { try { const d = await apiGet('/admin/tickets?status=disputed'); setTickets(d); } catch {} }

  async function approveProduct(id: string, type: string) {
    try { await apiPost(`/admin/products/${id}/approve`, { type }); toast.success('✅ تم القبول'); loadPending(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function rejectProduct(id: string, type: string) {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;
    try { await apiPost(`/admin/products/${id}/reject`, { type, reason }); toast.success('✅ تم الرفض'); loadPending(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function banUser(id: string) {
    const reason = prompt('سبب الحظر:');
    if (!reason) return;
    try { await apiPost(`/admin/users/${id}/ban`, { reason }); toast.success('✅ تم الحظر'); loadUsers(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function sendBroadcast() {
    if (!broadcast) return;
    try { const d = await apiPost('/admin/broadcast', { message: broadcast }); toast.success(`✅ أرسل لـ${d.sent} مستخدم`); setBroadcast(''); }
    catch (e: any) { toast.error(e.message); }
  }

  async function saveSettings() {
    try { await apiPut('/admin/settings', settings); toast.success('✅ تم حفظ الإعدادات'); }
    catch (e: any) { toast.error(e.message); }
  }

  if (!user || !['admin', 'owner', 'moderator'].includes(user.role)) return <div className="flex items-center justify-center h-full text-slate-400">غير مصرح</div>;

  const TABS = [{ id: 'stats', label: '📊' }, { id: 'products', label: '📦' }, { id: 'users', label: '👥' }, { id: 'disputes', label: '⚖️' }, { id: 'broadcast', label: '📢' }, { id: 'settings', label: '⚙️' }];

  return (
    <div className="h-full flex flex-col">
      <div className="glass px-4 py-2 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map(t => <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'products') loadPending(); if (t.id === 'users') loadUsers(); if (t.id === 'settings') loadSettings(); if (t.id === 'disputes') loadTickets(); }} className={`flex-shrink-0 px-3 py-2 rounded-xl text-lg ${tab === t.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}>{t.label}</button>)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollable p-3">
        {tab === 'stats' && stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[['👥', stats.users, 'مستخدم'], ['📦', stats.products + stats.accounts, 'منتج'], ['🛡️', stats.tickets, 'صفقة'], ['💰', stats.revenue, 'إيراد 💎']].map(([icon, val, label]) => (
                <div key={label} className="card p-3 text-center"><div className="text-2xl">{icon}</div><div className="text-white font-bold">{val}</div><div className="text-slate-400 text-xs">{label}</div></div>
              ))}
            </div>
            {stats.disputedTickets > 0 && <div className="card p-3 bg-red-500/10 border-red-500/30"><div className="text-red-400 font-medium">⚠️ {stats.disputedTickets} نزاع بانتظار الحل</div></div>}
            {stats.pendingDeposits > 0 && <div className="card p-3 bg-amber-500/10 border-amber-500/30"><div className="text-amber-400 font-medium">💳 {stats.pendingDeposits} إيداع بانتظار التأكيد</div></div>}
          </div>
        )}

        {tab === 'products' && (
          <div className="space-y-3">
            <div className="text-slate-400 text-sm mb-2">منتجات بانتظار الموافقة ({pendingProducts.products.length + pendingProducts.accounts.length})</div>
            {[...pendingProducts.products.map((p: any) => ({ ...p, pType: 'market' })), ...pendingProducts.accounts.map((p: any) => ({ ...p, pType: 'accounts' }))].map(p => (
              <div key={p._id} className="card p-3">
                <div className="text-white text-sm font-medium mb-1">{p.title}</div>
                <div className="text-slate-400 text-xs mb-1">💎{p.price} • @{p.sellerName} • {p.pType === 'accounts' ? '🔐 حسابات' : '🏠 سوق'}</div>
                {p.images?.[0] && <img src={p.images[0]} className="w-full h-24 object-cover rounded-xl mb-2" />}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => rejectProduct(p._id, p.pType)} className="btn-danger text-xs py-1.5">❌ رفض</button>
                  <button onClick={() => approveProduct(p._id, p.pType)} className="btn-primary text-xs py-1.5">✅ قبول</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.telegramId} className="card p-3 flex justify-between items-center">
                <div>
                  <div className="text-white text-sm font-medium">{u.fullName}</div>
                  <div className="text-slate-400 text-xs">@{u.username} • {u.role} • 💎{u.crystals}</div>
                  {u.isBanned && <span className="badge-red">محظور</span>}
                </div>
                <button onClick={() => banUser(u.telegramId)} className="text-red-400 text-xs border border-red-400/30 px-2 py-1 rounded-lg">حظر</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'disputes' && (
          <div className="space-y-3">
            <div className="text-slate-400 text-sm">نزاعات مفتوحة ({tickets.length})</div>
            {tickets.map(t => (
              <div key={t._id} className="card p-3">
                <div className="text-white text-sm font-medium mb-1">{t.productTitle}</div>
                <div className="text-slate-400 text-xs mb-1">مشتري: @{t.buyerName} • بائع: @{t.sellerName}</div>
                {t.disputeReason && <div className="text-red-400 text-xs mb-2">السبب: {t.disputeReason}</div>}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => apiPost(`/tickets/${t._id}/resolve`, { decision: 'buyer', note: 'قرار الأدمن' }).then(() => { toast.success('تم'); loadTickets(); }).catch((e: any) => toast.error(e.message))} className="btn-danger text-xs py-1.5">💰 رد للمشتري</button>
                  <button onClick={() => apiPost(`/tickets/${t._id}/resolve`, { decision: 'seller', note: 'قرار الأدمن' }).then(() => { toast.success('تم'); loadTickets(); }).catch((e: any) => toast.error(e.message))} className="btn-primary text-xs py-1.5">💳 للبائع</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'broadcast' && (
          <div className="space-y-3">
            <div className="text-slate-400 text-sm">إرسال رسالة لجميع المستخدمين</div>
            <textarea value={broadcast} onChange={e => setBroadcast(e.target.value)} rows={5} className="input-field resize-none" placeholder="نص الرسالة..." />
            <button onClick={sendBroadcast} className="btn-primary">📢 إرسال للجميع</button>
          </div>
        )}

        {tab === 'settings' && settings && (
          <div className="space-y-3">
            {[
              { key: 'crystalPriceUSD', label: '💎 سعر الكريستال (USD)', type: 'number' },
              { key: 'commissionPercent', label: '💰 نسبة العمولة (%)', type: 'number' },
              { key: 'minWithdrawCrystals', label: '⬇️ حد أدنى السحب', type: 'number' },
              { key: 'supportUsername', label: '📞 يوزر الدعم', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key}><label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input type={type} value={settings[key] || ''} onChange={e => setSettings((s: any) => ({ ...s, [key]: type === 'number' ? +e.target.value : e.target.value }))} className="input-field text-sm" /></div>
            ))}
            {[
              { key: 'marketOpen', label: '🏠 السوق العام' },
              { key: 'accountsStoreOpen', label: '🔐 متجر الحسابات' },
              { key: 'pointsStoreOpen', label: '⭐ متجر النقاط' },
              { key: 'auctionsOpen', label: '🔨 المزادات' },
              { key: 'autoApproveProducts', label: '✅ موافقة تلقائية للمنتجات' },
              { key: 'maintenanceMode', label: '🔧 وضع الصيانة' },
            ].map(({ key, label }) => (
              <div key={key} className="flex justify-between items-center card p-3">
                <span className="text-white text-sm">{label}</span>
                <input type="checkbox" checked={!!settings[key]} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.checked }))} className="w-5 h-5 accent-emerald-500" />
              </div>
            ))}
            <button onClick={saveSettings} className="btn-primary">💾 حفظ الإعدادات</button>
          </div>
        )}
      </div>
    </div>
  );
}

