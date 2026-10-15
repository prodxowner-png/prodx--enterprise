import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpDown, 
  Database, 
  X,
  Layers
} from 'lucide-react';
import { Product } from '../types/pos';
import { saveProduct, adjustProductStock, seedInitialProductsIfEmpty } from '../services/firebase';

interface InventoryManagerProps {
  products: Product[];
  onRefresh?: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ products }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [stockAdjustModal, setStockAdjustModal] = useState<{ product: Product; amount: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const categories = ['ทั้งหมด', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchCat = categoryFilter === 'ทั้งหมด' || p.category === categoryFilter;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const totalStockCount = products.reduce((sum, p) => sum + p.stock, 0);

  // Handle save (new or edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price) {
      alert('กรุณากรอกชื่อสินค้าและราคา');
      return;
    }

    setIsSaving(true);
    try {
      const prodToSave: Product = {
        id: editingProduct.id || `prod-${Date.now().toString(36)}`,
        name: editingProduct.name,
        barcode: editingProduct.barcode || `${Math.floor(88500000000 + Math.random() * 99999999)}`,
        price: Number(editingProduct.price) || 0,
        cost: Number(editingProduct.cost) || 0,
        stock: Number(editingProduct.stock) || 0,
        minStock: Number(editingProduct.minStock) || 5,
        category: editingProduct.category || 'ทั่วไป',
        description: editingProduct.description || '',
      };

      await saveProduct(prodToSave);
      setEditingProduct(null);
      setIsNewProduct(false);
      setStatusMessage('บันทึกข้อมูลสินค้าขึ้น Firebase เรียบร้อย');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle stock adjustment
  const handleConfirmStockAdjust = async () => {
    if (!stockAdjustModal) return;
    setIsSaving(true);
    try {
      await adjustProductStock(stockAdjustModal.product.id, stockAdjustModal.amount);
      setStockAdjustModal(null);
      setStatusMessage('ปรับยอดสต็อกใน Firebase สำเร็จ');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ปรับสต็อกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle seed
  const handleSeedData = async () => {
    if (!confirm('ต้องการรีโหลดชุดข้อมูลสินค้าตัวอย่าง (12 รายการ) ลงใน Firebase หรือไม่?')) {
      return;
    }
    setIsSeeding(true);
    try {
      const count = await seedInitialProductsIfEmpty(true);
      setStatusMessage(`นำเข้าข้อมูลสินค้าสำเร็จ ${count} รายการลงใน Firestore`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสร้างข้อมูลตัวอย่าง: ' + err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-5">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">รายการสินค้าทั้งหมด</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{products.length} รายการ</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">จำนวนชิ้นในสต็อกรวม</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{totalStockCount} ชิ้น</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">สินค้าสต็อกใกล้หมด</div>
            <div className="text-2xl font-black text-amber-300 font-mono mt-1">{lowStockCount} รายการ</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/40 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">สินค้าหมดสต็อก</div>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">{outOfStockCount} รายการ</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/40 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Control Bar: Search, Category, Add, Seed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า บาร์โค้ด หรือรหัส SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isSeeding ? 'กำลังนำเข้า...' : 'นำเข้าสินค้าตัวอย่าง'}</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct({
                name: '',
                barcode: `${Math.floor(88500000000 + Math.random() * 99999999)}`,
                price: 50,
                cost: 20,
                stock: 20,
                minStock: 5,
                category: 'ทั่วไป',
                description: '',
              });
              setIsNewProduct(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มสินค้าใหม่</span>
          </button>
        </div>
      </div>

      {/* Realtime Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">สินค้า</th>
                <th className="py-3 px-4">หมวดหมู่</th>
                <th className="py-3 px-4 font-mono">บาร์โค้ด</th>
                <th className="py-3 px-4 text-right">ราคาขาย</th>
                <th className="py-3 px-4 text-right">ต้นทุน</th>
                <th className="py-3 px-4 text-center">คงเหลือ (สต็อก)</th>
                <th className="py-3 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((item) => {
                const isOut = item.stock <= 0;
                const isLow = item.stock > 0 && item.stock <= item.minStock;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {item.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {item.barcode}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                      ฿{item.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      ฿{item.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold px-2.5 py-1 rounded-lg text-xs ${
                            isOut
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                              : isLow
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {item.stock} ชิ้น
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick adjust stock button */}
                        <button
                          onClick={() => setStockAdjustModal({ product: item, amount: 10 })}
                          title="ปรับเพิ่ม/ลดสต็อก"
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          <span>ปรับสต็อก</span>
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => {
                            setEditingProduct({ ...item });
                            setIsNewProduct(false);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                    <p className="text-xs">ไม่พบข้อมูลสินค้า</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / CREATE PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg text-white mb-4">
              {isNewProduct ? 'เพิ่มสินค้าใหม่ลงระบบ' : `แก้ไขข้อมูลสินค้า: ${editingProduct.name}`}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">ชื่อสินค้า *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="เช่น อเมริกาโน่เย็น, ครัวซองต์..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">หมวดหมู่</label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    placeholder="เช่น เครื่องดื่ม, เบเกอรี่..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">บาร์โค้ด</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">ราคาขาย (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.price ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">ต้นทุน (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.cost ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">จำนวนสต็อกคงเหลือ</label>
                  <input
                    type="number"
                    value={editingProduct.stock ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">จุดเตือนสต็อกใกล้หมด</label>
                  <input
                    type="number"
                    value={editingProduct.minStock ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">คำอธิบายสินค้า</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="รายละเอียด ส่วนผสม หรือคุณสมบัติ..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUST MODAL */}
      {stockAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-xs">
            <h3 className="font-extrabold text-base text-white mb-1">
              ปรับปรุงสต็อกสินค้า
            </h3>
            <p className="text-slate-400 mb-4">{stockAdjustModal.product.name}</p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center mb-4">
              <span className="text-slate-400">สต็อกปัจจุบัน:</span>
              <span className="font-mono font-bold text-base text-white">{stockAdjustModal.product.stock} ชิ้น</span>
            </div>

            <div className="space-y-3">
              <label className="block font-semibold text-slate-300">
                จำนวนที่ต้องการปรับ (+ หรือ -)
              </label>
              <input
                type="number"
                value={stockAdjustModal.amount}
                onChange={(e) => setStockAdjustModal({ ...stockAdjustModal, amount: Number(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
              />

              <div className="flex gap-2">
                {[+5, +10, +25, -1, -5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStockAdjustModal({ ...stockAdjustModal, amount: preset })}
                    className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold"
                  >
                    {preset > 0 ? `+${preset}` : preset}
                  </button>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex justify-between items-center text-indigo-300 font-semibold">
                <span>สต็อกใหม่หลังปรับ:</span>
                <span className="font-mono font-bold text-sm">
                  {Math.max(0, stockAdjustModal.product.stock + stockAdjustModal.amount)} ชิ้น
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setStockAdjustModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmStockAdjust}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>ยืนยันการปรับ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
