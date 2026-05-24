import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, ChevronDown, X, Package, TrendingUp, DollarSign, Check } from 'lucide-react';
import { apiGet, apiForm, apiDelete, haptic } from '../../lib/api.js';
import { ImageUploader, SkeletonCard } from '../shared/index.js';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = ['game_account','subscription','digital_service','game_currency','social_media','design_dev'];
const PT_LABELS: Record<string,string> = {
  game_account:'حساب لعبة', subscription:'اشتراك', digital_service:'خدمة رقمية',
  game_currency:'عملة لعبة', social_media:'سوشيال ميديا', design_dev:'تصميم/برمجة',
};
const PLATFORMS = ['pubg','freefire','valorant','fortnite','cod','instagram','tiktok','youtube','netflix','spotify','other'];
const PAYMENT_OPTS = [
  { id:'crystals', label:'💎 كريستال' },
  { id:'usdt',     label:'💲 USDT'    },
  { id:'baridimob',label:'📱 بريدي'   },
  { id:'ccp',      label:'🏦 CCP'     },
  { id:'binance',  label:'🟡 Binance' },
  { id:'flexy',    label:'📞 فليكسي'  },
];

const EMPTY_FORM = {
  title:'', description:'', price:'',
  type:'game_account', platform:'pubg',
  isNegotiable:false, warrantyPeriod:'بدون ضمان', isSwapAcceptable:false,
  acceptedPayments:['crystals'],
  accountAge:'', accountLevel:'', followersCount:'', region:'',
  credentials:{ email:'', password:'', username:'', phone:'', notes:'' },
};

