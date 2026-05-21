import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  Menu, 
  ChevronRight, 
  TrendingUp, 
  ShieldCheck, 
  HelpCircle, 
  PlusCircle, 
  Coins, 
  Star, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { dbInstance } from '../data';
import { Product, EscrowTicket, TelegramUser, SwapRequest } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  senderName: string;
  text: string;
  time: string;
  buttons?: Array<{ text: string; action: string; payload?: string }>;
}

interface TelegramSimulatorProps {
  currentUser: TelegramUser;
  onStateChange: () => void;
  onNavigateToMiniApp: (tab: string) => void;
}

export default function TelegramSimulator({ 
  currentUser, 
  onStateChange, 
  onNavigateToMiniApp 
}: TelegramSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome messages
  useEffect(() => {
    const welcomeMsgs: Message[] = [
      {
        id: 'welcome_1',
        sender: 'bot',
        senderName: 'MarketBot 🛡️',
        text: `👋 مرحباً بك في **MarketBot** - سوق الضمان والوساطة العربي الأكبر داخل تيليجرام!

🛡️ نحن نوفر لك بيئة تجارة رقمية آمنة وموثوقة 100% بنظام الإسكرو (الوساطة الذكية). يمكنك شراء الحسابات، الاشتراكات، مفاتيح الألعاب، وتبادل السلع أو المزايدة عليها بكل ثقة.

💡 تفضل باختيار أحد الخيارات أدناه لبدء جولتك:`,
        time: '23:15',
        buttons: [
          { text: '🛒 تصفح المنتجات وشراء', action: 'cmd_browse' },
          { text: '🏪 التسجيل كبائع جديد', action: 'cmd_register_seller' },
          { text: '📦 تتبع طلباتي الحالية', action: 'cmd_my_orders' },
          { text: '💰 شحن ومراجعة محفظتي', action: 'cmd_wallet' },
          { text: '⭐ مراجعة أحدث التقييمات', action: 'cmd_reviews' },
          { text: '🆘 الدعم الفني والمساعدة', action: 'cmd_support' }
        ]
      }
    ];
    setMessages(welcomeMsgs);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (text: string, buttons?: Array<{ text: string; action: string; payload?: string }>) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: 'bot_msg_' + Date.now(),
      sender: 'bot',
      senderName: 'MarketBot 🛡️',
      text,
      time: timeStr,
      buttons
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const addUserMessage = (text: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: 'user_msg_' + Date.now(),
      sender: 'user',
      senderName: currentUser.fullName,
      text,
      time: timeStr
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    addUserMessage(userText);
    setInputValue('');

    // Process typed messages as command simulation
    setTimeout(() => {
      const lower = userText.toLowerCase().trim();
      if (lower.includes('start') || lower === 'start' || lower === '/start') {
        addBotMessage(
          `👋 مرحباً بك مجدداً في **MarketBot**!\n\nاختر من الأزرار التفاعلية لتجربة أسرع للبيع والشراء الآمن بالضمان:`,
          [
            { text: '🛒 تصفح المنتجات وشراء', action: 'cmd_browse' },
            { text: '🏪 التسجيل كبائع جديد', action: 'cmd_register_seller' },
            { text: '📦 طلباتي', action: 'cmd_my_orders' },
            { text: '💰 محفظتي', action: 'cmd_wallet' },
            { text: '⭐ التقييمات', action: 'cmd_reviews' },
            { text: '🆘 الدعم', action: 'cmd_support' }
          ]
        );
      } else if (lower.includes('شراء') || lower.includes('buy') || lower === '/buy') {
        handleButtonAction('cmd_browse');
      } else if (lower.includes('بائع') || lower.includes('seller')) {
        handleButtonAction('cmd_register_seller');
      } else if (lower.includes('محفظة') || lower.includes('wallet')) {
        handleButtonAction('cmd_wallet');
      } else if (lower.includes('دعم') || lower.includes('support')) {
        handleButtonAction('cmd_support');
      } else {
        // Custom reply incorporating Anti-Scam filter simulator
        if (userText.includes('http') || userText.includes('www.') || userText.includes('t.me/')) {
          addBotMessage(
            `🚨 **[مستشعر الحماية الذكي Anti-Scam]**\nلقد قمت بإرسال رابط خارجي! يمنع نظام الإسكرو تداول الروابط الخارجية لحمايتك من الاختراق أو إتمام صفقات خارج الضمان.\n\n⚠️ تم تسجيل هذا النشاط في مركز إدارة الأمان كتحذير. يرجى الشراء من داخل البوت فقط لضمان حقك.`
          );
          dbInstance.addSecurityAlert(
            currentUser.id,
            currentUser.username,
            'suspicious_link',
            'medium',
            `المستخدم أرسل رابط خارجي في محاكي الشات الرئيسي: "${userText}"`
          );
          onStateChange();
        } else {
          addBotMessage(
            `❓ عذراً، لم أفهم رسالتك المكتوبة بدقة أخي العزيز. \n\nيرجى استخدام لوحة الأزرار بالأسفل للتحكم السريع والآمن في عمليات الشراء، البيع، ومتابعة تذاكر النزاع والضمان بنقرة واحدة!`
          );
        }
      }
    }, 800);
  };

  const handleButtonAction = (action: string, payload?: string) => {
    // Scroll automatically
    addUserMessage(`النقرة على زر تفاعلي: [${actionTextFromAction(action, payload)}]`);

    setTimeout(() => {
      switch (action) {
        case 'cmd_browse': {
          const products = dbInstance.getProducts().filter(p => !p.isHidden);
          addBotMessage(
            `🎮 **المنتجات والحسابات المتاحة حالياً في السوق العربي:**\n\nتصفح المنتجات النشطة بالضمان واضغط شراء لبدء وساطة آمنة فورية:\n\n` +
            products.map((p, i) => `${i + 1}. **${p.title}**\n💰 السعر: ${p.price}$\n🛡️ البائع: @${p.sellerId.replace('user_seller_', '')}\n💎 طرق الدفع: ${p.acceptedPayments.join(' + ')}\n\n`).join(''),
            [
              { text: '🎮 شراء حساب فالورانت (15$)', action: 'cmd_select_prod', payload: 'prod_valorant' },
              { text: '🍿 نتفليكس بريميوم (4$)', action: 'cmd_select_prod', payload: 'prod_netflix' },
              { text: '📱 شدات ببجي (25$)', action: 'cmd_select_prod', payload: 'prod_pubg_uc' },
              { text: '✨ تفقد التطبيق المصغر (Mini App) لمزيد من التفاصيل', action: 'go_to_miniapp', payload: 'market' }
            ]
          );
          break;
        }

        case 'cmd_select_prod': {
          const prodId = payload || '';
          const prod = dbInstance.getProducts().find(p => p.id === prodId);
          if (!prod) {
            addBotMessage(`⚠️ عذراً أخي، هذا المنتج غير متوفر في الذاكرة حالياً.`);
            return;
          }
          const isSwapStr = prod.isSwapAcceptable ? '✅ نعم، يقبل التبادل Swap' : '❌ لا يقبل التبادل';
          const isNegoStr = prod.isNegotiable ? '✅ نعم، يقبل التفاوض' : '❌ السعر ثابت';
          
          addBotMessage(
            `🛒 **صفحة المنتج رقم #${prodId}**\n\n` +
            `📦 **المنتج:** ${prod.title}\n` +
            `💰 **السعر:** ${prod.price}$\n` +
            `🛡️ **البائع:** @${prod.sellerId.replace('user_seller_', '')} (مستوى التقييم: 4.9⭐)\n` +
            `🔁 **التبديل:** ${isSwapStr}\n` +
            `💬 **التفاوض:** ${isNegoStr}\n` +
            `💳 **طرق الدفع المتوفرة:** ${prod.acceptedPayments.join(' + ')}\n` +
            `📜 **الوصف:** ${prod.description}\n\n` +
            `🛡️ *بشراء المنتج، يتم حجز الأموال في حساب الضمان للمنصة، ولن يستلمها البائع حتى تقوم بالتأكيد أو يتدخل الوسيط لحل النزاع وإرجاع رصيدك في حال حدوث عطل.*`,
            [
              { text: '⚡ شراء فوري عبر الضمان', action: 'cmd_buy_confirm', payload: prodId },
              { text: '💬 تفاوض على السعر', action: 'cmd_negotiate', payload: prodId },
              { text: '🔁 طلب مبادلة (Swap)', action: 'cmd_swap_init', payload: prodId },
              { text: '🔙 العودة لقائمة المنتجات', action: 'cmd_browse' }
            ]
          );
          break;
        }

        case 'cmd_buy_confirm': {
          const prodId = payload || '';
          const prod = dbInstance.getProducts().find(p => p.id === prodId);
          if (!prod) {
            addBotMessage(`⚠️ عذراً، لم نعثر على المنتج المطلوب.`);
            return;
          }

          // Generate new ticket in db
          const tickets = dbInstance.getTickets();
          const tktId = 'tkt_' + Math.floor(100 + Math.random() * 900);
          const newTicket: EscrowTicket = {
            id: tktId,
            productId: prodId,
            productTitle: prod.title,
            price: prod.price,
            buyerId: currentUser.id,
            buyerName: currentUser.fullName,
            sellerId: prod.sellerId,
            sellerName: prod.sellerId.includes('wael') ? 'WaelStore' : 'SofianeSmm',
            status: 'waiting_payment',
            createdAt: new Date().toISOString(),
            buyerConfirmed: false,
            sellerConfirmed: false,
            messages: [
              {
                id: 'msg_1',
                senderId: 'bot',
                senderName: 'الوسيط التلقائي 🛡',
                senderRole: 'admin',
                text: `مرحباً بكما في تذكرة الوساطة المؤمنة #tktId.\nالمشتري طلب شراء: [${prod.title}]\nالسعر: ${prod.price}$ لضمان أمان مالكم.`,
                timestamp: 'الآن'
              }
            ]
          };

          // Hold funds in wallet
          const wallets = dbInstance.getWallets();
          const buyerWallet = wallets.find(w => w.userId === currentUser.id);
          if (buyerWallet) {
            if (buyerWallet.availableBalance < prod.price) {
              addBotMessage(
                `❌ **فشل الدفع الآلي لعدم وجود رصيد كافٍ!**\n\nرصيدك الحالي: **${buyerWallet.availableBalance}$**، وسعر المنتج **${prod.price}$**.\n\n💡 يرجى شحن محفظتك أولاً عبر تحويل BaridiMob أو دفع USDT، ثم إعادة المحاولة، أو اضغط زر شحن المحفظة الآن بالأسفل.`,
                [
                  { text: '💰 شحن رصيد المحفظة الآن', action: 'cmd_wallet' },
                  { text: '🍿 تصفح منتجات أرخص', action: 'cmd_browse' }
                ]
              );
              return;
            } else {
              // deduct balance
              buyerWallet.availableBalance -= prod.price;
              buyerWallet.pendingBalance += prod.price;
              // update transactions
              buyerWallet.transactions.unshift({
                id: 'tx_with_' + Date.now(),
                amount: -prod.price,
                type: 'escrow_hold',
                status: 'pending',
                description: `تعليق رصيد شراء لصفقة الضمان #${tktId}`,
                timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
                paymentMethod: 'Internal Wallet'
              });
              dbInstance.saveWallets(wallets);
            }
          }

          newTicket.status = 'waiting_delivery'; // Auto transition to paid since we cleared balance
          tickets.unshift(newTicket);
          dbInstance.saveTickets(tickets);
          
          addBotMessage(
            `✅ **تم حجز رصيد الإسكرو بنجاح!**\n\n📩 تم إنشاء تذكرة الوساطة المؤمنة برقم **#${tktId}** للسلعة "${prod.title}".\n\n💸 تم تعليق قيمة المنتج (**${prod.price}$**) في محفظة الضمان أوتوماتيكياً حتى يؤكد المشتري استلام الإكسس وسلامته.\n\n🔗 تفاصيل التذكرة متاحة الآن وتنبيه البائع قد أرسل للإفصاح عن البيانات ومراسلتك.`
          );

          onStateChange();

          setTimeout(() => {
            addBotMessage(
              `🔔 تود الانتقال لصفحة المحادثة بالـ Mini App والتحكم في إثباتات الدفع والتسليم مع البائع؟`,
              [
                { text: '💬 فتح تذاكر الشراء بالـ Mini App', action: 'go_to_miniapp', payload: 'tickets' },
                { text: '🔙 العودة للرئيسية', action: 'cmd_home' }
              ]
            );
          }, 400);
          break;
        }

        case 'cmd_negotiate': {
          addBotMessage(
            `💬 **نظام التفاوض الذكي على السعر:**\n\nالبائع يتيح تقديم عرض مالي أقل. يرجى كتابة السعر الذي تقترحه (مثال: 12$).\n\n*البوت سيقوم بإرساله كطلب معلق للبائع للموافقة أو الرفض عبر لوحته الخاصة.*`,
            [{ text: '🔙 إلغاء والرجوع لأصل السعر', action: 'cmd_browse' }]
          );
          break;
        }

        case 'cmd_swap_init': {
          addBotMessage(
            `🔁 **توليد غرفة التبادل والمقايضة Swap:**\n\nصفقة الضمان للتبادلات تمنع الطرفين من فقدان الحسابات. لتنفيذ ذلك:\n\n1. يرجى توثيق ما تملكه.\n2. إرسال الاقتراح.\n3. يقوم الوسيط بتعليق الحسابين وفحصهما يدوياً لضمان سلامة الطرفين بالكامل.\n\n❓ هل تود تصفح المقايضات المعروضة حالياً؟`,
            [
              { text: '💼 تصفح التبادلات النشطة بـ الـ Mini App', action: 'go_to_miniapp', payload: 'swap' },
              { text: '🔙 إلغاء المبادلة', action: 'cmd_browse' }
            ]
          );
          break;
        }

        case 'cmd_register_seller': {
          if (currentUser.role === 'seller' || currentUser.role === 'admin') {
            addBotMessage(
              `🏪 **أنت مسجل بالفعل كبائع وثقة داخل البوت!**\n\nتفضل بالدخول إلى لوحة التحكم الخاصة بالبائع بالضغط أدناه لمتابعة الأرباح ورفع منتجات جديدة وحسابات للبيع:`,
              [
                { text: '🏪 إدارة متجري الآن بالـ Mini App', action: 'go_to_miniapp', payload: 'sell' },
                { text: '🔙 الرجوع للرئيسية', action: 'cmd_home' }
              ]
            );
          } else {
            // Register flow simulation
            addBotMessage(
              `🏪 **التقدم للتسجيل بصفتك بائع معتمد (Seller Registry):**\n\nلإدراج منتجاتك الرقمية أو حسابات الألعاب وبيعها للعديد من المشترين، نقوم أولاً بتفقد البيانات الأساسية لحماية المستهلكين.\n\n💡 شروط البائع لدينا:\n- عمولة ثابتة 10% لكل عملية بيع لحماية الضمان الإسكرو.\n- التزام بتسليم الحسابات السليمة وعدم استرجاع الإيميلات.\n\n✍️ يرجى تسجيل متجرك الآن بالضغط أدناه للتفعيل الفوري كبائع للتجربة:`,
              [
                { text: '✅ موافقة على الشروط والتفعيل الفوري كبائع', action: 'cmd_seller_grant' },
                { text: '❌ تراجع وإلغاء', action: 'cmd_home' }
              ]
            );
          }
          break;
        }

        case 'cmd_seller_grant': {
          const users = dbInstance.getUsers();
          const target = users.find(u => u.id === currentUser.id);
          if (target) {
            target.role = 'seller';
            target.level = 'Verified';
            dbInstance.saveUsers(users);
          }
          addBotMessage(
            `🎉 **مبروك! تم تفعيل حسابك كـ [بائع موثق وبضمان] بنجاح داخل النظام!**\n\n🏪 تم إتاحة "لوحة البائع" المتطورة لك بالكامل. يمكنك الآن إضافة حسابات ألعاب، وسوشيال ميديا، ومزايدات رقمية بكل سهولة.\n\n🔗 تفضل بفتح لوحة المتجر لمشاهدة تفاصيل الإحصائيات ودعم العملاء والأرباح.`
          );
          onStateChange();
          setTimeout(() => {
            addBotMessage(
              `تود التوجه للوحة تحكم المتجر الآن لإنشاء منتج يدوياً؟`,
              [
                { text: '🏪 فتح لوحة تحكم البائع', action: 'go_to_miniapp', payload: 'sell' },
                { text: '🔙 العودة لقائمة الخيارات', action: 'cmd_home' }
              ]
            );
          }, 300);
          break;
        }

        case 'cmd_my_orders': {
          const activeTkts = dbInstance.getTickets().filter(t => t.buyerId === currentUser.id);
          if (activeTkts.length === 0) {
            addBotMessage(
              `📦 ليس لديك أي طلبات نشطة حالياً تحت حساب الإسكرو الرقمي.\n\nتصفح المعروضات وابدأ صفقتك الأولى الآمنة بالضمان:`,
              [{ text: '🛒 شراء منتج الآن', action: 'cmd_browse' }]
            );
          } else {
            addBotMessage(
              `📦 **طلباتك المشتراة تحت رعاية الضمان والوساطة:**\n\n` +
              activeTkts.map(t => `🔹 صفقة **#${t.id}** (${t.productTitle})\n💰 القيمة: ${t.price}$ | الحالة: [${translateStatus(t.status)}]\n`).join('\n') +
              `\n💡 يمكنك مراجعة المراسلات السرية وتأكيد الاستلام داخل صفحة التذاكر الفورية.`,
              [
                { text: '💬 تتبع محادثة الإسكرو بالـ Mini App', action: 'go_to_miniapp', payload: 'tickets' },
                { text: '🔙 العودة للرئيسية', action: 'cmd_home' }
              ]
            );
          }
          break;
        }

        case 'cmd_wallet': {
          const wallets = dbInstance.getWallets();
          const wallet = wallets.find(w => w.userId === currentUser.id);
          const balanceStr = wallet ? `${wallet.availableBalance}$ (معلق: ${wallet.pendingBalance}$)` : '0.00$';
          
          addBotMessage(
            `💰 **محفظتك الرقمية المتكاملة داخل البوت:**\n\n💵 **الرصيد المتاح:** ${balanceStr}\n🔑 **رقم الإحالة الخاص بك:** \`ref_dz_9941\`\n🎁 **رصيد المكافآت:** 2.5$\n\n💡 شحن المحفظة متاح لدينا بأفضل الطرق في المغرب العربي والشرق الأوسط:\n1. 🇩🇿 **تحويل BaridiMob / CCP** بالدينار الجزائري بسعر الصرف الموحد لليوم (1$ = 224 دج).\n2. 🟢 **العملات المشفرة (USDT / Binance Pay ID)** للتعبئة التلقائية.\n3. 📲 **بطاقات فليكسي Flexy** لجميع الشبكات الجزائري (Ooredoo / Djezzy / Mobilis).\n\n👇 سارع بشحن محفظتك للاستمتاع بخدمات السوق المعلق والمضمون.`,
            [
              { text: '🏧 شحن المحفظة ومحاكاة الإيداع بالـ Mini App', action: 'go_to_miniapp', payload: 'wallet' },
              { text: '🔙 رجوع للرئيسية', action: 'cmd_home' }
            ]
          );
          break;
        }

        case 'cmd_reviews': {
          addBotMessage(
            `⭐ **أحدث تقييمات بائعي المنصة في الإسكرو:**\n\n🔹 **التقييم 5/5 ⭐** - المشتري AnisDz7: "اشتريت حساب نتفلكس والوساطة كانت أوتوماتيكية ممتازة ولم يأت دقيقة حتى استلمت البريد والضمان شغال، بائع موثوق."\n\n🔹 **التقييم 4.9/5 ⭐** - المشتري DzGamer: "وائل بائع محترم وسريع الرد، أنصح بالتعامل معه."\n\n🔹 **التقييم 1/5 ⚠️** - المشتري Ramzi: "تحذير من البائع CheaterDz حاول خداعي بحساب ديسكورد تالف لكن الإدارة ردت أموالي، شكير لسرعة النزاع."`,
            [
              { text: '🏪 تصفح السوق المعتمد', action: 'cmd_browse' },
              { text: '🔙 رجوع للرئيسية', action: 'cmd_home' }
            ]
          );
          break;
        }

        case 'cmd_support': {
          addBotMessage(
            `🆘 **مركز الدعم وحماية المستهلكين والوساطة (Support Panel):**\n\nأهلاً بك أخي الكريم في الدعم الفني المباشر.\n\nهل تعاني من إحدى المشاكل التالية؟\n- مشكلة في شحن الرصيد بالبريدي موب أو الإيداع الرقمي البتكوين.\n- مشكلة في تسويات النزاع للصفقات.\n- الإبلاغ عن غش بائع أو بائع يحاول إرسال روابط كاذبة.\n\nأرسل رسالتك هنا وسنتدخل يدوياً! أو تواصل مع المشرف الرئيسي: @dz_owner`,
            [
              { text: '⚖️ تفقد وحل تذاكر النزاع النشطة', action: 'go_to_miniapp', payload: 'tickets' },
              { text: '🔙 رجوع للرئيسية', action: 'cmd_home' }
            ]
          );
          break;
        }

        case 'cmd_home': {
          addBotMessage(
            `📋 قائمة الخيارات الرئيسية المعروضة بالبوت:`,
            [
              { text: '🛒 تصفح المنتجات وشراء', action: 'cmd_browse' },
              { text: '🏪 التسجيل كبائع جديد', action: 'cmd_register_seller' },
              { text: '📦 طلباتي الحالية', action: 'cmd_my_orders' },
              { text: '💰 محفظتي والتحويلات', action: 'cmd_wallet' },
              { text: '⭐ أحدث تقييمات المستخدمين', action: 'cmd_reviews' },
              { text: '🆘 الدعم الفني والحماية', action: 'cmd_support' }
            ]
          );
          break;
        }

        case 'go_to_miniapp': {
          const tab = payload || 'market';
          addBotMessage(`🚀 جاري تشغيل التطبيق المصغر (Telegram Mini App) على قسم **[${translateTab(tab)}]** بنجاح... تم الانتقال بالصفحة المقابلة!`);
          onNavigateToMiniApp(tab);
          break;
        }

        default:
          addBotMessage(`ℹ️ الخيار ${action} قيد التطوير والمحاكاة.`);
          break;
      }
    }, 600);
  };

  const actionTextFromAction = (action: string, payload?: string): string => {
    switch (action) {
      case 'cmd_browse': return 'تصفح المنتجات';
      case 'cmd_select_prod': return `اختيار مُنتج #${payload}`;
      case 'cmd_buy_confirm': return `تأكيد شراء السلعة #${payload}`;
      case 'cmd_negotiate': return 'مفاوضة السعر';
      case 'cmd_swap_init': return 'مبادلة سلعة';
      case 'cmd_register_seller': return 'التسجيل كبائع';
      case 'cmd_seller_grant': return 'موافقة شروط المتجر';
      case 'cmd_my_orders': return 'إستظهار طلباتي';
      case 'cmd_wallet': return 'المحفظة والشحن';
      case 'cmd_reviews': return 'تقييمات المتداولين';
      case 'cmd_support': return 'الدعم الفني والوسيط';
      case 'cmd_home': return 'الرجوع للقائمة الرئيسية';
      case 'go_to_miniapp': return `تشغيل Mini App 🚀 [${translateTab(payload || '')}]`;
      default: return action;
    }
  };

  const translateTab = (tab: string) => {
    switch (tab) {
      case 'market': return 'تصفح السوق';
      case 'sell': return 'إدارة متجري';
      case 'tickets': return 'تذاكر الضمان والنزاع';
      case 'wallet': return 'المحفظة الذكية';
      case 'swap': return 'صالة المقايضة والـ Swap';
      case 'admin': return 'لوحة التحكم الإدارية';
      default: return tab;
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'waiting_payment': return 'بانتظار الدفع ⏳';
      case 'waiting_delivery': return 'بانتظار تسليم السلعة 📦';
      case 'delivered': return 'تم التسليم والمراجعة ✅';
      case 'disputed': return 'نزاع نشط ⚖️ (تحت مراقبة المشرف)';
      case 'completed': return 'مكتمل ومحرر 🎉';
      case 'refunded': return 'مسترجع بالكامل أمنياً 🔙';
      default: return status;
    }
  };

  return (
    <div id="simulated-bot-container" className="h-full flex flex-col bg-[#17212b] rounded-2xl border-2 border-slate-700/80 overflow-hidden shadow-2xl relative text-white">
      {/* Bot Chat Header */}
      <div className="bg-[#24303f] px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xl shadow font-semibold">
            🛡️
          </div>
          <div>
            <div className="font-bold flex items-center gap-1 text-slate-100">
              <span>MarketBot</span>
              <span className="bg-cyan-500 text-[10px] text-[#24303f] px-1 rounded font-bold">BOT</span>
            </div>
            <p className="text-xs text-slate-400">سوق الضمان المتكامل وساطة 24h</p>
          </div>
        </div>
        
        {/* Shortcut labels */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleButtonAction('cmd_home')} 
            className="p-1.5 hover:bg-[#2c3b4e] rounded-lg text-slate-400 hover:text-cyan-400 transition"
            title="القائمة الرئيسية للرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Security alert indicator inside Chat */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-3 py-1.5 text-xs text-yellow-300 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          <span>مفعل: نظام فحص الروابط وكشف الاحتيال الذكي للوساطة الآمنة.</span>
        </div>
        <span className="text-[10px] bg-yellow-500/20 px-1 rounded text-yellow-500">مباشر</span>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm" style={{ backgroundImage: 'radial-gradient(circle, #24303f 10%, transparent 11%)', backgroundSize: '20px 20px' }}>
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {/* Sender and Bubble wrapper */}
            <div className="max-w-[85%]">
              <span className="text-[11px] text-slate-400 px-1 mb-0.5 block">
                {m.senderName}
              </span>
              <div className={`p-3 rounded-2xl whitespace-pre-line leading-relaxed shadow-md ${
                m.sender === 'user' 
                  ? 'bg-[#183551] rounded-tr-none text-slate-200' 
                  : 'bg-[#1e2c3a] rounded-tl-none text-slate-100 border border-slate-700/40'
              }`}>
                {m.text}
                <span className="block text-right text-[10px] text-slate-400 mt-1">{m.time}</span>
              </div>
            </div>

            {/* Inline Keyboards */}
            {m.buttons && m.buttons.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-[85%] self-start" style={{ direction: 'rtl' }}>
                {m.buttons.map((btn, idx) => {
                  const isPrimary = btn.action.includes('miniapp') || btn.action.includes('confirm') || btn.action.includes('grant');
                  return (
                    <button
                      key={idx}
                      onClick={() => handleButtonAction(btn.action, btn.payload)}
                      className={`text-xs py-2 px-3 rounded-lg text-center font-medium transition cursor-pointer flex items-center justify-center gap-1 shadow-sm ${
                        isPrimary
                          ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white'
                          : 'bg-[#2b394a] hover:bg-[#34465b] text-slate-200 border border-slate-700'
                      }`}
                    >
                      {btn.text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Suggests tray */}
      <div className="px-3 py-1.5 bg-[#1a2531] border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-400 scrollbar-none" style={{ direction: 'rtl' }}>
        <span className="font-semibold text-cyan-400 whitespace-nowrap">أوامر سريعة:</span>
        <button onClick={() => { setInputValue('/start'); handleSendMessage(); }} className="bg-[#24303f] hover:bg-slate-700 px-2 py-1 rounded-full whitespace-nowrap">/start إعادة الترحيب</button>
        <button onClick={() => handleButtonAction('cmd_browse')} className="bg-[#24303f] hover:bg-slate-700 px-2 py-1 rounded-full whitespace-nowrap">🛒 تصفح السلع</button>
        <button onClick={() => handleButtonAction('cmd_wallet')} className="bg-[#24303f] hover:bg-slate-700 px-2 py-1 rounded-full whitespace-nowrap">💰 محفظتي</button>
        <button onClick={() => handleButtonAction('cmd_register_seller')} className="bg-[#24303f] hover:bg-slate-700 px-2 py-1 rounded-full whitespace-nowrap">🏪 التسجيل كبائع</button>
        <button onClick={() => handleButtonAction('cmd_support')} className="bg-[#24303f] hover:bg-slate-700 px-2 py-1 rounded-full whitespace-nowrap">🆘 طلب مساعدة</button>
      </div>

      {/* Input panel */}
      <form onSubmit={handleSendMessage} className="bg-[#24303f] p-3 border-t border-slate-700/60 flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="أكتب رسالتك أو جرب رابط احتيالي تقع بالحظر..."
          className="flex-1 bg-[#17212b] text-slate-100 placeholder-slate-400 text-sm rounded-xl px-4 py-2.5 border border-slate-700/40 focus:outline-none focus:border-cyan-500/60 text-right"
          style={{ direction: 'rtl' }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-[#17212b] disabled:text-slate-500 rounded-xl transition cursor-pointer"
        >
          <Send className="w-5 h-5 stroke-2 transform rotate-180" />
        </button>
      </form>
    </div>
  );
}
