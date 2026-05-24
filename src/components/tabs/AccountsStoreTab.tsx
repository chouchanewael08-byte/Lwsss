import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

export default function AccountsStoreTab({ user, onNavigate }: { user: any; onNavigate: (t: any) => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { apiGet('/accounts').then(d => setProducts(d.products || d)).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function buy(p: any) {
    try {
      await apiPost('/tickets', { productId: p._id, productType: 'accounts', paymentMethod: 'crystals' });
      toast.success('✅ تم إنشاء الطلب!');
      setSelected(null); onNavigate('escrow');
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <PageLoader />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header"><div style={{ fontSize:17, fontWeight:800 }} className="grad">🎮 متجر الحسابات</div></div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {products.length === 0 ? <EmptyState icon="🎮" text="لا توجد حسابات" /> :
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {products.map(p => (
              <div key={p._id} className="card fade-in" onClick={() => setSelected(p)} style={{ cursor:'pointer', overflow:'hidden' }}>
                {p.images?.[0] ? <img src={p.images[0]} style={{ width:'100%', height:90, objectFit:'cover' }} /> :
                  <div style={{ height:90, background:'linear-gradient(135deg,#001a33,#0a0a1f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🎮</div>}
                <div style={{ padding:'10px 10px 12px' }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.title}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--purple)' }}>💎{p.price}</div>
                  <div style={{ fontSize:10, color:'var(--text2)' }}>🏪 {p.sellerName}</div>
                </div>
              </div>
            ))}
          </div>}
      </div>
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:100, display:'flex', alignItems:'flex-end' }} onClick={() => setSelected(null)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width:'100%', padding:20, borderRadius:'20px 20px 0 0' }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>{selected.title}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>{selected.description}</div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--purple)', marginBottom:16 }}>💎{selected.price}</div>
            <button className="btn btn-primary" onClick={() => buy(selected)} style={{ width:'100%', padding:14 }}>🛒 شراء الآن</button>
          </div>
        </div>
      )}
    </div>
  );
}
