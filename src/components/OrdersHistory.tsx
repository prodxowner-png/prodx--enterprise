import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  RotateCcw, 
  Printer, 
  CheckCircle2, 
  Ban, 
  Eye, 
  Calendar, 
  CreditCard, 
  QrCode, 
  Banknote,
  DollarSign,
  TrendingUp,
  X,
  AlertTriangle
} from 'lucide-react';
import { Order } from '../types/pos';
import { refundOrVoidOrder, FIREBASE_PROJECT_INFO } from '../services/firebase';

interface OrdersHistoryProps {
  orders: Order[];
}

export const OrdersHistory: React.FC<OrdersHistoryProps> = ({ orders }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('ลูกค้ายกเลิกสินค้า');
  const [refundAction, setRefundAction] = useState<'refunded' | 'voided'>('refunded');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Financial summary metrics
  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'completed'), [orders]);

  const totalRevenue = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + o.total, 0);
  }, [completedOrders]);

  const avgOrderValue = useMemo(() => {
    if (completedOrders.length === 0) return 0;
    return totalRevenue / completedOrders.length;
  }, [completedOrders, totalRevenue]);

  const promptPayTotal = useMemo(() => {
    return completedOrders
      .filter((o) => o.paymentMethod === 'promptpay')
      .reduce((sum, o) => sum + o.total, 0);
  }, [completedOrders]);

  const cashTotal = useMemo(() => {
    return completedOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + o.total, 0);
  }, [completedOrders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchQuery =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.cashier.toLowerCase().includes(search.toLowerCase()) ||
        o.paymentMethod.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [orders, statusFilter, search]);

  const handleConfirmRefund = async () => {
    if (!refundModalOrder) return;
    setIsProcessing(true);
    try {
      await refundOrVoidOrder(refundModalOrder.id, refundAction, refundReason);
      setStatusNotice(`ทำรายการ ${refundAction === 'refunded' ? 'คืนเงิน' : 'ยกเลิกบิล'} และคืนสต็อกสำเร็จ`);
      setRefundModalOrder(null);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการคืนเงิน');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-5">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">ยอดขายรวมสุทธิ (Firebase)</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              ฿{totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">จำนวนออเดอร์สำเร็จ</div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {completedOrders.length} บิล
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">ยอดขายเฉลี่ยต่อบิล</div>
            <div className="text-2xl font-black text-indigo-300 font-mono mt-1">
              ฿{avgOrderValue.toFixed(2)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-950/50 text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">PromptPay / เงินสด</div>
            <div className="text-sm font-black text-slate-200 font-mono mt-1">
              QR: <span className="text-blue-400">฿{promptPayTotal.toFixed(0)}</span> | Cash: <span className="text-emerald-400">฿{cashTotal.toFixed(0)}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
        </div>
      </div>

      {statusNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่ใบเสร็จ, แคชเชียร์, วิธีชำระ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'completed', label: 'สำเร็จ' },
            { id: 'refunded', label: 'คืนเงินแล้ว' },
            { id: 'voided', label: 'ยกเลิก (Void)' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">เลขที่ใบเสร็จ</th>
                <th className="py-3 px-4">วันที่ / เวลา</th>
                <th className="py-3 px-4">เครื่อง / แคชเชียร์</th>
                <th className="py-3 px-4">รายการสินค้า</th>
                <th className="py-3 px-4">วิธีชำระ</th>
                <th className="py-3 px-4 text-right">ยอดเงินรวม</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                    {ord.orderNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(ord.createdAt).toLocaleString('th-TH')}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px]">
                    <span className="font-semibold">{ord.terminalId}</span>
                    <span className="text-slate-500 ml-1">({ord.cashier.split('@')[0]})</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-200">{ord.itemCount} ชิ้น</span>
                    <span className="text-slate-500 truncate block max-w-xs text-[10px]">
                      {ord.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 uppercase">
                      {ord.paymentMethod === 'promptpay' && <QrCode className="w-3 h-3 text-blue-400" />}
                      {ord.paymentMethod === 'cash' && <Banknote className="w-3 h-3 text-emerald-400" />}
                      {ord.paymentMethod === 'card' && <CreditCard className="w-3 h-3 text-amber-400" />}
                      <span>{ord.paymentMethod}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                    ฿{ord.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ord.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                          : ord.status === 'refunded'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {ord.status === 'completed' ? 'สำเร็จ' : ord.status === 'refunded' ? 'คืนเงิน' : 'ยกเลิก'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedReceipt(ord)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>ใบเสร็จ</span>
                      </button>

                      {ord.status === 'completed' && (
                        <button
                          onClick={() => {
                            setRefundModalOrder(ord);
                            setRefundAction('refunded');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>คืนเงิน</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                    <p className="text-xs">ยังไม่มีรายการขายในสถานะนี้</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT VIEW MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
              <h2 className="font-extrabold text-base tracking-wider uppercase">PRODX-POS STORE</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Firebase Project: {FIREBASE_PROJECT_INFO.projectId}</p>
              <div className="text-[10px] text-slate-600 mt-2">
                <div>ใบเสร็จรับเงิน (สำเนา)</div>
                <div className="font-bold text-slate-800">{selectedReceipt.orderNumber}</div>
                <div>{new Date(selectedReceipt.createdAt).toLocaleString('th-TH')}</div>
                <div>เครื่อง: {selectedReceipt.terminalId} • แคชเชียร์: {selectedReceipt.cashier.split('@')[0]}</div>
                <div className={`mt-1 font-bold ${selectedReceipt.status === 'completed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  สถานะ: {selectedReceipt.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="py-3 border-b-2 border-dashed border-slate-300 space-y-1.5 max-h-48 overflow-y-auto">
              {selectedReceipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="flex-1 pr-2">
                    <div className="font-bold">{it.name}</div>
                    <div className="text-slate-500 text-[10px]">{it.quantity} x ฿{it.unitPrice.toFixed(2)}</div>
                  </div>
                  <div className="font-bold">฿{it.total.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="py-2.5 border-b-2 border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>ยอดรวมสินค้า</span>
                <span>฿{selectedReceipt.subtotal.toFixed(2)}</span>
              </div>
              {selectedReceipt.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>ส่วนลด</span>
                  <span>-฿{selectedReceipt.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                <span>฿{selectedReceipt.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                <span>ยอดสุทธิ</span>
                <span>฿{selectedReceipt.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                <span>ชำระโดย: {selectedReceipt.paymentMethod.toUpperCase()}</span>
                <span>รับมา: ฿{selectedReceipt.received.toFixed(2)}</span>
              </div>
              {selectedReceipt.change > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>เงินทอน</span>
                  <span>฿{selectedReceipt.change.toFixed(2)}</span>
                </div>
              )}
            </div>

            {selectedReceipt.notes && (
              <div className="pt-2 text-[10px] text-slate-500 italic">
                หมายเหตุ: {selectedReceipt.notes}
              </div>
            )}

            <div className="mt-5 flex gap-2 font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบเสร็จ</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-300"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND / VOID MODAL */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-xs">
            <h3 className="font-extrabold text-base text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>ยืนยันการคืนเงินหรือยกเลิกบิล</span>
            </h3>
            <p className="text-slate-400 mb-4 font-mono">{refundModalOrder.orderNumber}</p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>ยอดเงินที่ต้องคืนลูกค้า:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">฿{refundModalOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>สินค้าที่จะคืนเข้าสต็อก:</span>
                <span className="font-mono text-white">{refundModalOrder.itemCount} ชิ้น</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">ประเภทการทำรายการ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundAction('refunded')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      refundAction === 'refunded'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    คืนเงิน (Refund)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundAction('voided')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      refundAction === 'voided'
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    ยกเลิกบิล (Void)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">เหตุผลในการทำรายการ</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="ลูกค้ายกเลิกสินค้า">ลูกค้ายกเลิกสินค้า</option>
                  <option value="คิดเงินผิดพลาด/คีย์ซ้ำ">คิดเงินผิดพลาด / คีย์ซ้ำ</option>
                  <option value="สินค้าชำรุดหรือมีตำหนิ">สินค้าชำรุดหรือมีตำหนิ</option>
                  <option value="เปลี่ยนวิธีการชำระเงิน">เปลี่ยนวิธีการชำระเงิน</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setRefundModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmRefund}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 disabled:opacity-50"
              >
                {isProcessing ? 'กำลังประมวลผล...' : 'ยืนยันคืนเงินและสต็อก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
