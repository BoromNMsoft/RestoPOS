import { X, Printer, Check } from 'lucide-react';
import { Sale, SaleItem, formatSaleId, ORDER_TYPE_LABELS, OrderType } from '../types';
import { useEffect, useRef } from 'react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
  restaurantName?: string;
  restaurantLogo?: string | null;
}

export default function ReceiptModal({ sale, onClose, restaurantName, restaurantLogo }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePrint = () => {
    const win = window.open('', '', 'width=420,height=700');
    if (!win) return;

    const items = sale.items?.map((item: SaleItem) => `
      <tr>
        <td>${item.product_name}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${item.unit_price.toFixed(2)} MRU</td>
        <td class="right">${item.subtotal.toFixed(2)} MRU</td>
      </tr>
    `).join('') || '';

    const date = new Date(sale.created_at);
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const orderLabelPrint = sale.is_from_order ? 'COMMANDE' : '';
    const typeLabelPrint = sale.order_type ? ORDER_TYPE_LABELS[sale.order_type as OrderType] : '';

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu #${sale.id.slice(0, 8).toUpperCase()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            background: #fff;
            color: #111;
            padding: 24px 20px;
            max-width: 380px;
            margin: 0 auto;
          }

          /* ── En-tête ── */
          .header {
            text-align: center;
            margin-bottom: 16px;
          }
          .header .logo {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .header .tagline {
            font-size: 10px;
            color: #000;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .header .meta {
            margin-top: 8px;
            font-size: 11px;
            color: #000;
          }
          .header .ref {
            display: inline-block;
            margin-top: 6px;
            background: #111;
            color: #fff;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 10px;
            letter-spacing: 1px;
          }

          /* ── Séparateurs ── */
          .sep-solid { border: none; border-top: 1.5px solid #111; margin: 12px 0; }
          .sep-dash  { border: none; border-top: 1px dashed #000; margin: 10px 0; }

          /* ── Table articles ── */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          thead tr {
            border-bottom: 1px solid #000;
          }
          thead td {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #000;
            padding-bottom: 6px;
          }
          tbody tr td {
            padding: 5px 0;
            vertical-align: top;
          }
          tbody tr:not(:last-child) td {
            border-bottom: 1px dotted #eee;
          }
          .col-name  { width: 45%; }
          .col-qty   { width: 10%; text-align: center; }
          .col-price { width: 20%; text-align: right; color: #000; }
          .col-total { width: 25%; text-align: right; font-weight: bold; }
          .center { text-align: center; }
          .right { text-align: right; }

          /* ── Récapitulatif ── */
          .summary { margin-top: 4px; }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 12px;
            color: #000;
          }
          .summary-row.total {
            font-size: 15px;
            font-weight: 900;
            color: #111;
            padding-top: 8px;
            margin-top: 4px;
            border-top: 1.5px solid #111;
          }
          .summary-row.change {
            color: #16a34a;
            font-weight: 700;
          }

          .badge-payment {
            display: inline-block;
            background: #f3f4f6;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 1px 8px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          /* ── Pied de page ── */
          .footer {
            text-align: center;
            margin-top: 16px;
            font-size: 10px;
            color: #000;
            letter-spacing: 0.5px;
          }
          .footer .thanks {
            font-size: 13px;
            font-weight: bold;
            color: #111;
            margin-bottom: 4px;
            letter-spacing: 2px;
            text-transform: uppercase;
          }

          @media print {
            body { padding: 0; }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>

        <div class="header">
          ${restaurantLogo ? `<img src="${restaurantLogo}" alt="logo" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin:0 auto 8px;display:block;" />` : ''}
          <div class="logo">${restaurantName ?? 'RestoPOS'}</div>
          <div class="tagline">Votre restaurant de confiance</div>
          <div class="meta">${dateStr} &nbsp;|&nbsp; ${timeStr}</div>
          <div class="ref">#${sale.id.slice(0, 8).toUpperCase()}</div>
          ${(orderLabelPrint || typeLabelPrint) ? `
            <div style="margin-top:8px;">
              ${orderLabelPrint ? `<span style="display:inline-block;background:#111;color:#fff;padding:2px 10px;border-radius:4px;font-size:10px;font-weight:bold;letter-spacing:1px;margin-right:4px;">${orderLabelPrint}</span>` : ''}
              ${typeLabelPrint ? `<span style="display:inline-block;background:#f3f4f6;border:1px solid #ccc;padding:2px 10px;border-radius:4px;font-size:10px;letter-spacing:1px;">${typeLabelPrint}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <hr class="sep-solid" />

        <table>
          <thead>
            <tr>
              <td class="col-name">Article</td>
              <td class="col-qty">Qté</td>
              <td class="col-price">P.U.</td>
              <td class="col-total">Total</td>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>

        <hr class="sep-solid" />

        <div class="summary">
          <div class="summary-row">
            <span>Paiement</span>
            <span class="badge-payment">${sale.payment_method === 'cash' ? 'Espèces' : 'Carte'}</span>
          </div>
          <div class="summary-row">
            <span>Montant reçu</span>
            <span>${sale.amount_received.toFixed(2)} MRU</span>
          </div>
          <div class="summary-row change">
            <span>Monnaie rendue</span>
            <span>${sale.change_given.toFixed(2)} MRU</span>
          </div>
          <div class="summary-row total">
            <span>TOTAL</span>
            <span>${sale.total.toFixed(2)} MRU</span>
          </div>
        </div>

        <hr class="sep-dash" />

        ${sale.note ? `
          <div style="margin: 8px 0 12px 0;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #000; margin-bottom: 4px;">Note</div>
            <div style="font-size: 12px; color: #111; font-style: italic;">${sale.note}</div>
          </div>
          <hr class="sep-dash" />
        ` : ''}

        <div class="footer">
          <div class="thanks">Merci !</div>
          <div>Nous espérons vous revoir bientôt.</div>
          <div style="margin-top:8px;">★ ★ ★</div>
        </div>

      </body>
      </html>
    `);

    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const date = new Date(sale.created_at);
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const orderTypeLabel = sale.order_type ? ORDER_TYPE_LABELS[sale.order_type as OrderType] : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Success header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-5 text-white text-center shrink-0">
          <div className="w-12 h-12 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2">
            <Check size={24} />
          </div>
          <h2 className="text-xl font-bold">Paiement accepté !</h2>
          <p className="text-sm opacity-90 mt-1">Transaction enregistrée</p>
        </div>

        {/* Receipt */}
        <div ref={receiptRef} className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <div className="text-center mb-3">
            {restaurantLogo && (
              <img src={restaurantLogo} alt={restaurantName} className="w-10 h-10 rounded-lg object-cover mx-auto mb-1.5" />
            )}
            <p className="font-bold text-gray-900 dark:text-white">{restaurantName ?? 'RestoPOS'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{dateStr} - {timeStr}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{formatSaleId(sale)}</p>

            {/* Badge origine + type */}
            <div className="mt-2 flex items-center justify-center gap-1.5">
              {sale.is_from_order && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  Commande
                </span>
              )}
              {orderTypeLabel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {orderTypeLabel}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-3" />

          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs">
                <th className="text-left pb-2 font-medium">Article</th>
                <th className="text-center pb-2 font-medium">Qté</th>
                <th className="text-right pb-2 font-medium">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item: SaleItem) => (
                <tr key={item.id} className="text-gray-900 dark:text-white">
                  <td className="py-1">{item.product_name}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right tabular-nums">{item.subtotal.toFixed(2)} MRU</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-3" />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Total</span>
              <span className="font-bold text-gray-900 dark:text-white tabular-nums">{sale.total.toFixed(2)} MRU</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Reçu</span>
              <span className="tabular-nums">{sale.amount_received.toFixed(2)} MRU</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Monnaie rendue</span>
              <span className="tabular-nums">{sale.change_given.toFixed(2)} MRU</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-3" />
          {/* Note */}
          {sale.note && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Note</p>
              <p className="text-sm text-gray-900 dark:text-white italic">{sale.note}</p>
              <div className="border-t border-dashed border-gray-300 dark:border-gray-700 mt-3" />
            </div>
          )}
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">Merci de votre visite !</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-3 flex gap-3 shrink-0 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Printer size={16} />
            Imprimer
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}