import { Minus, Plus, Trash2, Receipt } from 'lucide-react';
import { CartItem } from '../types';

interface CartPanelProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  total: number;
}

export default function CartPanel({ cart, onUpdateQuantity, onRemoveItem, onClearCart, total }: CartPanelProps) {
  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-6">
        <Receipt size={48} strokeWidth={1} />
        <p className="mt-3 text-sm font-medium">Panier vide</p>
        <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Panier</h3>
        <button
          onClick={onClearCart}
          className="text-[10px] font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          Vider
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-2">
        {cart.map(item => (
          <div
            key={item.product.id}
            className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.product.price.toFixed(2)} MRU</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateQuantity(item.product.id, -1)}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Minus size={12} />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.product.id, 1)}
                disabled={item.quantity >= item.product.stock}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="w-16 text-right">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{(item.product.price * item.quantity).toFixed(2)} MRU</span>
            </div>

            <button
              onClick={() => onRemoveItem(item.product.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">{total.toFixed(2)} MRU</span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{cart.reduce((s, i) => s + i.quantity, 0)} article(s)</p>
      </div>
    </div>
  );
}
