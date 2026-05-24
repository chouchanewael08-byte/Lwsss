import { useState } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { StatBox } from '../shared/components.js';
import toast from 'react-hot-toast';

const AVATARS = ['👤','😎','🦁','🐯','🦊','🐺','🦅','🐉','⚡','💎','🔥','🌟','🏆','💫','🎯'];
const LEVEL_COLORS: Record<string,string> = { New:'var(--text2)', Trusted:'var(--cyan)', Verified:'var(--green)', VIP:'var(--amber)', 'High Risk':'var(--red)', Scam:'var(--red)' };

export default function ProfileTab({ user, onUserUpdate }: { user: any; onUserUpdate: (u: any) => void }) {
  const [editing, setEditing]   = useState(false);
  const [avatar, setAvatar]     = useState(user?.avatar || '👤');
  const [saving, setSaving]     = useState(false);
  const [refLink, setRefLink]   = useState('');

  async function saveAvatar() {
    setSaving(true);
    try {
      await apiPost('/user/profile', { avatar });
      onUserUpdate({ ...user, avatar });
      setEditing(false);
      toast.success('✅ تم تحديث الصورة');
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function getRefLink() {
    try {
      const me = await fetch('/api/user/me').then(r => r.json());
      const botUsername = 'YourBot'; // يمكن جلبه من الـ API
      const link = `https://t.me/${botUsername}?start=${user.telegramId}`;
      setRefLink(link);
      navigator.clipboard?.writeText(link);
      toast.success('✅ تم نسخ رابط الإحالة!');
    } catch {}
  }

  const levelColor = LEVEL_COLORS[user?.level] || 'var(--text2)';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1a0533,#001a33)', padding:'28px 20px 20px', textAlign:'center', position:'relative' }}>
        <div style={{ fontSize:56, marginBottom:8, cursor:'pointer' }} onClick={() => setEditing(true)}>{user?.avatar || '👤'}</div>
        <div style={{ fontSize:18, fontWeight:800 }}>{user?.fullName || user?.username}</div>
        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:6 }}>@{user?.username}</div>
        <div style={{ display:'inline-flex', gap:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color: levelColor, background:`${levelColor}20`, padding:'3px 10px', borderRadius:99, border:`1px solid ${levelColor}40` }}>
            {user?.level}
          </span>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--purple)', background:'rgba(139,92,246,0.2)', padding:'3px 10px', borderRadius:99 }}>
            {user?.sellerLevel}
          </span>
          {user?.role !== 'user' && (
            <span style={{ fontSize:11, fontWeight:700, color:'var(--amber)', background:'rgba(245,158,11,0.2)', padding:'3px 10px', borderRadius:99 }}>
              {user?.role}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <StatBox icon="✅" label="مبيعات"   value={user?.salesCount || 0}     color="var(--green)" />
          <StatBox icon="🛒" label="مشتريات"  value={user?.purchasesCount || 0} color="var(--cyan)" />
          <StatBox icon="📊" label="نجاح %"   value={`${user?.successRate || 100}%`} color="var(--purple)" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <StatBox icon="💎" label="كريستال"  value={user?.crystals || 0}  color="var(--purple)" />
          <StatBox icon="⭐" label="نجوم"     value={user?.stars || 0}     color="var(--amber)" />
        </div>

        {/* Referral */}
        <div className="card2" style={{ padding:14 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>🔗 برنامج الإحالة</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10 }}>شارك رابطك واربح 💎50 لكل صديق</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, fontSize:11, color:'var(--text3)', padding:'8px 10px', background:'var(--card)', borderRadius:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {refLink || 'اضغط لتوليد الرابط'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={getRefLink}>نسخ</button>
          </div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:8 }}>👥 إحالاتك: {user?.referralCount || 0}</div>
        </div>

        {/* Member since */}
        <div className="card2" style={{ padding:12, fontSize:12, color:'var(--text2)', textAlign:'center' }}>
          📅 عضو منذ: {new Date(user?.joinedAt || Date.now()).toLocaleDateString('ar')}
        </div>
      </div>

      {/* Avatar picker */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', alignItems:'flex-end' }} onClick={() => setEditing(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width:'100%', padding:20, borderRadius:'20px 20px 0 0' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>اختر صورتك</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:14 }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => setAvatar(a)} style={{ fontSize:32, padding:10, borderRadius:12, border: avatar===a ? '2px solid var(--purple)' : '2px solid transparent', background: avatar===a ? 'rgba(139,92,246,0.2)' : 'transparent', cursor:'pointer' }}>{a}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={saveAvatar} disabled={saving} style={{ width:'100%' }}>
              {saving ? '⏳...' : '✅ حفظ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
