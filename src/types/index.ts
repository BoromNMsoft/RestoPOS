export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string;
  stock: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  total: number;
  amount_received: number;
  change_given: number;
  payment_method: string;
  created_at: string;
  cashier_id?: string;
  cashier_name?: string;
  station_id?: string;
  station_name?: string;
  items?: SaleItem[];
  note?: string;
  order_type?: OrderType;
  is_from_order?: boolean;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// ── Commandes ──────────────────────────────────────────────

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';


export interface Order {
  id: string;
  order_type: OrderType;
  status: OrderStatus;
  total: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  note?: string | null;
  cashier_id?: string | null;
  cashier_name?: string | null;
  station_id?: string | null;
  station_name?: string | null;
  cancel_reason?: string | null;   // ← ajoute
  sale_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// ── Vues ───────────────────────────────────────────────────

export type ViewType = 'pos' | 'dashboard' | 'products' | 'settings' | 'history' | 'closure' | 'orders';

// ── Helpers ────────────────────────────────────────────────

export const formatSaleId = (sale: { id: string; station_name?: string | null }) => {
  const shortId = sale.id.slice(0, 8).toUpperCase();
  if (!sale.station_name) return `#${shortId}`;
  const prefix = sale.station_name.replace(/\s+/g, '-').toUpperCase();
  return `${prefix}-${shortId}`;
};

// Libellés lisibles pour l'affichage
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: 'Sur place',
  takeaway: 'À emporter',
  delivery: 'Livraison',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Récupérée',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

