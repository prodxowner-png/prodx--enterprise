import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  PauseCircle, 
  PlayCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  X, 
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { Product, CartItem, PaymentMethod, Order } from '../types/pos';
import { executeCheckoutTransaction, FIREBASE_PROJECT_INFO } from '../services/firebase';

interface PosRegisterProps {
  products: Product[];
  terminalId: string;
  onOrderCompleted?: (order: Order) => void;
  onRefreshData?: () => void;
}

export const PosRegister: React.FC<PosRegisterProps> = ({
  products,
  terminalId,
  onOrderCompleted,
  onRefreshData,
}) => {
  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [heldOrders, setHeldOrders] = useState<{ id: string; time: string; cart: CartItem[] }[]>([]);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Success Receipt Modal State
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category)));
    return ['ทั้งหมด', ...list];
  }, [products]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations (Authoritative exact decimals)
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round(((cartSubtotal * Math.min(100, Math.max(0, discountValue))) / 100) * 100) / 100;
    }
    return Math.min(cartSubtotal, Math.max(0, discountValue));
  }, [cartSubtotal, discountType, discountValue]);

  const subtotalAfterDiscount = Math.max(0, cartSubtotal - discountAmount);

  // Thai standard VAT 7%
  const vatAmount = useMemo(() => {
    if (!includeVat) return 0;
    return Math.round(subtotalAfterDiscount * 0.07 * 100) / 100;
  }, [subtotalAfterDiscount, includeVat]);

  const grandTotal = Math.round((subtotalAfterDiscount + vatAmount) * 100) / 100;

  // Add product to cart with stock validation
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return prevCart; // Prevent exceeding stock
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: Math.round((item.quantity + 1) * item.unitPrice * 100) / 100,
              }
            : item
        );
      }
      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          unitPrice: product.price,
          total: product.price,
        },
      ];
    });
  };

  // Modify quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) return item; // Exceeds stock
            return {
              ...item,
              quantity: nextQty,
              total: Math.round(nextQty * item.unitPrice * 100) / 100,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove single item
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Barcode scanning handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) => p.barcode === barcodeInput.trim() || p.id === barcodeInput.trim()
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`ไม่พบสินค้าที่มีบาร์โค้ด: ${barcodeInput}`);
    }
  };

  // Hold current order
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders((prev) => [
      ...prev,
      {
        id: `HOLD-${Date.now().toString(36)}`,
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        cart: [...cart],
      },
    ]);
    setCart([]);
  };

  // Resume held order
  const handleResumeOrder = (index: number) => {
    const orderToResume = heldOrders[index];
    if (cart.length > 0) {
      if (!confirm('มีสินค้าในตะกร้าปัจจุบัน ต้องการแทนที่ด้วยบิลที่พักไว้หรือไม่?')) {
        return;
      }
    }
    setCart(orderToResume.cart);
    setHeldOrders((prev) => prev.filter((_, i) => i !== index));
  };

  // Open checkout modal
  const openCheckout = (method: PaymentMethod) => {
    if (cart.length === 0) return;
    setPaymentMethod(method);
    setCashTendered(grandTotal);
    setCheckoutError(null);
    setIsCheckoutOpen(true);
  };

  // Calculate change
  const changeAmount = Math.max(0, Math.round((cashTendered - grandTotal) * 100) / 100);

  // Confirm checkout & submit to Firebase
  const handleConfirmCheckout = async () => {
    if (paymentMethod === 'cash' && cashTendered < grandTotal) {
      setCheckoutError(`ยอดเงินที่รับ (฿${cashTendered}) น้อยกว่ายอดรวม (฿${grandTotal})`);
      return;
    }

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const orderResult = await executeCheckoutTransaction({
        cart,
        subtotal: cartSubtotal,
        tax: vatAmount,
        discount: discountAmount,
        total: grandTotal,
        received: paymentMethod === 'cash' ? cashTendered : grandTotal,
        change: paymentMethod === 'cash' ? changeAmount : 0,
        paymentMethod,
        cashierEmail: FIREBASE_PROJECT_INFO.userEmail,
        terminalId,
      });

      // Clear cart
      setCart([]);
      setDiscountValue(0);
      setIsCheckoutOpen(false);
      setCompletedOrder(orderResult);

      if (onOrderCompleted) {
        onOrderCompleted(orderResult);
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      setCheckoutError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-5">
      {/* LEFT COLUMN: Product Catalog, Scanner, Categories */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Top Controls: Barcode scan input & search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
          {/* Barcode scanner box */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="สแกนบาร์โค้ดหรือพิมพ์รหัสสินค้า..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm"
            >
              <Barcode className="w-4 h-4" />
              <span>ยิงบาร์โค้ด</span>
            </button>
          </form>

          {/* Text search */}
          <div className="relative sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= product.minStock;
            const cartItem = cart.find((c) => c.product.id === product.id);
            const inCartCount = cartItem?.quantity || 0;

            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOutOfStock}
                className={`relative group flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all ${
                  isOutOfStock
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                    : 'bg-slate-900 border-slate-800 hover:border-indigo-500/70 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98]'
                }`}
              >
                {/* Cart badge if added */}
                {inCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                    {inCartCount}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/80">
                      {product.category}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isOutOfStock
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                          : isLowStock
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                          : 'bg-emerald-950/40 text-emerald-400'
                      }`}
                    >
                      {isOutOfStock ? 'หมด' : `คลัง: ${product.stock}`}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">฿</span>
                    <span className="text-lg font-black text-amber-400 ml-0.5 font-mono">
                      {product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-indigo-600 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 flex flex-col items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-slate-700 mb-3" />
              <p className="font-semibold text-slate-400">ไม่พบรายการสินค้าที่ค้นหา</p>
              <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Realtime Cart & Checkout Control Panel */}
      <div className="w-full lg:w-[420px] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">รายการในตะกร้า</h2>
              <p className="text-[11px] text-slate-400">เครื่อง: {terminalId} • พนักงาน: {FIREBASE_PROJECT_INFO.userEmail.split('@')[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {heldOrders.length > 0 && (
              <div className="relative group">
                <button
                  className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/20"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>บิลพัก ({heldOrders.length})</span>
                </button>
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-xl hidden group-hover:block z-50">
                  <div className="text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-800 mb-1">
                    เรียกคืนบิลที่พักไว้:
                  </div>
                  {heldOrders.map((h, i) => (
                    <button
                      key={h.id}
                      onClick={() => handleResumeOrder(i)}
                      className="w-full text-left text-xs p-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200"
                    >
                      <span>เวลา {h.time}</span>
                      <span className="font-mono text-amber-400 font-bold">{h.cart.length} รายการ</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleHoldOrder}
              disabled={cart.length === 0}
              title="พักบิลนี้เพื่อรับลูกค้าท่านถัดไป"
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1 disabled:opacity-40"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>พักบิล</span>
            </button>

            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                title="ล้างตะกร้า"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto my-3 space-y-2 max-h-[340px] pr-1">
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 group"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-200 truncate">{item.product.name}</h4>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>฿{item.unitPrice.toFixed(2)}/ชิ้น</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500 font-mono">สต็อก {item.product.stock}</span>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => updateQuantity(item.product.id, -1)}
                  className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-7 text-center font-mono font-bold text-xs text-white">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.product.id, 1)}
                  disabled={item.quantity >= item.product.stock}
                  className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Line Total */}
              <div className="w-16 text-right">
                <div className="font-mono font-black text-sm text-amber-400">
                  ฿{item.total.toFixed(2)}
                </div>
              </div>

              <button
                onClick={() => removeFromCart(item.product.id)}
                className="text-slate-600 hover:text-rose-400 transition-colors p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-slate-800 mb-2" />
              <p className="text-xs font-semibold text-slate-400">ยังไม่มีสินค้าในตะกร้า</p>
              <p className="text-[11px] text-slate-600 mt-0.5">แตะเลือกสินค้าจากหน้าจอ หรือสแกนบาร์โค้ด</p>
            </div>
          )}
        </div>

        {/* Financial Summary & Discounts */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 mt-auto">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ยอดรวมสินค้า ({cart.reduce((s, i) => s + i.quantity, 0)} ชิ้น)</span>
            <span className="font-mono text-slate-200">฿{cartSubtotal.toFixed(2)}</span>
          </div>

          {/* Discount control */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span>ส่วนลด:</span>
              <div className="inline-flex rounded-md bg-slate-900 border border-slate-800 p-0.5 text-[10px]">
                <button
                  onClick={() => setDiscountType('amount')}
                  className={`px-1.5 py-0.5 rounded ${discountType === 'amount' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  ฿
                </button>
                <button
                  onClick={() => setDiscountType('percent')}
                  className={`px-1.5 py-0.5 rounded ${discountType === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  %
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={discountValue || ''}
                placeholder="0"
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="font-mono text-rose-400">-฿{discountAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* VAT Toggle */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
            </label>
            <span className="font-mono text-slate-300">฿{vatAmount.toFixed(2)}</span>
          </div>

          {/* Grand Total */}
          <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
            <span className="font-extrabold text-sm text-white">ยอดชำระสุทธิ</span>
            <div className="text-right">
              <span className="text-xs text-amber-400 font-bold mr-1">฿</span>
              <span className="font-mono font-black text-2xl text-amber-400 tracking-tight">
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Payment Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => openCheckout('promptpay')}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <QrCode className="w-4 h-4" />
            <span>พร้อมเพย์ QR</span>
          </button>

          <button
            onClick={() => openCheckout('cash')}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Banknote className="w-4 h-4" />
            <span>เงินสด (Cash)</span>
          </button>

          <button
            onClick={() => openCheckout('card')}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>บัตรเครดิต</span>
          </button>

          <button
            onClick={() => openCheckout('transfer')}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>โอนเงินบัญชี</span>
          </button>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg text-white mb-1 flex items-center gap-2">
              <span>ชำระเงินค่าสินค้า</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {paymentMethod.toUpperCase()}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              เครื่อง {terminalId} • พนักงาน {FIREBASE_PROJECT_INFO.userEmail}
            </p>

            {/* Total Display */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center mb-5">
              <span className="text-xs font-semibold text-slate-400">ยอดที่ต้องชำระทั้งหมด</span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-0.5">
                ฿{grandTotal.toFixed(2)}
              </div>
            </div>

            {/* PAYMENT METHODS TABS */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {(['promptpay', 'cash', 'card', 'transfer'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    if (method === 'cash') setCashTendered(grandTotal);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === method
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                  }`}
                >
                  {method === 'promptpay' && <QrCode className="w-4 h-4" />}
                  {method === 'cash' && <Banknote className="w-4 h-4" />}
                  {method === 'card' && <CreditCard className="w-4 h-4" />}
                  {method === 'transfer' && <Sparkles className="w-4 h-4" />}
                  <span className="capitalize">{method}</span>
                </button>
              ))}
            </div>

            {/* PromptPay View */}
            {paymentMethod === 'promptpay' && (
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 mb-5">
                <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center mb-3">
                  {/* Realtime PromptPay QR simulation SVG */}
                  <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Outer finder patterns */}
                    <rect width="100" height="100" fill="white" />
                    <rect x="5" y="5" width="26" height="26" fill="black" />
                    <rect x="8" y="8" width="20" height="20" fill="white" />
                    <rect x="11" y="11" width="14" height="14" fill="#003D6B" />

                    <rect x="69" y="5" width="26" height="26" fill="black" />
                    <rect x="72" y="8" width="20" height="20" fill="white" />
                    <rect x="75" y="11" width="14" height="14" fill="#003D6B" />

                    <rect x="5" y="69" width="26" height="26" fill="black" />
                    <rect x="8" y="72" width="20" height="20" fill="white" />
                    <rect x="11" y="75" width="14" height="14" fill="#003D6B" />

                    {/* Simulated data matrix cells */}
                    <rect x="36" y="8" width="5" height="5" fill="black" />
                    <rect x="45" y="12" width="5" height="5" fill="black" />
                    <rect x="55" y="6" width="5" height="5" fill="black" />
                    <rect x="15" y="38" width="5" height="5" fill="black" />
                    <rect x="25" y="44" width="5" height="5" fill="black" />
                    <rect x="38" y="38" width="24" height="24" fill="#003D6B" rx="3" />
                    <text x="50" y="53" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">PROMPT</text>
                    <text x="50" y="60" fill="#FFC107" fontSize="8" fontWeight="bold" textAnchor="middle">PAY</text>
                    <rect x="68" y="38" width="5" height="5" fill="black" />
                    <rect x="78" y="45" width="5" height="5" fill="black" />
                    <rect x="40" y="68" width="5" height="5" fill="black" />
                    <rect x="52" y="75" width="5" height="5" fill="black" />
                    <rect x="62" y="80" width="5" height="5" fill="black" />
                    <rect x="74" y="70" width="5" height="5" fill="black" />
                    <rect x="84" y="82" width="5" height="5" fill="black" />
                  </svg>
                  <div className="text-[10px] font-bold text-slate-700 tracking-wider mt-1">
                    THAI QR PAYMENT • PROMPTPAY
                  </div>
                </div>

                <div className="text-center text-xs text-slate-300">
                  <p className="font-semibold text-white">สแกนชำระเงินผ่านแอปธนาคารทุกแห่ง</p>
                  <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                    ปลายทาง: PRODX-POS ({FIREBASE_PROJECT_INFO.userEmail})
                  </p>
                </div>
              </div>
            )}

            {/* Cash Calculator View */}
            {paymentMethod === 'cash' && (
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    จำนวนเงินที่รับจากลูกค้า (บาท)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                    <input
                      type="number"
                      step="any"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-xl font-bold font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Preset quick cash buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCashTendered(grandTotal)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                  >
                    พอดี (฿{grandTotal.toFixed(2)})
                  </button>
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 font-mono"
                    >
                      ฿{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashTendered(Math.ceil(grandTotal / 100) * 100)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 font-mono"
                  >
                    ปัดเศษร้อย (฿{Math.ceil(grandTotal / 100) * 100})
                  </button>
                </div>

                {/* Change display */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  cashTendered >= grandTotal
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  <span className="text-xs font-semibold">เงินทอน</span>
                  <span className="text-xl font-black font-mono">
                    ฿{changeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Credit Card / Transfer reference */}
            {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 mb-5 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-semibold">
                  กรุณารูดบัตร/แตะบัตรผ่านเครื่อง EDC หรือตรวจสอบสลิปโอนเงิน
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  ระบบจะตัดสต็อกและบันทึกยอดขายลง Firebase Cloud ทันที
                </p>
              </div>
            )}

            {/* Error Message */}
            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Confirm Checkout Button */}
            <button
              onClick={handleConfirmCheckout}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกธุรกรรมลง Firebase Realtime...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันการชำระเงิน (฿{grandTotal.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED RECEIPT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setCompletedOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
              <h2 className="font-extrabold text-base tracking-wider uppercase">PRODX-POS STORE</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Firebase Project: {FIREBASE_PROJECT_INFO.projectId}</p>
              <p className="text-[10px] text-slate-500">เลขประจำตัวผู้เสียภาษี: 0105566099881 (สาขา 0000)</p>
              <div className="text-[10px] text-slate-600 mt-2">
                <div>ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</div>
                <div className="font-bold text-slate-800">{completedOrder.orderNumber}</div>
                <div>{new Date(completedOrder.createdAt).toLocaleString('th-TH')}</div>
                <div>เครื่อง: {completedOrder.terminalId} • พนักงาน: {completedOrder.cashier.split('@')[0]}</div>
              </div>
            </div>

            {/* Receipt Line Items */}
            <div className="py-3 border-b-2 border-dashed border-slate-300 space-y-1.5 max-h-48 overflow-y-auto">
              {completedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="flex-1 pr-2">
                    <div className="font-bold">{it.name}</div>
                    <div className="text-slate-500 text-[10px]">{it.quantity} x ฿{it.unitPrice.toFixed(2)}</div>
                  </div>
                  <div className="font-bold">฿{it.total.toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Receipt Totals */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>ยอดรวมสินค้า</span>
                <span>฿{completedOrder.subtotal.toFixed(2)}</span>
              </div>
              {completedOrder.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>ส่วนลด</span>
                  <span>-฿{completedOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                <span>฿{completedOrder.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                <span>ยอดรวมสุทธิ</span>
                <span>฿{completedOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                <span>ชำระโดย: {completedOrder.paymentMethod.toUpperCase()}</span>
                <span>รับมา: ฿{completedOrder.received.toFixed(2)}</span>
              </div>
              {completedOrder.change > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>เงินทอน</span>
                  <span>฿{completedOrder.change.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500">
              <p>ขอบคุณที่ใช้บริการ / THANK YOU</p>
              <p className="mt-1 text-[9px] text-emerald-600 font-bold">
                ✓ ซิงค์ข้อมูลขึ้น Firebase Realtime สำเร็จ
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-2 font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบเสร็จ</span>
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-500 transition-colors"
              >
                <span>เริ่มรายการใหม่</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
