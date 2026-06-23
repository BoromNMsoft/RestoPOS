import { Plus, Pencil, Trash2, X, Check, Search, Package, ShieldAlert, Tag } from 'lucide-react';
import { Product, Category } from '../types';
import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface ProductManagementProps {
  products: Product[];
  categories: Category[];
  onRefetch: () => void;
}

type Tab = 'products' | 'categories';

const ICONS = ['Soup', 'Beef', 'Pizza', 'Sandwich', 'Cake', 'Coffee', 'Wine', 'Fish', 'Salad', 'IceCream', 'Beer', 'Utensils'];

export default function ProductManagement({ products, categories, onRefetch }: ProductManagementProps) {
  const { authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');

  // Produits
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    name: '',
    price: '',
    image_url: '',
    category_id: '',
    stock: '',
    is_available: true,
  });

  // Catégories
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Utensils');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<Category | null>(null);

  const filtered = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const openNew = () => {
    if (!isAdmin) return;
    setSaveError(null);
    setEditingProduct(null);
    setForm({ name: '', price: '', image_url: '', category_id: categories[0]?.id || '', stock: '0', is_available: true });
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    if (!isAdmin) return;
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price.toString(),
      image_url: product.image_url || '',
      category_id: product.category_id,
      stock: product.stock.toString(),
      is_available: product.is_available,
    });
    setShowForm(true);
  };

  const formatSaveError = (message: string) => {
    if (message.includes('infinite recursion')) {
      return 'Erreur de configuration Supabase (RLS).';
    }
    if (message.includes('row-level security') || message.includes('permission denied')) {
      return 'Permission refusée. Reconnectez-vous avec le compte admin.';
    }
    if (message.includes('violates foreign key')) {
      return 'Catégorie invalide. Rechargez la page et réessayez.';
    }
    return message;
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      setSaveError('Le nom et le prix sont obligatoires.');
      return;
    }
    if (!form.category_id) {
      setSaveError('Aucune catégorie disponible. Vérifiez la connexion à la base de données.');
      return;
    }

    const price = parseFloat(form.price);
    if (Number.isNaN(price) || price < 0) {
      setSaveError('Le prix doit être un nombre positif.');
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price,
        image_url: form.image_url.trim() || null,
        category_id: form.category_id,
        stock: parseInt(form.stock, 10) || 0,
        is_available: parseInt(form.stock, 10) > 0 ? form.is_available : false,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }

      setShowForm(false);
      onRefetch();
    } catch (e) {
      const message = e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : 'Erreur lors de l\'enregistrement';
      setSaveError(formatSaveError(message));
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      onRefetch();
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setDeleting(null);
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || '';

  // ── Catégories ──
  const handleAddCategory = async () => {
    if (!newCatName) return;
    setCatSaving(true);
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
    await supabase.from('categories').insert({ name: newCatName, icon: newCatIcon, sort_order: maxOrder + 1 });
    setShowAddCategory(false); setNewCatName(''); setNewCatIcon('Utensils');
    setCatSaving(false); onRefetch();
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCatName) return;
    setCatSaving(true);
    await supabase.from('categories').update({ name: editCatName, icon: editCatIcon }).eq('id', editingCategory.id);
    setEditingCategory(null); setCatSaving(false); onRefetch();
  };

  const handleDeleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    onRefetch();
  };

  const moveCategoryOrder = async (category: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(c => c.id === category.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await Promise.all([
      supabase.from('categories').update({ sort_order: swap.sort_order }).eq('id', category.id),
      supabase.from('categories').update({ sort_order: category.sort_order }).eq('id', swap.id),
    ]);
    onRefetch();
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
        <ShieldAlert size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-4">Accès restreint</h2>
        <p className="text-sm mt-2 text-center max-w-md">La gestion des produits est réservée aux administrateurs. En tant que caissier, vous pouvez utiliser la caisse et modifier le stock des produits.</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {tab === 'products' ? 'Gestion des produits' : 'Gestion des catégories'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tab === 'products' ? `${products.length} produit(s) au total` : `${categories.length} catégorie(s)`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button onClick={() => setTab('products')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'products' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Package size={12} /> Produits
              </button>
              <button onClick={() => setTab('categories')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'categories' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Tag size={12} /> Catégories
              </button>
            </div>
            {tab === 'products' ? (
              <button onClick={openNew}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95"
              >
                <Plus size={16} /> Ajouter
              </button>
            ) : (
              <button onClick={() => setShowAddCategory(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95"
              >
                <Plus size={16} /> Ajouter
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {tab === 'products' && (
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
          </div>
        )}

        {/* Product list */}
        {tab === 'products' && (
          <div className="space-y-2">
            {filtered.map(product => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      product.is_available
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                      {product.is_available ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">{getCategoryName(product.category_id)}</span>
                    <span>Stock: {product.stock}</span>
                  </div>
                </div>

                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">{product.price.toFixed(2)} €</span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(product)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteProduct(product)}
                    disabled={deleting === product.id}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <Package size={40} strokeWidth={1.5} className="mx-auto" />
                <p className="mt-3 text-sm">Aucun produit trouvé</p>
              </div>
            )}
          </div>
        )}

        {/* TAB CATÉGORIES */}
        {tab === 'categories' && (
          <div className="space-y-2">
            {[...categories].sort((a, b) => a.sort_order - b.sort_order).map((category, idx, arr) => (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                  <Tag size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{category.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Icône : {category.icon} · Ordre : {category.sort_order}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveCategoryOrder(category, 'up')} disabled={idx === 0}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs"
                  >▲</button>
                  <button onClick={() => moveCategoryOrder(category, 'down')} disabled={idx === arr.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs"
                  >▼</button>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingCategory(category); setEditCatName(category.name); setEditCatIcon(category.icon); }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmDeleteCategory(category)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <Tag size={40} strokeWidth={1.5} className="mx-auto" />
                <p className="mt-3 text-sm">Aucune catégorie</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form modal produit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="Nom du produit"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prix (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      const stock = raw === '' ? '0' : String(Math.max(0, parseInt(raw, 10)));
                      setForm(f => ({
                        ...f,
                        stock,
                        is_available: parseInt(stock, 10) > 0,
                      }));
                    }}
                    onKeyDown={e => {
                      if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Catégorie</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image URL</label>
                <input
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    disabled={parseInt(form.stock, 10) === 0}
                    onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
                <span className="text-sm text-gray-700 dark:text-gray-300">Disponible</span>
              </div>
            </div>

            {saveError && (
              <div className="mx-6 mb-0 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {saveError}
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.price || !form.category_id}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={16} />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT CATÉGORIE */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouvelle catégorie</h2>
              <button onClick={() => setShowAddCategory(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom</label>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex: Tacos"
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Icône</label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setNewCatIcon(icon)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        newCatIcon === icon ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setShowAddCategory(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuler</button>
              <button onClick={handleAddCategory} disabled={catSaving || !newCatName}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Check size={16} />{catSaving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER CATÉGORIE */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Modifier la catégorie</h2>
              <button onClick={() => setEditingCategory(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom</label>
                <input value={editCatName} onChange={e => setEditCatName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Icône</label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setEditCatIcon(icon)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        editCatIcon === icon ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setEditingCategory(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuler</button>
              <button onClick={handleEditCategory} disabled={catSaving || !editCatName}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Check size={16} />{catSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION PRODUIT */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Supprimer ce produit ?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span className="font-semibold text-gray-900 dark:text-white">{confirmDeleteProduct.name}</span> sera définitivement supprimé. Cette action est irréversible.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteProduct(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { handleDelete(confirmDeleteProduct.id); setConfirmDeleteProduct(null); }}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all active:scale-95"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION CATÉGORIE */}
      {confirmDeleteCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Supprimer cette catégorie ?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span className="font-semibold text-gray-900 dark:text-white">{confirmDeleteCategory.name}</span> sera supprimée. Les produits associés seront sans catégorie.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteCategory(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { handleDeleteCategory(confirmDeleteCategory.id); setConfirmDeleteCategory(null); }}
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