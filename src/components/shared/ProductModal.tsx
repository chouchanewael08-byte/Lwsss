import { useState, useEffect } from 'react';

const PAY_METHODS = [
  { id: 'crystals', label: 'كريستال',  icon: '💎', color: '#06b6d4' },
  { id: 'usdt',     label: 'USDT',     icon: '💵', color: '#10b981' },
  { id: 'baridimob',label: 'بريدي',    icon: '🏦', color: '#6366f1' },
  { id: 'ccp',      label: 'CCP',      icon: '🏧', color: '#f59e0b' },
  { id: 'binance',  label: 'Binance',  icon: '🟡', color: '#eab308' },
  { id: 'flexy',    label: 'Flexy',    icon: '📱', color: '#ec4899' },
];

interface Props {
  product: any;
  productType?: string;
  onClose: () => void;
  onBuy: (payMethod: string) => Promise<void>;
  onNegotiate?: () => void;
  buying: boolean;
}

export function ProductModal({ product, productType, onClose, onBuy, onNegotiate, buying }: Props) {
  const [payMethod, setPayMethod] = useState('crystals');
  const [imgIdx,    setImgIdx]    = useState(0);
  const [visible,   setVisible]   = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 320);
  }

  const hasImages = product.images?.length > 0;
  const tag = product.platform || product.type || productType || 'منتج';

  return (
    <div
      className="pm-overlay"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
      onClick={close}
    >
      <div
        className="pm-sheet"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="pm-handle" />

        <div className="pm-header">
          <div style={{ flex: 1 }}>
            <div className="pm-tag">{tag}</div>
            <h2 className="pm-title">{product.title}</h2>
          </div>
          <button className="pm-close" onClick={close}>✕</button>
        </div>

        {hasImages && (
          <div className="pm-gallery">
            <img src={product.images[imgIdx]} className="pm-gallery-img" alt="" />
            {product.images.length > 1 && (
              <div className="pm-dots">
                {product.images.map((_: any, i: number) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`pm-dot ${i === imgIdx ? 'pm-dot-active' : ''}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {product.description && <p className="pm-desc">{product.description}</p>}

        <div className="pm-stats">
          {([
            ['👁', product.viewsCount ?? 0,            'مشاهدة'],
            ['🛡', product.warrantyPeriod || 'لا',     'ضمان'],
            ['⭐', product.sellerLevel    || 'عادي',   'البائع'],
          ] as [string,any,string][]).map(([icon, val, label]) => (
            <div key={label} className="pm-stat">
              <span className="pm-stat-icon">{icon}</span>
              <span className="pm-stat-val">{val}</span>
              <span className="pm-stat-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="pm-price-row">
          <span className="pm-price-label">السعر النهائي</span>
          <div className="pm-price">
            <span className="pm-price-gem">💎</span>
            <span className="pm-price-num">{product.price?.toLocaleString()}</span>
          </div>
        </div>

        <div className="pm-pay-label">اختر طريقة الدفع</div>
        <div className="pm-pay-grid">
          {PAY_METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => setPayMethod(m.id)}
              className={`pm-pay-btn ${payMethod === m.id ? 'pm-pay-active' : ''}`}
              style={payMethod === m.id ? { '--pm-accent': m.color } as any : {}}
            >
              <span className="pm-pay-icon">{m.icon}</span>
              <span className="pm-pay-text">{m.label}</span>
              {payMethod === m.id && <span className="pm-pay-check">✓</span>}
            </button>
          ))}
        </div>

        <div className="pm-actions">
          <button className="pm-btn-buy" onClick={() => onBuy(payMethod)} disabled={buying}>
            {buying
              ? <><span className="pm-spin">⟳</span> جار المعالجة...</>
              : <>🛒 &nbsp;شراء الآن</>}
          </button>
          {onNegotiate && (
            <button className="pm-btn-neg" onClick={onNegotiate}>💬 تفاوض</button>
          )}
        </div>

        <div className="pm-escrow">
          🔐 &nbsp;محمي بنظام الإيسكرو — أموالك محجوزة حتى تتأكد
        </div>
      </div>
    </div>
  );
}
