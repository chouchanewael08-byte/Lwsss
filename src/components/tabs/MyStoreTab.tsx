import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

export default function MyStoreTab({ user }: { user: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState({ title:'', description:'', price:'', type:'digital_service', credentialsRaw:'' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const d = await apiGet('/user/my-products'); setProducts([...(d.products||[]), ...(d.accounts||[])]); }
    catch {} setLoading(false);
  }

  async function submit() {
    if (!form.title || !form.price) return toast.error('العنوان والسعر مطلوبان');
    setSaving(true);
    try {
      await apiPost('/products', { title: form.title, description: form.description, price: +form.price, type: form.type, credentialsRaw: form.credentialsRaw });
      toast.success('✅ تم إرسال المنتج للمراجعة!');
      setAdding(false); setForm({ title:'', description:'', price:'', type:'digital_service', credentialsRaw:'' });
      load();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function del(id: string, type: string) {
    if (!confirm('هل تريد حذف هذا المنتج؟')) return;
    try { await apiDelete(`/${type === 'account' ? 'accounts' : 'products'}/${id}`); toast.success('✅ تم الحذف'); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <PageLoader />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800 }} className="grad">🏪 متجري</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>{products.length} منتج</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ إضافة</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {products.length === 0
          ? <EmptyState icon="🏪" text="متجرك فارغ" sub="أضف منتجك الأول!" />
          : products.map(p => (
            <div key={p._id} className="card fade-in" style={{ padding:14, marginBottom:10 }}>
              <div style={{ display:'flex', gap:10 }}>
                {p.images?.[0]
                  ? <img src={p.images[0]} style={{ width:60, height:60, borderRadius:10, objectFit:'cover' }} />
                  : <div style={{ width:60, height:60, borderRadius:10, background:'var(--card2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📦</div>}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{p.title}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--purple)' }}>💎{p.price}</div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                    background: p.isApproved ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                    color: p.isApproved ? 'var(--green)' : 'var(--amber)' }}>
                    {p.isApproved ? '✅ مفعّل' : '⏳ مراجعة'}
                  </span>
                </div>
                <button onClick={() => del(p._id, p.platform ? 'account' : 'product')} style={{ background:'none', border:'none', color:'var(--red)', fontSize:18, cursor:'pointer' }}>🗑</button>
              </div>
            </div>
          ))}
      </div>

      {/* Add product modal */}
      {adding && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:100, display:'flex', alignItems:'flex-end' }} onClick={() => setAdding(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width:'100%', maxHeight:'90vh', overflowY:'auto', borderRadius:'20px 20px 0 0', padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:800 }}>➕ منتج جديد</div>
              <button onClick={() => setAdding(false)} style={{ background:'none', border:'none', color:'var(--text2)', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div><div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>العنوان *</div><input className="inp" placeholder="عنوان المنتج" value={form.title} onChange={e => setForm({...form, title:e.target.value})} /></div>
              <div><div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>الوصف</div><textarea className="inp" placeholder="وصف تفصيلي..." rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})} style={{ resize:'none' }} /></div>
              <div><div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>السعر 💎 *</div><input className="inp" type="number" placeholder="500" value={form.price} onChange={e => setForm({...form, price:e.target.value})} /></div>
              <div><div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>بيانات المنتج 🔐</div><textarea className="inp" placeholder="يوزر: xxx&#10;باسوورد: xxx" rows={3} value={form.credentialsRaw} onChange={e => setForm({...form, credentialsRaw:e.target.value})} style={{ resize:'none' }} /></div>
              <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ padding:14 }}>
                {saving ? '⏳ جار الإرسال...' : '📤 إرسال للمراجعة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
