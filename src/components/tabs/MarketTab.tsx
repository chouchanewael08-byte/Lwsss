import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, haptic } from '../../lib/api.js';
import { EmptyState } from '../shared/index.js';
import { ProductModal } from '../shared/ProductModal.js';
import toast from 'react-hot-toast';
import type { TabName } from '../../App.js';

const CATS = [
  { id: 'all',            label: 'الكل 🔍' },
  { id: 'game_account',   label: 'حسابات ألعاب 🎮' },
  { id: 'subscription',   label: 'اشتراكات رقمية 📺' },
  { id: 'digital_service',label: 'خدمات 💻' },
  { id: 'game_currency',  label: 'عملات 💰' },
  { id: 'social_media',   label: 'سوشيال ميديا 📱' },
];

const PAY_ICONS: Record<string, string> = {
  crystals:'💎', usdt:'💵', baridimob:'🏦', ccp:'🏧', binance:'🟡', flexy:'📱'
};

export default function MarketTab({ user, onNavigate }: { user: any; onNavigate: (t: TabName) => void }) {
  const [products, setProducts]   = useState<any[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');
  const [cat,      setCat]        = useState('all');
  const [selected, setSelected]   = useState<any>(null);
  const [buying,   setBuying]     = useState(false);
  const [coupon,   setCoupon]     = useState('');
  const [discount, setDiscount]   = useState(0);
  const [payMethod,setPayMethod]  = useState('crystals');
  const crystalUSD = 0.01;

  useEffect(() => { load(); }, [cat]);

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams({ type: cat === 'all' ? '' : cat, limit: '40' });
      const d = await apiGet(`/products?${p}`);
      setProducts(d.products || []);
    } catch { toast.error('خطأ في التحميل'); }
    setLoading(false);
  }

  async function validateCoupon(price: number) {
    if (!coupon) return;
    try {
      const d = await apiPost('/products/coupon/validate', { code: coupon, amount: price, storeType: 'market' });
      setDiscount(d.discount);
      toast.success(`✅ خصم 💎${d.discount}`);
    } catch (e: any) { toast.error(e.message); }
  }

  async function buy(method: string) {
    if (!selected || buying) return;
    setBuying(true);
    haptic('medium');
    try {
      await apiPost('/tickets', { productId: selected._id, productType: 'market', paymentMethod: method, couponCode: coupon || null });
      toast.success('✅ تم إنشاء الصفقة!');
      setSelected(null);
      onNavigate('escrow');
    } catch (e: any) { toast.error(e.message); }
    setBuying(false);
  }

  const filtered = search
    ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="h-full flex flex-col bg-mkt">

      {/* ── Header ── */}
      <div className="mkt-header">
        <div className="mkt-brand">
          <div className="mkt-logo">🏪</div>
          <div>
            <div className="mkt-name">السوق الرقمي</div>
            <div className="mkt-sub">سوق آمن 100% بنظام إيسكرو</div>
          </div>
        </div>
        <div className="mkt-search-wrap">
          <span className="mkt-search-icon">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن: حساب فالورانت، شدات ببجي..."
            className="mkt-search"
          />
          {search && <button className="mkt-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="mkt-cats">
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`mkt-cat ${cat === c.id ? 'mkt-cat-active' : ''}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto scrollable mkt-list">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="mkt-skeleton" />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="🔍" title="لا توجد منتجات" subtitle="جرب تغيير الفلاتر أو البحث" />
        ) : (
          filtered.map(p => <ProductCard key={p._id} p={p} crystalUSD={crystalUSD}
            onOpen={() => { haptic(); setSelected(p); setDiscount(0); setCoupon(''); }} />)
        )}
      </div>

      {/* ── Modal ── */}
      {selected && (
        <ProductDetailModal
          product={selected}
          discount={discount}
          coupon={coupon}
          onCouponChange={setCoupon}
          onValidateCoupon={() => validateCoupon(selected.price)}
          onBuy={buy}
          onClose={() => setSelected(null)}
          buying={buying}
          crystalUSD={crystalUSD}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Product Card (list item)
────────────────────────────────────────── */
function ProductCard({ p, crystalUSD, onOpen }: { p: any; crystalUSD: number; onOpen: () => void }) {
  const usd = (p.price * crystalUSD).toFixed(2);
  const hasDiscount = p.discountPercent > 0;
  const originalPrice = hasDiscount ? Math.ceil(p.price / (1 - p.discountPercent / 100)) : null;

  return (
    <div className="mktcard" onClick={onOpen}>
      {/* Image / Video preview */}
      <div className="mktcard-media">
        {p.images?.[0]
          ? <img src={p.images[0]} className="mktcard-img" alt="" loading="lazy" />
          : <div className="mktcard-noimg">
              {p.type === 'game_account' ? '🎮' : p.type === 'subscription' ? '📺' : p.type === 'game_currency' ? '💰' : p.type === 'social_media' ? '📱' : '💻'}
            </div>
        }
        {/* Badges */}
        <div className="mktcard-badges">
          {p.isTrend    && <span className="mktcard-badge mktcard-badge-fire">🔥 ترند</span>}
          {p.isFeatured && <span className="mktcard-badge mktcard-badge-star">⭐ مميز</span>}
          {hasDiscount  && <span className="mktcard-badge mktcard-badge-disc">-{p.discountPercent}%</span>}
        </div>
        {/* Category */}
        <span className="mktcard-cat">{
          p.type === 'game_account' ? '🎮 حسابات ألعاب'
          : p.type === 'subscription' ? '📺 اشتراكات'
          : p.type === 'game_currency' ? '💰 عملات'
          : p.type === 'social_media' ? '📱 سوشيال'
          : p.type === 'digital_service' ? '💻 خدمات'
          : '📦 منتج'
        }</span>
        {/* Video indicator */}
        {p.videos?.length > 0 && <span className="mktcard-video-badge">▶ فيديو</span>}
      </div>

      {/* Body */}
      <div className="mktcard-body">
        <div className="mktcard-title">{p.title}</div>
        {p.description && <div className="mktcard-desc">{p.description.slice(0, 90)}{p.description.length > 90 ? '...' : ''}</div>}

        {/* Payment tags */}
        {p.acceptedPayments?.length > 0 && (
          <div className="mktcard-pays">
            {p.acceptedPayments.slice(0, 4).map((m: string) => (
              <span key={m} className="mktcard-pay">{PAY_ICONS[m] || '💳'} {m === 'baridimob' ? 'بريدي' : m === 'crystals' ? 'كريستال' : m}</span>
            ))}
          </div>
        )}

        {/* Price row */}
        <div className="mktcard-price-row">
          <div>
            {hasDiscount && <div className="mktcard-original">💎{originalPrice?.toLocaleString()}</div>}
            <div className="mktcard-price">💎 {p.price.toLocaleString()}</div>
            <div className="mktcard-usd">${usd}</div>
          </div>
          <div className="mktcard-views">👁 {p.viewsCount || 0}</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Product Detail Modal (full redesign)
────────────────────────────────────────── */
function ProductDetailModal({ product, discount, coupon, onCouponChange, onValidateCoupon, onBuy, onClose, buying, crystalUSD }: any) {
  const [mediaIdx, setMediaIdx] = useState(0);
  const [payMethod, setPayMethod] = useState('crystals');
  const [visible, setVisible] = useState(false);
  const finalPrice = product.price - discount;
  const usd = (finalPrice * crystalUSD).toFixed(2);

  // All media: images + videos
  const allMedia = [
    ...(product.images || []).map((url: string) => ({ type: 'image', url })),
    ...(product.videos || []).map((url: string) => ({ type: 'video', url })),
  ];

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  function close() { setVisible(false); setTimeout(onClose, 320); }

  const PAY_METHODS = [
    { id: 'crystals',  label: 'كريستال',  icon: '💎', color: '#06b6d4' },
    { id: 'usdt',      label: 'USDT',     icon: '💵', color: '#10b981' },
    { id: 'baridimob', label: 'بريدي',    icon: '🏦', color: '#6366f1' },
    { id: 'ccp',       label: 'CCP',      icon: '🏧', color: '#f59e0b' },
    { id: 'binance',   label: 'Binance',  icon: '🟡', color: '#eab308' },
    { id: 'flexy',     label: 'Flexy',    icon: '📱', color: '#ec4899' },
  ];

  return (
    <div className="pm-overlay" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }} onClick={close}>
      <div className="pm-sheet"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}>

        <div className="pm-handle" />

        {/* Header */}
        <div className="pm-header">
          <div style={{ flex: 1 }}>
            <div className="pm-tag">{product.type || 'منتج'}</div>
            <h2 className="pm-title">{product.title}</h2>
          </div>
          <button className="pm-close" onClick={close}>✕</button>
        </div>

        {/* Media Gallery (images + videos) */}
        {allMedia.length > 0 && (
          <div className="pm-gallery">
            {allMedia[mediaIdx].type === 'image'
              ? <img src={allMedia[mediaIdx].url} className="pm-gallery-img" alt="" />
              : <video src={allMedia[mediaIdx].url} className="pm-gallery-img" controls playsInline preload="metadata" />
            }
            {allMedia.length > 1 && (
              <div className="pm-media-strip">
                {allMedia.map((m: any, i: number) => (
                  <button key={i} onClick={() => setMediaIdx(i)}
                    className={`pm-media-thumb ${i === mediaIdx ? 'pm-media-thumb-active' : ''}`}>
                    {m.type === 'image'
                      ? <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                      : <span style={{ fontSize: 20 }}>▶</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {product.description && <p className="pm-desc">{product.description}</p>}

        {/* Stats */}
        <div className="pm-stats">
          {([
            ['👁', product.viewsCount ?? 0,         'مشاهدة'],
            ['🛡', product.warrantyPeriod || 'لا',  'ضمان'],
            ['⭐', product.sellerLevel || 'عادي',   'البائع'],
          ] as [string,any,string][]).map(([icon, val, label]) => (
            <div key={label} className="pm-stat">
              <span className="pm-stat-icon">{icon}</span>
              <span className="pm-stat-val">{val}</span>
              <span className="pm-stat-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div className="pm-coupon-row">
          <input value={coupon} onChange={e => onCouponChange(e.target.value)}
            placeholder="كوبون خصم (اختياري)" className="pm-coupon-input" />
          <button onClick={onValidateCoupon} className="pm-coupon-btn">تطبيق</button>
        </div>

        {/* Price */}
        <div className="pm-price-row">
          <div>
            <span className="pm-price-label">السعر النهائي</span>
            {discount > 0 && <div style={{ fontSize: 11, color: '#64748b', textDecoration: 'line-through' }}>💎{product.price}</div>}
          </div>
          <div className="pm-price">
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="pm-price-gem">💎</span>
                <span className="pm-price-num">{finalPrice.toLocaleString()}</span>
              </div>
              <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>${usd}</div>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="pm-pay-label">اختر طريقة الدفع</div>
        <div className="pm-pay-grid">
          {PAY_METHODS.map(m => (
            <button key={m.id} onClick={() => setPayMethod(m.id)}
              className={`pm-pay-btn ${payMethod === m.id ? 'pm-pay-active' : ''}`}
              style={payMethod === m.id ? { '--pm-accent': m.color } as any : {}}>
              <span className="pm-pay-icon">{m.icon}</span>
              <span className="pm-pay-text">{m.label}</span>
              {payMethod === m.id && <span className="pm-pay-check">✓</span>}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="pm-actions">
          <button className="pm-btn-buy" onClick={() => onBuy(payMethod)} disabled={buying}>
            {buying ? <><span className="pm-spin">⟳</span> جار...</> : <>🛒 &nbsp;شراء الآن</>}
          </button>
        </div>

        <div className="pm-escrow">🔐 &nbsp;محمي بنظام الإيسكرو — أموالك محجوزة حتى تتأكد</div>
      </div>
    </div>
  );
}
