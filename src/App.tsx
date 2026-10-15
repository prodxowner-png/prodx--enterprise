import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { PosRegister } from './components/PosRegister';
import { InventoryManager } from './components/InventoryManager';
import { OrdersHistory } from './components/OrdersHistory';
import { RealtimeSyncMonitor } from './components/RealtimeSyncMonitor';
import { Product, Order, TerminalPresence, SyncLogEvent } from './types/pos';
import {
  testConnection,
  subscribeToProducts,
  subscribeToOrders,
  subscribeToHeartbeats,
  seedInitialProductsIfEmpty,
  sendTerminalHeartbeat,
  FIREBASE_PROJECT_INFO,
} from './services/firebase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'pos' | 'inventory' | 'orders' | 'realtime'>('pos');
  const [terminalId, setTerminalId] = useState<string>('POS-01');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [terminals, setTerminals] = useState<TerminalPresence[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [syncEvents, setSyncEvents] = useState<SyncLogEvent[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Helper to add realtime event to ticker
  const logSyncEvent = useCallback((type: SyncLogEvent['type'], message: string) => {
    const event: SyncLogEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      type,
      message,
    };
    setSyncEvents((prev) => [event, ...prev.slice(0, 39)]);
  }, []);

  // Probe connection
  const runProbe = useCallback(async () => {
    const res = await testConnection();
    setIsConnected(res.connected);
    setLatencyMs(res.latencyMs);
    if (res.connected) {
      logSyncEvent('heartbeat', `ทดสอบการเชื่อมต่อ Firebase สำเร็จ (${res.latencyMs}ms)`);
    } else {
      logSyncEvent('heartbeat', `การเชื่อมต่อขัดข้อง: ${res.error || 'Offline'}`);
    }
  }, [logSyncEvent]);

  // Initial startup: test connection and seed products if needed
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const probeResult = await testConnection();
        if (mounted) {
          setIsConnected(probeResult.connected);
          setLatencyMs(probeResult.latencyMs);
          logSyncEvent('heartbeat', `เชื่อมต่อ Firebase Project ${FIREBASE_PROJECT_INFO.projectId} สำเร็จ (${probeResult.latencyMs}ms)`);
        }

        // Seed products if collection is empty
        await seedInitialProductsIfEmpty(false);
      } catch (err) {
        console.warn('Initial init note:', err);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [logSyncEvent]);

  // Attach Realtime Listeners
  useEffect(() => {
    const unsubProducts = subscribeToProducts((newProducts) => {
      setProducts(newProducts);
      logSyncEvent('read', `ซิงค์สินค้าล่าสุด ${newProducts.length} รายการจาก Firestore`);
    });

    const unsubOrders = subscribeToOrders((newOrders) => {
      setOrders(newOrders);
      logSyncEvent('read', `ซิงค์รายการขายล่าสุด ${newOrders.length} บิลจาก Firestore`);
    });

    const unsubHeartbeats = subscribeToHeartbeats((beats) => {
      setTerminals(beats);
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubHeartbeats();
    };
  }, [logSyncEvent]);

  // Terminal heartbeat broadcaster (every 8 seconds)
  useEffect(() => {
    const sendPulse = () => {
      sendTerminalHeartbeat({
        terminalId,
        cashierEmail: FIREBASE_PROJECT_INFO.userEmail,
        lastPing: new Date().toISOString(),
        activeCartItemsCount: 0,
        status: 'online',
      });
    };

    sendPulse();
    const interval = setInterval(sendPulse, 8000);
    return () => clearInterval(interval);
  }, [terminalId]);

  // Handle order completion callback
  const handleOrderCompleted = (order: Order) => {
    logSyncEvent(
      'order_completed',
      `บันทึกคำสั่งซื้อใหม่ #${order.orderNumber} ยอด ฿${order.total.toFixed(2)} (${order.paymentMethod})`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation & Status Bar */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cartCount={0}
        isConnected={isConnected}
        latencyMs={latencyMs}
        onRefreshProbe={runProbe}
        terminalId={terminalId}
        setTerminalId={setTerminalId}
      />

      {/* Main Workspace Content */}
      <main className="flex-1">
        {currentTab === 'pos' && (
          <PosRegister
            products={products}
            terminalId={terminalId}
            onOrderCompleted={handleOrderCompleted}
            onRefreshData={runProbe}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryManager
            products={products}
            onRefresh={runProbe}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersHistory
            orders={orders}
          />
        )}

        {currentTab === 'realtime' && (
          <RealtimeSyncMonitor
            terminals={terminals}
            currentTerminalId={terminalId}
            isConnected={isConnected}
            latencyMs={latencyMs}
            syncEvents={syncEvents}
            onTriggerProbe={runProbe}
            productsCount={products.length}
            ordersCount={orders.length}
          />
        )}
      </main>

      {/* Footer Info Strip */}
      <footer className="border-t border-slate-900 bg-slate-950/60 px-4 py-2.5 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">PRODX-POS v2.0</span>
          <span>•</span>
          <span>Firebase Realtime Database: <code className="text-indigo-400 font-mono">{FIREBASE_PROJECT_INFO.projectId}</code></span>
        </div>
        <div className="flex items-center gap-2">
          <span>ผู้ใช้งาน: <span className="text-slate-300 font-semibold">{FIREBASE_PROJECT_INFO.userEmail}</span> ({FIREBASE_PROJECT_INFO.plan})</span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Realtime Synced
          </span>
        </div>
      </footer>
    </div>
  );
}
