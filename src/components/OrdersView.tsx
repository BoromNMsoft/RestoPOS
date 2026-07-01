import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  ClipboardList, Store, ShoppingBag, Bike, Phone, StickyNote, Clock,
  ChefHat, CheckCircle2, Smartphone, Banknote, X, ArrowRight, Search,
  CircleDollarSign, PackageCheck, Ban, ChevronDown,
} from 'lucide-react';
import {
  Order, OrderStatus, OrderType,
  ORDER_TYPE_LABELS, ORDER_STATUS_LABELS,
  PaymentProvider, PAYMENT_PROVIDER_LABELS,
} from '../types';

interface OrdersViewProps {
  onCheckoutOrder: (order: Order, method: 'cash' | 'mobile', provider: PaymentProvider | null) => Promise<void>;
}

const TYPE_ICON: Record<OrderType, typeof Store> = {
  dine_in: Store,
  takeaway: ShoppingBag,
  delivery: Bike,
};

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready'];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Démarrer la prépa',
  preparing: 'Marquer prête',
  ready: 'Marquer récupérée',
};

const NEXT_ICON: Partial<Record<OrderStatus, typeof ArrowRight>> = {
  pending: ArrowRight,
  preparing: ArrowRight,
  ready: PackageCheck,
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  preparing: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  ready: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  delivered: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  completed: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  cancelled: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

const STATUS_ICON: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle2,
  delivered: PackageCheck,
  completed: CheckCircle2,
  cancelled: X,
};

type StatusFilter = 'active' | 'all' | OrderStatus;
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'En cours' },
  { value: 'pending', label: 'En attente' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'ready', label: 'Prête' },
  { value: 'delivered', label: 'Récupérée' },
  { value: 'cancelled', label: 'Annulée' },
  { value: 'all', label: 'Toutes' },
];

const TYPE_FILTERS: { value: 'all' | OrderType; label: string }[] = [
  { value: 'all', label: 'Tous les types' },
  { value: 'dine_in', label: 'Sur place' },
  { value: 'takeaway', label: 'À emporter' },
  { value: 'delivery', label: 'Livraison' },
];

const PROVIDERS: PaymentProvider[] = ['bankily', 'masrvi', 'sedad'];

// Raisons d'annulation prédéfinies
const CANCEL_REASONS = [
  'Client absent',
  'Erreur de commande',
  'Produit indisponible',
  'Délai trop long',
  'Demande du client',
  'Autre',
];

