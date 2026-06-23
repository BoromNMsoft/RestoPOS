import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, UserCheck, UserX, Monitor, ShieldAlert, X, Check, User, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { createCashier, updateCashier, deleteCashier } from '../lib/manageUser'

interface Cashier {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface Station {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Assignment {
  id: string;
  cashier_id: string;
  station_id: string;
}

type Tab = 'cashiers' | 'stations';

export default function SettingsPanel() {
  const { authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [tab, setTab] = useState<Tab>('cashiers');
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form nouveaux caissiers
  const [showAddCashier, setShowAddCashier] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form nouveau point de vente
  const [showAddStation, setShowAddStation] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [newStationDesc, setNewStationDesc] = useState('');

  // Modal assignation
  const [assigningCashier, setAssigningCashier] = useState<Cashier | null>(null);

  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null)
  //const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const handleEditStation = async () => {
    if (!editingStation || !editName) return;
    await supabase.from('pos_stations')
      .update({
        name: editName,
        description: editDesc || null,
      })
      .eq('id', editingStation.id);
    setEditingStation(null);
    fetchAll();
  };

  const handleEditCashier = async () => {
    if (!editingCashier) return
    setEditSaving(true)
    setEditError(null)
    try {
      await updateCashier(editingCashier.id, {
        full_name: editName,
        email: editEmail,
        ...(editPassword && { password: editPassword }),
      })
      setEditingCashier(null)
      fetchAll()
    } catch (e: any) {
      setEditError(e?.message ?? 'Erreur lors de la modification.')
    } finally {
      setEditSaving(false)
    }
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cashiersRes, stationsRes, assignmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cashier').order('created_at'),
        supabase.from('pos_stations').select('*').order('created_at'),
        supabase.from('cashier_assignments').select('*'),
      ]);
      if (cashiersRes.data) setCashiers(cashiersRes.data);
      if (stationsRes.data) setStations(stationsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Caissiers ──────────────────────────────────────────────

  // ── handleAddCashier ──
  const handleAddCashier = async () => {
    if (!newEmail || !newName || !newPassword) {
      setSaveError('Tous les champs sont obligatoires.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await createCashier(newEmail, newPassword, newName)
      setShowAddCashier(false)
      setNewEmail(''); setNewName(''); setNewPassword('')
      fetchAll()
    } catch (e: any) {
      setSaveError(e?.message ?? 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  // ── handleDeleteCashier ──
  const handleDeleteCashier = async (id: string) => {
    if (!confirm('Supprimer ce caissier ?')) return
    try {
      await deleteCashier(id)
      fetchAll()
    } catch (e: any) {
      console.error(e)
    }
  }

  // ── Stations ───────────────────────────────────────────────

  const handleAddStation = async () => {
    if (!newStationName) return;
    await supabase.from('pos_stations').insert({
      name: newStationName,
      description: newStationDesc || null,
    });
    setShowAddStation(false);
    setNewStationName(''); setNewStationDesc('');
    fetchAll();
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm('Supprimer ce point de vente ?')) return;
    await supabase.from('pos_stations').delete().eq('id', id);
    fetchAll();
  };

  const toggleStation = async (station: Station) => {
    await supabase.from('pos_stations')
      .update({ is_active: !station.is_active })
      .eq('id', station.id);
    fetchAll();
  };

  // ── Assignations ───────────────────────────────────────────

  const getAssignment = (cashierId: string) =>
    assignments.find(a => a.cashier_id === cashierId);

  const getStationName = (stationId: string) =>
    stations.find(s => s.id === stationId)?.name ?? '—';

  const handleAssign = async (stationId: string | null) => {
    if (!assigningCashier) return;
    const existing = getAssignment(assigningCashier.id);
    if (existing) {
      await supabase.from('cashier_assignments').delete().eq('cashier_id', assigningCashier.id);
    }
    if (stationId) {
      await supabase.from('cashier_assignments').insert({
        cashier_id: assigningCashier.id,
        station_id: stationId,
      });
    }
    setAssigningCashier(null);
    fetchAll();
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
        <ShieldAlert size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-4">Accès restreint</h2>
        <p className="text-sm mt-2 text-center max-w-md">Les paramètres sont réservés aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestion des caissiers et points de vente</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit mb-6">
          {([['cashiers', 'Caissiers'], ['stations', 'Points de vente']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB CAISSIERS ── */}
        {tab === 'cashiers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{cashiers.length} caissier(s)</p>
              <button
                onClick={() => { setShowAddCashier(true); setSaveError(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95"
              >
                <Plus size={16} /> Ajouter un caissier
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-10 text-gray-400 text-sm">Chargement...</div>
              ) : cashiers.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
                  <User size={36} strokeWidth={1.5} className="mx-auto mb-2" />
                  Aucun caissier enregistré
                </div>
              ) : cashiers.map(cashier => {
                const assignment = getAssignment(cashier.id);
                return (
                  <div key={cashier.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <User size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{cashier.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cashier.email}</p>
                    </div>
                    {/* Poste assigné */}
                    <button
                      onClick={() => setAssigningCashier(cashier)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        assignment
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Monitor size={12} />
                      {assignment ? getStationName(assignment.station_id) : 'Non assigné'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCashier(cashier)
                        setEditName(cashier.full_name)
                        setEditEmail(cashier.email)
                        setEditPassword('')
                        setEditError(null)
                      }}
                      className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCashier(cashier.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB POINTS DE VENTE ── */}
        {tab === 'stations' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{stations.length} point(s) de vente</p>
              <button
                onClick={() => setShowAddStation(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95"
              >
                <Plus size={16} /> Ajouter un poste
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-10 text-gray-400 text-sm">Chargement...</div>
              ) : stations.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
                  <Monitor size={36} strokeWidth={1.5} className="mx-auto mb-2" />
                  Aucun point de vente
                </div>
              ) : stations.map(station => {
                const assignedCashier = cashiers.find(c =>
                  assignments.find(a => a.station_id === station.id && a.cashier_id === c.id)
                );
                return (
                  <div key={station.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      station.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Monitor size={18} className={station.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{station.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {station.description ?? 'Aucune description'}
                        {assignedCashier && (
                          <span className="ml-2 text-blue-500 font-medium">· {assignedCashier.full_name}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleStation(station)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        station.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      {station.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                      {station.is_active ? 'Actif' : 'Inactif'}
                    </button>
                    <button
                      onClick={() => handleDeleteStation(station.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL AJOUT CAISSIER ── */}
      {showAddCashier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouveau caissier</h2>
              <button onClick={() => setShowAddCashier(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom complet</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="jean@restopos.fr"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
              {saveError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {saveError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddCashier(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddCashier}
                disabled={saving || !newEmail || !newName || !newPassword}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Check size={16} />
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJOUT STATION ── */}
      {showAddStation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouveau point de vente</h2>
              <button onClick={() => setShowAddStation(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom</label>
                <input
                  value={newStationName}
                  onChange={e => setNewStationName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="Caisse 3"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</label>
                <input
                  value={newStationDesc}
                  onChange={e => setNewStationDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="Caisse terrasse"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddStation(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddStation}
                disabled={!newStationName}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Check size={16} /> Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ASSIGNATION ── */}
      {assigningCashier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assigner un poste</h2>
              <button onClick={() => setAssigningCashier(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Choisir un poste pour <span className="font-semibold text-gray-900 dark:text-white">{assigningCashier.full_name}</span>
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleAssign(null)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <UserX size={16} /> Non assigné
                </button>
                {stations.map(station => {
                  const occupiedBy = cashiers.find(c =>
                    assignments.find(a => a.station_id === station.id && a.cashier_id === c.id)
                  );
                  const isOccupied = occupiedBy && occupiedBy.id !== assigningCashier.id;

                  return (
                    <button
                      key={station.id}
                      onClick={() => !isOccupied && handleAssign(station.id)}
                      disabled={isOccupied}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-colors ${
                        isOccupied
                          ? 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                          : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300'
                      }`}
                    >
                      <Monitor size={16} className={isOccupied ? 'text-gray-300 dark:text-gray-600' : 'text-amber-500'} />
                      <span className="flex-1 text-left">{station.name}</span>
                      {isOccupied
                        ? <span className="text-xs text-gray-400">Occupé par {occupiedBy.full_name}</span>
                        : station.description && <span className="text-gray-400 text-xs">{station.description}</span>
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingCashier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Modifier le caissier</h2>
              <button onClick={() => setEditingCashier(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom complet</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nouveau mot de passe <span className="text-gray-400 normal-case font-normal">(laisser vide pour ne pas changer)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
              {editError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {editError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setEditingCashier(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditCashier}
                disabled={editSaving || !editName || !editEmail}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Check size={16} />
                {editSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}