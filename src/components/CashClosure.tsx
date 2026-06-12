import { useState, useEffect, useCallback, useMemo } from 'react';
import { Monitor, ChevronDown, CheckCircle, AlertCircle, Clock, X, FileText, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Station {
  id: string;
  name: string;
}

interface ClosureSale {
  id: string;
  total: number;
  cashier_name: string | null;
  created_at: string;
  items?: { quantity: number }[];
}

interface Closure {
  id: string;
  station_name: string;
  date: string;
  theoretical_amount: number;
  counted_amount: number;
  difference: number;
  transactions_count: number;
  closed_by_name: string;
  notes: string | null;
  created_at: string;
}

export default function CashClosure() {
  const { authUser } = useAuth();

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [sales, setSales] = useState<ClosureSale[]>([]);
  const [countedAmount, setCountedAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingClosure, setExistingClosure] = useState<Closure | null>(null);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [selectedClosure, setSelectedClosure] = useState<Closure | null>(null);

  // Fetch stations
  const fetchStations = useCallback(async () => {
    const { data } = await supabase.from('pos_stations').select('id, name').eq('is_active', true);
    if (data) {
      setStations(data);
      if (data.length > 0) setSelectedStation(data[0].id);
    }
  }, []);

  // Fetch ventes pour la clôture
  const fetchSales = useCallback(async () => {
    if (!selectedStation || !selectedDate) return;
    setLoading(true);

    const from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDate);
    to.setHours(23, 59, 59, 999);

    const [salesRes, closureRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, total, cashier_name, created_at')
        .eq('station_id', selectedStation)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('cash_closures')
        .select('*')
        .eq('station_id', selectedStation)
        .eq('date', selectedDate)
        .single(),
    ]);

    setSales(salesRes.data ?? []);
    setExistingClosure(closureRes.data ?? null);
    setLoading(false);
  }, [selectedStation, selectedDate]);

  // Fetch historique clôtures
  const fetchClosures = useCallback(async () => {
    const { data } = await supabase
      .from('cash_closures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setClosures(data);
  }, []);

  useEffect(() => { fetchStations(); }, [fetchStations]);
  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { if (tab === 'history') fetchClosures(); }, [tab, fetchClosures]);

  const stats = useMemo(() => {
    const theoretical = sales.reduce((s, sale) => s + sale.total, 0);
    const counted = parseFloat(countedAmount) || 0;
    const difference = counted - theoretical;

    // Par caissier
    const byCashier: Record<string, { name: string; total: number; count: number }> = {};
    sales.forEach(s => {
      const name = s.cashier_name ?? 'Inconnu';
      if (!byCashier[name]) byCashier[name] = { name, total: 0, count: 0 };
      byCashier[name].total += s.total;
      byCashier[name].count += 1;
    });

    return {
      theoretical,
      counted,
      difference,
      transactions: sales.length,
      byCashier: Object.values(byCashier),
    };
  }, [sales, countedAmount]);

  const handleSave = async () => {
    if (!selectedStation || !countedAmount) return;
    setSaving(true);
    try {
      const station = stations.find(s => s.id === selectedStation);
      await supabase.from('cash_closures').upsert({
        station_id: selectedStation,
        station_name: station?.name ?? '',
        date: selectedDate,
        theoretical_amount: stats.theoretical,
        counted_amount: stats.counted,
        difference: stats.difference,
        transactions_count: stats.transactions,
        closed_by: authUser?.user.id,
        closed_by_name: authUser?.fullName,
        notes: notes || null,
      }, { onConflict: 'station_id,date' });

      await fetchSales();
      await fetchClosures();
      setCountedAmount('');
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  const stationName = stations.find(s => s.id === selectedStation)?.name ?? '';

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clôture de caisse</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Validation et rapport de fin de service</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setTab('new')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'new'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Plus size={12} /> Nouvelle
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'history'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Clock size={12} /> Historique
            </button>
          </div>
        </div>

        {/* ── TAB NOUVELLE CLÔTURE ── */}
        {tab === 'new' && (
          <div className="space-y-5">

            {/* Sélecteurs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Point de vente
                </label>
                <div className="relative mt-2">
                  <select
                    value={selectedStation}
                    onChange={e => setSelectedStation(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 pr-8"
                  >
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="mt-2 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            {/* Clôture déjà existante */}
            {existingClosure && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Clôture déjà effectuée pour ce poste et cette date
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Par {existingClosure.closed_by_name} · Montant compté : {existingClosure.counted_amount.toFixed(2)} € · Écart : {existingClosure.difference >= 0 ? '+' : ''}{existingClosure.difference.toFixed(2)} €
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Stats théoriques */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.transactions}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Montant théorique</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.theoretical.toFixed(2)} €</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Panier moyen</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stats.transactions > 0 ? (stats.theoretical / stats.transactions).toFixed(2) : '0.00'} €
                    </p>
                  </div>
                </div>

                {/* Par caissier */}
                {stats.byCashier.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Détail par caissier</h3>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {stats.byCashier.map(c => (
                        <div key={c.name} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {c.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{c.count} transaction(s)</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                            {c.total.toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saisie montant compté */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Comptage physique</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Montant compté dans le tiroir (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={countedAmount}
                        onChange={e => setCountedAmount(e.target.value)}
                        className="mt-2 w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 tabular-nums"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Écart */}
                    {countedAmount && (
                      <div className={`flex items-center justify-between p-4 rounded-xl ${
                        Math.abs(stats.difference) < 0.01
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                          : stats.difference < 0
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      }`}>
                        <div className="flex items-center gap-2">
                          {Math.abs(stats.difference) < 0.01
                            ? <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                            : <AlertCircle size={18} className={stats.difference < 0 ? 'text-red-500' : 'text-blue-500'} />
                          }
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {Math.abs(stats.difference) < 0.01
                              ? 'Caisse équilibrée ✓'
                              : stats.difference < 0
                              ? 'Manque en caisse'
                              : 'Excédent en caisse'
                            }
                          </span>
                        </div>
                        <span className={`text-lg font-bold tabular-nums ${
                          Math.abs(stats.difference) < 0.01
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : stats.difference < 0
                            ? 'text-red-500'
                            : 'text-blue-500'
                        }`}>
                          {stats.difference >= 0 ? '+' : ''}{stats.difference.toFixed(2)} €
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Notes (optionnel)
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        className="mt-2 w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                        placeholder="Observations, incidents..."
                      />
                    </div>
                  </div>
                </div>

                {/* Bouton valider */}
                <button
                  onClick={handleSave}
                  disabled={saving || !countedAmount || stats.transactions === 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText size={18} />
                  {saving ? 'Enregistrement...' : existingClosure ? 'Mettre à jour la clôture' : 'Valider la clôture'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── TAB HISTORIQUE ── */}
        {tab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Clôtures passées</h3>
            </div>
            {closures.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                <FileText size={36} strokeWidth={1.5} className="mx-auto mb-3" />
                Aucune clôture enregistrée
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {closures.map(closure => (
                  <div
                    key={closure.id}
                    onClick={() => setSelectedClosure(closure)}
                    className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        Math.abs(closure.difference) < 0.01
                          ? 'bg-emerald-50 dark:bg-emerald-900/30'
                          : closure.difference < 0
                          ? 'bg-red-50 dark:bg-red-900/30'
                          : 'bg-blue-50 dark:bg-blue-900/30'
                      }`}>
                        <Monitor size={16} className={
                          Math.abs(closure.difference) < 0.01
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : closure.difference < 0
                            ? 'text-red-500'
                            : 'text-blue-500'
                        } />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {closure.station_name} · {new Date(closure.date).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {closure.transactions_count} transactions · Clôturé par {closure.closed_by_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                        {closure.theoretical_amount.toFixed(2)} €
                      </p>
                      <p className={`text-xs font-semibold tabular-nums ${
                        Math.abs(closure.difference) < 0.01
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : closure.difference < 0
                          ? 'text-red-500'
                          : 'text-blue-500'
                      }`}>
                        {closure.difference >= 0 ? '+' : ''}{closure.difference.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal détail clôture */}
      {selectedClosure && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedClosure(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedClosure.station_name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {new Date(selectedClosure.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedClosure(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Transactions</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedClosure.transactions_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Montant théorique</span>
                <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{selectedClosure.theoretical_amount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Montant compté</span>
                <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{selectedClosure.counted_amount.toFixed(2)} €</span>
              </div>
              <div className={`flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-800`}>
                <span className="font-bold text-gray-900 dark:text-white">Écart</span>
                <span className={`font-bold tabular-nums ${
                  Math.abs(selectedClosure.difference) < 0.01
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : selectedClosure.difference < 0
                    ? 'text-red-500'
                    : 'text-blue-500'
                }`}>
                  {selectedClosure.difference >= 0 ? '+' : ''}{selectedClosure.difference.toFixed(2)} €
                </span>
              </div>
              {selectedClosure.notes && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedClosure.notes}</p>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Clôturé par <span className="font-semibold text-gray-900 dark:text-white">{selectedClosure.closed_by_name}</span>
                  {' · '}{new Date(selectedClosure.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}