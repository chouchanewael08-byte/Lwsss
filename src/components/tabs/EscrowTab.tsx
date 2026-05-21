import React, { useState, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { EscrowTicket, DisputePriority, TicketMessage } from '../../types';
import { useTicketStore } from '../../stores/useTicketStore';
import { useUserStore } from '../../stores/useUserStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { TicketCard } from '../shared/TicketCard';
import { MessageSquare, ShieldAlert, Award, FileText, CheckCircle2, Send, Scale, AlertOctagon } from 'lucide-react';
import toast from 'react-hot-toast';

interface EscrowTabProps {
  activeTicketId: string | null;
  setActiveTicketId: (ticketId: string | null) => void;
}

export default function EscrowTab({
  activeTicketId,
  setActiveTicketId
}: EscrowTabProps) {
  const tickets = useTicketStore(state => state.tickets);
  const sendMessage = useTicketStore(state => state.sendMessage);
  const confirmTicketReceipt = useTicketStore(state => state.confirmTicketReceipt);
  const updateTicketStatus = useTicketStore(state => state.updateTicketStatus);
  const disputeTicket = useTicketStore(state => state.disputeTicket);
  const updateTicketDetails = useTicketStore(state => state.updateTicketDetails);

  const currentUser = useUserStore(state => state.currentUser);
  const users = useUserStore(state => state.users);

  const releaseEscrowFunds = useWalletStore(state => state.releaseEscrowFunds);
  const refundEscrowFunds = useWalletStore(state => state.refundEscrowFunds);

  const addNotification = useAlertStore(state => state.addNotification);
  const addSystemLog = useAlertStore(state => state.addSystemLog);
  const addAlert = useAlertStore(state => state.addAlert);

  // Local Chat / Dispute Form inputs
  const [ticketMessageInput, setTicketMessageInput] = useState('');
  const [disputeReasonInput, setDisputeReasonInput] = useState('');
  const [disputePriorityInput, setDisputePriorityInput] = useState<DisputePriority>('medium');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  // Filtered tickets based on active user role
  const filteredTickets = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
      return tickets; // Admin sees all tickets
    }
    return tickets.filter(t => t.buyerId === currentUser.id || t.sellerId === currentUser.id);
  }, [tickets, currentUser]);

  const activeTicket = useMemo(() => {
    if (!activeTicketId) return null;
    return tickets.find(t => t.id === activeTicketId) || null;
  }, [tickets, activeTicketId]);

  // Handle Receipt Confirmation
  const handleConfirmAction = useCallback(async (tkt: EscrowTicket) => {
    if (!currentUser) return;
    const isBuyer = currentUser.id === tkt.buyerId;
    const isSeller = currentUser.id === tkt.sellerId;
    const roleKey = isBuyer ? 'buyer' : 'seller';

    confirmTicketReceipt(tkt.id, roleKey);

    // Refresh updated object parameters in local memory
    const updatedBuyerConfirmed = isBuyer ? true : tkt.buyerConfirmed;
    const updatedSellerConfirmed = isSeller ? true : tkt.sellerConfirmed;

    toast.success('✔️ تم تسجيل موافقتك على الإجراء!');

    // Check if both parties confirmed
    if (updatedBuyerConfirmed && updatedSellerConfirmed) {
      // Automatic release algorithm
      const fee = tkt.price * 0.10; // 10% Platform fee
      
      // Update store ticket status
      updateTicketDetails(tkt.id, {
        status: 'completed',
        buyerConfirmed: true,
        sellerConfirmed: true
      });

      // Transfer money atomically via store
      if (tkt.price > 0) {
        await releaseEscrowFunds(
          tkt.buyerId,
          tkt.sellerId,
          tkt.price,
          fee,
          `أرباح مبيعة السلعة رقمية #${tkt.productId} بعد خصم عمولتنا`
        );
      }

      // Notify and log
      addNotification(tkt.sellerId, '🎉 تم تصفية رصيد الصفقة', `تم تسوية الطلب #${tkt.id} وإيداع ${tkt.price - fee}$ بمحفظتك بعد تأكيد المشتري!`, 'success');
      addNotification(tkt.buyerId, '✔️ اكتمل الطلب والضمان المالي', `شكراً لك! تم الإفراج المالي الآمن للبائع وتقييم الصفقة بنجاح.`, 'success');
      
      addSystemLog({
        id: 'log_' + Date.now(),
        adminId: 'system',
        adminName: 'الوسيط',
        action: 'تسوية تلقائية ناجحة',
        details: `اكتملت الصفقة #${tkt.id} وتأكيد الطرفين. عمولة: ${fee}$، تحويل للبائع: ${tkt.price - fee}$`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });

      toast.success('🎉 تهانينا! تمت المصادقة وتسوية المحافظ المالية وإيداع الأرباح تلقائياً بالكامل.');
    } else {
      // Notify other user to confirm
      const otherUserId = isBuyer ? tkt.sellerId : tkt.buyerId;
      addNotification(
        otherUserId, 
        '⏳ بانتظار تأكيد استلام خط الوساطة', 
        `قام الطرف الآخر بتأكيد الصفقة #${tkt.id}. يرجى تأكيد استلامك في أقرب وقت لتحرير الأموال.`, 
        'info'
      );
    }
  }, [currentUser, confirmTicketReceipt, updateTicketStatus, releaseEscrowFunds, addNotification, addSystemLog, updateTicketDetails]);

  // Handle Dispute Filing
  const handleRaiseDisputeSubmit = useCallback((e: React.FormEvent, tkt: EscrowTicket) => {
    e.preventDefault();
    if (!currentUser) return;

    const sanitizedReason = DOMPurify.sanitize(disputeReasonInput.trim());
    if (!sanitizedReason) {
      toast.error('⚠️ يرجى تفصيل سبب وجذور هذا النزاع الرقمي!');
      return;
    }

    disputeTicket(tkt.id, sanitizedReason, disputePriorityInput);

    // Append automated message
    sendMessage(tkt.id, {
      id: 'msg_bot_disp_' + Date.now(),
      senderId: 'bot',
      senderName: 'الوسيط التلقائي 🛡',
      senderRole: 'admin',
      text: `⚠️ تنبيه: تم تأسيس نزاع رسمي ومصادقة الطلب للتحكيم القضائي. دخل العضو في قائمة النزاعات المستعجلة تحت سبب: "${sanitizedReason}". سيقوم المشرف الإداري بفحص الإيميلات والتحقق من التسوية.`,
      timestamp: 'الآن'
    });

    // Send safety logs
    addNotification(tkt.sellerId, '⚠️ نزاع نشط لطلب معلق', `المشتري @${currentUser.username} قام بفتح نزاع رسمي على التذكرة #${tkt.id}! لن يتم تحرير المال إلا بمعرفة الإشراف.`, 'warning');
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'مستشعر النزاع',
      action: 'فتح نزاع ضمان رسمي',
      details: `@${currentUser.username} احتج على الصفقة #${tkt.id} (أولوية: ${disputePriorityInput})`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    setDisputeReasonInput('');
    setShowDisputeForm(false);
    toast.success('🚨 تم رفع النزاع لخط الرقابة والتحكيم بنجاح! سيتم فحص الدردشة وصور التسليم في غضون دقائق.');
  }, [currentUser, disputeReasonInput, disputePriorityInput, disputeTicket, sendMessage, addNotification, addSystemLog]);

  // Send message chat handler
  const handleSendMessageSubmit = useCallback((e: React.FormEvent, tktId: string) => {
    e.preventDefault();
    if (!currentUser || !ticketMessageInput.trim()) return;

    const text = DOMPurify.sanitize(ticketMessageInput.trim());
    const isUrl = text.includes('http') || text.includes('www.') || text.includes('t.me/');
    
    if (isUrl) {
      toast.error('⚠️ يمنع إرسال روابط خارجية لحماية الحسابات من النصب!');
      
      // Register Security Alert
      addAlert({
        id: 'alt_' + Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        type: 'suspicious_link',
        severity: 'critical',
        details: `أرسل رابطاً مشبوهاً داخل صفقة النزاع للضمان: "${text}"`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
        status: 'new'
      });

      addSystemLog({
        id: 'log_' + Date.now(),
        adminId: 'system',
        adminName: 'مستشعر الرابط المشبوه',
        action: 'تنبيه أمني عاجل',
        details: `@${currentUser.username} حاول إرسال رابط مشبوه في التذكرة: ${tktId}`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });

      return;
    }

    sendMessage(tktId, {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role === 'admin' ? 'admin' : (currentUser.id === activeTicket?.buyerId ? 'buyer' : 'seller'),
      text,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
    });

    // Notify other party
    if (activeTicket) {
      const otherUserId = currentUser.id === activeTicket.buyerId ? activeTicket.sellerId : activeTicket.buyerId;
      addNotification(otherUserId, '💬 رسالة جديدة بالوساطة', `أرسل لك الطرف الآخر رسالة في التذكرة #${tktId}`, 'info');
    }

    setTicketMessageInput('');
  }, [currentUser, ticketMessageInput, activeTicket, sendMessage, addAlert, addSystemLog, addNotification]);

  // Admin Dispute Resolutions
  const handleAdminResolveAction = useCallback(async (decision: 'p_release' | 'p_refund' | 'p_split') => {
    if (!activeTicket || !currentUser) return;

    const tkt = activeTicket;
    const fee = tkt.price * 0.10;
    const sellerNet = tkt.price - fee;

    if (decision === 'p_release') {
      // Release funds to seller
      updateTicketDetails(tkt.id, { status: 'completed' });
      
      if (tkt.price > 0) {
        await releaseEscrowFunds(tkt.buyerId, tkt.sellerId, tkt.price, fee, `تحرير ضمان صفقة النزاع #${tkt.id} لصالحك بقرار الإدارة`);
      }

      addNotification(tkt.sellerId, '⚖️ قرار تحكيم: تم استلام المستحقات', `درس المشرف النزاع وقرر تحرير كامل أموال الصفقة #${tkt.id} لحسابك برصيد ${sellerNet}$.`, 'success');
      addNotification(tkt.buyerId, '⚖️ قرار تحكيم: تم تحرير الأموال', `صفقة النزاع #${tkt.id} تم تسويتها وإرسال المستحقات للبائع بقرار الإشراف.`, 'info');
      
      addSystemLog({
        id: 'log_' + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.fullName,
        action: 'تصفية نزاع وتحرير مالي',
        details: `التحكيم اليدوي أنهى النزاع #${tkt.id} بالإفراج للبائع. الرسوم المستقطعة: ${fee}$`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });

    } else if (decision === 'p_refund') {
      // Refund back to buyer
      updateTicketDetails(tkt.id, { status: 'refunded' });

      if (tkt.price > 0) {
        await refundEscrowFunds(tkt.buyerId, tkt.price, `إرجاع قيمة صفقة النزاع #${tkt.id} بالكامل لعدم مطابقة الشروط`);
      }

      addNotification(tkt.buyerId, '⚖️ قرار تحكيم: تم سحب الرصيد واسترجاعه لك', `انتهى فحص النزاع للطلب #${tkt.id} على أنه نصب من البائع وتأكيد استرجاع كامل المستحقات ${tkt.price}$ لمحفظتك.`, 'success');
      addNotification(tkt.sellerId, '⚖️ قرار تحكيم: تم إلغاء الصفقة واسترجاع الودائع', `درس المشرف النزاع للطلب #${tkt.id} وقرر إلغاء المعاملة واسترداد المال للمشتري لعدم الإلتزام.`, 'error');

      addSystemLog({
        id: 'log_' + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.fullName,
        action: 'تصفية نزاع وإلغاء صفقة',
        details: `التحكيم قرر استرجاع مبالغ الصفقة #${tkt.id} للمشتري بالكامل`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });

    } else if (decision === 'p_split') {
      // Split 50/50
      const splitAmount = tkt.price / 2;
      const splitFee = splitAmount * 0.10;
      const finalSellerNet = splitAmount - splitFee;

      updateTicketDetails(tkt.id, { status: 'completed' });

      if (tkt.price > 0) {
        // refund half to buyer, release other half to seller
        await refundEscrowFunds(tkt.buyerId, splitAmount, `استرجاع نصف القيمة الموزعة للنزاع #${tkt.id}`);
        await releaseEscrowFunds(tkt.buyerId, tkt.sellerId, splitAmount, splitFee, `تحرير نصف قيمة الصفقة #${tkt.id} بعد خصم عمولتنا بقرار الإدارة التوافق`);
      }

      addNotification(tkt.buyerId, '⚖️ قرار تحكيم: تناصف توافقي', `تم تسوية الطلب #${tkt.id} بتوزيع معادل 50٪ وإرجاع نصف الرصيد ${splitAmount}$ لمحفظتك بقرار الإدارة.`, 'success');
      addNotification(tkt.sellerId, '⚖️ قرار تحكيم: تناصف توافقي', `تم تسوية النزاع للطلب #${tkt.id} بتوزيع معادل 50٪ وإضافة الرصيد ${finalSellerNet}$ لمحفظتك بقرار الإدارة.`, 'success');

      addSystemLog({
        id: 'log_' + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.fullName,
        action: 'تصفية نزاع توافقي (تناصف)',
        details: `التحكيم قرر توزيع معادل الصفقة #${tkt.id} مناصفة بين الطرفين.`,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });
    }

    toast.success('⚖️ تم إنهاء النزاع وتسوية الأوعية المالية وحفظ خطة التحكيم يدوياً بنجاح.');
  }, [activeTicket, currentUser, updateTicketDetails, releaseEscrowFunds, refundEscrowFunds, addNotification, addSystemLog]);

  return (
    <div className="space-y-5 text-right font-sans">
      
      {/* Visual Header Escrow line */}
      <div className="bg-[#0b1122] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>صندوق محادثات الضمان وساطة الجزائر (SkyEscrow)</span>
          </h3>
          <p className="text-[10.5px] text-slate-400">
            تواصل مع البائع داخل الخط، لا تشارك حساباتك خارج البوت مطلقاً. الإدارة حاضرة وتراقب النزاعات المشبوهة بدقة.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left column Tickets List cards */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-[10.5px] text-slate-400 font-bold block pb-1 border-b border-slate-900">قائمة تذاكر صفقات الشراء والضمان المفتوحة ({filteredTickets.length})</span>
          
          {filteredTickets.length === 0 ? (
            <div className="bg-[#0d1627] text-center py-16 rounded-2xl border border-slate-850 p-6 space-y-2">
              <span className="text-2xl block">🕵️‍♂️</span>
              <h5 className="text-xs sm:text-sm font-extrabold text-slate-350">أنت لا تشارك بأي صفقات نشطة حالياً</h5>
              <p className="text-[10px] text-slate-500">اختر السلعة من المتجر بتبويب الرئيسي واشترِ بالدولار أو بالنقاط لتأسيس الضمان التلقائي.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-0.5">
              {filteredTickets.map(tkt => (
                <TicketCard
                  key={tkt.id}
                  ticket={tkt}
                  activeTicketId={activeTicketId}
                  onSelectTicket={setActiveTicketId}
                  currentUserRole={currentUser?.role || 'buyer'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column Selected Ticket Chat Panel */}
        <div className="lg:col-span-8">
          {activeTicket ? (
            <div className="bg-[#0d1627] border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[640px] text-right">
              
              {/* Chat Header line stats */}
              <div className="bg-slate-950/80 p-4 border-b border-slate-900 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="font-extrabold text-[#f1f5f9] text-xs sm:text-sm">{activeTicket.productTitle}</h4>
                  <span className="text-[9.5px] text-indigo-400 font-mono">معرف التذكرة: #{activeTicket.id}</span>
                </div>

                <div className="flex gap-2">
                  <span className="bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-bold px-2 py-1 rounded-lg">
                    قيمة الضمان: ${activeTicket.price}
                  </span>
                </div>
              </div>

              {/* Chat message listings screen */}
              <div className="p-4 space-y-3 overflow-y-auto h-[320px] bg-[#070b16]">
                {activeTicket.messages.length === 0 ? (
                  <p className="text-center text-[10.5px] text-slate-500 py-10">تبادلوا التحية وباشروا تسليم بيانات السلعة بأمان هنا.</p>
                ) : (
                  activeTicket.messages.map(msg => {
                    const isBot = msg.senderId === 'bot';
                    const isCurrentUser = msg.senderId === currentUser?.id;

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] ${
                          isBot ? 'mx-auto w-full text-center bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl' :
                          isCurrentUser ? 'mr-auto text-right' : 'ml-auto text-right'
                        }`}
                      >
                        {!isBot && (
                          <div className="flex items-center gap-1 mb-0.5 font-bold text-[9.5px]">
                            <span className={isCurrentUser ? 'text-indigo-400' : 'text-emerald-450'}>
                              {msg.senderName}
                            </span>
                            <span className="text-[8.5px] text-slate-500">
                              ({msg.senderRole === 'buyer' ? 'مشتري' : 'بائع'}) - {msg.timestamp}
                            </span>
                          </div>
                        )}
                        <div className={`p-2.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
                          isBot ? 'text-indigo-150 text-right' :
                          isCurrentUser 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-slate-900 text-slate-100 border border-slate-850 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Actions based on State of the active ticket */}
              {activeTicket.status === 'completed' || activeTicket.status === 'refunded' ? (
                <div className="bg-slate-950/40 p-4 border-t border-slate-900 text-center py-6 text-xs text-slate-400 font-bold">
                  🔒 تم إقفال تذكرة الوساطة هذه بالكامل ونقل الرصيد وتسجيل خطة الضمان في خوادم SkyMarket بنجاح.
                </div>
              ) : (
                <div className="p-4 bg-slate-950/50 border-t border-slate-900 space-y-4">
                  
                  {/* Chat Input message form */}
                  <form onSubmit={(e) => handleSendMessageSubmit(e, activeTicket.id)} className="flex gap-2">
                    <input
                      type="text"
                      value={ticketMessageInput}
                      onChange={(e) => setTicketMessageInput(e.target.value)}
                      placeholder="اكتب رسالة للبائع هنا (احذر إرسال الروابط أو الأرقام)..."
                      className="flex-1 bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-505"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-indigo-650 hover:bg-indigo-500 rounded-xl text-white transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Operational controls (Receipt release or raise dispute) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    
                    {/* Buyer confirmations */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleConfirmAction(activeTicket)}
                        className={`py-1.5 px-3.5 rounded-lg text-[10.5px] font-black cursor-pointer transition flex items-center gap-1.5 ${
                          (currentUser?.id === activeTicket.buyerId && activeTicket.buyerConfirmed) ||
                          (currentUser?.id === activeTicket.sellerId && activeTicket.sellerConfirmed)
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-520 text-white shadow-lg shadow-emerald-950/10'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {(currentUser?.id === activeTicket.buyerId && activeTicket.buyerConfirmed) ||
                          (currentUser?.id === activeTicket.sellerId && activeTicket.sellerConfirmed)
                            ? 'تم تأكيد موافقتك على التسليم ✔️'
                            : 'تأكيد التسليم وتحرير الأموال 🤝'}
                        </span>
                      </button>

                      {currentUser?.id === activeTicket.buyerId && activeTicket.status !== 'disputed' && (
                        <button
                          onClick={() => setShowDisputeForm(!showDisputeForm)}
                          className="py-1.5 px-3.5 bg-slate-900 hover:bg-rose-950/20 text-rose-400 border border-slate-80 w-hover:border-rose-905 rounded-lg text-[10.5px] font-bold cursor-pointer transition flex items-center gap-1"
                        >
                          <AlertOctagon className="w-4 h-4 text-rose-400" />
                          <span>تقديم اعتراض / نزاع رسمي 🚨</span>
                        </button>
                      )}
                    </div>

                    {/* Admin judicial resolution parameters */}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 w-full text-right mt-1.5">
                        <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5" />
                          <span>الملك التحكم التحكيمي لأعضاء الإدارة:</span>
                        </span>
                        
                        <div className="grid grid-cols-3 gap-2 text-[9.5px]">
                          <button
                            onClick={() => handleAdminResolveAction('p_release')}
                            className="py-1.5 bg-gradient-to-r from-emerald-605 to-emerald-500 hover:brightness-110 text-white font-extrabold rounded-lg cursor-pointer"
                          >
                            تحرير بالكامل للبائع ⚖️
                          </button>
                          
                          <button
                            onClick={() => handleAdminResolveAction('p_refund')}
                            className="py-1.5 bg-gradient-to-r from-rose-605 to-rose-500 hover:brightness-110 text-white font-extrabold rounded-lg cursor-pointer"
                          >
                            استرجاع بالكامل للمشتري ↩️
                          </button>

                          <button
                            onClick={() => handleAdminResolveAction('p_split')}
                            className="py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-extrabold rounded-lg cursor-pointer border border-slate-800"
                          >
                            تناصف وتقسيم 50/50 🤝
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* Dispute form modal slide if toggled by buyer */}
              {showDisputeForm && (
                <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3 font-sans">
                  <h4 className="text-xs font-black text-rose-450">تأسيس شكوى واعتراض نزاع للإدارة:</h4>
                  <form onSubmit={(e) => handleRaiseDisputeSubmit(e, activeTicket)} className="space-y-2.5 text-xs">
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block font-bold">الأولوية من حيث الضرر:</label>
                      <select
                        value={disputePriorityInput}
                        onChange={(e) => setDisputePriorityInput(e.target.value as DisputePriority)}
                        className="w-full bg-[#070b16] text-slate-300 p-2 rounded-lg border border-slate-850"
                      >
                        <option value="low">منخفض (لم يتواصل البائع مجيباً)</option>
                        <option value="medium">متوسط (بيانات الحساب خاطئة بحاجة للتعديل)</option>
                        <option value="high">مرتفع للغاية وجسيم (سرقة إيميل، نصب، تبديل بيانات مستعجلة)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block font-bold">تفاصيل الشكوى (ماذا حدث للسلعة؟):</label>
                      <textarea
                        required
                        value={disputeReasonInput}
                        onChange={(e) => setDisputeReasonInput(e.target.value)}
                        placeholder="اكتب بالتفصيل المشكلة، مثل: البائع سلمني كلمة مرور خاطئة ولا يستجيب بالدردشة..."
                        className="w-full bg-[#070b16] text-slate-200 p-2 rounded-lg border border-slate-850 focus:outline-none"
                        rows={2.5}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="submit"
                        className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg cursor-pointer transition"
                      >
                        إرسال لغرفة المعاينة والتحكيم
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisputeForm(false)}
                        className="py-1.5 px-4 bg-slate-850 text-slate-400 rounded-lg cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>

                  </form>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-[#0c1221] border border-slate-850 h-[380px] rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-2">
              <span className="text-3xl block">🛡️</span>
              <h5 className="text-xs sm:text-sm font-extrabold text-[#f1f5f9]">تفاصيل وغرفة مفاوضات الإسكرو والضمان</h5>
              <p className="text-[10px] text-slate-505 max-w-sm">
                يرجى اختيار تذكرة من السلسلة على اليمين للوصول إلى غرفة المحادثات الآمنة مع الطرف الآخر ومباشرة تسليم المنتجات الرقمية تحت غطاء التحكيم.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
