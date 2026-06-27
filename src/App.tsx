import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { Product, Category, CartItem, Sale, ViewType, OrderType, Order } from './types';
import { useAuth } from './hooks/useAuth';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import CartPanel from './components/CartPanel';
import Calculator from './components/Calculator';
import ReceiptModal from './components/ReceiptModal';
import Dashboard from './components/Dashboard';
import ProductManagement from './components/ProductManagement';
import LoginScreen from './components/LoginScreen';
import SettingsPanel from './components/SettingsPanel';
import { ShieldAlert, LogOut, ClipboardList } from 'lucide-react';
import CashierHistory from './components/CashierHistory';
import CashClosure from './components/CashClosure';
import OrderModal from './components/OrderModal';
import OrdersView from './components/OrdersView';
import { Navigate } from 'react-router-dom';
import OrderTicketModal from './components/Orderticketmodal';

function AppContent() {
  const { authUser, loading: authLoading, signOut: authSignOut } = useAuth();

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderTicket, setOrderTicket] = useState<Order | null>(null);

  const signOut = useCallback(async () => {
    setCurrentView('pos'); // ← reset la vue avant déconnexion
    localStorage.removeItem('currentView'); // ← ajoute
    await authSignOut();
  }, [authSignOut]);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
       return window.matchMedia('(prefers-color-scheme: dark)').matches;
     }
     return false;
   });

  // const [darkMode, setDarkMode] = useState(false); //mode claire par defaut

  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('currentView') as ViewType;
    return saved ?? 'pos';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);


  // Ajoute un wrapper pour setter
  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    localStorage.setItem('currentView', view);
  }, []);

  // If cashier, force POS view
  const effectiveView = authUser?.role === 'cashier' && !['pos', 'history', 'orders'].includes(currentView) ? 'pos' : currentView;
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const [stations, setStations] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
     const [catRes, prodRes, salesRes, stationsRes, ordersRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').order('created_at', { ascending: false }).limit(100),
        supabase.from('pos_stations').select('*, cashier_assignments(cashier_id, profiles(full_name))').order('created_at'),
        supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false }).limit(200),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (salesRes.data) setSales(salesRes.data as Sale[]);
      if (stationsRes.data) setStations(stationsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
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
      setStations([]);
      setOrders([]);  // ← ajoutex
    }
  }, [authUser, fetchData]);

  useEffect(() => {
  if (!authUser) return;

    // Écoute les nouvelles ventes en temps réel
    const channel = supabase
      .channel('realtime-sales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, fetchData]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);

  const activeOrdersCount = useMemo(
    () => orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length,
    [orders]
  );

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;

      // Bloque si on atteint le stock max
      if (currentQty >= product.stock) return prev;

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
        .map(item => {
          if (item.product.id !== productId) return item;
          // Bloque si on dépasse le stock
          if (delta > 0 && item.quantity >= item.product.stock) return item;
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        })
        .filter(item => item.quantity > 0);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

 const handleCheckout = useCallback(async (
    amountReceived: number,
    changeGiven: number,
    method: 'cash' | 'card' = 'cash',
    note: string = '',
    orderType: 'dine_in' | 'takeaway' = 'dine_in'   // ← nouveau paramètre
  ) => {
    if (cart.length === 0) return;
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          total: cartTotal,
          amount_received: amountReceived,
          change_given: changeGiven,
          payment_method: method,
          note: note || null,
          order_type: orderType,        // ← type de service choisi
          is_from_order: false,         // ← vente directe au comptoir
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

  const handleCreateOrder = useCallback(async (orderData: {
    order_type: OrderType;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    note: string;
  }) => {
    if (cart.length === 0) return;

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: orderData.order_type,
          status: 'pending',
          total: cartTotal,
          customer_name: orderData.customer_name || null,
          customer_phone: orderData.customer_phone || null,
          delivery_address: orderData.delivery_address || null,
          note: orderData.note || null,
          cashier_id: authUser?.user.id,
          cashier_name: authUser?.fullName,
          station_id: authUser?.stationId,
          station_name: authUser?.stationName,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Construit la commande complète pour le bon de commande
      const completedOrder: Order = {
        ...order,
        items: orderItems.map((oi, i) => ({ id: `${order.id}-${i}`, ...oi })),
      };
      setOrderTicket(completedOrder);   // ← affiche le bon de commande

      setCart([]);
      setShowOrderModal(false);
    } catch (e) {
      console.error('Create order error:', e);
      throw e;
    }
  }, [cart, cartTotal, authUser, fetchData]);


 const handleCheckoutOrder = useCallback(async (order: Order, method: 'cash' | 'card') => {
  try {
    // 1. Crée la vente (montant = total, pas de monnaie)
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total: order.total,
        amount_received: order.total,
        change_given: 0,
        payment_method: method,
        note: order.note || null,
        order_type: order.order_type,   // ← type de la commande (peut être livraison)
        is_from_order: true,            // ← vient d'une commande
        cashier_id: authUser?.user.id,
        cashier_name: authUser?.fullName,
        station_id: authUser?.stationId,
        station_name: authUser?.stationName,
      })
      .select()
      .single();
    if (saleError) throw saleError;

    // 2. Copie les articles de la commande vers la vente
    const saleItems = (order.items ?? []).map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));
    if (saleItems.length > 0) {
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;
    }

    // 3. Décrémente le stock
    for (const item of order.items ?? []) {
      if (!item.product_id) continue;
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        await supabase
          .from('products')
          .update({ stock: Math.max(0, product.stock - item.quantity) })
          .eq('id', item.product_id);
      }
    }

    // 4. Relie la commande à la vente (paiement) — SANS changer le statut cuisine
    await supabase
      .from('orders')
      .update({ sale_id: sale.id, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    // 5. Affiche le reçu de la commande payée
    const completedSale: Sale = {
      ...sale,
      items: saleItems.map((si, i) => ({ id: `${sale.id}-${i}`, ...si })),
    };
    setReceiptSale(completedSale);

    fetchData();
  } catch (e) {
    console.error('Checkout order error:', e);
    throw e;
  }
}, [authUser, products, fetchData]);

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

  // Super-admin n'a rien à faire dans l'app resto → redirection vers la console
  if (authUser.role === 'super_admin') {
    return <Navigate to="/console" replace />;
  }

  if (authUser.restaurantSuspended) {
    return (
      <div className={`h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Accès suspendu</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            L'accès à ce POS a été temporairement suspendu. Merci de contacter le support.
          </p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold mx-auto hover:bg-gray-500 transition-colors"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold mx-auto hover:bg-gray-500 transition-colors"
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
        onViewChange={handleViewChange}  // ← ici
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        ordersCount={activeOrdersCount}   // ← ajoute
        onSignOut={signOut}
        restaurantName={authUser.restaurantName}   // ← ajoute
        restaurantLogo={authUser.restaurantLogo}   // ← ajoute
      />

      {effectiveView === 'orders' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <OrdersView onCheckoutOrder={handleCheckoutOrder} />
        </div>
      )}

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
              onNewOrder={() => setShowOrderModal(true)}
              disabled={cart.length === 0}
            />
          </div>
        </div>
      )}

      {effectiveView === 'history' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CashierHistory />
        </div>
      )}

      {effectiveView === 'dashboard' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <Dashboard sales={sales} stations={stations} orders={orders} />
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

      {effectiveView === 'closure' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CashClosure />
        </div>
      )}

      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          onClose={() => setReceiptSale(null)}
          restaurantName={authUser.restaurantName}
          restaurantLogo={authUser.restaurantLogo}
        />
      )}
      {orderTicket && (
        <OrderTicketModal
          order={orderTicket}
          onClose={() => setOrderTicket(null)}
          restaurantName={authUser.restaurantName}
          restaurantLogo={authUser.restaurantLogo}
        />
      )}
      {showOrderModal && (
        <OrderModal
          total={cartTotal}
          onClose={() => setShowOrderModal(false)}
          onConfirm={handleCreateOrder}
        />
      )}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}