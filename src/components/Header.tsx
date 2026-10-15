import React from 'react';
import { 
  Store, 
  Wifi, 
  WifiOff, 
  Activity, 
  Database, 
  ShoppingCart, 
  Package, 
  Receipt, 
  RefreshCw, 
  MonitorCheck, 
  ShieldCheck 
} from 'lucide-react';
import { FIREBASE_PROJECT_INFO } from '../services/firebase';

interface HeaderProps {
  currentTab: 'pos' | 'inventory' | 'orders' | 'realtime';
  setCurrentTab: (tab: 'pos' | 'inventory' | 'orders' | 'realtime') => void;
  cartCount: number;
  isConnected: boolean;
  latencyMs: number;
  onRefreshProbe: () => void;
  terminalId: string;
  setTerminalId: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  cartCount,
  isConnected,
  latencyMs,
  onRefreshProbe,
  terminalId,
  setTerminalId,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                PRODX<span className="text-amber-400 font-black">POS</span>
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Cloud Realtime
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Database className="w-3 h-3 text-indigo-400" />
                Firebase: <code className="text-indigo-300 font-mono text-[11px] font-semibold">{FIREBASE_PROJECT_INFO.projectId}</code>
              </span>
              <span className="text-slate-600">•</span>
              <span className="truncate max-w-[180px] sm:max-w-none text-slate-400">
                {FIREBASE_PROJECT_INFO.userEmail}
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setCurrentTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>หน้าขาย (POS)</span>
            {cartCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>คลังสินค้า & สต็อก</span>
          </button>

          <button
            onClick={() => setCurrentTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'orders'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>ประวัติการขาย</span>
          </button>

          <button
            onClick={() => setCurrentTab('realtime')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'realtime'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>ซิงค์เรียลไทม์</span>
          </button>
        </nav>

        {/* Realtime Status Badges & Terminal Selector */}
        <div className="flex items-center gap-2">
          {/* Terminal Picker */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
            <MonitorCheck className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={terminalId}
              onChange={(e) => setTerminalId(e.target.value)}
              aria-label="เลือกเครื่องคิดเงิน (Terminal)"
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="POS-01" className="bg-slate-900 text-white">เครื่อง 01 (เคาน์เตอร์หลัก)</option>
              <option value="POS-02" className="bg-slate-900 text-white">เครื่อง 02 (จุดสั่งกาแฟ)</option>
              <option value="POS-03" className="bg-slate-900 text-white">เครื่อง 03 (แท็บเล็ตบาร์)</option>
            </select>
          </div>

          {/* Cloud Sync Status */}
          <button
            onClick={onRefreshProbe}
            title="กดเพื่อทดสอบความเร็วและสัญญาณ Realtime Database"
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400 hover:bg-rose-900/30'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="font-semibold">{isConnected ? `${latencyMs}ms` : 'Offline'}</span>
            <RefreshCw className="w-3 h-3 text-slate-400 hover:text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};
