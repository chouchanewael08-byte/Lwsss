import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

function countdown(endAt: string) {
  const diff = new Date(endAt).getTime() - Date.now();
  if (diff <= 0) return '⏰ انتهى';
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
  return `${h}س ${m}د ${s}ث`;
}

export default function AuctionTab({ user }: { user: any }) {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [bidding, setBidding]   = useState<string|null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [, tick] = useState(0);

  useEffect(() => { load(); const t = setInterval(() => tick(n => n+1), 1000); return () => clearInterval(t); }, []);

  async function load() {
    setLoading(true);
    try { const d = await apiGet('/auctions'); setAuctions(d.auctions || d); }
    catch {} setLoading(false);
  }

  async function bid(a: any) {
    if (!bidAmount || +bidAmount <= a.currentBid) return toast.error(`المزايدة يجب أن تكون أكثر من 💎${a.currentBid}`);
    try {
      await apiPost(`/auctions/${a._id}/bid`, { amount: +bidAmount });
      toast.success('✅ تم تسجيل مزايدتك!');
      setBidding(null); setBidAmount(''); load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <PageLoader />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header"><div style={{ fontSize:17, fontWeight:800 }} className="grad">⚡ المزادات الحية</div></div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {auctions.length === 0 ? <EmptyState icon="⚡" text="لا توجد مزادات نشطة" /> :
          auctions.map(a => (
            <div key={a._id} className="card fade-in" style={{ padding:14, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:700, flex:1 }}>{a.productTitle}</div>
                <span style={{ fontSize:11, color:'var(--red)', fontWeight:700, background:'rgba(239,68,68,0.15)', padding:'3px 8px', borderRadius:99 }}>⏰ {countdown(a.endAt)}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                <div className="card2" style={{ padding:10, textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'var(--text2)' }}>السعر الحالي</div>
                  <div style={{ fontSize:20, fontWeight:800, color:'var(--purple)' }}>💎{a.currentBid}</div>
                </div>
                <div className="card2" style={{ padding:10, textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'var(--text2)' }}>عدد المزايدات</div>
                  <div style={{ fontSize:20, fontWeight:800, color:'var(--cyan)' }}>{a.bids?.length || 0}</div>
                </div>
              </div>
              {a.currentBidderName && <div style={{ fontSize:11, color:'var(--text2)', marginBottom:10 }}>🏆 الأعلى: {a.currentBidderName}</div>}
              {a.sellerId !== user?.telegramId && (
                bidding === a._id ? (
                  <div style={{ display:'flex', gap:8 }}>
                    <input className="inp" type="number" placeholder={`أكثر من ${a.currentBid}`} value={bidAmount} onChange={e => setBidAmount(e.target.value)} style={{ flex:1 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => bid(a)}>مزايدة</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setBidding(null)}>إلغاء</button>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => { setBidding(a._id); setBidAmount(String(a.currentBid+1)); }} style={{ width:'100%' }}>⚡ زايد الآن</button>
                )
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
