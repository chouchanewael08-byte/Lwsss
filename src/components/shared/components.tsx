import { useState, useRef, useEffect } from 'react';
import { Camera, X, ImagePlus, Send, ShieldCheck, Eye } from 'lucide-react';
import { apiPost } from '../../lib/api.js';
import toast from 'react-hot-toast';

// ─── ImageUploader ────────────────────────────────────

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  onNewFiles: (files: File[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, onChange, onNewFiles, maxImages = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, maxImages - images.length - previews.length);
    onNewFiles(arr);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removePreview(i: number) { setPreviews(p => p.filter((_, j) => j !== i)); }
  function removeExisting(i: number) { onChange(images.filter((_, j) => j !== i)); }

  const total = images.length + previews.length;

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-2">
        {images.map((img, i) => (
          <div key={i} className="relative w-20 h-20">
            <img src={img} className="w-full h-full object-cover rounded-xl" />
            <button onClick={() => removeExisting(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <X size={10} className="text-white" />
            </button>
          </div>
        ))}
        {previews.map((src, i) => (
          <div key={`p${i}`} className="relative w-20 h-20">
            <img src={src} className="w-full h-full object-cover rounded-xl opacity-70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <button onClick={() => removePreview(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <X size={10} className="text-white" />
            </button>
          </div>
        ))}
        {total < maxImages && (
          <button onClick={() => inputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition-colors">
            <ImagePlus size={20} className="text-slate-400" />
            <span className="text-xs text-slate-400">إضافة</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <p className="text-xs text-slate-500">📸 الصور من هاتفك مباشرة • حد أقصى {maxImages} صور • 5MB لكل صورة</p>
    </div>
  );
}

// ─── ChatWindow.tsx ───────────────────────────────────────

interface ChatMsg { senderId: string; senderName: string; text: string; isSystem: boolean; timestamp: string | Date; }

interface ChatWindowProps {
  chatId: string;
  messages: ChatMsg[];
  myId: string;
  onNewMessage: (msg: ChatMsg) => void;
  onDeal?: (price: number) => void;
  productPrice?: number;
}

export function ChatWindow({ chatId, messages, myId, onNewMessage, onDeal, productPrice }: ChatWindowProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { message } = await apiPost(`/chat/${chatId}/message`, { text });
      onNewMessage(message);
      setText('');
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
        <ShieldCheck size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-400">محادثة محمية • لا يسمح بمشاركة روابط خارجية</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollable">
        {messages.map((m, i) => {
          if (m.isSystem) return (
            <div key={i} className="text-center">
              <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full">{m.text}</span>
            </div>
          );
          const isMe = m.senderId === myId;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-slate-700 text-slate-100 rounded-bl-sm'}`}>
                {!isMe && <div className="text-xs text-slate-400 mb-1">{m.senderName}</div>}
                <p className="leading-relaxed">{m.text}</p>
                <div className="text-[10px] opacity-60 mt-1 text-left">
                  {new Date(m.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
            placeholder="اكتب رسالة..." rows={1}
            className="input-field resize-none text-sm flex-1" style={{ minHeight: 44 }} />
          <button onClick={send} disabled={!text.trim() || sending}
            className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50">
            <Send size={18} className="text-white" />
          </button>
        </div>
        {onDeal && productPrice && (
          <button onClick={() => onDeal(productPrice)}
            className="w-full mt-2 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm border border-emerald-500/30">
            ✅ موافقة على السعر الأصلي 💎{productPrice}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ProductCard.tsx ──────────────────────────────────────

interface ProductCardProps {
  product: any;
  onClick: () => void;
  showType?: boolean;
}

export function ProductCard({ product, onClick, showType = false }: ProductCardProps) {
  const hasDiscount = product.discountPercent > 0;
  const finalPrice = hasDiscount ? Math.floor(product.price * (1 - product.discountPercent / 100)) : product.price;

  return (
    <div className="card p-3 cursor-pointer active:scale-95 transition-transform" onClick={onClick}>
      <div className="relative mb-3">
        {product.images?.[0]
          ? <img src={product.images[0]} className="w-full h-36 object-cover rounded-xl" />
          : <div className="w-full h-36 bg-slate-700/50 rounded-xl flex items-center justify-center text-4xl">🎮</div>
        }
        {product.isFeatured && <div className="absolute top-2 right-2 badge-amber">مميز ⭐</div>}
        {hasDiscount && <div className="absolute top-2 left-2 badge-red">-{product.discountPercent}%</div>}
      </div>
      <h3 className="text-white font-semibold text-sm mb-1 truncate">{product.title}</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-emerald-400 font-bold">💎{finalPrice.toLocaleString()}</div>
          {hasDiscount && <div className="text-slate-500 text-xs line-through">💎{product.price.toLocaleString()}</div>}
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <Eye size={11} /> <span>{product.viewsCount || 0}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-slate-400 text-xs">@{product.sellerName}</span>
        {product.isNegotiable && <span className="badge-green">قابل للتفاوض</span>}
      </div>
    </div>
  );
}

// ─── SkeletonCard.tsx ─────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card p-3">
      <div className="skeleton w-full h-36 mb-3" />
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

// ─── EmptyState.tsx ───────────────────────────────────────
interface EmptyProps { icon: string; title: string; subtitle?: string; action?: () => void; actionLabel?: string; }

export function EmptyState({ icon, title, subtitle, action, actionLabel }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-6xl mb-4">{icon}</div>
      <div className="text-white font-bold text-lg mb-2">{title}</div>
      {subtitle && <div className="text-slate-400 text-sm mb-4">{subtitle}</div>}
      {action && <button onClick={action} className="btn-primary w-auto px-6">{actionLabel}</button>}
    </div>
  );
}