export default function MyStoreTab({ user }: { user: any }) {
  const [products,  setProducts]  = useState<any[]>([]);
  const [accounts,  setAccounts]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [storeType, setStoreType] = useState<'market'|'accounts'>('market');
  const [newFiles,  setNewFiles]  = useState<File[]>([]);
  const [submitting,setSubmitting]= useState(false);
  const [activeTab, setActiveTab] = useState<'all'|'market'|'accounts'>('all');
  const [form, setForm] = useState<Record<string,any>>({ ...EMPTY_FORM });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet('/user/my-products');
      setProducts(data.products || []);
      setAccounts(data.accounts || []);
    } catch { toast.error('خطأ في التحميل'); }
    setLoading(false);
  }

  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const sc = (k: string, v: string) => setForm(f => ({ ...f, credentials: { ...f.credentials, [k]: v } }));
  const togglePay = (m: string) => setForm(f => ({
    ...f,
    acceptedPayments: f.acceptedPayments.includes(m)
      ? f.acceptedPayments.filter((x: string) => x !== m)
      : [...f.acceptedPayments, m],
  }));

  async function submit() {
    if (!form.title.trim())           return toast.error('العنوان مطلوب');
    if (!form.price || +form.price<=0) return toast.error('السعر يجب أن يكون أكبر من 0');
    if (!form.credentials.email && !form.credentials.username) return toast.error('أدخل إيميل أو معرف الحساب');
    setSubmitting(true); haptic('medium');
    const fd = new FormData();
    fd.append('title',           form.title.trim());
    fd.append('description',     form.description);
    fd.append('price',           form.price);
    fd.append('isNegotiable',    String(form.isNegotiable));
    fd.append('warrantyPeriod',  form.warrantyPeriod);
    fd.append('credentials',     JSON.stringify(form.credentials));
    fd.append('acceptedPayments',JSON.stringify(form.acceptedPayments));
    if (storeType === 'market') {
      fd.append('type', form.type);
      fd.append('isSwapAcceptable', String(form.isSwapAcceptable));
    } else {
      ['platform','accountAge','accountLevel','followersCount','region']
        .forEach(k => fd.append(k, form[k] || ''));
    }
    for (const file of newFiles) fd.append('images', file);
    try {
      const endpoint = storeType === 'market' ? '/products' : '/accounts';
      const { autoApprove } = await apiForm(endpoint, fd);
      toast.success(autoApprove ? '🎉 تم نشر المنتج!' : '✅ أُرسل للمراجعة!');
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setNewFiles([]);
      load();
    } catch (e: any) { toast.error(e.message); }
    setSubmitting(false);
  }

  async function del(id: string, type: 'market'|'accounts') {
    if (!confirm('حذف هذا المنتج نهائياً؟')) return;
    try {
      await apiDelete(`/${type === 'market' ? 'products' : 'accounts'}/${id}`);
      toast.success('تم الحذف');
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  const allItems = [
    ...products.map(p => ({ ...p, _type: 'market'   })),
    ...accounts.map(a => ({ ...a, _type: 'accounts' })),
  ];
  const filtered = activeTab === 'all' ? allItems
    : allItems.filter(i => i._type === activeTab);

  const approved = allItems.filter(p => p.isApproved).length;
  const pending  = allItems.filter(p => !p.isApproved).length;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--c-bg)' }}>

      {/* ── HEADER ── */}
      <div className="glass-header px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="font-bold text-white text-base">🏪 متجري</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-muted)' }}>
              {allItems.length} منتج · {approved} مقبول · {pending} قيد المراجعة
            </p>
          </div>
          <button
            onClick={() => { haptic(); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 15px rgba(34,197,94,0.3)' }}
          >
            <Plus size={16} /> إضافة
          </button>
        </div>

        {/* stats strip */}
        {!loading && allItems.length > 0 && (
          <div className="flex gap-2 mb-3">
            {[
              { icon: <Package size={14}/>, label: 'إجمالي', val: allItems.length, col: '#4ade80' },
              { icon: <Check size={14}/>,   label: 'مقبول',   val: approved,        col: '#22c55e' },
              { icon: <TrendingUp size={14}/>, label:'مراجعة', val: pending,         col: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl py-2 px-2 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-lg font-extrabold" style={{ color: s.col }}>{s.val}</div>
                <div className="text-[10px]" style={{ color: 'var(--c-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* filter tabs */}
        {!loading && allItems.length > 0 && (
          <div className="tab-pills mb-3">
            {[['all','الكل'],['market','السوق'],['accounts','الحسابات']].map(([id,lbl]) => (
              <button key={id} className={`tab-pill ${activeTab===id?'active':''}`}
                onClick={() => setActiveTab(id as any)}>
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto scrollable p-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">لا توجد منتجات</div>
            <div className="empty-sub">أضف أول منتج وابدأ البيع الآن</div>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-2" style={{ maxWidth: 220 }}>
              + إضافة منتج
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <div key={p._id} className={`product-card ${p.isApproved ? 'approved' : 'pending'}`}>
                <div className={`product-card-accent ${p.isApproved ? '' : 'pending'}`} />
                <div className="p-3 flex gap-3 items-center">
                  {/* thumbnail */}
                  <div className="relative flex-shrink-0">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                        🎮
                      </div>
                    )}
                  </div>
                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate text-white">{p.title}</div>
                    <div className="mt-1">
                      <span className="price-tag">💎 {Number(p.price).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.isApproved
                        ? <span className="badge-green">✅ مقبول</span>
                        : <span className="badge-amber">⏳ مراجعة</span>
                      }
                      {p.isHidden && <span className="badge-red">مخفي</span>}
                      {p._type === 'accounts' && <span className="badge-purple">حساب</span>}
                    </div>
                  </div>
                  {/* actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => del(p._id, p._type)} className="btn-icon danger">
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--c-muted)' }}>
                      <Eye size={11} /> {p.viewsCount || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD FORM MODAL ── */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) { setShowForm(false); haptic(); } }}>
          <div className="modal-sheet">
            <div className="modal-handle" />

            {/* header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-extrabold text-white text-base">➕ منتج جديد</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            {/* store type selector */}
            <div className="tab-pills mb-4">
              {[['market','🏠 السوق العام'],['accounts','🔐 متجر الحسابات']].map(([id,lbl]) => (
                <button key={id} className={`tab-pill ${storeType===id?'active':''}`}
                  onClick={() => setStoreType(id as any)}>
                  {lbl}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* title */}
              <div>
                <label className="input-label">عنوان المنتج *</label>
                <input className="input-field" placeholder="مثال: حساب PUBG M M5 ..."
                  value={form.title} onChange={e => sf('title', e.target.value)} maxLength={100} />
              </div>

              {/* type/platform */}
              {storeType === 'market' ? (
                <div>
                  <label className="input-label">نوع المنتج</label>
                  <select className="input-field" value={form.type} onChange={e => sf('type', e.target.value)}>
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{PT_LABELS[t]}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="input-label">المنصة</label>
                  <select className="input-field" value={form.platform} onChange={e => sf('platform', e.target.value)}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
              )}

              {/* price */}
              <div>
                <label className="input-label">السعر 💎 (كريستال) *</label>
                <input className="input-field" type="number" placeholder="0" min="1" max="999999"
                  value={form.price} onChange={e => sf('price', e.target.value)} />
              </div>

              {/* description */}
              <div>
                <label className="input-label">الوصف</label>
                <textarea className="input-field" rows={3} placeholder="اكتب وصفاً للمنتج..."
                  value={form.description} onChange={e => sf('description', e.target.value)}
                  maxLength={1000} style={{ resize: 'none' }} />
              </div>

              {/* accounts extra fields */}
              {storeType === 'accounts' && (
                <div className="grid grid-cols-2 gap-2">
                  {[['accountAge','عمر الحساب'],['accountLevel','المستوى'],['followersCount','المتابعين'],['region','المنطقة']].map(([k,lbl]) => (
                    <div key={k}>
                      <label className="input-label">{lbl}</label>
                      <input className="input-field text-sm" placeholder={lbl} value={form[k]}
                        onChange={e => sf(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              )}

              {/* credentials */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--c-green3)' }}>🔐 بيانات الحساب (مشفرة)</div>
                <div className="grid grid-cols-2 gap-2">
                  {[['email','الإيميل *'],['password','كلمة المرور'],['username','المعرف'],['phone','الهاتف'],['notes','ملاحظات']].map(([k,lbl]) => (
                    <div key={k} className={k==='notes'?'col-span-2':''}>
                      <input className="input-field text-sm" placeholder={lbl}
                        value={form.credentials[k]} onChange={e => sc(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* payment methods */}
              <div>
                <label className="input-label">طرق الدفع المقبولة</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTS.map(({ id, label }) => (
                    <button key={id} type="button"
                      className={`payment-chip ${form.acceptedPayments.includes(id) ? 'selected' : ''}`}
                      onClick={() => togglePay(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* options */}
              <div className="flex gap-3">
                {[
                  { k:'isNegotiable', lbl:'💬 قابل للتفاوض' },
                  ...(storeType==='market'?[{ k:'isSwapAcceptable', lbl:'🔄 قبول تبادل' }]:[]),
                ].map(({ k, lbl }) => (
                  <div key={k} className="toggle-wrap flex-1" onClick={() => { haptic('light'); sf(k, !form[k]); }}>
                    <div className={`toggle ${form[k] ? 'on' : ''}`}><div className="toggle-knob" /></div>
                    <span className="text-xs" style={{ color: 'var(--c-muted2)' }}>{lbl}</span>
                  </div>
                ))}
              </div>

              {/* images */}
              <div>
                <label className="input-label">الصور</label>
                <ImageUploader files={newFiles} onChange={setNewFiles} maxFiles={5} />
              </div>

              {/* submit */}
              <button onClick={submit} disabled={submitting} className="btn-primary mt-2"
                style={{ fontSize: 15, padding: '14px' }}>
                {submitting ? '⏳ جار النشر...' : '🚀 نشر المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
