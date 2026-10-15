import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  query,
  orderBy,
  limit,
  getDocFromServer,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Order, TerminalPresence, CartItem, PaymentMethod } from '../types/pos';
import { INITIAL_PRODUCTS } from '../data/seedProducts';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: getFirestore with firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Export project metadata for UI display
export const FIREBASE_PROJECT_INFO = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  appId: firebaseConfig.appId,
  userEmail: 'kamkokaewthodsawat@gmail.com',
  plan: 'Google AI Pro Plan',
};

// Error handling as strictly required by Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'cashier-session',
      email: auth.currentUser?.email || FIREBASE_PROJECT_INFO.userEmail,
      emailVerified: auth.currentUser?.emailVerified ?? true,
      isAnonymous: auth.currentUser?.isAnonymous ?? false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [{ providerId: 'google.com', email: FIREBASE_PROJECT_INFO.userEmail }],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: Test connection probe to Firestore
export async function testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    // Attempt ping probe on test document
    await setDoc(doc(db, 'test', 'connection'), {
      ping: Timestamp.now(),
      terminalUser: FIREBASE_PROJECT_INFO.userEmail,
      project: FIREBASE_PROJECT_INFO.projectId,
    });
    const snapshot = await getDocFromServer(doc(db, 'test', 'connection'));
    const latency = Date.now() - startTime;
    return { connected: snapshot.exists(), latencyMs: latency };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.warn('Firestore probe warning (may be offline or initializing):', error);
    return {
      connected: false,
      latencyMs: latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Subscribe to real-time products
export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const productsCol = collection(db, 'products');
  return onSnapshot(
    productsCol,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          name: data.name || '',
          barcode: data.barcode || '',
          price: Number(data.price) || 0,
          cost: Number(data.cost) || 0,
          stock: Number(data.stock) || 0,
          minStock: Number(data.minStock) || 0,
          category: data.category || 'ทั่วไป',
          image: data.image,
          description: data.description,
          updatedAt: data.updatedAt,
        });
      });
      // Sort by name or category
      items.sort((a, b) => a.name.localeCompare(b.name, 'th'));
      onData(items);
    },
    (error) => {
      console.error('Error listening to products:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );
}

// Subscribe to real-time orders
export function subscribeToOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          orderNumber: data.orderNumber || d.id,
          cashier: data.cashier || FIREBASE_PROJECT_INFO.userEmail,
          terminalId: data.terminalId || 'POS-01',
          items: data.items || [],
          subtotal: Number(data.subtotal) || 0,
          tax: Number(data.tax) || 0,
          discount: Number(data.discount) || 0,
          total: Number(data.total) || 0,
          received: Number(data.received) || 0,
          change: Number(data.change) || 0,
          paymentMethod: data.paymentMethod || 'cash',
          status: data.status || 'completed',
          itemCount: Number(data.itemCount) || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          notes: data.notes,
        });
      });
      onData(list);
    },
    (error) => {
      console.error('Error listening to orders:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

// Subscribe to real-time terminal heartbeats
export function subscribeToHeartbeats(
  onData: (heartbeats: TerminalPresence[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'syncHeartbeats');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: TerminalPresence[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          terminalId: d.id,
          cashierEmail: data.cashierEmail || '',
          lastPing: data.lastPing || '',
          activeCartItemsCount: Number(data.activeCartItemsCount) || 0,
          status: data.status || 'idle',
        });
      });
      onData(list);
    },
    (error) => {
      console.error('Error listening to heartbeats:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'syncHeartbeats');
    }
  );
}

// Seed initial products to Firestore
export async function seedInitialProductsIfEmpty(force = false): Promise<number> {
  const productsCol = collection(db, 'products');
  const existing = await getDocs(productsCol);

  if (existing.size > 0 && !force) {
    return existing.size;
  }

  let count = 0;
  for (const item of INITIAL_PRODUCTS) {
    const docRef = doc(db, 'products', item.id);
    await setDoc(docRef, {
      ...item,
      updatedAt: new Date().toISOString(),
    });
    count++;
  }
  return count;
}

