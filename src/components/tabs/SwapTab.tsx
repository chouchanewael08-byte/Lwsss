import React, { useState, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useSwapStore } from '../../stores/useSwapStore';
import { useUserStore } from '../../stores/useUserStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { RefreshCw, MessageCircle, Check, ShieldCheck, ArrowRightLeft, Info, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SwapTab() {
  const swaps = useSwapStore(state => state.swaps);
  const addSwapRequest = useSwapStore(state => state.addSwapRequest);
  const matchSwaps = useSwapStore(state => state.matchSwaps);
  const cancelSwapRequest = useSwapStore(state => state.cancelSwapRequest);
  const completeSwapRequest = useSwapStore(state => state.completeSwapRequest);

  const currentUser = useUserStore(state => state.currentUser);
  const addNotification = useAlertStore(state => state.addNotification);
  const addSystemLog = useAlertStore(state => state.addSystemLog);

  // States
  const [newHave, setNewHave] = useState('');
  const [newWant, setNewWant] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  
  // Custom static messages list mapped to room IDs to mock live bartering chats
  const [mockRoomChats, setMockRoomChats] = useState<Record<string, { sender: string; text: string }[]>>({
    'room_demo': [
      { sender: 'الوسيط', text: 'تم إنشاء غرفة المقايضة المشتركة المضمونة! تبادلا الإيميلات وافحص كود التأمين.' },
      { sender: 'سليم', text: 'أهلاً بك أخي، أنا أملك حساب تيكتوك، وأريد حساب ألعاب فالورانت الخاص بك.' }
    ]
  });

  // Filter requests
  const pendingRequests = useMemo(() => {
    return swaps.filter(s => s.status === 'pending');
  }, [swaps]);

  const activeMatchedRequests = useMemo(() => {
    return swaps.filter(s => s.status === 'matched' && s.userId === currentUser?.id);
  }, [swaps, currentUser]);

  // Create Swap
  const handleCreateSwapSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const sanitizedHave = DOMPurify.sanitize(newHave.trim());
    const sanitizedWant = DOMPurify.sanitize(newWant.trim());

    if (!sanitizedHave || !sanitizedWant) {
      toast.error('⚠️ يرجى تحديد ما تملكه وما ترغب باستبداله بدقة!');
      return;
    }

    const newReqId = 'swp_' + Date.now().toString().slice(-4);
    addSwapRequest({
      id: newReqId,
      userId: currentUser.id,
      username: currentUser.username,
      have: sanitizedHave,
      want: sanitizedWant,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('ar-DZ')
    });

    // Notify & Log
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'محرر الصفقات',
      action: 'إدراج طلب مقايضة',
      details: `@${currentUser.username} يريد استبدال [${sanitizedHave}] بـ [${sanitizedWant}]`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setNewHave('');
    setNewWant('');
    toast.success('🔁 تم إدراج طلب المقايضة الخاص بك بنجاح! سيتم إخطارك عند تطابق الرغبات.');
  }, [currentUser, newHave, newWant, addSwapRequest, addSystemLog]);

  // Matching handler
  const handleInitiateMatch = useCallback(async (targetReqId: string) => {
    if (!currentUser) return;
    
    // Find matching request
    const targetReq = swaps.find(r => r.id === targetReqId);
    if (!targetReq) return;

    if (targetReq.userId === currentUser.id) {
      toast.error('❌ لا يمكنك مقايضة حساباتك مع نفسك!');
      return;
    }

    // Check if user has a corresponding pending swap
    let myPending = swaps.find(s => s.userId === currentUser.id && s.status === 'pending');
    let myReqId = myPending?.id;

    if (!myReqId) {
      myReqId = 'swp_my_' + Date.now().toString().slice(-4);
      await addSwapRequest({
        id: myReqId,
        userId: currentUser.id,
        username: currentUser.username,
        have: targetReq.want,
        want: targetReq.have,
        status: 'pending',
        createdAt: new Date().toLocaleDateString('ar-DZ')
      });
    }

    // Trigger Zustand store matching logic
    const roomId = await matchSwaps(targetReq.id, myReqId);

    // Seed mock chat
    setMockRoomChats(prev => ({
      ...prev,
      [roomId]: [
        { sender: 'الوسيط 🛡️', text: 'مبارك التوافق والمقايضة التلقائية! لقد انطلقت الغرفة الأمنة لفحص الحسابات وتبادل كود التحقق الثنائي.' },
        { sender: `@${currentUser.username}`, text: `مرحباً أخي @${targetReq.username}، أنا مهتم جداً بمقايضة سلعتك: ${targetReq.have}.` }
      ]
    }));

    // Notify & Log
    addNotification(targetReq.userId, '🤝 توافق ومقايضة سريعة!', `@${currentUser.username} وافق على مقايضة حساباتي ولديه الرغبات المطابقة!`, 'success');
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'خادم المقايضة',
      action: 'توافق مقايضة حسابات',
      details: `تطابق طلب @${currentUser.username} مع @${targetReq.username} برقم غرفة: ${roomId}`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setSelectedRoomId(roomId);
    toast.success('🤝 تم مطابقة الصفقة وتأسيس الغرفة الآمنة المشتركة للمفاوضات بنجاح!');
  }, [currentUser, swaps, matchSwaps, addSwapRequest, addNotification, addSystemLog]);

  // Send Swap Chat message
  const handleSendSwapChat = useCallback((e: React.FormEvent, rId: string) => {
    e.preventDefault();
    if (!chatMessage.trim() || !currentUser) return;

    const sanitizedText = DOMPurify.sanitize(chatMessage.trim());
    if (!sanitizedText) return;

    setMockRoomChats(prev => ({
      ...prev,
      [rId]: [...(prev[rId] || []), { sender: `@${currentUser.username}`, text: sanitizedText }]
    }));

    setChatMessage('');
  }, [chatMessage, currentUser]);

  return (
    <div className="space-y-6 text-right font-sans">
      
      {/* Upper informational Hero banner */}
      <div className="bg-gradient-to-r from-[#0d1527] to-[#1d1637] border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1">
          <span className="text-purple-400 font-extrabold text-xs block">🔁 بوابتك لتبديل ومقايضة الحسابات والاشتراكات مجاناً</span>
          <h2 className="text-base sm:text-lg font-black text-slate-100">قسم المقايضات التوافقي (Swap Accounts Exchange)</h2>
          <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xl">
            هل سئمت حسابك الحالي وتريد التجربة؟ يمكنك الآن مبادلة حساب فالورانت الخاص بك بحساب ببجي، أو اشتراك نتفليكس باشتراك ديسكورد نيترو دون دفع دولار واحد، تحت إشراف الوساطة الفنية لحمايتك من سحب الإيميلات.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column post a new Swap Request */}
        <div className="lg:col-span-4 bg-[#0d1627] border border-slate-800 p-4 md:p-5 rounded-2xl space-y-4">
          <h4 className="text-xs sm:text-sm font-black text-slate-100 border-b border-slate-80 pb-2 flex items-center gap-1.5 justify-end">
            <span>انشر رغبة مقايضة جديدة</span>
            <Plus className="w-4 h-4 text-purple-400" />
          </h4>

          <form onSubmit={handleCreateSwapSubmit} className="space-y-3.5 text-xs">
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">ماذا تملك حالياً (Have):</label>
              <input
                type="text"
                required
                value={newHave}
                onChange={(e) => setNewHave(e.target.value)}
                placeholder="مثلاً: حساب فالورانت لفل 80 به سكنات"
                className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-bold text-slate-200 focus:border-purple-550 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">ما الذي تطمح إليه بديله (Want):</label>
              <input
                type="text"
                required
                value={newWant}
                onChange={(e) => setNewWant(e.target.value)}
                placeholder="مثلاً: حساب ببجي الجزائر به سكن مثك"
                className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-bold text-slate-205 focus:border-purple-550 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black rounded-lg transition active:scale-95"
            >
              انشر طلب المقايضة للدليل 🔁
            </button>

          </form>
        </div>

        {/* Right Column Grid Pending & Swaps chat rooms */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active matched negotiations panels if matching room is chosen */}
          {selectedRoomId && (
            <div className="bg-[#0b1122] border-2 border-purple-500/20 rounded-2xl overflow-hidden p-4 space-y-3.5 text-right">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2 flex-wrap gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-100">غرفة محادثة الاتفاق والمقايضة الآمنة 🤝</h4>
                  <span className="text-[9px] text-purple-400 font-mono">ID: {selectedRoomId}</span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      completeSwapRequest(selectedRoomId.replace('room_', ''));
                      setSelectedRoomId(null);
                      toast.success('🎉 تم وسم وتصديق المقايضة كمكتمل وممتازة كلياً!');
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition"
                  >
                    أكملت بنجاح وحررت البيانات ✔️
                  </button>
                  <button
                    onClick={() => setSelectedRoomId(null)}
                    className="px-2.5 py-1 bg-slate-800 text-slate-400 font-bold text-[10px] rounded"
                  >
                    إغلاق المحادثة
                  </button>
                </div>
              </div>

              {/* Chat room messages logs */}
              <div className="bg-[#050811] rounded-xl p-3 h-[180px] overflow-y-auto space-y-2 text-xs">
                {(mockRoomChats[selectedRoomId] || []).map((msg, idx) => (
                  <div key={idx} className="p-2 bg-slate-900/40 rounded border border-slate-950">
                    <span className="font-extrabold pr-1 text-purple-400 block">{msg.sender}:</span>
                    <p className="text-slate-300 pt-0.5">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* chat form */}
              <form onSubmit={(e) => handleSendSwapChat(e, selectedRoomId)} className="flex gap-2.5 text-xs">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="تبادلا هنا الحسابات وتفاصيل الفحص..."
                  className="flex-1 bg-slate-950 p-2 rounded-lg border border-slate-850 text-slate-205"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-650 hover:bg-purple-500 text-white font-bold rounded-lg"
                >
                  إرسال
                </button>
              </form>
            </div>
          )}

          {/* Pending Swaps listing catalogs */}
          <span className="text-[10.5px] text-slate-400 font-bold block pb-1 border-b border-slate-900">طلبات التبديل والمقايضة المتاحة بالبوت</span>
          
          {pendingRequests.length === 0 ? (
            <div className="text-center py-16 bg-[#0c1324] border border-slate-850 rounded-xl p-6">
              <span className="text-2xl block">🤝</span>
              <h5 className="text-xs sm:text-sm font-extrabold text-slate-350">لا توجد أي طلبات مقايضة معلنة حالياً</h5>
              <p className="text-[9.5px] text-slate-500">كن سباقاً وانشر أول حساب ترغب بتبديله على اليسار!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-[#0d1627] border border-slate-850 rounded-xl p-4 flex flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-purple-400">@{req.username}</span>
                      <span className="text-slate-500">{req.createdAt}</span>
                    </div>

                    <div className="bg-[#070b16] p-2.5 rounded-lg border border-slate-900 space-y-1.5 text-xs">
                      <div>
                        <span className="text-emerald-450 font-bold">بذمتي وأملك حالياً:</span>
                        <p className="text-[#f1f5f9] font-sans font-extrabold">{req.have}</p>
                      </div>
                      <div className="border-t border-slate-905 pt-1.5">
                        <span className="text-amber-400 font-bold">أرغب بتبديله بـ:</span>
                        <p className="text-[#f1f5f9] font-sans font-extrabold">{req.want}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-850/80 flex justify-end gap-2.5">
                    {req.userId === currentUser?.id ? (
                      <button
                        onClick={() => {
                          cancelSwapRequest(req.id);
                          toast.success('✔️ تم سحب وإلغاء طلب المقايضة الخاص بك بنجاح!');
                        }}
                        className="py-1.5 px-3 bg-slate-850 hover:bg-slate-800 text-slate-400 font-bold text-[10px] rounded-lg"
                      >
                        سحب وإلغاء الطلب
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInitiateMatch(req.id)}
                        className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10.5px] rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>مبادلة وقبول فوراً 🤝</span>
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
