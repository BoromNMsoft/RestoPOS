import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, UserCheck, UserX, Monitor, ShieldAlert, X, Check, User, Pencil, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { createCashier, updateCashier, deleteCashier } from '../lib/manageUser'

interface Cashier {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface Station {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_main: boolean;   // ← ajoute
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
  const [newPhone, setNewPhone] = useState('');
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

  // Édition station
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editStationName, setEditStationName] = useState('');
  const [editStationDesc, setEditStationDesc] = useState('');

  // Édition caissier
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // View password
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Confirmations de suppression
  const [confirmDeleteCashier, setConfirmDeleteCashier] = useState<Cashier | null>(null);
  const [confirmDeleteStation, setConfirmDeleteStation] = useState<Station | null>(null);

  // Mon compte — changement de mot de passe (admin lui-même)
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [showMyPasswordField, setShowMyPasswordField] = useState(false);
  const [mySaving, setMySaving] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);
  const [mySuccess, setMySuccess] = useState(false);

  // View password (Mon compte)
  const [showMyPwd1, setShowMyPwd1] = useState(false);
  const [showMyPwd2, setShowMyPwd2] = useState(false);

  const handleChangeMyPassword = async () => {
    setMyError(null);
    setMySuccess(false);

    if (myNewPassword.length < 6) {
      setMyError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (myNewPassword !== myConfirmPassword) {
      setMyError('Les mots de passe ne correspondent pas.');
      return;
    }

    setMySaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: myNewPassword });
      if (error) throw error;
      setMySuccess(true);
      setMyNewPassword('');
      setMyConfirmPassword('');
      setShowMyPasswordField(false);
    } catch (e: any) {
      setMyError(e?.message ?? 'Erreur lors du changement de mot de passe.');
    } finally {
      setMySaving(false);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cashiersRes, stationsRes, assignmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cashier').order('created_at'),
        supabase.from('pos_stations').select('*').order('created_at'),
        supabase.from('cashier_assignments').select('*'),
      ]);
      if (cashiersRes.data) setCashiers(cashiersRes.data);
      if (stationsRes.data) setStations(stationsRes.data.filter(s => !s.is_main));
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Caissiers ──
  const handleAddCashier = async () => {
    if (!newPhone || !newName || !newPassword) {
      setSaveError('Tous les champs sont obligatoires.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await createCashier(newPhone, newPassword, newName);
      setShowAddCashier(false);
      setNewPhone(''); setNewName(''); setNewPassword('');
      setShowNewPassword(false);
      fetchAll();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCashier = async () => {
    if (!editingCashier) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateCashier(editingCashier.id, {
        full_name: editName,
        phone: editPhone,
        ...(editPassword && { password: editPassword }),
      });
      setEditingCashier(null);
      setShowEditPassword(false);
      fetchAll();
    } catch (e: any) {
      setEditError(e?.message ?? 'Erreur lors de la modification.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteCashier = async (id: string) => {
    try {
      await deleteCashier(id);
      fetchAll();
    } catch (e: any) {
      console.error(e);
    }
  };

  // ── Stations ──
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

  const handleEditStation = async () => {
    if (!editingStation || !editStationName) return;
    await supabase.from('pos_stations')
      .update({ name: editStationName, description: editStationDesc || null })
      .eq('id', editingStation.id);
    setEditingStation(null);
    fetchAll();
  };

  const handleDeleteStation = async (id: string) => {
    await supabase.from('pos_stations').delete().eq('id', id);
    fetchAll();
  };

  const toggleStation = async (station: Station) => {
    await supabase.from('pos_stations')
      .update({ is_active: !station.is_active })
      .eq('id', station.id);
    fetchAll();
  };

  // ── Assignations ──
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

        {/* ── MON COMPTE ── */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <KeyRound size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mon compte</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{authUser?.fullName} · {authUser?.phone}</p>
            </div>
          </div>

          {!showMyPasswordField ? (
            <button
              onClick={() => { setShowMyPasswordField(true); setMyError(null); setMySuccess(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <KeyRound size={14} /> Changer mon mot de passe
            </button>
          ) : (
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showMyPwd1 ? 'text' : 'password'}
                    value={myNewPassword}
                    onChange={e => setMyNewPassword(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMyPwd1(v => !v)}
                    className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showMyPwd1 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showMyPwd2 ? 'text' : 'password'}
                    value={myConfirmPassword}
                    onChange={e => setMyConfirmPassword(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMyPwd2(v => !v)}
                    className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showMyPwd2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {myError && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {myError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowMyPasswordField(false); setMyNewPassword(''); setMyConfirmPassword(''); setMyError(null); setShowMyPwd1(false); setShowMyPwd2(false); }}
                  disabled={mySaving}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleChangeMyPassword}
                  disabled={mySaving || !myNewPassword || !myConfirmPassword}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <Check size={14} />
                  {mySaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {mySuccess && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
              <CheckCircle2 size={15} /> Mot de passe mis à jour avec succès.
            </div>
          )}
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cashier.phone}</p>
                    </div>
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
                        setEditingCashier(cashier);
                        setEditName(cashier.full_name);
                        setEditPhone(cashier.phone);
                        setEditPassword('');
                        setEditError(null);
                      }}
                      className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteCashier(cashier)}
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
                      onClick={() => {
                        setEditingStation(station);
                        setEditStationName(station.name);
                        setEditStationDesc(station.description ?? '');
                      }}
                      className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteStation(station)}
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
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Téléphone</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="48751505"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                disabled={saving || !newPhone || !newName || !newPassword}
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

      {/* ── MODAL MODIFIER STATION ── */}
      {editingStation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Modifier le point de vente</h2>
              <button onClick={() => setEditingStation(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom</label>
                <input
                  value={editStationName}
                  onChange={e => setEditStationName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</label>
                <input
                  value={editStationDesc}
                  onChange={e => setEditStationDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setEditingStation(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditStation}
                disabled={!editStationName}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Check size={16} /> Enregistrer
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
                      disabled={!!isOccupied}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-colors ${
                        isOccupied
                          ? 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                          : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300'
                      }`}
                    >
                      <Monitor size={16} className={isOccupied ? 'text-gray-300 dark:text-gray-600' : 'text-amber-500'} />
                      <span className="flex-1 text-left">{station.name}</span>
                      {isOccupied
                        ? <span className="text-xs text-gray-400">Occupé par {occupiedBy!.full_name}</span>
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

      {/* ── MODAL MODIFIER CAISSIER ── */}
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
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Téléphone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nouveau mot de passe <span className="text-gray-400 normal-case font-normal">(laisser vide pour ne pas changer)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(v => !v)}
                    className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                disabled={editSaving || !editName || !editPhone}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Check size={16} />
                {editSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMATION SUPPRESSION CAISSIER ── */}
      {confirmDeleteCashier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Supprimer ce caissier ?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span className="font-semibold text-gray-900 dark:text-white">{confirmDeleteCashier.full_name}</span> sera définitivement supprimé. Cette action est irréversible.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteCashier(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { handleDeleteCashier(confirmDeleteCashier.id); setConfirmDeleteCashier(null); }}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all active:scale-95"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMATION SUPPRESSION STATION ── */}
      {confirmDeleteStation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Supprimer ce point de vente ?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span className="font-semibold text-gray-900 dark:text-white">{confirmDeleteStation.name}</span> sera définitivement supprimé. Cette action est irréversible.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteStation(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { handleDeleteStation(confirmDeleteStation.id); setConfirmDeleteStation(null); }}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all active:scale-95"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}