// Update single product details
export async function saveProduct(product: Product): Promise<void> {
  try {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, {
      name: product.name,
      barcode: product.barcode,
      price: Number(product.price),
      cost: Number(product.cost),
      stock: Number(product.stock),
      minStock: Number(product.minStock),
      category: product.category,
      description: product.description || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

// Adjust stock quantity
export async function adjustProductStock(productId: string, adjustment: number): Promise<number> {
  try {
    return await runTransaction(db, async (transaction) => {
      const docRef = doc(db, 'products', productId);
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists()) {
        throw new Error('ไม่พบสินค้าในระบบ');
      }
      const currentStock = Number(snapshot.data().stock) || 0;
      const nextStock = currentStock + adjustment;
      if (nextStock < 0) {
        throw new Error(`สต็อกไม่เพียงพอ (มี ${currentStock} ชิ้น, ต้องการปรับลด ${Math.abs(adjustment)} ชิ้น)`);
      }
      transaction.update(docRef, {
        stock: nextStock,
        updatedAt: new Date().toISOString(),
      });
      return nextStock;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}

// Authoritative checkout transaction
export async function executeCheckoutTransaction(params: {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  received: number;
  change: number;
  paymentMethod: PaymentMethod;
  cashierEmail: string;
  terminalId: string;
  notes?: string;
}): Promise<Order> {
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderNumber = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const createdOrder = await runTransaction(db, async (transaction) => {
      // 1. Read all product docs to verify stock and prices
      const productDocs: { ref: any; snapshot: any; item: CartItem }[] = [];

      for (const item of params.cart) {
        const ref = doc(db, 'products', item.product.id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) {
          throw new Error(`สินค้า "${item.product.name}" ไม่พบในฐานข้อมูล`);
        }
        const dbStock = Number(snapshot.data().stock) || 0;
        if (dbStock < item.quantity) {
          throw new Error(`สินค้า "${item.product.name}" มีสต็อกไม่พอ (เหลือ ${dbStock} ชิ้น, ในตะกร้ามี ${item.quantity} ชิ้น)`);
        }
        productDocs.push({ ref, snapshot, item });
      }

      // 2. Deduct inventory atomically
      for (const { ref, snapshot, item } of productDocs) {
        const dbStock = Number(snapshot.data().stock) || 0;
        transaction.update(ref, {
          stock: dbStock - item.quantity,
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Prepare order record
      const orderData: Order = {
        id: orderId,
        orderNumber,
        cashier: params.cashierEmail || FIREBASE_PROJECT_INFO.userEmail,
        terminalId: params.terminalId,
        items: params.cart.map((c) => ({
          productId: c.product.id,
          name: c.product.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          total: c.total,
        })),
        subtotal: params.subtotal,
        tax: params.tax,
        discount: params.discount,
        total: params.total,
        received: params.received,
        change: params.change,
        paymentMethod: params.paymentMethod,
        status: 'completed',
        itemCount: params.cart.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: new Date().toISOString(),
        notes: params.notes || '',
      };

      const orderRef = doc(db, 'orders', orderId);
      transaction.set(orderRef, orderData);

      return orderData;
    });

    return createdOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

// Void or Refund an order with atomic stock restoration
export async function refundOrVoidOrder(orderId: string, action: 'refunded' | 'voided', reason: string): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('ไม่พบข้อมูลคำสั่งซื้อ');
      }

      const orderData = orderSnap.data() as Order;
      if (orderData.status !== 'completed') {
        throw new Error(`ไม่สามารถดำเนินการได้ เนื่องจากสถานะปัจจุบันคือ ${orderData.status}`);
      }

      // Restore inventory
      for (const item of orderData.items) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await transaction.get(pRef);
        if (pSnap.exists()) {
          const currentStock = Number(pSnap.data().stock) || 0;
          transaction.update(pRef, {
            stock: currentStock + item.quantity,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Update order status
      transaction.update(orderRef, {
        status: action,
        notes: `${orderData.notes || ''} [${action.toUpperCase()}: ${reason} เมื่อ ${new Date().toLocaleString('th-TH')}]`,
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }
}

// Update terminal heartbeat
export async function sendTerminalHeartbeat(presence: TerminalPresence): Promise<void> {
  try {
    const docRef = doc(db, 'syncHeartbeats', presence.terminalId);
    await setDoc(docRef, {
      ...presence,
      lastPing: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('Heartbeat send failed:', error);
  }
}
