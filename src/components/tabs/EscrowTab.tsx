import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  pending_payment:   { label: 'انتظار الدفع',   color: 'var(--amber)',  icon: '⏳' },
  payment_confirmed: { label: 'تم الدفع',       color: 'var(--cyan)',   icon: '✅' },
  partial_revealed:  { label: 'كشف جزئي',       color: 'var(--purple)', icon: '🔓' },
  full_revealed:     { label: 'كشف كامل',       color: 'var(--green)',  icon: '🔑' },
  completed:         { label: 'مكتملة',          color: 'var(--green)',  icon: '🎉' },
  auto_completed:    { label: 'اكتملت تلقائياً', color: 'var(--green)',  icon: '🤖' },
  disputed:          { label: 'نزاع',            color: 'var(--red)',    icon: '⚠️' },
  refunded:          { label: 'مُستردّة',        color: 'var(--amber)',  icon: '↩️' },
};

export default function EscrowTab({ user }: { user: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const d = await apiGet('/tickets'); setTickets(d.tickets || d); }
    catch { toast.error('خطأ'); }
    setLoading(false);
  }

  if (loading) return <PageLoader />;

  if (selected) return <TicketDetail ticket={selected} user={user} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <div style={{ fontSize:17, fontWeight:800 }} className="grad">🔐 صفقاتي</div>
        <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{tickets.length} صفقة</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {tickets.length === 0
          ? <EmptyState icon="🤝" text="لا توجد صفقات" sub="ابدأ بشراء منتج من السوق" />
          : tickets.map(t => <TicketCard key={t._id} t={t} user={user} onClick={() => setSelected(t)} />)}
      </div>
    </div>
  );
}

function TicketCard({ t, user, onClick }: { t: any; user: any; onClick: () => void }) {
  const s = STATUS_MAP[t.status] || { label: t.status, color: 'var(--text2)', icon: '❓' };
  const isBuyer = t.buyerId === user?.telegramId;
  return (
    <div className="card fade-in" onClick={onClick} style={{ padding:14, marginBottom:10, cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{t.productTitle}</div>
          <div style={{ fontSize:11, color:'var(--text2)' }}>{isBuyer ? `🏪 ${t.sellerName}` : `🛒 ${t.buyerName}`}</div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, color: s.color, background: `${s.color}20`, padding:'3px 8px', borderRadius:99 }}>{s.icon} {s.label}</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:18, fontWeight:800, color:'var(--purple)' }}>💎{t.amount}</div>
        <div style={{ fontSize:10, color:'var(--text3)' }}>{new Date(t.createdAt).toLocaleDateString('ar')}</div>
      </div>
    </div>
  );
}

function TicketDetail({ ticket: t, user, onBack }: { ticket: any; user: any; onBack: () => void }) {
  const [ticket, setTicket]   = useState(t);
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState(false);
  const isBuyer  = ticket.buyerId === user?.telegramId;
  const isSeller = ticket.sellerId === user?.telegramId;
  const isAdmin  = ['admin','owner','moderator'].includes(user?.role);
  const s = STATUS_MAP[ticket.status] || { label: ticket.status, color: 'var(--text2)', icon: '❓' };

  async function refresh() {
    try { const d = await apiGet(`/tickets/${ticket._id}`); setTicket(d); }
    catch {}
  }

  async function action(endpoint: string, body: any = {}) {
    setLoading(true);
    try { await apiPost(`/tickets/${ticket._id}/${endpoint}`, body); await refresh(); toast.success('✅ تم'); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  async function sendMsg() {
    if (!msg.trim()) return;
    try { await apiPost(`/tickets/${ticket._id}/message`, { text: msg }); setMsg(''); await refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--purple)', fontSize:14, cursor:'pointer', marginBottom:8 }}>← رجوع</button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:15, fontWeight:700 }}>{ticket.productTitle}</div>
          <span style={{ fontSize:10, color: s.color, background: `${s.color}20`, padding:'3px 8px', borderRadius:99, fontWeight:700 }}>{s.icon} {s.label}</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {/* Info */}
        <div className="card2" style={{ padding:12, marginBottom:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div><div style={{ fontSize:10, color:'var(--text2)' }}>المبلغ</div><div style={{ fontWeight:700, color:'var(--purple)' }}>💎{ticket.amount}</div></div>
            <div><div style={{ fontSize:10, color:'var(--text2)' }}>الدفع</div><div style={{ fontWeight:600, fontSize:12 }}>{ticket.paymentMethod}</div></div>
            {isBuyer && <div><div style={{ fontSize:10, color:'var(--text2)' }}>البائع</div><div style={{ fontSize:12 }}>🏪 {ticket.sellerName}</div></div>}
            {isSeller && <div><div style={{ fontSize:10, color:'var(--text2)' }}>المشتري</div><div style={{ fontSize:12 }}>🛒 {ticket.buyerName}</div></div>}
          </div>
        </div>

        {/* Credentials */}
        {ticket.credentials && (
          <div className="card2" style={{ padding:12, marginBottom:10, border:'1px solid var(--green)' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--green)', marginBottom:8 }}>🔑 بيانات المنتج</div>
            {Object.entries(ticket.credentials).map(([k, v]) => (
              <div key={k} style={{ fontSize:12, color:'var(--text)', marginBottom:4 }}><span style={{ color:'var(--text2)' }}>{k}: </span>{String(v)}</div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
          {isSeller && ticket.status === 'payment_confirmed' && (
            <button className="btn btn-sm btn-primary" onClick={() => action('reveal-partial')} disabled={loading}>🔓 كشف جزئي</button>
          )}
          {isSeller && ['payment_confirmed','partial_revealed'].includes(ticket.status) && (
            <button className="btn btn-sm btn-green" onClick={() => action('reveal-full')} disabled={loading}>🔑 كشف كامل</button>
          )}
          {isBuyer && ['full_revealed','partial_revealed'].includes(ticket.status) && (
            <button className="btn btn-sm btn-green" onClick={() => action('confirm')} disabled={loading}>✅ تأكيد الاستلام</button>
          )}
          {['payment_confirmed','partial_revealed','full_revealed'].includes(ticket.status) && (isBuyer || isSeller) && (
            <button className="btn btn-sm btn-red" onClick={() => { const r = prompt('سبب النزاع:'); if (r) action('dispute', { reason: r }); }} disabled={loading}>⚠️ فتح نزاع</button>
          )}
        </div>

        {/* Messages */}
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:8 }}>💬 المحادثة</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {(ticket.messages || []).map((m: any, i: number) => (
            <div key={i} style={{ display:'flex', flexDirection: m.senderId === user?.telegramId ? 'row-reverse' : 'row', gap:8 }}>
              <div style={{ maxWidth:'80%', padding:'8px 12px', borderRadius:12, fontSize:12, lineHeight:1.5,
                background: m.isSystemMessage ? 'var(--card2)' : m.senderId === user?.telegramId ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : 'var(--card2)',
                color: m.isSystemMessage ? 'var(--text2)' : 'var(--text)',
                border: m.isSystemMessage ? '1px solid var(--border)' : 'none',
              }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Send message */}
      {!['completed','auto_completed','refunded'].includes(ticket.status) && (
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
          <input className="inp" placeholder="رسالة..." value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()} style={{ flex:1 }} />
          <button className="btn btn-primary btn-sm" onClick={sendMsg}>إرسال</button>
        </div>
      )}
    </div>
  );
}
