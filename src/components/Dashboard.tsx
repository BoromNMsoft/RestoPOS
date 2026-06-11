import { TrendingUp, ShoppingBag, Clock, Euro, ArrowUpRight, ArrowDownRight, ShieldAlert, X } from 'lucide-react';
import { Sale } from '../types';
import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface DashboardProps {
  sales: Sale[];
}

export default function Dashboard({ sales }: DashboardProps) {
  const { authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.created_at);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      }
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d >= monthAgo;
    });
  }, [sales, period]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
    const totalTransactions = filteredSales.length;
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const lastSale = filteredSales.length > 0 ? filteredSales[0] : null;
    return { totalRevenue, totalTransactions, avgTicket, lastSale };
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

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vue d'ensemble de vos ventes</p>
          </div>
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

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Euro size={20} />}
            label="Chiffre d'affaires"
            value={`${stats.totalRevenue.toFixed(2)} €`}
            trend={+12.5}
            color="amber"
          />
          <StatCard
            icon={<ShoppingBag size={20} />}
            label="Transactions"
            value={stats.totalTransactions.toString()}
            trend={+8.2}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Panier moyen"
            value={`${stats.avgTicket.toFixed(2)} €`}
            trend={-2.1}
            color="emerald"
          />
          <StatCard
            icon={<Clock size={20} />}
            label="Dernière vente"
            value={stats.lastSale ? new Date(stats.lastSale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            trend={0}
            color="purple"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Hourly chart */}
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
                          {d.value.toFixed(0)} €
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

          {/* Top products */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Produits les plus vendus</h3>
            <TopProducts sales={filteredSales} />
          </div>
        </div>

        {/* Recent transactions */}
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white">#{sale.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}{sale.items?.length || 0} article(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{sale.total.toFixed(2)} €</span>
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
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Transaction #{selectedSale.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(selectedSale.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}
                    {' à '}
                    {new Date(selectedSale.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Articles */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Articles vendus
                </p>
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
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {item.subtotal.toFixed(2)} €
                          </span>
                          <p className="text-xs text-gray-400">{item.unit_price.toFixed(2)} € / unité</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun article</p>
                  )}
                </div>
              </div>

              {/* Paiement */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Paiement
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Moyen de paiement</span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">
                    {selectedSale.payment_method === 'cash' ? '💵 Espèces' : '💳 Carte'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Montant reçu</span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                    {selectedSale.amount_received.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Monnaie rendue</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {selectedSale.change_given.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums text-base">
                    {selectedSale.total.toFixed(2)} €
                  </span>
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
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
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
              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{p.revenue.toFixed(2)} €</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
