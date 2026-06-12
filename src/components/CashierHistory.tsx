import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingBag, X, Euro, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Sale } from '../types';

type Period = 'today' | 'yesterday' | 'week';

export default function CashierHistory() {
  const { authUser } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);

    const now = new Date();
    let from: Date;

    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'yesterday') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
    } else {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const { data } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('cashier_id', authUser.user.id)
      .gte('created_at', from.toISOString())
      .lte('created_at', period === 'yesterday' ? now.toISOString() : new Date().toISOString())
      .order('created_at', { ascending: false });

    setSales((data as Sale[]) ?? []);
    setLoading(false);
  }, [authUser, period]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalTransactions = sales.length;
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const lastSale = sales[0] ?? null;
    return { totalRevenue, totalTransactions, avgTicket, lastSale };
  }, [sales]);

  const periodLabels: Record<Period, string> = {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    week: '7 derniers jours',
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes ventes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {authUser?.stationName && `Caisse · ${authUser.stationName}`}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {(['today', 'yesterday', 'week'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3">
              <Euro size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
              {stats.totalRevenue.toFixed(2)} €
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total encaissé</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
              <ShoppingBag size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
              {stats.totalTransactions}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Transactions</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
              {stats.avgTicket.toFixed(2)} €
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Panier moyen</p>
          </div>
        </div>

        {/* Liste transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Transactions</h3>
            {stats.lastSale && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Clock size={12} />
                Dernière à {new Date(stats.lastSale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              <ShoppingBag size={36} strokeWidth={1.5} className="mx-auto mb-3" />
              Aucune vente pour cette période
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {sales.map(sale => (
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        #{sale.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{sale.items?.length || 0} article(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                      {sale.total.toFixed(2)} €
                    </p>
                    <p className="text-xs text-gray-400">
                      {sale.payment_method === 'cash' ? 'Espèces' : 'Carte'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal détail */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
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
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Articles vendus
              </p>
              <div className="space-y-2">
                {selectedSale.items?.map(item => (
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
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Paiement</span>
                <span className="font-semibold text-gray-900 dark:text-white">
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
  );
}