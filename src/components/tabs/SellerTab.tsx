import React, { useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Product, ProductType } from '../../types';
import { useProductStore } from '../../stores/useProductStore';
import { useUserStore } from '../../stores/useUserStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { Plus, Store, Tag, Trash2, Edit, Upload, EyeOff, Eye, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface SellerTabProps {
  onNavigateToTab: (tab: string) => void;
}

const PRODUCT_TYPES: { id: ProductType; label: string }[] = [
  { id: 'game_account', label: 'حسابات ألعاب 🎮' },
  { id: 'subscription', label: 'اشتراكات رقمية 📺' },
  { id: 'digital_service', label: 'خدمات رقمية ⚡' },
  { id: 'game_currency', label: 'عملات ألعاب 💎' },
  { id: 'social_media', label: 'حسابات سوشيال ميديا 📲' },
  { id: 'design_dev', label: 'تصميم وبرمجة 💻' }
];

export default function SellerTab({ onNavigateToTab }: SellerTabProps) {
  const products = useProductStore(state => state.products);
  const addProduct = useProductStore(state => state.addProduct);
  const updateProductPriceAndDiscount = useProductStore(state => state.updateProductPriceAndDiscount);
  const toggleProductVisibility = useProductStore(state => state.toggleProductVisibility);
  const currentUser = useUserStore(state => state.currentUser);
  const addSystemLog = useAlertStore(state => state.addSystemLog);

  // Form States
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdType, setNewProdType] = useState<ProductType>('game_account');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPayments, setNewProdPayments] = useState<string[]>(['BaridiMob', 'USDT']);
  const [newProdSwap, setNewProdSwap] = useState(false);
  const [newProdNego, setNewProdNego] = useState(false);
  const [newProdWarranty, setNewProdWarranty] = useState('ضمان 30 يوم');
  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const [currentImageInput, setCurrentImageInput] = useState('');
  const [newProdDiscount, setNewProdDiscount] = useState('0');

  // Inline editor states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('0');

  // Filter products listed by the current active seller
  const sellerProducts = products.filter(p => p.sellerId === currentUser?.id);

  // Handle payments multiselect
  const togglePaymentMethod = (method: string) => {
    if (newProdPayments.includes(method)) {
      setNewProdPayments(newProdPayments.filter(m => m !== method));
    } else {
      setNewProdPayments([...newProdPayments, method]);
    }
  };

  // Image addition via text URL
  const handleAddImageUrl = () => {
    if (!currentImageInput.trim()) return;
    setNewProdImages([...newProdImages, currentImageInput.trim()]);
    setCurrentImageInput('');
    toast.success('📸 تم إدراج رابط صورة المعاينة بنجاح!');
  };

  // Base64 file loaders
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('❌ يرجى اختيار ملفات صور فقط!');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('❌ يجب أن يكون حجم الصورة أقل من 2 ميغابايت للحفاظ على السرعة!');
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setNewProdImages(prev => [...prev, evt.target?.result as string]);
          toast.success('📸 تم رفع وضغط ملف الصورة بنجاح!');
        }
      };
      reader.readAsDataURL(file);
    });
  };

    // Create Product handler
  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const sanitizedTitle = DOMPurify.sanitize(newProdTitle.trim());
    const sanitizedDesc = DOMPurify.sanitize(newProdDesc.trim());
    const sanitizedWarranty = DOMPurify.sanitize(newProdWarranty);

    if (!sanitizedTitle || !newProdPrice.trim() || !sanitizedDesc) {
      toast.error('⚠️ يرجى تعبئة كامل تفاصيل المنتج المطلوبة!');
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('⚠️ سعر المنتج يجب أن يكون رقماً مالياً صحيحاً أكبر من 0');
      return;
    }

    const finalImages = newProdImages.length > 0 
      ? newProdImages 
      : ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'];

    addProduct({
      id: 'prod_' + Date.now().toString().slice(-6),
      title: sanitizedTitle,
      price: priceNum,
      description: sanitizedDesc,
      type: newProdType,
      sellerId: currentUser.id,
      images: finalImages,
      acceptedPayments: newProdPayments,
      isSwapAcceptable: newProdSwap,
      isNegotiable: newProdNego,
      warrantyPeriod: sanitizedWarranty,
      discountPercentage: parseInt(newProdDiscount) || 0
    });

    // Logging
    addSystemLog({
      id: 'log_' + Date.now(),
      adminId: 'system',
      adminName: 'البائع الذاتي',
      action: 'إدراج منتج جديد',
      details: `@${currentUser.username} أدرج السلعة: ${sanitizedTitle} بسعر ${priceNum}$`,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });

    // Reset State
    setNewProdTitle('');
    setNewProdPrice('');
    setNewProdDesc('');
    setNewProdSwap(false);
    setNewProdNego(false);
    setNewProdImages([]);
    setNewProdDiscount('0');
    toast.success('🚀 تم نشر سلعتك بنجاح في سوق SkyMarket! سيتم إخطار المشترين فوراً.');
    onNavigateToTab('market');
  };

  // Inline Catalog update
  const handleSaveInlineEdit = (prodId: string) => {
    const parsedPrice = parseFloat(editPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('⚠️ يرجى إدخال مبلغ صحيح للسعر');
      return;
    }

    updateProductPriceAndDiscount(prodId, parsedPrice, parseInt(editDiscount) || 0);
    setEditingProductId(null);
    toast.success('💾 تم تحديث متطلبات السعر والخصم للمنتج بنجاح!');
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* Dynamic Upper stat card */}
      <div className="bg-gradient-to-r from-[#0d1527] to-[#121c33] border border-emerald-500/20 rounded-2xl p-5 text-right relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-550/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1">
            <span className="text-emerald-400 font-extrabold text-xs block">✨ بائعي وعارضي خدمات السيرفر المعتمدين</span>
            <h3 className="text-sm sm:text-base font-black text-slate-100">تحكّم بمتجرك، عروضك، ومستوى تخفيض مبيعاتك!</h3>
            <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xl">
              تأكد من تسليم شحنتك للعميل بالدردشة والضمان المشترك. عمولة الموقع هي 10٪ تُقتطع تلقائياً من الإسكرو لتمويل استمرارية خوادمنا ومستشعرات فحص الروابط المخادعة والسبام.
            </p>
          </div>
          <div className="bg-[#070b16] border border-slate-800 px-4 py-2 rounded-xl text-center min-w-[150px] shrink-0 shadow">
            <span className="text-[9px] text-slate-400 block font-bold mb-0.5">مبيعاتك الكلية المنجزة</span>
            <div className="text-lg font-mono font-black text-emerald-400">
              {currentUser?.salesCount || 0} شحنة
            </div>
            <span className="text-[8.5px] text-slate-500 block">بنسبة نجاح {currentUser?.successRate || 100}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column forms: adding product */}
        <div className="lg:col-span-5 bg-[#0d1627] border border-slate-800 p-4 md:p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Store className="w-5 h-5 text-indigo-400" />
            <h4 className="text-xs sm:text-sm font-black text-slate-100">أدرج سلعة رقمية جديدة في السوق</h4>
          </div>

          <form onSubmit={handleCreateProductSubmit} className="space-y-3 text-xs leading-relaxed">
            
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 block font-bold">اسم أو عنوان السلعة:</label>
              <input
                type="text"
                required
                value={newProdTitle}
                onChange={(e) => setNewProdTitle(e.target.value)}
                placeholder="مثلاً: حساب تيك توك 50k متفاعل بالبريد الأصلي"
                className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 focus:outline-none focus:border-indigo-550 font-bold"
              />
            </div>

            {/* Type Category and Pricing */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 block font-bold">التصنيف الرقمي:</label>
                <select
                  value={newProdType}
                  onChange={(e) => setNewProdType(e.target.value as ProductType)}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 font-bold"
                >
                  {PRODUCT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 block font-bold">السعر بالدولار ($):</label>
                <input
                  type="number"
                  required
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder="مثلاً: 15$"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 font-bold"
                />
              </div>
            </div>

            {/* Desc */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 block font-bold">تفاصيل ووصف السلعة والشروط:</label>
              <textarea
                required
                rows={3}
                value={newProdDesc}
                onChange={(e) => setNewProdDesc(e.target.value)}
                placeholder="صف السلعة بدقة، تفاصيل الإيميل، الضمان المتوفر، لفل الحساب، وهل يوجد حظر أو لا..."
                className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 focus:outline-none focus:border-indigo-550 font-sans"
              />
            </div>

            {/* Warranty and discounts */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 block font-bold">مدة وشرط الضمان:</label>
                <input
                  type="text"
                  value={newProdWarranty}
                  onChange={(e) => setNewProdWarranty(e.target.value)}
                  placeholder="مثلاً: ضمان تواصل 24 ساعة"
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-850 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 block font-bold">تطبيق تخفيض عاجل (%):</label>
                <select
                  value={newProdDiscount}
                  onChange={(e) => setNewProdDiscount(e.target.value)}
                  className="w-full bg-slate-950 text-slate-250 p-2.5 rounded-lg border border-slate-850 font-mono font-bold"
                >
                  <option value="0">سعر ثابت عادي (0%)</option>
                  <option value="10">خصم بسيط (10%)</option>
                  <option value="20">خصم ساخن (20%)</option>
                  <option value="30">تخفيض ممتاز (30%)</option>
                  <option value="50">نصف السعر (50%)</option>
                </select>
              </div>
            </div>

            {/* Negotiation and swap toggles */}
            <div className="flex justify-between items-center py-1.5 px-2 bg-slate-950/40 rounded-xl border border-slate-900">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-350">
                <input
                  type="checkbox"
                  checked={newProdSwap}
                  onChange={(e) => setNewProdSwap(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-indigo-500 font-sans"
                />
                <span>أقبل المقايضة (Swap) 🔁</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-350">
                <input
                  type="checkbox"
                  checked={newProdNego}
                  onChange={(e) => setNewProdNego(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-indigo-505 font-sans"
                />
                <span>قابل للتفاوض البسيط 🗣️</span>
              </label>
            </div>

            {/* Drag & Drop File Loader UI */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 block font-bold">أضف صور توضيحية للمعاينة:</label>
              
              <div className="border border-dashed border-slate-800 rounded-xl p-3 bg-slate-950/30 text-center relative group hover:border-[#3b82f6]/40 transition duration-300">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="قم بجر أو رفع صور السلعة من جهازك مباشرة"
                />
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition" />
                  <span className="text-[9.5px] text-slate-400 font-bold block pt-0.5">اسحب أو اضغط لرفع صور السلعة المباشرة</span>
                  <span className="text-[8.5px] text-slate-600">تفضل صيغ PNG, JPG بحد أقصى 2MB</span>
                </div>
              </div>

              {/* URL fallback option */}
              <div className="flex gap-2.5 pt-1.5">
                <input
                  type="text"
                  value={currentImageInput}
                  onChange={(e) => setCurrentImageInput(e.target.value)}
                  placeholder="أو ضع رابط صورة جاهز مباشر..."
                  className="flex-1 bg-slate-950 text-slate-300 p-2.5 rounded-lg border border-slate-850"
                  id="image-url-input"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  إدراج
                </button>
              </div>

              {/* Thumbnails list */}
              {newProdImages.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {newProdImages.map((img, idx) => (
                    <div key={idx} className="w-12 h-12 rounded-lg border border-slate-800 relative overflow-hidden group">
                      <img src={img} className="w-full h-full object-cover" alt="thumbnail" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setNewProdImages(newProdImages.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-red-650/80 text-white font-bold hidden group-hover:flex items-center justify-center text-[10px] cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Payment Methods selection */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 block font-bold">بوابات دفع مأذونة تملكها لتلقي الأموال:</label>
              <div className="flex flex-wrap gap-1.5">
                {['BaridiMob', 'CCP', 'USDT', 'Flexy', 'Binance'].map(method => {
                  const has = newProdPayments.includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => togglePaymentMethod(method)}
                      className={`px-3 py-1 font-bold text-[9px] rounded-lg cursor-pointer transition border ${
                        has 
                          ? 'bg-indigo-650/10 border-indigo-500 text-indigo-400' 
                          : 'bg-slate-950 border-slate-850 text-slate-450 hover:text-slate-200'
                      }`}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black rounded-xl transition cursor-pointer shadow-lg shadow-indigo-950/30"
            >
              🚀 انشر السلعة الرقمية فوراً بالسوق
            </button>

          </form>
        </div>

        {/* Right Column details list of products has reports */}
        <div className="lg:col-span-7 bg-[#0d1627] border border-slate-800 p-4 md:p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Tag className="w-5 h-5 text-emerald-450" />
            <h4 className="text-xs sm:text-sm font-black text-slate-100">إدارة مبيعاتك وعروض السلع الخاصة بك ({sellerProducts.length})</h4>
          </div>

          {sellerProducts.length === 0 ? (
            <div className="text-center py-16 space-y-2 bg-[#080d1a] border border-slate-850 rounded-xl p-6">
              <span className="text-2xl block">🏪</span>
              <h5 className="text-xs sm:text-sm font-extrabold text-slate-300">أنت لا تملك أي منتجات معروضة بالسوق حالياً</h5>
              <p className="text-[9.5px] text-slate-500">قم بملء الاستمارة العارضة على اليسار لنشر أول شحنة أو حساب ديجيتال بالبوت.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-0.5">
              {sellerProducts.map(p => {
                const isEditing = editingProductId === p.id;
                const reportsCount = p.reportsCount || 0;
                
                return (
                  <div key={p.id} className="bg-[#0a0f1d] border border-slate-900 rounded-xl p-3.5 space-y-3 transition hover:border-slate-850 text-right">
                    
                    {/* Header stats line */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-850 bg-slate-950">
                          <img src={p.images[0]} className="w-full h-full object-cover" alt="product thumbnail" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-[#f1f5f9] text-xs sm:text-sm">{p.title}</h5>
                          <span className="text-[9px] text-slate-450 font-mono block">رقم المعرف: #{p.id}</span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        {reportsCount > 0 && (
                          <span className="bg-rose-500/10 text-rose-450 border border-rose-500/15 text-[8.5px] font-black px-2 py-0.5 rounded-lg animate-pulse flex items-center gap-1">
                            🚨 {reportsCount} شكوى بلاغ
                          </span>
                        )}
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg ${
                          p.isHidden 
                            ? 'bg-slate-800 text-slate-400' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {p.isHidden ? 'مخفي عن الزوار' : 'نشط ومعروض'}
                        </span>
                      </div>
                    </div>

                    {/* Editor view if active */}
                    {isEditing ? (
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 block">السعر بالدولار ($):</label>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-full bg-slate-900 text-slate-150 p-2 border border-slate-800 rounded font-bold font-mono text-center"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-505 block">التخفيض العاجل (%):</label>
                            <select
                              value={editDiscount}
                              onChange={(e) => setEditDiscount(e.target.value)}
                              className="w-full bg-slate-900 text-slate-150 p-2 border border-slate-800 rounded font-bold font-mono text-center"
                            >
                              {[0, 10, 20, 30, 50].map(v => (
                                <option key={v} value={v}>{v}%</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-1.5">
                          <button
                            onClick={() => handleSaveInlineEdit(p.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] px-3.5 py-1.5 rounded-lg transition"
                          >
                            تحديث وحفظ
                          </button>
                          <button
                            onClick={() => setEditingProductId(null)}
                            className="bg-slate-850 text-slate-405 font-bold text-[10.5px] px-3.5 py-1.5 rounded-lg"
                          >
                            إلغاء التعديل
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                        <div>
                          <span className="text-slate-500 text-[9px] block">السعر والخصم الحالي:</span>
                          <span className="font-extrabold text-slate-300 font-mono">${p.price}</span>
                          {p.discountPercentage ? (
                            <span className="text-rose-450 font-bold font-mono text-[9px] block">({p.discountPercentage}% خصم مطبق)</span>
                          ) : null}
                        </div>

                        {/* Fast controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProductId(p.id);
                              setEditPrice(String(p.price));
                              setEditDiscount(String(p.discountPercentage || 0));
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-80 y-text-slate-205 hover:text-white border border-slate-800 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل السعر والخصم</span>
                          </button>

                          <button
                            onClick={() => {
                              toggleProductVisibility(p.id);
                              toast.success(p.isHidden ? '👁️ تم التراجع وإعادة إظهار السلعة للزوار!' : '👁️‍🗨️ تم إخفاء السلعة بنجاح عن الزوار.');
                            }}
                            className={`p-1.5 border rounded-lg transition-all text-xs cursor-pointer ${
                              p.isHidden 
                                ? 'bg-indigo-950/40 border-indigo-900 text-indigo-400' 
                                : 'bg-slate-900 border-slate-800 text-slate-450 hover:text-slate-200'
                            }`}
                            title={p.isHidden ? 'إظهار السلعة للجمهور' : 'إخفاء مؤقت للسلعة'}
                          >
                            {p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
