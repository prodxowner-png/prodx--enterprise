export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  image?: string;
  description?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  itemDiscount?: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'promptpay' | 'card' | 'transfer';
export type OrderStatus = 'completed' | 'voided' | 'refunded';

export interface OrderItemRecord {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  cashier: string;
  terminalId: string;
  items: OrderItemRecord[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  received: number;
  change: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  itemCount: number;
  createdAt: string;
  notes?: string;
}

export interface TerminalPresence {
  terminalId: string;
  cashierEmail: string;
  lastPing: string;
  activeCartItemsCount: number;
  status: 'online' | 'idle' | 'checkout';
}

export interface SyncLogEvent {
  id: string;
  timestamp: string;
  type: 'read' | 'write' | 'stock_change' | 'order_completed' | 'heartbeat';
  message: string;
  details?: Record<string, unknown>;
}
