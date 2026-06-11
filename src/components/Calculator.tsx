import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingBag } from 'lucide-react';

interface CalculatorProps {
  total: number;
  onCashCheckout: (amountReceived: number, change: number) => void;
  disabled: boolean;
}

export default function Calculator({ total, onCashCheckout, disabled }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [change, setChange] = useState<number | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
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
    if (showCalculator) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showCalculator, resetTimer]);

  // When cart is cleared (sale completed), hide calculator and show button
  useEffect(() => {
    if (disabled && showCalculator) {
      setShowCalculator(false);
      setDisplay('0');
      setChange(null);
    }
  }, [disabled, showCalculator]);

  const handleDigit = (digit: string) => {
    if (disabled) return;
    handleActivity();
    setDisplay(prev => {
      const next = prev === '0' ? digit : prev + digit;
      const val = parseFloat(next);
      setChange(val >= total ? val - total : null);
      return next;
    });
  };

  const handleClear = () => {
    handleActivity();
    setDisplay('0');
    setChange(null);
  };

  const handleBackspace = () => {
    handleActivity();
    setDisplay(prev => {
      const next = prev.length <= 1 ? '0' : prev.slice(0, -1);
      const val = parseFloat(next);
      setChange(val >= total ? val - total : null);
      return next;
    });
  };

  const handleQuickAmount = (amount: number) => {
    if (disabled) return;
    handleActivity();
    setDisplay(amount.toString());
    setChange(amount >= total ? amount - total : null);
  };

  const handleExactAmount = () => {
    if (disabled) return;
    handleActivity();
    const t = Math.ceil(total * 100) / 100;
    setDisplay(t.toString());
    setChange(0);
  };

  const handleCheckout = () => {
    if (disabled) return;
    const received = parseFloat(display);
    if (received < total || isNaN(received)) return;
    onCashCheckout(received, received - total);
    setDisplay('0');
    setChange(null);
    setShowCalculator(false);
  };

  const amount = parseFloat(display) || 0;
  const canCheckout = !disabled && amount >= total && total > 0;

  const buttons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', '00', '.'],
  ];

  // Show "Nouvelle Vente" button when calculator is hidden
  if (!showCalculator) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-3 border-t border-gray-100 dark:border-gray-800">
        <div className="w-full text-center mb-2">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{total.toFixed(2)} €</p>
        </div>
        <button
          onClick={() => {
            setShowCalculator(true);
            resetTimer();
            setDisplay('0');
            setChange(null);
          }}
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
        <p className="text-[10px] text-gray-400 dark:text-gray-600">
          Ajoutez des produits puis cliquez ici pour encaisser
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-gray-100 dark:border-gray-800">
      {/* Display */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50" onClick={handleActivity}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Montant reçu</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{display} €</p>
          </div>
          {change !== null && (
            <div className="text-right">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Monnaie</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{change.toFixed(2)} €</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick amounts */}
      <div className="px-3 pt-2 pb-1 grid grid-cols-4 gap-1.5" onClick={handleActivity}>
        {[5, 10, 20, 50].map(a => (
          <button
            key={a}
            onClick={() => handleQuickAmount(a)}
            className="py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {a} €
          </button>
        ))}
      </div>

      {/* Numpad */}
      <div className="px-3 py-1 grid grid-cols-4 gap-1.5">
        {buttons.map((row, ri) =>
          row.map(digit => (
            <button
              key={`${ri}-${digit}`}
              onClick={() => handleDigit(digit)}
              className="py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-95 transition-all shadow-sm"
            >
              {digit}
            </button>
          ))
        )}
        <button
          onClick={handleBackspace}
          className="py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-95 transition-all shadow-sm"
        >
          ←
        </button>
        <button
          onClick={handleClear}
          className="py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all shadow-sm"
        >
          C
        </button>
        <button
          onClick={handleExactAmount}
          disabled={disabled || total === 0}
          className="py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-all shadow-sm disabled:opacity-40"
        >
          Exact
        </button>
      </div>

      {/* Checkout button */}
      <div className="px-3 pt-1.5 pb-3">
        <button
          onClick={handleCheckout}
          disabled={!canCheckout}
          className={`w-full py-3.5 rounded-xl text-base font-bold transition-all duration-200 shadow-lg active:scale-[0.98] ${
            canCheckout
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-600 hover:to-orange-600'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed'
          }`}
        >
          Encaisser {total > 0 ? `${total.toFixed(2)} €` : ''}
        </button>
      </div>
    </div>
  );
}
