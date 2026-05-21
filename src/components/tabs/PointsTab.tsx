import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useUserStore } from '../../stores/useUserStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { Award, CheckSquare, Sparkles, RefreshCw, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

interface PointTask {
  id: string;
  title: string;
  points: number;
  icon: string;
  description: string;
}

const POINT_TASKS: PointTask[] = [
  {
    id: 'tg_channel',
    title: 'الاشتراك بالقناة الرسمية للبوت 📢',
    points: 100,
    icon: '📣',
    description: 'اشترك في قناة التنبيهات الرسمية لدينا لتصلك مبيعات حسابات ببجي وفالورانت اليومية.'
  },
  {
    id: 'invite_friends',
    title: 'مشاركة رابط عروض السوق في المجموعات 🚀',
    points: 250,
    icon: '👥',
    description: 'ادعُ 3 من أصدقائك عبر رابط الإحالة الخاص بك وتلقى هدايا عمولات النشاط مجاناً.'
  },
  {
    id: 'rate_escrow',
    title: 'تقييم تجربة الإسكرو بـ 5 نجوم ⭐',
    points: 150,
    icon: '⭐',
    description: 'قيّم سرعة تسوية تذكرة الضمان المالي لمكافأة فريق التطوير والدفاع الفني.'
  },
  {
    id: 'react_posts',
    title: 'وضع ريأكشن على منشورات البائعين 🔥',
    points: 80,
    icon: '🔥',
    description: 'اختر 5 منشورات لسلع من اختيارك بالسوق وضع ريأكشن داعم لإبقائها نشطة.'
  },
  {
    id: 'watch_ad',
    title: 'مشاهدة الإعلان القصير لدعم البوت 📺',
    points: 300,
    icon: '📺',
    description: 'شاهد لقطة إعلانية ممولة سريعة لتوفير خوادم البوت واستمراره مجانياً.'
  }
];

export default function PointsTab() {
  const currentUser = useUserStore(state => state.currentUser);
  const updateUserPoints = useUserStore(state => state.updateUserPoints);
  const addNotification = useAlertStore(state => state.addNotification);
  const addSystemLog = useAlertStore(state => state.addSystemLog);

  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [activeVerifyingTaskId, setActiveVerifyingTaskId] = useState<string | null>(null);

  // Initialize completed tasks from CloudStorage / localStorage fallback
  useEffect(() => {
    const loadCompletedTasksState = async () => {
      try {
        const raw = localStorage.getItem('tg_completed_tasks_refined');
        if (raw) setCompletedTasks(JSON.parse(raw));
      } catch (e) {
        setCompletedTasks([]);
      }
    };
    loadCompletedTasksState();
  }, []);

  // Use Telegram WebApp haptic impact if available
  const triggerHaptic = useCallback(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      try {
        tg.HapticFeedback.notificationOccurred('success');
      } catch (e) {
        console.log('Haptic feedback not supported in browser environment');
      }
    }
  }, []);

  const handleVerifyTask = useCallback((task: PointTask) => {
    if (!currentUser) return;
    
    setActiveVerifyingTaskId(task.id);
    triggerHaptic();

    // Simulated task verification with delay
    setTimeout(() => {
      const updated = [...completedTasks, task.id];
      setCompletedTasks(updated);
      localStorage.setItem('tg_completed_tasks_refined', JSON.stringify(updated));

      // Award points
      updateUserPoints(currentUser.id, task.points);

      // System notification & logs
      addNotification(currentUser.id, '🎯 اكتمال مهمة مكافئة بونص نقاط', `لقد ربحت +${task.points} نقطة نشاط لإكمال مهمة: ${task.title}`, 'success');
      
      addSystemLog({
        id: 'log_' + Date.now(),
        adminId: 'system',
        adminName: 'محرر البوت',
        action: 'توزيع بونص نقاط',
        details: `@${currentUser.username} ربح +${task.points} نقطة لمهمة شحن تفاعلية`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });

      setActiveVerifyingTaskId(null);
      toast.success(`🎉 مبارك! تم التحقق بنجاح وإضافة +${task.points} من نقاط النشاط لحسابك.`);
    }, 1800);
  }, [currentUser, completedTasks, updateUserPoints, addNotification, addSystemLog, triggerHaptic]);

  return (
    <div className="space-y-6 text-right font-sans">
      
      {/* Upper header summary */}
      <div className="bg-gradient-to-r from-[#0d1527] to-[#142345] border border-amber-500/10 rounded-2xl p-5 text-right relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-550/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 z-10 relative">
          <div className="space-y-1">
            <span className="text-amber-400 font-extrabold text-xs block">🎯 مركز كسب الولاء والـ Loyalty Points المكافآت</span>
            <h3 className="text-sm sm:text-base font-black text-slate-100">أكمل مهام البوت اليومية واحصل على سلع مجاناً!</h3>
            <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xl">
              ساعدنا على ريأكشن عروض المبيعات أو مشاركة البوت في قنواتك، وسنهديك نقاط نشاط قابلة كلياً للاستبدال الفوري بالنتفليكس والسلع الأخرى بمتجرنا بدلاً من الكاش.
            </p>
          </div>
          
          <div className="bg-[#070b16] border border-slate-800 px-4 py-2 bg-slate-950/60 rounded-xl text-center min-w-[130px] shrink-0">
            <span className="text-[8.5px] text-slate-400 block font-bold mb-0.5">رصيدك الحالي من نقاط النشاط</span>
            <div className="text-xl font-mono font-black text-amber-400 flex items-center justify-center gap-1">
              <span>{currentUser?.points || 0}</span>
              <span className="text-sm">⭐</span>
            </div>
            <span className="text-[8.5px] text-slate-500 block">قابلة للاستبدال الفوري</span>
          </div>
        </div>
      </div>

      {/* Point tasks grid lists */}
      <div className="space-y-3.5">
        <span className="text-[10.5px] text-slate-400 font-bold block pb-1 border-b border-slate-900">المهام اليومية والأبواب النشطة</span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {POINT_TASKS.map(task => {
            const isCompleted = completedTasks.includes(task.id);
            const isVerifying = activeVerifyingTaskId === task.id;

            return (
              <div key={task.id} className="bg-[#0d1627] border border-slate-850 hover:border-slate-800 p-4 rounded-xl flex items-start gap-3.5 transition">
                <span className="text-2xl p-2.5 bg-[#070b16] rounded-xl shrink-0">{task.icon}</span>
                
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-extrabold text-[#f1f5f9] text-xs sm:text-sm truncate">{task.title}</h4>
                    <span className="bg-amber-500/10 text-amber-400 font-mono text-[9px] font-black px-2 py-0.5 rounded border border-amber-500/25">
                      +{task.points} نقطة
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 leading-relaxed">{task.description}</p>
                  
                  <div className="pt-2 border-t border-slate-905 flex justify-end">
                    {isCompleted ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 px-3 py-1 border border-emerald-900/50 rounded-lg">
                        ✔️ تم مطابقة الإجراء وصرف النقاط
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVerifyTask(task)}
                        disabled={isVerifying}
                        className={`text-[9.5px] font-black px-3.5 py-1.5 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                          isVerifying 
                            ? 'bg-slate-800 text-slate-500' 
                            : 'bg-indigo-600 hover:bg-indigo-520 text-white shadow-md'
                        }`}
                      >
                        {isVerifying && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isVerifying ? 'جاري التحقق...' : 'انطلق وأكمل المهمة 🚀'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
