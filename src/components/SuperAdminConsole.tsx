import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createPos } from '../lib/createPos';
import {
  LayoutGrid, Store, Users, Euro, Plus, Moon, Sun, LogOut, Shield,
  Building2, Calendar, TrendingUp, X, Check, Phone, Eye, EyeOff, User,
} from 'lucide-react';

interface SuperAdminConsoleProps {
  fullName: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
}

interface Restaurant {
  id: string;
  name: string;
  created_at: string;
}

interface RestaurantStats {
  staff: number;
  cashiers: number;
  admins: number;
  revenue: number;
  salesCount: number;
}

export default function SuperAdminConsole({ fullName, darkMode, onToggleDark, onSignOut }: SuperAdminConsoleProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [statsByResto, setStatsByResto] = useState<Record<string, RestaurantStats>>({});
  const [loading, setLoading] = useState(true);

  // Création POS
  const [showCreate, setShowCreate] = useState(false);
  const [posName, setPosName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [restosRes, profilesRes, salesRes] = await Promise.all([
        supabase.from('restaurants').select('*').order('created_at'),
        supabase.from('profiles').select('restaurant_id, role'),
        supabase.from('sales').select('restaurant_id, total'),
      ]);

      const restos = (restosRes.data ?? []) as Restaurant[];
      setRestaurants(restos);

      const stats: Record<string, RestaurantStats> = {};
      for (const r of restos) {
        stats[r.id] = { staff: 0, cashiers: 0, admins: 0, revenue: 0, salesCount: 0 };
      }
      (profilesRes.data ?? []).forEach((p: any) => {
        if (!p.restaurant_id || !stats[p.restaurant_id]) return;
        stats[p.restaurant_id].staff += 1;
        if (p.role === 'cashier') stats[p.restaurant_id].cashiers += 1;
        if (p.role === 'admin') stats[p.restaurant_id].admins += 1;
      });
      (salesRes.data ?? []).forEach((s: any) => {
        if (!s.restaurant_id || !stats[s.restaurant_id]) return;
        stats[s.restaurant_id].revenue += s.total ?? 0;
        stats[s.restaurant_id].salesCount += 1;
      });
      setStatsByResto(stats);
    } catch (e) {
      console.error('SuperAdmin fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setPosName(''); setAdminName(''); setAdminPhone(''); setAdminPassword('');
    setShowPassword(false); setCreateError(null);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!posName || !adminName || !adminPhone || !adminPassword) {
      setCreateError('Tous les champs sont obligatoires.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createPos({
        pos_name: posName.trim(),
        admin_name: adminName.trim(),
        admin_phone: adminPhone.trim(),
        admin_password: adminPassword,
      });
      setShowCreate(false);
      fetchData();
    } catch (e: any) {
      setCreateError(e?.message ?? 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const totalRevenue = Object.values(statsByResto).reduce((s, r) => s + r.revenue, 0);
  const totalStaff = Object.values(statsByResto).reduce((s, r) => s + r.staff, 0);

  return (
    <div className={`h-full min-h-0 flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white ${darkMode ? 'dark' : ''}`}>
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 dark:from-amber-500 dark:to-orange-600 flex items-center justify-center shadow-md">
            <LayoutGrid size={16} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">Console</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
              <Shield size={11} /> Super Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{fullName}</span>
          <button onClick={onToggleDark} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onSignOut} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors" title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenu */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes POS</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {restaurants.length} POS · {totalStaff} membre(s) du personnel
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95"
            >
              <Plus size={16} /> Nouveau POS
            </button>
          </div>

          {/* Stats globales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Building2 size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">POS</span>
              </div>
              <p className="text-2xl font-bold">{restaurants.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Users size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Personnel total</span>
              </div>
              <p className="text-2xl font-bold">{totalStaff}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Euro size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">CA cumulé</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{totalRevenue.toFixed(2)} €</p>
            </div>
          </div>

          {/* Liste des POS */}
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Chargement...</div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Store size={40} strokeWidth={1.5} className="mx-auto" />
              <p className="mt-3 text-sm">Aucun POS</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {restaurants.map(resto => {
                const s = statsByResto[resto.id] ?? { staff: 0, cashiers: 0, admins: 0, revenue: 0, salesCount: 0 };
                return (
                  <div key={resto.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                          <Store size={22} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">{resto.name}</h3>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} />
                            Créé le {new Date(resto.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Users size={11} /> Personnel</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{s.staff}</p>
                        <p className="text-[10px] text-gray-400">{s.admins} admin · {s.cashiers} caissier(s)</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><TrendingUp size={11} /> Ventes</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{s.salesCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Euro size={11} /> CA</p>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">{s.revenue.toFixed(0)} €</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal création POS */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouveau POS</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom du POS</label>
                <div className="relative mt-1">
                  <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={posName}
                    onChange={e => setPosName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="Ex: Chez Fatou"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-1">Premier administrateur</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom complet</label>
                <div className="relative mt-1">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="Nom de l'admin"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Téléphone</label>
                <div className="relative mt-1">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={e => setAdminPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="Numéro de connexion"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mot de passe</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Le POS démarrera avec des catégories par défaut et une caisse.
              </p>

              {createError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {createError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-gray-900">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !posName || !adminName || !adminPhone || !adminPassword}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={16} />
                {creating ? 'Création...' : 'Créer le POS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}