import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { Product, Category, CartItem, Sale, ViewType } from './types';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import CartPanel from './components/CartPanel';
import Calculator from './components/Calculator';
import ReceiptModal from './components/ReceiptModal';
import Dashboard from './components/Dashboard';
import ProductManagement from './components/ProductManagement';
import LoginScreen from './components/LoginScreen';
import SettingsPanel from './components/SettingsPanel';
import { ShieldAlert, LogOut } from 'lucide-react';

function AppContent() {
  const { authUser, loading: authLoading, signOut } = useAuth();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [currentView, setCurrentView] = useState<ViewType>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  // If cashier, force POS view
  const effectiveView = authUser?.role === 'cashier' && currentView !== 'pos' ? 'pos' : currentView;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes, salesRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').order('created_at', { ascending: false }).limit(100),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (salesRes.data) setSales(salesRes.data as Sale[]);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) {
      fetchData();
    } else {
      setProducts([]);
      setCategories([]);
      setCart([]);
      setSales([]);
      setLoading(false);
    }
  }, [authUser, fetchData]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const handleCheckout = useCallback(async (amountReceived: number, changeGiven: number) => {
    if (cart.length === 0) return;

    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          total: cartTotal,
          amount_received: amountReceived,
          change_given: changeGiven,
          payment_method: 'cash',
          cashier_id: authUser?.user.id,
          cashier_name: authUser?.fullName,
          station_id: authUser?.stationId,
          station_name: authUser?.stationName,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      for (const item of cart) {
        await supabase
          .from('products')
          .update({ stock: Math.max(0, item.product.stock - item.quantity) })
          .eq('id', item.product.id);
      }

      const completedSale: Sale = {
        ...sale,
        items: saleItems.map((si, i) => ({ id: `${sale.id}-${i}`, ...si })),
      };

      setReceiptSale(completedSale);
      setCart([]);
      fetchData();
    } catch (e) {
      console.error('Checkout error:', e);
    }
  }, [cart, cartTotal, authUser, fetchData]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <LoginScreen />
      </div>
    );
  }

  // ← Ajoute ce bloc juste après
  if (authUser.role === 'cashier' && (!authUser.stationId || authUser.stationActive === false)) {
    const isInactive = authUser.stationId && authUser.stationActive === false;
    return (
      <div className={`h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isInactive ? 'Poste inactif' : 'Aucun poste assigné'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {isInactive
              ? `Le poste "${authUser.stationName}" est actuellement inactif. Merci de contacter l'administrateur.`
              : "Vous n'êtes assigné à aucune caisse. Merci de contacter l'administrateur."
            }
          </p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold mx-auto hover:bg-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
      <Header
        currentView={effectiveView}
        onViewChange={setCurrentView}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
      />

      {effectiveView === 'pos' && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Products section ~75% */}
          <div className="w-3/4 min-h-0 flex flex-col border-r border-gray-200 dark:border-gray-800">
            <ProductGrid
              products={products}
              categories={categories}
              cart={cart}
              onAddToCart={addToCart}
              loading={loading}
            />
          </div>

          {/* Cart + Calculator section ~25% */}
          <div className="w-1/4 min-h-0 flex flex-col bg-white dark:bg-gray-900 min-w-[300px] overflow-hidden">
            <CartPanel
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              total={cartTotal}
            />
            <Calculator
              total={cartTotal}
              onCashCheckout={handleCheckout}
              disabled={cart.length === 0}
            />
          </div>
        </div>
      )}

      {effectiveView === 'dashboard' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <Dashboard sales={sales} />
        </div>
      )}
      {effectiveView === 'products' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ProductManagement products={products} categories={categories} onRefetch={fetchData} />
        </div>
      )}

      {effectiveView === 'settings' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <SettingsPanel />
        </div>
      )}

      {receiptSale && (
        <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
