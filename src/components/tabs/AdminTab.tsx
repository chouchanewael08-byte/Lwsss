import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '../../lib/api.js';
import { PageLoader, StatBox } from '../shared/components.js';
import toast from 'react-hot-toast';

type AdminView = 'main'|'users'|'pending'|'disputes'|'settings'|'broadcast';

export default function AdminTab({ user }: { user: any }) {
  const [view, setView]       = useState<AdminView>('main');
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet('/admin/stats').then(setStats).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  if (loading) return <PageLoader />;

  if (view === 'users')     return <UsersView onBack={() => setView('main')} />;
  if (view === 'pending')   return <PendingView onBack={() => setView('main')} />;
  if (view === 'disputes')  return <DisputesView onBack={() => setView('main')} />;
  if (view === 'settings')  return <SettingsView onBack={() => setView('main')} />;
  if (view === 'broadcast') return <BroadcastView onBack={() => setView('main')} />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header"><div style={{ fontSize:17, fontWeight:800 }} className="grad">⚙️ لوحة الإدارة</div></div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          <StatBox icon="👥" label="المستخدمين" value={stats?.users?.total||0} color="var(--cyan)" />
          <StatBox icon="🆕" label="اليوم"      value={stats?.users?.new24h||0} color="var(--green)" />
          <StatBox icon="⏳" label="للمراجعة"  value={(stats?.products?.pendingMarket||0)+(stats?.products?.pendingAccounts||0)} color="var(--amber)" />
          <StatBox icon="⚠️" label="نزاعات"    value={stats?.tickets?.disputed||0} color="var(--red)" />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { id:'users',     icon:'👥', label:'المستخدمين',   sub:'بحث وإدارة' },
            { id:'pending',   icon:'⏳', label:'مراجعة المنتجات', sub:'موافقة أو رفض' },
            { id:'disputes',  icon:'⚠️', label:'النزاعات',     sub:`${stats?.tickets?.disputed||0} نزاع` },
            { id:'broadcast', icon:'📢', label:'إذاعة رسالة',  sub:'للجميع أو فئة' },
            { id:'settings',  icon:'🔧', label:'الإعدادات',    sub:'أسعار وعمولات' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id as AdminView)} className="card"
              style={{ padding:16, display:'flex', alignItems:'center', gap:12, border:'1px solid var(--border)', cursor:'pointer', textAlign:'right' }}>
              <span style={{ fontSize:24 }}>{item.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{item.label}</div>
                <div style={{ fontSize:11, color:'var(--text2)' }}>{item.sub}</div>
              </div>
              <span style={{ color:'var(--text3)' }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersView({ onBack }: { onBack: ()=>void }) {
  const [users, setUsers]   = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { const d = await apiGet(`/admin/users?search=${search}&limit=20`); setUsers(d.users||[]); }
    catch {} setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function ban(id: string) {
    const reason = prompt('سبب الحظر:'); if (!reason) return;
    try { await apiPost(`/admin/users/${id}/ban`, { reason }); toast.success('✅ تم الحظر'); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--purple)', fontSize:14, cursor:'pointer', marginBottom:8 }}>← رجوع</button>
        <div style={{ display:'flex', gap:8 }}>
          <input className="inp" placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1 }} onKeyDown={e => e.key==='Enter' && load()} />
          <button className="btn btn-primary btn-sm" onClick={load}>بحث</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {loading ? <PageLoader /> : users.map(u => (
          <div key={u._id} className="card2 fade-in" style={{ padding:12, marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:28 }}>{u.avatar||'👤'}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{u.username}</div>
              <div style={{ fontSize:10, color:'var(--text2)' }}>{u.telegramId} • {u.role} • {u.level}</div>
              <div style={{ fontSize:10, color:'var(--purple)' }}>💎{u.crystals} ⭐{u.stars}</div>
            </div>
            {!u.isBanned ? (
              <button className="btn btn-xs btn-red" onClick={() => ban(u.telegramId)}>حظر</button>
            ) : (
              <button className="btn btn-xs btn-green" onClick={async()=>{ await apiPost(`/admin/users/${u.telegramId}/unban`,{}); load(); }}>رفع</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingView({ onBack }: { onBack: ()=>void }) {
  const [pending, setPending] = useState<{market:any[];accounts:any[]}>({market:[],accounts:[]});
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet('/admin/products/pending').then(setPending).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  async function approve(id:string, type:string) {
    try { await apiPost(`/admin/products/${id}/approve`,{}); toast.success('✅ تمت الموافقة'); reload(); }
    catch(e:any){ toast.error(e.message); }
  }
  async function reject(id:string) {
    const reason = prompt('سبب الرفض:');
    try { await apiPost(`/admin/products/${id}/reject`,{reason}); toast.success('✅ تم الرفض'); reload(); }
    catch(e:any){ toast.error(e.message); }
  }
  function reload() { setLoading(true); apiGet('/admin/products/pending').then(setPending).catch(()=>{}).finally(()=>setLoading(false)); }

  const all = [...(pending.market||[]).map(p=>({...p,ptype:'market'})), ...(pending.accounts||[]).map(p=>({...p,ptype:'accounts'}))];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--purple)', fontSize:14, cursor:'pointer', marginBottom:6 }}>← رجوع</button>
        <div style={{ fontSize:15, fontWeight:700 }}>⏳ مراجعة المنتجات ({all.length})</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {loading ? <PageLoader /> : all.length===0 ? <div style={{textAlign:'center',color:'var(--text2)',padding:40}}>✅ لا توجد منتجات للمراجعة</div> :
          all.map(p => (
            <div key={p._id} className="card fade-in" style={{ padding:14, marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{p.title}</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>{p.description?.slice(0,80)}...</div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--purple)', marginBottom:10 }}>💎{p.price}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-sm btn-green" onClick={()=>approve(p._id,p.ptype)} style={{flex:1}}>✅ موافقة</button>
                <button className="btn btn-sm btn-red" onClick={()=>reject(p._id)} style={{flex:1}}>❌ رفض</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function DisputesView({ onBack }: { onBack:()=>void }) {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { apiGet('/admin/disputes').then(d=>setDisputes(d||[])).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  async function resolve(id:string, resolution:string) {
    const note = prompt('ملاحظة (اختياري):') || '';
    try { await apiPost(`/tickets/${id}/resolve`,{resolution,note}); toast.success('✅ تم الحل'); setDisputes(d=>d.filter(x=>x._id!==id)); }
    catch(e:any){ toast.error(e.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={onBack} style={{ background:'none',border:'none',color:'var(--purple)',fontSize:14,cursor:'pointer',marginBottom:6 }}>← رجوع</button>
        <div style={{ fontSize:15, fontWeight:700 }}>⚠️ النزاعات ({disputes.length})</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {loading ? <PageLoader /> : disputes.length===0 ? <div style={{textAlign:'center',color:'var(--green)',padding:40}}>✅ لا توجد نزاعات</div> :
          disputes.map(d => (
            <div key={d._id} className="card fade-in" style={{ padding:14, marginBottom:10, border:'1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{d.productTitle}</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>المشتري: {d.buyerName} | البائع: {d.sellerName}</div>
              <div style={{ fontSize:12, color:'var(--red)', marginBottom:10 }}>⚠️ {d.disputeReason}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-sm btn-green" onClick={()=>resolve(d._id,'complete')} style={{flex:1}}>✅ للبائع</button>
                <button className="btn btn-sm btn-red" onClick={()=>resolve(d._id,'refund')} style={{flex:1}}>↩️ رد للمشتري</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function SettingsView({ onBack }: { onBack:()=>void }) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { apiGet('/admin/settings').then(setSettings).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  async function save() {
    setSaving(true);
    try { await apiPut('/admin/settings', settings); toast.success('✅ تم الحفظ'); }
    catch(e:any){ toast.error(e.message); }
    setSaving(false);
  }

  if (loading) return <PageLoader />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={onBack} style={{ background:'none',border:'none',color:'var(--purple)',fontSize:14,cursor:'pointer',marginBottom:6 }}>← رجوع</button>
        <div style={{ fontSize:15, fontWeight:700 }}>🔧 الإعدادات</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {[
          { key:'crystalPriceUSD', label:'سعر الكريستال بالدولار', type:'number' },
          { key:'commissionPercent', label:'نسبة العمولة %', type:'number' },
          { key:'minWithdrawCrystals', label:'الحد الأدنى للسحب', type:'number' },
          { key:'maxWithdrawCrystals', label:'الحد الأقصى للسحب', type:'number' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>{f.label}</div>
            <input className="inp" type={f.type} value={settings[f.key]||''} onChange={e => setSettings({...settings,[f.key]:f.type==='number'?+e.target.value:e.target.value})} />
          </div>
        ))}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[{key:'marketOpen',label:'السوق مفتوح'},{key:'maintenanceMode',label:'وضع الصيانة'},{key:'autoApproveProducts',label:'موافقة تلقائية'}].map(f=>(
            <div key={f.key} className="card2" style={{ padding:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13 }}>{f.label}</span>
              <button onClick={()=>setSettings({...settings,[f.key]:!settings[f.key]})} style={{ width:44,height:24,borderRadius:99,border:'none',cursor:'pointer', background:settings[f.key]?'var(--green)':'var(--card)', transition:'all 0.2s', position:'relative' }}>
                <div style={{ width:20,height:20,borderRadius:99,background:'white',position:'absolute',top:2,transition:'all 0.2s',right:settings[f.key]?2:22 }} />
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width:'100%', marginTop:14, padding:14 }}>
          {saving?'⏳ جار الحفظ...':'💾 حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}

function BroadcastView({ onBack }: { onBack:()=>void }) {
  const [msg, setMsg]     = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!msg.trim()) return toast.error('الرسالة فارغة');
    setSending(true);
    try { const d = await apiPost('/admin/broadcast',{message:msg}); toast.success(d.message||'✅ تم الإرسال'); setMsg(''); }
    catch(e:any){ toast.error(e.message); }
    setSending(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={onBack} style={{ background:'none',border:'none',color:'var(--purple)',fontSize:14,cursor:'pointer',marginBottom:6 }}>← رجوع</button>
        <div style={{ fontSize:15, fontWeight:700 }}>📢 إذاعة رسالة</div>
      </div>
      <div style={{ flex:1, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:12, color:'var(--text2)' }}>الرسالة (يدعم Markdown):</div>
        <textarea className="inp" rows={8} placeholder="✍️ اكتب رسالتك هنا..." value={msg} onChange={e=>setMsg(e.target.value)} style={{ resize:'none' }} />
        <div className="card2" style={{ padding:10, fontSize:11, color:'var(--text2)' }}>
          💡 يمكنك استخدام *نص عريض* و _مائل_ و `كود`
        </div>
        <button className="btn btn-primary" onClick={send} disabled={sending} style={{ padding:14 }}>
          {sending?'⏳ جار الإرسال...':'📢 إرسال لجميع المستخدمين'}
        </button>
      </div>
    </div>
  );
}
