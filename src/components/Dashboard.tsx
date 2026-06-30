import { TrendingUp, ShoppingBag, Clock, Euro, ArrowUpRight, ArrowDownRight, ShieldAlert, X, Monitor, User, ClipboardList, Store, Bike, Ban, Phone, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatSaleId } from '../types';
import { Sale, Order, OrderType, OrderStatus, ORDER_TYPE_LABELS, getPaymentLabel, PAYMENT_PROVIDER_LABELS } from '../types';

interface DashboardProps {
  sales: Sale[];
  stations: StationInfo[];
  orders: Order[];
}

interface StationInfo {
  id: string;
  name: string;
  is_active: boolean;
  cashier_assignments: {
    cashier_id: string;
    profiles: { full_name: string } | null;
  }[];
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready'];

const TYPE_ICON: Record<OrderType, typeof Store> = {
  dine_in: Store,
  takeaway: ShoppingBag,
  delivery: Bike,
};

export default function Dashboard({ sales, stations, orders }: DashboardProps) {
  const { authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [stationPanelOpen, setStationPanelOpen] = useState(false);

  const inPeriod = (iso: string) => {
    const now = new Date();
    const d = new Date(iso);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchStation = selectedStation === 'all' || s.station_id === selectedStation;
      return inPeriod(s.created_at) && matchStation;
    });
  }, [sales, period, selectedStation]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStation = selectedStation === 'all' || o.station_id === selectedStation;
      return inPeriod(o.created_at) && matchStation;
    });
  }, [orders, period, selectedStation]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
    const totalTransactions = filteredSales.length;
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const lastSale = filteredSales.length > 0 ? filteredSales[0] : null;
    return { totalRevenue, totalTransactions, avgTicket, lastSale };
  }, [filteredSales]);

  // ── Indicateurs commandes ──
  const orderStats = useMemo(() => {
    // En cours : état live, calculé sur toutes les commandes (pas filtré par période)
    const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
    const activeCount = activeOrders.length;
    const unpaidActive = activeOrders.filter(o => !o.sale_id).length;
    const paidCount = filteredOrders.filter(o => o.sale_id).length;

    // Sur la période sélectionnée
    const total = filteredOrders.length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;
    const cancelRate = total > 0 ? (cancelled / total) * 100 : 0;

    // Répartition par type (hors annulées)
    const byType: Record<OrderType, number> = { dine_in: 0, takeaway: 0, delivery: 0 };
    filteredOrders.forEach(o => {
      if (o.status !== 'cancelled') byType[o.order_type] = (byType[o.order_type] ?? 0) + 1;
    });
    const typeMax = Math.max(byType.dine_in, byType.takeaway, byType.delivery, 1);

    // Commandes vs ventes directes (chiffre d'affaires)
    const orderSaleIds = new Set(orders.filter(o => o.sale_id).map(o => o.sale_id));
    const orderRevenue = filteredSales.filter(s => orderSaleIds.has(s.id)).reduce((sum, s) => sum + s.total, 0);
    const directRevenue = filteredSales.filter(s => !orderSaleIds.has(s.id)).reduce((sum, s) => sum + s.total, 0);
    const revenueTotal = orderRevenue + directRevenue;
    const orderPct = revenueTotal > 0 ? (orderRevenue / revenueTotal) * 100 : 0;

    return { activeCount, unpaidActive, total, cancelled, cancelRate, paidCount, byType, typeMax, orderRevenue, directRevenue, revenueTotal, orderPct };
  }, [orders, filteredOrders, filteredSales]);

  const paymentStats = useMemo(() => {
    const byMethod: Record<string, { label: string; total: number; count: number }> = {};

    filteredSales.forEach(s => {
      // Clé = provider si mobile, sinon la méthode
      let key: string;
      let label: string;
      if (s.payment_method === 'cash') {
        key = 'cash'; label = 'Espèces';
      } else if (s.payment_method === 'mobile' && s.payment_provider) {
        key = s.payment_provider; label = PAYMENT_PROVIDER_LABELS[s.payment_provider];
      } else if (s.payment_method === 'card') {
        key = 'card'; label = 'Carte';
      } else {
        key = 'mobile'; label = 'Mobile';
      }
      if (!byMethod[key]) byMethod[key] = { label, total: 0, count: 0 };
      byMethod[key].total += s.total;
      byMethod[key].count += 1;
    });

    const list = Object.values(byMethod).sort((a, b) => b.total - a.total);
    const grandTotal = list.reduce((sum, m) => sum + m.total, 0);

    return { list, grandTotal };
  }, [filteredSales]);

  const recentSales = useMemo(() => {
    return [...filteredSales]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [filteredSales]);

  const hourlyData = useMemo(() => {
    const hours: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hours[h] = 0;
    filteredSales.forEach(s => {
      const h = new Date(s.created_at).getHours();
      hours[h] += s.total;
    });
    const max = Math.max(...Object.values(hours), 1);
    return Object.entries(hours).map(([h, v]) => ({
      hour: parseInt(h),
      value: v,
      pct: (v / max) * 100,
    }));
  }, [filteredSales]);

  const periodLabels = { today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois' };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
        <ShieldAlert size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-4">Accès restreint</h2>
        <p className="text-sm mt-2 text-center max-w-md">Le dashboard est réservé aux administrateurs.</p>
      </div>
    );
  }

  const availableStations = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach(s => {
      if (s.station_id && s.station_name) {
        map.set(s.station_id, s.station_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              {(() => {
                const activeCaisses = stations.filter(s => s.is_active).length;
                if (activeCaisses === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Live · {activeCaisses} caisse{activeCaisses > 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })()}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vue d'ensemble de vos ventes</p>
          </div>
          <div className="flex items-center gap-2">
            {availableStations.length > 0 && (
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => { setSelectedStation('all'); setStationPanelOpen(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedStation === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <Monitor size={12} /> Toutes
                </button>
                {availableStations.map(station => {
                  const stationInfo = stations.find(s => s.id === station.id);
                  const isActive = stationInfo?.is_active ?? false;
                  const cashierName = stationInfo?.cashier_assignments?.[0]?.profiles?.full_name ?? null;
                  return (
                    <button
                      key={station.id}
                      onClick={() => { setSelectedStation(station.id); setStationPanelOpen(true); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedStation === station.id
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                      }`}
                      title={cashierName ? `Caissier : ${cashierName}` : 'Aucun caissier assigné'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      {station.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(['today', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === p
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau état caisse sélectionnée */}
        {selectedStation !== 'all' && stationPanelOpen && (() => {
          const stationInfo = stations.find(s => s.id === selectedStation);
          if (!stationInfo) return null;
          const cashierName = stationInfo.cashier_assignments?.[0]?.profiles?.full_name ?? null;
          const stationSales = filteredSales.filter(s => s.station_id === selectedStation);
          const stationTotal = stationSales.reduce((s, sale) => s + sale.total, 0);
          return (
            <div className="mb-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                stationInfo.is_active ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <Monitor size={22} className={stationInfo.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{stationInfo.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    stationInfo.is_active
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-500'
                  }`}>
                    {stationInfo.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {cashierName
                    ? <span>Caissier : <span className="font-semibold text-gray-900 dark:text-white">{cashierName}</span></span>
                    : 'Aucun caissier assigné'
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Encaissé</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{stationTotal.toFixed(2)} MRU</p>
                <p className="text-xs text-gray-400">{stationSales.length} transaction(s)</p>
              </div>
              <button
                onClick={() => setStationPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          );
        })()}

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Euro size={20} />} label="Chiffre d'affaires" value={`${stats.totalRevenue.toFixed(2)} MRU`} trend={+12.5} color="amber" />
          <StatCard icon={<ShoppingBag size={20} />} label="Transactions" value={stats.totalTransactions.toString()} trend={+8.2} color="blue" />
          <StatCard icon={<ClipboardList size={20} />} label="Commandes (payées)" value={orderStats.paidCount.toString()} trend={0}color="emerald"/>          <StatCard icon={<Clock size={20} />} label="Dernière vente" value={stats.lastSale ? new Date(stats.lastSale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'} trend={0} color="purple" />
        </div>

        {/* ── SECTION COMMANDES ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Commandes</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* En cours */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <ClipboardList size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">En cours</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderStats.activeCount}</p>
              <p className="text-xs mt-1">
                {orderStats.unpaidActive > 0
                  ? <span className="text-red-500 font-semibold">{orderStats.unpaidActive} non payée(s)</span>
                  : <span className="text-emerald-600 dark:text-emerald-400">Toutes payées</span>
                }
              </p>
            </div>

            {/* Taux d'annulation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <Ban size={18} className="text-red-500" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Taux d'annulation</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderStats.cancelRate.toFixed(0)}%</p>
              <p className="text-xs text-gray-400 mt-1">{orderStats.cancelled} / {orderStats.total} commande(s)</p>
            </div>

            {/* Répartition par type */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 lg:col-span-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Répartition par type</span>
              <div className="mt-3 space-y-2.5">
                {(['dine_in', 'takeaway', 'delivery'] as OrderType[]).map(type => {
                  const Icon = TYPE_ICON[type];
                  const count = orderStats.byType[type];
                  const pct = (count / orderStats.typeMax) * 100;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <Icon size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-300 w-20 shrink-0">{ORDER_TYPE_LABELS[type]}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Commandes vs Ventes directes */}
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Origine du chiffre d'affaires</span>
              <span className="text-xs text-gray-400">{orderStats.orderPct.toFixed(0)}% via commandes</span>
            </div>
            {orderStats.revenueTotal > 0 ? (
              <>
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${orderStats.orderPct}%` }} />
                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500" style={{ width: `${100 - orderStats.orderPct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">Commandes</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{orderStats.orderRevenue.toFixed(2)} MRU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">Ventes directes</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{orderStats.directRevenue.toFixed(2)} MRU</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune donnée pour cette période</p>
            )}
          </div>
        </div>

        {/* Répartition par moyen de paiement */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Répartition par moyen de paiement</h3>
          </div>
          {paymentStats.list.length > 0 ? (
            <div className="space-y-3">
              {paymentStats.list.map(m => {
                const pct = paymentStats.grandTotal > 0 ? (m.total / paymentStats.grandTotal) * 100 : 0;
                return (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{m.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{m.count} vente(s)</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{m.total.toFixed(2)} MRU</span>
                        <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune vente pour cette période</p>
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ventes par heure</h3>
            <div className="flex items-end gap-1 h-40">
              {hourlyData
                .filter(d => d.value > 0 || (d.hour >= 8 && d.hour <= 23))
                .map(d => (
                  <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end relative group" style={{ height: '140px' }}>
                      {d.value > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-medium px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {d.value.toFixed(0)} MRU
                        </div>
                      )}
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-400 transition-all duration-300 hover:from-amber-600 hover:to-amber-500 cursor-pointer"
                        style={{ height: `${Math.max(d.pct, 2)}px` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400">{d.hour}h</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Produits les plus vendus</h3>
            <TopProducts sales={filteredSales} />
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Transactions récentes</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentSales.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                Aucune transaction pour cette période
              </div>
            ) : (
              recentSales.map(sale => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                      <ShoppingBag size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatSaleId(sale)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}{sale.items?.length || 0} article(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{sale.total.toFixed(2)} MRU</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal détail transaction */}
        {selectedSale && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSale(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Transaction {formatSaleId(selectedSale)}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(selectedSale.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' à '}
                    {new Date(selectedSale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Origine + type de la transaction */}
              <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
                {selectedSale.is_from_order ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                    <ClipboardList size={12} /> Commande
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                    <ShoppingBag size={12} /> Vente directe
                  </span>
                )}
                {selectedSale.order_type && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {ORDER_TYPE_LABELS[selectedSale.order_type]}
                  </span>
                )}
              </div>

              {(selectedSale.cashier_name || selectedSale.station_name) && (
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4 text-xs shrink-0">
                  {selectedSale.cashier_name && (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <User size={12} />
                      <span className="font-semibold">{selectedSale.cashier_name}</span>
                    </div>
                  )}
                  {selectedSale.station_name && (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Monitor size={12} />
                      <span className="font-semibold">{selectedSale.station_name}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Articles vendus</p>
                <div className="space-y-2">
                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    selectedSale.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                            {item.quantity}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">{item.product_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{item.subtotal.toFixed(2)} MRU</span>
                          <p className="text-xs text-gray-400">{item.unit_price.toFixed(2)} MRU / unité</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun article</p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl space-y-2 shrink-0">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Paiement</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Moyen de paiement</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedSale.payment_method === 'cash' ? '💵' : '💳'} {getPaymentLabel(selectedSale)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Montant reçu</span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{selectedSale.amount_received.toFixed(2)} MRU</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Monnaie rendue</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{selectedSale.change_given.toFixed(2)} MRU</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums text-base">{selectedSale.total.toFixed(2)} MRU</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string; trend: number; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
        {trend !== 0 && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function TopProducts({ sales }: { sales: Sale[] }) {
  const products = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.forEach(s => {
      s.items?.forEach(item => {
        if (!map[item.product_name]) map[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
        map[item.product_name].qty += item.quantity;
        map[item.product_name].revenue += item.subtotal;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales]);

  const maxRevenue = Math.max(...products.map(p => p.revenue), 1);

  if (products.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Aucune donnée</p>;
  }

  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <div key={p.name} className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{p.revenue.toFixed(2)} MRU</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}