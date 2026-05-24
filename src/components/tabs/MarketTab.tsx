import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

const CATS = [
  { id: 'all', label: '🔍 الكل' },
  { id: 'game_account',    label: '🎮 ألعاب' },
  { id: 'subscription',    label: '📺 اشتراكات' },
  { id: 'digital_service', label: '💻 خدمات' },
  { id: 'game_currency',   label: '💰 عملات' },
  { id: 'social_media',    label: '📱 سوشيال' },
];

export default function MarketTab({ user, onNavigate }: { user: any; onNavigate: (t: any) => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [cat, setCat]           = useState('all');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { load(); }, [cat]);

  async function load() {
    setLoading(true);
    try {
      const q = cat !== 'all' ? `?type=${cat}` : '';
      const d = await apiGet(`/products${q}`);
      setProducts(d.products || d);
    } catch { toast.error('خطأ في التحميل'); }
    setLoading(false);
  }

  const filtered = products.filter(p =>
    !search || p.title.includes(search) || p.sellerName?.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="tab-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 800 }} className="grad">🛒 السوق الرقمي</span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>💎{user?.crystals || 0}</span>
        </div>
        <input className="inp" placeholder="🔍 ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} className="btn btn-sm"
              style={{ flexShrink: 0, background: cat === c.id ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : 'var(--card2)', color: cat === c.id ? '#fff' : 'var(--text2)', border: '1px solid var(--border)' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px' }}>
        {loading ? <PageLoader /> : filtered.length === 0 ? <EmptyState icon="📭" text="لا توجد منتجات" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {filtered.map(p => <ProductCard key={p._id} p={p} onClick={() => setSelected(p)} />)}
          </div>
        )}
      </div>

      {selected && <ProductModal p={selected} user={user} onClose={() => setSelected(null)} onNavigate={onNavigate} />}
    </div>
  );
}

function ProductCard({ p, onClick }: { p: any; onClick: () => void }) {
  const disc = p.discountPercent > 0;
  const finalPrice = disc ? Math.floor(p.price * (1 - p.discountPercent / 100)) : p.price;
  return (
    <div className="card fade-in" onClick={onClick} style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
      {p.isFeatured && <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, background: '#F59E0B', color: '#000', borderRadius: 6, padding: '2px 6px', fontWeight: 700 }}>⭐ مميز</div>}
      {disc && <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 10, background: '#EF4444', color: '#fff', borderRadius: 6, padding: '2px 6px', fontWeight: 700 }}>-{p.discountPercent}%</div>}
      {p.images?.[0]
        ? <img src={p.images[0]} alt="" style={{ width: '100%', height: 90, objectFit: 'cover' }} />
        : <div style={{ height: 90, background: 'linear-gradient(135deg,#1a0533,#001a33)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📦</div>}
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {disc && <div style={{ fontSize: 10, color: 'var(--text3)', textDecoration: 'line-through' }}>💎{p.price}</div>}
            <div style={{ fontSize: 15, fontWeight: 800, color: '#8B5CF6' }}>💎{finalPrice}</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>👁 {p.viewsCount || 0}</div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>🏪 {p.sellerName}</div>
      </div>
    </div>
  );
}

function ProductModal({ p, user, onClose, onNavigate }: { p: any; user: any; onClose: () => void; onNavigate: (t: any) => void }) {
  const [method, setMethod]   = useState('crystals');
  const [buying, setBuying]   = useState(false);
  const disc      = p.discountPercent > 0;
  const finalPrice = disc ? Math.floor(p.price * (1 - p.discountPercent / 100)) : p.price;
  const isMine    = p.sellerId === user?.telegramId;

  async function buy() {
    if (isMine) return toast.error('لا يمكنك شراء منتجك');
    setBuying(true);
    try {
      const d = await apiPost('/tickets', { productId: p._id, productType: 'market', paymentMethod: method });
      toast.success('✅ تم إنشاء الطلب!');
      onClose(); onNavigate('escrow');
    } catch (e: any) { toast.error(e.message); }
    setBuying(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div className="card fade-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px 20px 0 0', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>🏪 {p.sellerName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />}

        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>{p.description}</div>

        <div className="card2" style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>السعر</span>
            <span style={{ fontWeight: 800, color: 'var(--purple)', fontSize: 16 }}>💎{finalPrice}</span>
          </div>
          {p.warrantyPeriod && p.warrantyPeriod !== 'بدون ضمان' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>الضمان</span>
              <span style={{ fontSize: 13, color: 'var(--green)' }}>✅ {p.warrantyPeriod}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>طريقة الدفع:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['crystals','baridimob','ccp','usdt','binance'].map(m => (
              <button key={m} onClick={() => setMethod(m)} className="btn btn-sm"
                style={{ background: method === m ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : 'var(--card2)', color: method === m ? '#fff' : 'var(--text2)', border: '1px solid var(--border)' }}>
                {m === 'crystals' ? '💎' : m === 'baridimob' ? '🏦' : m === 'ccp' ? '🏧' : m === 'usdt' ? '💵' : '🟡'} {m}
              </button>
            ))}
          </div>
        </div>

        {!isMine && (
          <button className="btn btn-primary" onClick={buy} disabled={buying} style={{ width: '100%', padding: 14, fontSize: 15 }}>
            {buying ? '⏳ جار الشراء...' : `🛒 شراء الآن — 💎${finalPrice}`}
          </button>
        )}
      </div>
    </div>
  );
}
