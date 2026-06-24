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

export type ViewType = 'pos' | 'dashboard' | 'products' | 'settings' | 'history' | 'closure';

export const formatSaleId = (sale: { id: string; station_name?: string | null }) => {
  const shortId = sale.id.slice(0, 8).toUpperCase();
  if (!sale.station_name) return `#${shortId}`;
  const prefix = sale.station_name.replace(/\s+/g, '-').toUpperCase();
  return `${prefix}-${shortId}`;
};