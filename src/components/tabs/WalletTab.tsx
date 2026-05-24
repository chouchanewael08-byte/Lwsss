import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, StatBox } from '../shared/components.js';
import toast from 'react-hot-toast';

const METHODS = [
  { id: 'baridimob', label: 'BaridiMob', icon: '🏦' },
  { id: 'ccp',       label: 'CCP',       icon: '🏧' },
  { id: 'usdt',      label: 'USDT TRC20',icon: '💵' },
  { id: 'binance',   label: 'Binance',   icon: '🟡' },
  { id: 'flexy',     label: 'Flexy',     icon: '📱' },
];

export default function WalletTab({ user, onUserUpdate }: { user: any; onUserUpdate: (u: any) => void }) {
  const [wallet, setWallet]   = useState<any>(null);
  const [txs, setTxs]         = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<'main'|'deposit'|'withdraw'>('main');
  const [method, setMethod]   = useState('baridimob');
  const [amount, setAmount]   = useState('');
  const [proof, setProof]     = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [w, t] = await Promise.all([apiGet('/wallet'), apiGet('/wallet/transactions')]);
      setWallet(w); setTxs(t.transactions || []);
    } catch {}
    setLoading(false);
  }

  async function sendDeposit() {
    if (!amount || +amount < 1) return toast.error('أدخل مبلغاً صحيحاً');
    setSending(true);
    try {
      await apiPost('/wallet/deposit', { amount: +amount, paymentMethod: method, proofImage: proof || null });
      toast.success('✅ تم إرسال طلب الإيداع!');
      setView('main'); setAmount(''); setProof('');
      load();
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  }

  async function sendWithdraw() {
    if (!amount || +amount < 500) return toast.error('الحد الأدنى 💎500');
    setSending(true);
    try {
      await apiPost('/wallet/withdraw', { amount: +amount, method });
      toast.success('✅ تم إرسال طلب السحب!');
      setView('main'); setAmount('');
      load();
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  }

  if (loading) return <PageLoader />;

  if (view === 'deposit') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={() => setView('main')} style={{ background:'none', border:'none', color:'var(--purple)', fontSize:14, cursor:'pointer', marginBottom:8 }}>← رجوع</button>
        <div style={{ fontSize:17, fontWeight:800 }}>💳 إيداع كريستال</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ fontSize:13, color:'var(--text2)' }}>اختر طريقة الدفع:</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)} className="card2"
              style={{ display:'flex', alignItems:'center', gap:12, padding:14, border: method===m.id ? '1px solid var(--purple)' : '1px solid var(--border)', cursor:'pointer', textAlign:'right' }}>
              <span style={{ fontSize:22 }}>{m.icon}</span>
              <span style={{ fontWeight:600, fontSize:14, flex:1 }}>{m.label}</span>
              {method===m.id && <span style={{ color:'var(--purple)' }}>✓</span>}
            </button>
          ))}
        </div>
        <div>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>المبلغ بالكريستال 💎</div>
          <input className="inp" type="number" placeholder="مثال: 1000" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>رابط إيصال الدفع (اختياري)</div>
          <input className="inp" placeholder="https://..." value={proof} onChange={e => setProof(e.target.value)} />
        </div>
        <div className="card2" style={{ padding:12, fontSize:12, color:'var(--amber)' }}>
          ⚠️ أرسل المبلغ أولاً ثم أرسل الطلب. سيتم التأكيد خلال 24 ساعة.
        </div>
        <button className="btn btn-primary" onClick={sendDeposit} disabled={sending} style={{ padding:14, fontSize:15 }}>
          {sending ? '⏳ جار الإرسال...' : '📤 إرسال طلب الإيداع'}
        </button>
      </div>
    </div>
  );

  if (view === 'withdraw') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={() => setView('main')} style={{ background:'none', border:'none', color:'var(--purple)', fontSize:14, cursor:'pointer', marginBottom:8 }}>← رجوع</button>
        <div style={{ fontSize:17, fontWeight:800 }}>💸 سحب كريستال</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
        <div className="card2" style={{ padding:14, textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>رصيدك المتاح</div>
          <div style={{ fontSize:28, fontWeight:800, color:'var(--purple)' }}>💎{wallet?.crystals || 0}</div>
        </div>
        <div style={{ fontSize:13, color:'var(--text2)' }}>طريقة الاستلام:</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)} className="card2"
              style={{ display:'flex', alignItems:'center', gap:12, padding:14, border: method===m.id ? '1px solid var(--purple)' : '1px solid var(--border)', cursor:'pointer' }}>
              <span style={{ fontSize:22 }}>{m.icon}</span>
              <span style={{ fontWeight:600, fontSize:14, flex:1 }}>{m.label}</span>
              {method===m.id && <span style={{ color:'var(--purple)' }}>✓</span>}
            </button>
          ))}
        </div>
        <div>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>المبلغ 💎 (الحد الأدنى 500)</div>
          <input className="inp" type="number" placeholder="500" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={sendWithdraw} disabled={sending} style={{ padding:14, fontSize:15 }}>
          {sending ? '⏳...' : '💸 إرسال طلب السحب'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <div style={{ fontSize:17, fontWeight:800, marginBottom:14 }} className="grad">💎 محفظتي</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <StatBox icon="💎" label="كريستال" value={wallet?.crystals || 0} color="var(--purple)" />
          <StatBox icon="⭐" label="نجوم" value={wallet?.stars || 0} color="var(--amber)" />
          <StatBox icon="🔒" label="محجوز" value={wallet?.frozenCrystals || 0} color="var(--text2)" />
        </div>
      </div>

      <div style={{ padding:'12px 16px', display:'flex', gap:10 }}>
        <button className="btn btn-primary" onClick={() => setView('deposit')} style={{ flex:1 }}>💳 إيداع</button>
        <button className="btn btn-secondary" onClick={() => setView('withdraw')} style={{ flex:1 }}>💸 سحب</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 16px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text2)', marginBottom:10 }}>📋 آخر المعاملات</div>
        {txs.length === 0
          ? <div style={{ textAlign:'center', color:'var(--text3)', fontSize:13, padding:20 }}>لا توجد معاملات</div>
          : txs.map(tx => <TxRow key={tx._id} tx={tx} />)}
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: any }) {
  const isIn = ['deposit','sale','bonus','referral_bonus','sale_complete','auction_sale'].some(t => tx.type.includes(t));
  return (
    <div className="card2 fade-in" style={{ padding:'10px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ fontSize:20 }}>{isIn ? '📥' : '📤'}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{tx.description}</div>
        <div style={{ fontSize:10, color:'var(--text3)' }}>{new Date(tx.createdAt).toLocaleDateString('ar')}</div>
      </div>
      <div style={{ textAlign:'left' }}>
        <div style={{ fontSize:14, fontWeight:700, color: isIn ? 'var(--green)' : 'var(--red)' }}>
          {isIn ? '+' : '-'}{tx.amount} {tx.currency === 'crystals' ? '💎' : '⭐'}
        </div>
        <div style={{ fontSize:10, color: tx.status==='completed' ? 'var(--green)' : tx.status==='pending' ? 'var(--amber)' : 'var(--text3)' }}>
          {tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'}
        </div>
      </div>
    </div>
  );
}
