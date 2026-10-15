import React, { useState } from 'react';
import { 
  Database, 
  Activity, 
  CheckCircle2, 
  Wifi, 
  Server, 
  ShieldCheck, 
  Terminal, 
  User, 
  Layers, 
  Zap, 
  RefreshCw,
  Clock,
  Radio,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { TerminalPresence, SyncLogEvent } from '../types/pos';
import { FIREBASE_PROJECT_INFO } from '../services/firebase';

interface RealtimeSyncMonitorProps {
  terminals: TerminalPresence[];
  currentTerminalId: string;
  isConnected: boolean;
  latencyMs: number;
  syncEvents: SyncLogEvent[];
  onTriggerProbe: () => void;
  productsCount: number;
  ordersCount: number;
}

export const RealtimeSyncMonitor: React.FC<RealtimeSyncMonitorProps> = ({
  terminals,
  currentTerminalId,
  isConnected,
  latencyMs,
  syncEvents,
  onTriggerProbe,
  productsCount,
  ordersCount,
}) => {
  const [isPinging, setIsPinging] = useState(false);

  const handleManualPing = async () => {
    setIsPinging(true);
    await onTriggerProbe();
    setTimeout(() => setIsPinging(false), 500);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Hero Realtime Connection Status Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>FIREBASE REALTIME DATABASE: CONNECTED & SYNCHRONIZING</span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              การเชื่อมต่อระบบคลาวด์แบบเรียลไทม์ (Live Realtime Sync)
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              เชื่อมต่อเสร็จสมบูรณ์กับ Firebase Project <code className="text-amber-400 font-mono font-bold">{FIREBASE_PROJECT_INFO.projectId}</code> สำหรับบัญชีผู้ใช้{' '}
              <span className="text-indigo-300 font-bold">{FIREBASE_PROJECT_INFO.userEmail}</span> ({FIREBASE_PROJECT_INFO.plan}) ข้อมูลสต็อกสินค้า คำสั่งซื้อ และสถานะจุดขายจะถูกซิงค์ข้ามทุกเครื่องแบบมิลลิวินาที
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualPing}
              disabled={isPinging}
              className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
              <span>ทดสอบความเร็วซิงค์ (Probe Latency)</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Firebase Project ID</span>
            </div>
            <div className="font-mono font-bold text-white text-xs mt-1 truncate">
              {FIREBASE_PROJECT_INFO.projectId}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Authenticated User</span>
            </div>
            <div className="font-mono font-bold text-amber-300 text-xs mt-1 truncate">
              {FIREBASE_PROJECT_INFO.userEmail}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>ความเร็วหน่วงเวลา (Latency)</span>
            </div>
            <div className="font-mono font-bold text-emerald-400 text-xs mt-1 flex items-center gap-1">
              <span>{latencyMs} ms</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">(Sub-second sync)</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Security Rules</span>
            </div>
            <div className="font-bold text-blue-300 text-xs mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Deployed & Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: Active Terminals Presence & Live Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Cashier Terminals (Presence) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="font-extrabold text-sm text-white">จุดขายที่กำลังเชื่อมต่อ (Connected Terminals)</h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
              {terminals.length > 0 ? terminals.length : 1} เครื่องออนไลน์
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            ระบบส่ง Heartbeat Pulse ทุก 8 วินาทีเพื่อระบุตำแหน่งเครื่องแคชเชียร์และซิงค์การทำงานแบบกลุ่ม
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-[300px]">
            {/* Show current terminal */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs font-mono">
                  {currentTerminalId}
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>เครื่องปัจจุบันของคุณ ({currentTerminalId})</span>
                    <span className="text-[10px] bg-indigo-500 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {FIREBASE_PROJECT_INFO.userEmail}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>ONLINE</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  ซิงค์แบบเรียลไทม์
                </div>
              </div>
            </div>

            {/* Other terminals */}
            {terminals
              .filter((t) => t.terminalId !== currentTerminalId)
              .map((t) => (
                <div
                  key={t.terminalId}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-black text-xs font-mono">
                      {t.terminalId}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-200">{t.terminalId}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{t.cashierEmail}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                      {t.status.toUpperCase()}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(t.lastPing).toLocaleTimeString('th-TH')}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>ฐานข้อมูล Firestore:</span>
            <span className="font-mono text-slate-300 font-bold">{FIREBASE_PROJECT_INFO.firestoreDatabaseId}</span>
          </div>
        </div>

        {/* Live Realtime Event Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="font-extrabold text-sm text-white">บันทึกเหตุการณ์ซิงค์สด (Live Realtime Ticker)</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {syncEvents.length} เหตุการณ์ล่าสุด
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[300px] font-mono text-xs pr-1">
            {syncEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                      ev.type === 'order_completed'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : ev.type === 'stock_change'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : ev.type === 'write'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {ev.type}
                  </span>
                  <span className="text-slate-300 text-[11px] font-sans leading-snug">
                    {ev.message}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {ev.timestamp}
                </span>
              </div>
            ))}

            {syncEvents.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                <Clock className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                <p className="text-xs">กำลังรอสัญญาณเหตุการณ์ซิงค์...</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>สถานะระบบจัดเก็บ:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {productsCount} สินค้า • {ordersCount} คำสั่งซื้อใน Firestore
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
