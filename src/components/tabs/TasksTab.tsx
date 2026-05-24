import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api.js';
import { PageLoader, EmptyState } from '../shared/components.js';
import toast from 'react-hot-toast';

export default function TasksTab({ user, onUserUpdate }: { user: any; onUserUpdate: (u: any) => void }) {
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doing, setDoing]     = useState<string|null>(null);

  useEffect(() => { apiGet('/tasks').then(setTasks).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function complete(task: any) {
    if (task.completed || doing) return;
    setDoing(task._id);
    if (task.type === 'channel_join' && task.link) {
      window.open(task.link, '_blank');
      toast('📲 اشترك أولاً ثم سنتحقق', { icon: 'ℹ️', duration: 4000 });
      await new Promise(r => setTimeout(r, 5000));
    }
    try {
      const d = await apiPost(`/tasks/${task._id}/complete`, {});
      toast.success(`⭐ +${task.starsReward} نجمة!`);
      onUserUpdate({ ...user, stars: d.totalStars });
      setTasks(ts => ts.map(t => t._id === task._id ? { ...t, completed: true } : t));
    } catch (e: any) { toast.error(e.message); }
    setDoing(null);
  }

  if (loading) return <PageLoader />;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="tab-header">
        <div style={{ fontSize:17, fontWeight:800, marginBottom:4 }} className="grad">🎯 المهام والنقاط</div>
        <div style={{ display:'flex', gap:12 }}>
          <span style={{ fontSize:13, color:'var(--amber)' }}>⭐ {user?.stars || 0} نجمة</span>
          <span style={{ fontSize:13, color:'var(--text2)' }}>|  {tasks.filter(t=>t.completed).length}/{tasks.length} مكتملة</span>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {tasks.length === 0
          ? <EmptyState icon="🎯" text="لا توجد مهام" />
          : tasks.map(t => (
            <div key={t._id} className="card fade-in" style={{ padding:14, marginBottom:10, opacity: t.completed ? 0.6 : 1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:28 }}>{t.icon || '🎯'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{t.title}</div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{t.description}</div>
                  <div style={{ fontSize:12, color:'var(--amber)', marginTop:4 }}>⭐ +{t.starsReward}</div>
                </div>
                <button onClick={() => complete(t)} disabled={t.completed || doing === t._id}
                  className={`btn btn-sm ${t.completed ? 'btn-secondary' : 'btn-primary'}`}>
                  {t.completed ? '✅ مكتمل' : doing === t._id ? '⏳...' : 'تنفيذ'}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
