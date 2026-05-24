import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

export default function PointsStoreTab({ user, onUserUpdate }: { user: any; onUserUpdate: (u: any) => void }) {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet('/points-store').then(d => setItems(d.items || d)).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function redeem(item: any) {
    if ((user?.stars || 0) < item.starsCost) return toast.error(`تحتاج ⭐${item.starsCost}`);
    try {
      await apiPost(`/points-store/${item._id}/redeem`, {});
      toast.success('✅ تم الاستبدال!');
      onUserUpdate({ ...user, stars: (user.stars || 0) - item.starsCost });
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <PageLoader />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <div style={{ fontSize:17, fontWeight:800, marginBottom:4 }} className="grad">🎁 متجر النقاط</div>
        <div style={{ fontSize:13, color:'var(--amber)' }}>رصيدك: ⭐{user?.stars || 0}</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {items.length === 0 ? <EmptyState icon="🎁" text="لا توجد عناصر" /> :
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {items.map(item => (
              <div key={item._id} className="card fade-in" style={{ padding:14, textAlign:'center' }}>
                {item.images?.[0] ? <img src={item.images[0]} style={{ width:'100%', height:80, objectFit:'cover', borderRadius:8, marginBottom:8 }} /> :
                  <div style={{ fontSize:36, marginBottom:8 }}>🎁</div>}
                <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{item.title}</div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--amber)', marginBottom:10 }}>⭐{item.starsCost}</div>
                <button className="btn btn-sm" onClick={() => redeem(item)}
                  style={{ width:'100%', background: (user?.stars||0)>=item.starsCost ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'var(--card2)', color: (user?.stars||0)>=item.starsCost ? '#000' : 'var(--text3)' }}>
                  استبدال
                </button>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}
