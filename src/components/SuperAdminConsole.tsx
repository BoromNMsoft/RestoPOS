import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { createPos } from '../lib/createPos';
import { uploadLogo } from '../lib/uploadLogo';
import {
  LayoutGrid, Store, Users, Euro, Plus, Moon, Sun, LogOut, Shield,
  Building2, Calendar, TrendingUp, X, Check, Phone, Eye, EyeOff, User,
  Pencil, Upload, Link2, ImageOff, ShieldOff, ShieldCheck, AlertTriangle,
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
  logo_url: string | null;
  is_suspended: boolean;
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

  // Modale création
  const [showCreate, setShowCreate] = useState(false);
  // Modale édition (le resto en cours d'édition, ou null)
  const [editing, setEditing] = useState<Restaurant | null>(null);
  // Confirmation suspension/réactivation
  const [confirmSuspend, setConfirmSuspend] = useState<Restaurant | null>(null);
  const [suspending, setSuspending] = useState(false);

  const toggleSuspend = async (resto: Restaurant) => {
    setSuspending(true);
    try {
      await supabase
        .from('restaurants')
        .update({ is_suspended: !resto.is_suspended })
        .eq('id', resto.id);
      setConfirmSuspend(null);
      fetchData();
    } catch (e) {
      console.error('Toggle suspend error:', e);
    } finally {
      setSuspending(false);
    }
  };

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
              onClick={() => setShowCreate(true)}
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
                  <div key={resto.id} className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 hover:shadow-md transition-shadow ${
                    resto.is_suspended ? 'border-red-200 dark:border-red-900/40' : 'border-gray-100 dark:border-gray-700'
                  }`}>
                    <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Logo ou fallback */}
                      {resto.logo_url ? (
                        <img src={resto.logo_url} alt={resto.name} className={`w-12 h-12 rounded-xl object-cover shadow-md bg-white ${resto.is_suspended ? 'opacity-50' : ''}`} />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md ${resto.is_suspended ? 'opacity-50' : ''}`}>
                          <Store size={22} className="text-white" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">{resto.name}</h3>
                          {resto.is_suspended && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                              <ShieldOff size={11} /> Suspendu
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} />
                          Créé le {new Date(resto.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Bouton suspendre/réactiver */}
                      <button
                        onClick={() => setConfirmSuspend(resto)}
                        className={`p-2 rounded-lg transition-colors ${
                          resto.is_suspended
                            ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            : 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                        }`}
                        title={resto.is_suspended ? 'Réactiver' : 'Suspendre'}
                      >
                        {resto.is_suspended ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
                      </button>
                      {/* Bouton éditer */}
                      <button
                        onClick={() => setEditing(resto)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={15} />
                      </button>
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

      {/* Modale création */}
      {showCreate && (
        <CreatePosModal
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); fetchData(); }}
        />
      )}

      {/* Modale édition */}
      {editing && (
        <EditPosModal
          resto={editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); fetchData(); }}
        />
      )}

      {/* Modale confirmation suspension/réactivation */}
      {confirmSuspend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                confirmSuspend.is_suspended ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                {confirmSuspend.is_suspended
                  ? <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
                  : <AlertTriangle size={22} className="text-red-500" />
                }
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {confirmSuspend.is_suspended ? `Réactiver ${confirmSuspend.name} ?` : `Suspendre ${confirmSuspend.name} ?`}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {confirmSuspend.is_suspended
                  ? "L'admin et les caissiers retrouveront l'accès normalement. Aucune donnée n'a été perdue."
                  : "L'admin et les caissiers ne pourront plus se connecter. Toutes les données (ventes, produits, historique) restent intactes et seront accessibles dès la réactivation."
                }
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmSuspend(null)}
                disabled={suspending}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => toggleSuspend(confirmSuspend)}
                disabled={suspending}
                className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                  confirmSuspend.is_suspended
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
                }`}
              >
                {suspending ? 'Patientez...' : confirmSuspend.is_suspended ? 'Réactiver' : 'Suspendre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Sélecteur de logo réutilisable (upload OU url)
──────────────────────────────────────────────────────────── */
function LogoPicker({
  logoUrl, setLogoUrl, file, setFile,
}: {
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
}) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = file ? URL.createObjectURL(file) : (logoUrl || null);

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logo <span className="text-gray-400 normal-case font-normal">(facultatif)</span></label>

      {/* Bascule upload / url */}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            mode === 'upload'
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Upload size={13} /> Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            mode === 'url'
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Link2 size={13} /> URL
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {/* Aperçu */}
        <div className="w-14 h-14 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="aperçu" className="w-full h-full object-cover" />
          ) : (
            <ImageOff size={18} className="text-gray-300 dark:text-gray-600" />
          )}
        </div>

        <div className="flex-1">
          {mode === 'upload' ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) setLogoUrl(''); }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full px-3 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
              >
                {file ? file.name : 'Choisir une image...'}
              </button>
            </>
          ) : (
            <input
              type="url"
              value={logoUrl}
              onChange={e => { setLogoUrl(e.target.value); setFile(null); }}
              placeholder="https://.../logo.png"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Modale création POS
──────────────────────────────────────────────────────────── */
function CreatePosModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [posName, setPosName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!posName || !adminName || !adminPhone || !adminPassword) {
      setError('Tous les champs (sauf logo) sont obligatoires.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Crée le POS + admin via l'Edge Function
      const res = await createPos({
        pos_name: posName.trim(),
        admin_name: adminName.trim(),
        admin_phone: adminPhone.trim(),
        admin_password: adminPassword,
      });
      const restaurantId = res.restaurant_id;

      // 2. Logo éventuel → upload ou URL, puis update du resto
      let finalLogo = logoUrl.trim();
      if (file) finalLogo = await uploadLogo(file);
      if (finalLogo) {
        await supabase.from('restaurants').update({ logo_url: finalLogo }).eq('id', restaurantId);
      }

      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la création.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Nouveau POS" onClose={onClose} busy={busy}>
      <div className="space-y-4">
        <Field label="Nom du POS" icon={<Store size={16} />}>
          <input value={posName} onChange={e => setPosName(e.target.value)} placeholder="Ex: Chez Fatou" className={inputCls} />
        </Field>

        <LogoPicker logoUrl={logoUrl} setLogoUrl={setLogoUrl} file={file} setFile={setFile} />

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-1">Premier administrateur</p>
        </div>

        <Field label="Nom complet" icon={<User size={16} />}>
          <input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Nom de l'admin" className={inputCls} />
        </Field>

        <Field label="Téléphone" icon={<Phone size={16} />}>
          <input type="tel" value={adminPhone} onChange={e => setAdminPhone(e.target.value.replace(/\D/g, ''))} placeholder="Numéro de connexion" className={inputCls} />
        </Field>

        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mot de passe</label>
          <div className="relative mt-1">
            <input type={showPassword ? 'text' : 'password'} value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all" />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">Le POS démarrera avec des catégories par défaut et une caisse.</p>

        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      </div>

      <ModalActions
        onClose={onClose}
        onConfirm={handleCreate}
        busy={busy}
        disabled={!posName || !adminName || !adminPhone || !adminPassword}
        confirmLabel="Créer le POS"
        busyLabel="Création..."
      />
    </ModalShell>
  );
}

/* ────────────────────────────────────────────────────────────
   Modale édition POS (nom + logo)
──────────────────────────────────────────────────────────── */
function EditPosModal({ resto, onClose, onDone }: { resto: Restaurant; onClose: () => void; onDone: () => void }) {
  const [posName, setPosName] = useState(resto.name);
  const [logoUrl, setLogoUrl] = useState(resto.logo_url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!posName.trim()) { setError('Le nom est obligatoire.'); return; }
    setBusy(true);
    setError(null);
    try {
      let finalLogo = logoUrl.trim();
      if (file) finalLogo = await uploadLogo(file);

      await supabase
        .from('restaurants')
        .update({ name: posName.trim(), logo_url: finalLogo || null })
        .eq('id', resto.id);

      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de l\'enregistrement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Modifier le POS" onClose={onClose} busy={busy}>
      <div className="space-y-4">
        <Field label="Nom du POS" icon={<Store size={16} />}>
          <input value={posName} onChange={e => setPosName(e.target.value)} className={inputCls} />
        </Field>

        <LogoPicker logoUrl={logoUrl} setLogoUrl={setLogoUrl} file={file} setFile={setFile} />

        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      </div>

      <ModalActions
        onClose={onClose}
        onConfirm={handleSave}
        busy={busy}
        disabled={!posName.trim()}
        confirmLabel="Enregistrer"
        busyLabel="Enregistrement..."
      />
    </ModalShell>
  );
}

/* ────────────────────────────────────────────────────────────
   Petits composants partagés
──────────────────────────────────────────────────────────── */
const inputCls = "w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all";

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, busy, children }: { title: string; onClose: () => void; busy: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} disabled={busy} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onClose, onConfirm, busy, disabled, confirmLabel, busyLabel }: {
  onClose: () => void; onConfirm: () => void; busy: boolean; disabled: boolean; confirmLabel: string; busyLabel: string;
}) {
  return (
    <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
      <button onClick={onClose} disabled={busy} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
        Annuler
      </button>
      <button onClick={onConfirm} disabled={busy || disabled} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
        <Check size={16} />
        {busy ? busyLabel : confirmLabel}
      </button>
    </div>
  );
}