export default function OrdersView({ onCheckoutOrder }: OrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Annulation
  const [confirmCancel, setConfirmCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelNote, setCancelNote] = useState<string>('');

  // Filtres
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
  const [phoneSearch, setPhoneSearch] = useState('');

  // Encaissement
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'mobile'>('cash');
  const [payProvider, setPayProvider] = useState<PaymentProvider | null>(null);
  const [payMenuOpen, setPayMenuOpen] = useState(false);
  const payMenuRef = useRef<HTMLDivElement>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      if (data) setOrders(data as Order[]);
    } catch (e) {
      console.error('Fetch orders error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-orders-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  // Ferme le menu mobile au clic extérieur
  useEffect(() => {
    if (!payMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (payMenuRef.current && !payMenuRef.current.contains(e.target as Node)) {
        setPayMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [payMenuOpen]);

  const advanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (next === 'delivered' && !order.sale_id) return;
    setBusyId(order.id);
    try {
      await supabase
        .from('orders')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      fetchOrders();
    } catch (e) {
      console.error('Advance status error:', e);
    } finally {
      setBusyId(null);
    }
  };

  const openCancel = (order: Order) => {
    setConfirmCancel(order);
    setCancelReason('');
    setCancelNote('');
  };

  const cancelOrder = async () => {
    if (!confirmCancel) return;
    const parts: string[] = [];
    if (cancelReason) parts.push(cancelReason);
    if (cancelNote.trim()) parts.push(cancelNote.trim());
    const finalReason = parts.join(' — ') || null;

    setBusyId(confirmCancel.id);
    try {
      await supabase
        .from('orders')
        .update({ status: 'cancelled', cancel_reason: finalReason, updated_at: new Date().toISOString() })
        .eq('id', confirmCancel.id);
      fetchOrders();
    } catch (e) {
      console.error('Cancel order error:', e);
    } finally {
      setBusyId(null);
      setConfirmCancel(null);
      setCancelReason('');
      setCancelNote('');
    }
  };

  const openPay = (order: Order) => {
    setPayingOrder(order);
    setPayMethod('cash');
    setPayProvider(null);
    setPayMenuOpen(false);
    setPayError(null);
  };

  const handlePay = async () => {
    if (!payingOrder) return;
    // En mode mobile, un provider est requis
    if (payMethod === 'mobile' && !payProvider) {
      setPayError('Choisissez le service mobile (Bankily, Masrvi ou Sedad).');
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      await onCheckoutOrder(payingOrder, payMethod, payMethod === 'mobile' ? payProvider : null);
      setPayingOrder(null);
      setPayMethod('cash');
      setPayProvider(null);
      setPayMenuOpen(false);
      fetchOrders();
    } catch (e: any) {
      setPayError(e?.message ?? 'Erreur lors de l\'encaissement.');
    } finally {
      setPaying(false);
    }
  };

  const visibleOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter === 'active') {
        if (!ACTIVE_STATUSES.includes(o.status)) return false;
      } else if (statusFilter !== 'all') {
        if (o.status !== statusFilter) return false;
      }
      if (typeFilter !== 'all' && o.order_type !== typeFilter) return false;
      const q = phoneSearch.trim();
      if (q && !(o.customer_phone ?? '').includes(q)) return false;
      return true;
    });
  }, [orders, statusFilter, typeFilter, phoneSearch]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
  const unpaidCount = orders.filter(o => ACTIVE_STATUSES.includes(o.status) && !o.sale_id).length;
  const hasActiveFilters = statusFilter !== 'active' || typeFilter !== 'all' || phoneSearch.trim() !== '';

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commandes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeCount} en cours · {unpaidCount} non payée(s)
          </p>
        </div>

        {/* Barre de filtres */}
        <div className="mb-5 flex flex-col sm:flex-row gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
          >
            {STATUS_FILTERS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as 'all' | OrderType)}
            className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
          >
            {TYPE_FILTERS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phoneSearch}
              onChange={e => setPhoneSearch(e.target.value.replace(/\D/g, ''))}
              placeholder="Rechercher par téléphone..."
              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setStatusFilter('active'); setTypeFilter('all'); setPhoneSearch(''); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Chargement...</div>
        ) : visibleOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <ClipboardList size={40} strokeWidth={1.5} className="mx-auto" />
            <p className="mt-3 text-sm">Aucune commande</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map(order => {
              const TypeIcon = TYPE_ICON[order.order_type];
              const StatusIcon = STATUS_ICON[order.status];
              const next = NEXT_STATUS[order.status];
              const NextIcon = NEXT_ICON[order.status] ?? ArrowRight;
              const isActive = ACTIVE_STATUSES.includes(order.status);
              const isPaid = !!order.sale_id;
              const advanceBlocked = next === 'delivered' && !isPaid;

              return (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center shrink-0">
                      <TypeIcon size={20} className="text-gray-600 dark:text-gray-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {ORDER_TYPE_LABELS[order.order_type]}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[order.status]}`}>
                          <StatusIcon size={11} />
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        {order.status !== 'cancelled' && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          }`}>
                            <CircleDollarSign size={11} />
                            {isPaid ? 'Payée' : 'Non payée'}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock size={11} /> {formatTime(order.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                        {order.items?.map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}× {item.product_name}</span>
                            <span className="tabular-nums text-gray-400">{item.subtotal.toFixed(2)} MRU</span>
                          </div>
                        ))}
                      </div>

                      {(order.customer_phone || order.note) && (
                        <div className="mt-2 flex flex-col gap-1">
                          {order.customer_phone && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Phone size={11} /> {order.customer_phone}
                            </span>
                          )}
                          {order.note && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                              <StickyNote size={11} className="mt-0.5 shrink-0" /> {order.note}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Raison d'annulation */}
                      {order.status === 'cancelled' && order.cancel_reason && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-500">
                          <Ban size={11} className="mt-0.5 shrink-0" />
                          <span>{order.cancel_reason}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{order.total.toFixed(2)} MRU</p>
                    </div>
                  </div>

                  {isActive && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-gray-50/50 dark:bg-gray-800/50 flex-wrap">
                      {next && (
                        <button
                          onClick={() => advanceStatus(order)}
                          disabled={busyId === order.id || advanceBlocked}
                          title={advanceBlocked ? 'Encaissez d\'abord la commande' : ''}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {NEXT_LABEL[order.status]} <NextIcon size={13} />
                        </button>
                      )}

                      {!isPaid && (
                        <button
                          onClick={() => openPay(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95"
                        >
                          <CircleDollarSign size={13} /> Encaisser
                        </button>
                      )}

                      {!isPaid && (
                        <button
                          onClick={() => openCancel(order)}
                          disabled={busyId === order.id}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          <X size={13} /> Annuler
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal encaissement */}
      {payingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Encaisser la commande</h2>
              <button onClick={() => setPayingOrder(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Montant à encaisser</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">{payingOrder.total.toFixed(2)} MRU</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mode de paiement</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setPayMethod('cash'); setPayProvider(null); setPayMenuOpen(false); }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      payMethod === 'cash'
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-2 ring-amber-400/30'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Banknote size={16} /> Espèces
                  </button>

                  {/* Bouton Mobile avec menu déroulant custom */}
                  <div className="relative" ref={payMenuRef}>
                    <button
                      onClick={() => setPayMenuOpen(o => !o)}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        payMethod === 'mobile'
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-2 ring-blue-400/30'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Smartphone size={16} />
                      {payMethod === 'mobile' && payProvider ? PAYMENT_PROVIDER_LABELS[payProvider] : 'Mobile'}
                      <ChevronDown size={14} className={`transition-transform ${payMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {payMenuOpen && (
                      <div className="absolute top-full mt-2 left-0 right-0 z-20 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-fade-in">
                        {PROVIDERS.map(p => (
                          <button
                            key={p}
                            onClick={() => { setPayMethod('mobile'); setPayProvider(p); setPayMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                              payProvider === p
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <Smartphone size={14} />
                            {PAYMENT_PROVIDER_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {payError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {payError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setPayingOrder(null)}
                disabled={paying}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handlePay}
                disabled={paying || (payMethod === 'mobile' && !payProvider)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={16} />
                {paying ? 'Encaissement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation annulation */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Annuler cette commande ?</h2>
              <button onClick={() => setConfirmCancel(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                La commande sera marquée comme annulée. Tu peux préciser une raison (facultatif).
              </p>

              {/* Raisons prédéfinies */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Raison</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CANCEL_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setCancelReason(r => r === reason ? '' : reason)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        cancelReason === reason
                          ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-2 ring-red-400/30'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note libre */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Précision <span className="text-gray-400 normal-case font-normal">(facultatif)</span>
                </label>
                <textarea
                  value={cancelNote}
                  onChange={e => setCancelNote(e.target.value)}
                  rows={2}
                  placeholder="Détail supplémentaire..."
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmCancel(null)}
                disabled={busyId === confirmCancel.id}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={cancelOrder}
                disabled={busyId === confirmCancel.id}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {busyId === confirmCancel.id ? 'Annulation...' : 'Annuler la commande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}