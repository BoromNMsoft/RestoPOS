import { useState } from 'react';
import { X, Check, Store, ShoppingBag, Bike, Phone, StickyNote } from 'lucide-react';
import { OrderType } from '../types';

interface OrderModalProps {
  total: number;
  onClose: () => void;
  onConfirm: (data: {
    order_type: OrderType;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    note: string;
  }) => Promise<void>;
}

const TYPES: { value: OrderType; label: string; icon: typeof Store }[] = [
  { value: 'dine_in', label: 'Sur place', icon: Store },
  { value: 'takeaway', label: 'À emporter', icon: ShoppingBag },
  { value: 'delivery', label: 'Livraison', icon: Bike },
];

export default function OrderModal({ total, onClose, onConfirm }: OrderModalProps) {
  const [orderType, setOrderType] = useState<OrderType>('takeaway');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    // ← ajoute cette vérification
    if (!customerPhone.trim()) {
      setError('Le numéro de téléphone est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      await onConfirm({
        order_type: orderType,
        customer_name: '',
        customer_phone: customerPhone.trim(),
        delivery_address: '',
        note: note.trim(),
      });
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de l\'enregistrement.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouvelle commande</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Type de commande */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setOrderType(value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                    orderType === value
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-2 ring-amber-400/30'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Téléphone client */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Téléphone<span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                placeholder="Numéro de téléphone"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Note</label>
            <div className="relative mt-1">
              <StickyNote size={16} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all resize-none"
                placeholder="Ajouter une note ..."
              />
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total commande</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{total.toFixed(2)} €</span>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !customerPhone.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={16} />
            {saving ? 'Enregistrement...' : 'Enregistrer la commande'}
          </button>
        </div>
      </div>
    </div>
  );
}