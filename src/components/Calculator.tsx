import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingBag, Smartphone, Banknote, FileText, ClipboardList, Store, ChevronDown } from 'lucide-react';
import { PaymentProvider, PAYMENT_PROVIDER_LABELS } from '../types';

type PaymentMethod = 'cash' | 'mobile';
type ServiceType = 'dine_in' | 'takeaway';

interface CalculatorProps {
  total: number;
  onCashCheckout: (
    amountReceived: number,
    change: number,
    method: PaymentMethod,
    note: string,
    orderType: ServiceType,
    provider: PaymentProvider | null
  ) => void;
  onNewOrder: () => void;
  disabled: boolean;
}

const PROVIDERS: PaymentProvider[] = ['bankily', 'masrvi', 'sedad'];

export default function Calculator({ total, onCashCheckout, onNewOrder, disabled }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [change, setChange] = useState<number | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('dine_in');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowCalculator(false);
      setDisplay('0');
      setChange(null);
    }, 30000);
  }, []);

  const handleActivity = useCallback(() => {
    if (showCalculator) resetTimer();
  }, [showCalculator, resetTimer]);

  useEffect(() => {
    if (showCalculator) resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [showCalculator, resetTimer]);

  useEffect(() => {
    if (disabled && showCalculator) {
      setShowCalculator(false);
      setDisplay('0');
      setChange(null);
      setNote('');
      setShowNote(false);
      setPaymentMethod('cash');
      setProvider(null);
      setServiceType('dine_in');
    }
  }, [disabled, showCalculator]);

  // Ferme le menu mobile au clic extérieur
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileMenuOpen]);

  // En mode Mobile, le montant reçu = total automatiquement (pas de monnaie)
  useEffect(() => {
    if (paymentMethod === 'mobile') {
      setDisplay(total.toFixed(2));
      setChange(0);
    } else {
      setDisplay('0');
      setChange(null);
      setProvider(null);
    }
  }, [paymentMethod, total]);

  const handleDigit = (digit: string) => {
    if (disabled || paymentMethod === 'mobile') return;
    handleActivity();
    setDisplay(prev => {
      const next = prev === '0' ? digit : prev + digit;
      const val = parseFloat(next);
      setChange(val >= total ? val - total : null);
      return next;
    });
  };

  const handleClear = () => {
    if (paymentMethod === 'mobile') return;
    handleActivity();
    setDisplay('0');
    setChange(null);
  };

  const handleBackspace = () => {
    if (paymentMethod === 'mobile') return;
    handleActivity();
    setDisplay(prev => {
      const next = prev.length <= 1 ? '0' : prev.slice(0, -1);
      const val = parseFloat(next);
      setChange(val >= total ? val - total : null);
      return next;
    });
  };

  const handleQuickAmount = (amount: number) => {
    if (disabled || paymentMethod === 'mobile') return;
    handleActivity();
    setDisplay(amount.toString());
    setChange(amount >= total ? amount - total : null);
  };

  const handleExactAmount = () => {
    if (disabled || paymentMethod === 'mobile') return;
    handleActivity();
    setDisplay(total.toFixed(2));
    setChange(0);
  };

  // Sélection d'un provider mobile via le menu custom
  const selectProvider = (p: PaymentProvider) => {
    handleActivity();
    setPaymentMethod('mobile');
    setProvider(p);
    setMobileMenuOpen(false);
  };

  const handleCheckout = () => {
    if (disabled) return;
    if (paymentMethod === 'cash') {
      const received = parseFloat(display);
      if (received < total || isNaN(received)) return;
      onCashCheckout(received, received - total, 'cash', note, serviceType, null);
    } else {
      if (!provider) return;
      onCashCheckout(total, 0, 'mobile', note, serviceType, provider);
    }
    setDisplay('0');
    setChange(null);
    setNote('');
    setShowNote(false);
    setShowCalculator(false);
    setPaymentMethod('cash');
    setProvider(null);
    setServiceType('dine_in');
  };

  const amount = parseFloat(display) || 0;
  const canCheckout = !disabled && total > 0 && (
    paymentMethod === 'mobile' ? !!provider : (amount >= total)
  );

  const buttons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', '00', '.'],
  ];

  if (!showCalculator) {
    return (
      <div className="px-4 pt-0 pb-4 flex flex-col gap-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={onNewOrder}
          disabled={total <= 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ClipboardList size={16} />
          Nouvelle commande
        </button>

        <button
          onClick={() => { setShowCalculator(true); resetTimer(); setDisplay('0'); setChange(null); }}
          disabled={total <= 0}
          className={`w-full py-4 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] ${
            total > 0
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-600 hover:to-orange-600'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed'
          }`}
        >
          <ShoppingBag size={20} />
          Nouvelle Vente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-gray-100 dark:border-gray-800">

      {/* Sélecteur mode paiement : Espèces | Mobile ▾ */}
      <div className="px-3 pt-3 pb-1 grid grid-cols-2 gap-2">
        <button
          onClick={() => { setPaymentMethod('cash'); setProvider(null); }}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            paymentMethod === 'cash'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          <Banknote size={16} /> Espèces
        </button>

        {/* Bouton Mobile avec menu déroulant custom */}
        <div className="relative" ref={mobileMenuRef}>
          <button
            onClick={() => { handleActivity(); setMobileMenuOpen(o => !o); }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              paymentMethod === 'mobile'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            <Smartphone size={16} />
            {paymentMethod === 'mobile' && provider ? PAYMENT_PROVIDER_LABELS[provider] : 'Mobile'}
            <ChevronDown size={14} className={`transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {mobileMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-fade-in">
              {PROVIDERS.map(p => (
                <button
                  key={p}
                  onClick={() => selectProvider(p)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    provider === p
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Smartphone size={14} />
                  {PAYMENT_PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sélecteur type de service */}
      <div className="px-3 pt-1 pb-1 grid grid-cols-2 gap-2">
        <button
          onClick={() => setServiceType('dine_in')}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
            serviceType === 'dine_in'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          <Store size={16} /> Sur place
        </button>
        <button
          onClick={() => setServiceType('takeaway')}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
            serviceType === 'takeaway'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          <ShoppingBag size={16} /> À emporter
        </button>
      </div>

      {/* Display */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50" onClick={handleActivity}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {paymentMethod === 'mobile' ? 'Paiement mobile' : 'Montant reçu'}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {paymentMethod === 'mobile' ? `${total.toFixed(2)} MRU` : `${display} MRU`}
            </p>
          </div>
          {paymentMethod === 'cash' && change !== null && (
            <div className="text-right">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Monnaie</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{change.toFixed(2)} MRU</p>
            </div>
          )}
          {paymentMethod === 'mobile' && (
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Smartphone size={20} className="text-blue-500" />
            </div>
          )}
        </div>
      </div>

      {/* Mode espèces — montants rapides + numpad */}
      {paymentMethod === 'cash' && (
        <>
          <div className="px-3 pt-2 pb-1 grid grid-cols-4 gap-1.5" onClick={handleActivity}>
            {[5, 10, 20, 50].map(a => (
              <button key={a} onClick={() => handleQuickAmount(a)}
                className="py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {a} MRU
              </button>
            ))}
          </div>

          <div className="px-3 py-1 grid grid-cols-4 gap-1.5">
            {buttons.map((row, ri) =>
              row.map(digit => (
                <button key={`${ri}-${digit}`} onClick={() => handleDigit(digit)}
                  className="py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                >
                  {digit}
                </button>
              ))
            )}
            <button onClick={handleBackspace}
              className="py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >←</button>
            <button onClick={handleClear}
              className="py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 active:scale-95 transition-all shadow-sm"
            >C</button>
            <button onClick={handleExactAmount} disabled={disabled || total === 0}
              className="py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 active:scale-95 transition-all shadow-sm disabled:opacity-40"
            >Exact</button>
          </div>
        </>
      )}

      {/* Mode mobile — confirmation provider */}
      {paymentMethod === 'mobile' && (
        <div className="px-4 py-4 text-center">
          <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
            Paiement via {provider ? PAYMENT_PROVIDER_LABELS[provider] : '—'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Confirmez après réception du paiement
          </p>
        </div>
      )}

      {/* Note commande */}
      <div className="px-3 pb-1">
        <button
          onClick={() => setShowNote(v => !v)}
          className="w-full flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <FileText size={12} />
          {showNote ? 'Masquer la note' : note ? `Note : ${note}` : 'Ajouter une note'}
        </button>
        {showNote && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Sans sauce, à emporter, allergie..."
            className="mt-1.5 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          />
        )}
      </div>

      {/* Checkout button */}
      <div className="px-3 pt-1 pb-3">
        <button
          onClick={handleCheckout}
          disabled={!canCheckout}
          className={`w-full py-3.5 rounded-xl text-base font-bold transition-all duration-200 shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
            canCheckout
              ? paymentMethod === 'mobile'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/25 hover:shadow-blue-500/40'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-600 hover:to-orange-600'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed'
          }`}
        >
          {paymentMethod === 'mobile' ? <Smartphone size={18} /> : <Banknote size={18} />}
          {paymentMethod === 'mobile'
            ? `${provider ? PAYMENT_PROVIDER_LABELS[provider] : 'Mobile'} · ${total.toFixed(2)} MRU`
            : `Encaisser ${total > 0 ? `${total.toFixed(2)} MRU` : ''}`}
        </button>
      </div>
    </div>
  );
}