import { Search, Plus } from 'lucide-react';
import { Product, Category, CartItem } from '../types';
import { useState, useMemo } from 'react';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  loading: boolean;
}

export default function ProductGrid({ products, categories, cart, onAddToCart, loading }: ProductGridProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const cartMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(item => map.set(item.product.id, item.quantity));
    return map;
  }, [cart]);

  const filtered = useMemo(() => {
  return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !activeCategory || p.category_id === activeCategory;
      // Affiche uniquement les produits disponibles (épuisés inclus, indisponibles exclus)
      return matchSearch && matchCategory && p.is_available;
    });
  }, [products, search, activeCategory]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            !activeCategory
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Tout
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeCategory === cat.id
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(product => {
            const qty = cartMap.get(product.id) || 0;
            const outOfStock = product.stock === 0;
            const maxReached = qty >= product.stock; // ← ajouté

            return (
              <button
                key={product.id}
                onClick={() => !outOfStock && onAddToCart(product)}
                disabled={outOfStock}
                className={`group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border transition-all duration-200 text-left ${
                  outOfStock
                    ? 'border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-100 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.97]'
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${!outOfStock && 'group-hover:scale-105'}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Plus size={24} className="text-gray-300 dark:text-gray-600" />
                    </div>
                  )}

                  {/* Overlay épuisé OU max atteint */}
                  {(outOfStock || maxReached) && (
                    <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                      <span className="text-white text-xs font-bold tracking-wider uppercase px-2 py-1 rounded-lg bg-gray-900/80">
                        {outOfStock ? 'Épuisé' : 'Max atteint'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-base font-bold ${outOfStock ? 'text-gray-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {product.price.toFixed(2)} €
                    </span>
                    {!outOfStock && product.stock > 0 && product.stock < 10 && (
                      <span className="text-[10px] text-orange-500 font-medium">{product.stock} rest.</span>
                    )}
                  </div>
                </div>

                {qty > 0 && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {qty}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <Search size={40} strokeWidth={1.5} />
            <p className="mt-3 text-sm">Aucun produit trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
    