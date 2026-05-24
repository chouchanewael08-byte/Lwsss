import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

export default function SwapTab({ user }: { user: any }) {
  const [swaps, setSwaps]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [have, setHave]       = useState('');
  const [want, setWant]       = useState('');

  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); try { const d = await apiGet('/swap'); setSwaps(d.swaps||d); } catch {} setLoading(false); }
  async function create() {
    if (!have || !want) return toast.error('اكتب ما تملكه وما تريده');
    try { await apiPost('/swap', { have, want }); toast.success('✅ تم نشر العرض!'); setHave(''); setWant(''); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <PageLoader />;
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <div style={{ fontSize:17, fontWeight:800, marginBottom:10 }} className="grad">🔄 التبادل</div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="inp" placeholder="أملك..." value={have} onChange={e => setHave(e.target.value)} style={{ flex:1 }} />
          <input className="inp" placeholder="أريد..." value={want} onChange={e => setWant(e.target.value)} style={{ flex:1 }} />
          <button className="btn btn-primary btn-sm" onClick={create}>نشر</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {swaps.length === 0 ? <EmptyState icon="🔄" text="لا توجد عروض تبادل" /> :
          swaps.map(s => (
            <div key={s._id} className="card fade-in" style={{ padding:14, marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>يملك: <span style={{ color:'var(--green)', fontWeight:600 }}>{s.have}</span></div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>يريد: <span style={{ color:'var(--cyan)', fontWeight:600 }}>{s.want}</span></div>
                </div>
                <div style={{ fontSize:11, color:'var(--text2)' }}>🏪 {s.username}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
