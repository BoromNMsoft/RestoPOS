import { X, Printer, ClipboardList, Store, ShoppingBag, Bike, Phone, StickyNote } from 'lucide-react';
import { Order, OrderType, OrderItem, ORDER_TYPE_LABELS } from '../types';
import { useEffect } from 'react';

interface OrderTicketModalProps {
  order: Order;
  onClose: () => void;
  restaurantName?: string;
  restaurantLogo?: string | null;
}

const TYPE_ICON: Record<OrderType, typeof Store> = {
  dine_in: Store,
  takeaway: ShoppingBag,
  delivery: Bike,
};

export default function OrderTicketModal({ order, onClose, restaurantName, restaurantLogo }: OrderTicketModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const TypeIcon = TYPE_ICON[order.order_type];

  const handlePrint = () => {
    const win = window.open('', '', 'width=420,height=700');
    if (!win) return;

    const items = order.items?.map((item: OrderItem) => `
      <tr>
        <td>${item.product_name}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${item.unit_price.toFixed(2)} MRU</td>
        <td class="right">${item.subtotal.toFixed(2)} MRU</td>
      </tr>
    `).join('') || '';

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bon de commande #${order.id.slice(0, 8).toUpperCase()}</title>
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
          .header { text-align: center; margin-bottom: 12px; }
          .header .logo {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .badge-order {
            display: inline-block;
            margin: 8px 0 4px;
            background: #111;
            color: #fff;
            padding: 4px 14px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .header .meta { margin-top: 8px; font-size: 11px; color: #444; }
          .header .ref {
            display: inline-block;
            margin-top: 6px;
            background: #f3f4f6;
            border: 1px solid #ccc;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 10px;
            letter-spacing: 1px;
          }
          .info-block {
            margin: 10px 0;
            padding: 10px;
            background: #f9fafb;
            border: 1px dashed #ccc;
            border-radius: 6px;
            font-size: 12px;
          }
          .info-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .info-row .label { color: #666; }
          .info-row .value { font-weight: bold; }
          .sep-solid { border: none; border-top: 1.5px solid #111; margin: 12px 0; }
          .sep-dash  { border: none; border-top: 1px dashed #aaa; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          thead tr { border-bottom: 1px solid #ddd; }
          thead td {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
            padding-bottom: 6px;
          }
          tbody tr td { padding: 5px 0; vertical-align: top; }
          tbody tr:not(:last-child) td { border-bottom: 1px dotted #eee; }
          .center { text-align: center; }
          .right { text-align: right; }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 15px;
            font-weight: 900;
            padding-top: 8px;
            margin-top: 4px;
            border-top: 1.5px solid #111;
          }
          .footer {
            text-align: center;
            margin-top: 16px;
            font-size: 10px;
            color: #999;
            letter-spacing: 0.5px;
          }
          .footer .note-pay {
            font-size: 11px;
            color: #b45309;
            font-weight: bold;
            margin-bottom: 6px;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 10mm; }
            * {
              color: #000 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${restaurantLogo ? `<img src="${restaurantLogo}" alt="logo" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin:0 auto 8px;display:block;" />` : ''}
          <div class="logo">${restaurantName ?? 'RestoPOS'}</div>
          <div class="badge-order">★ Bon de commande ★</div>
          <div class="meta">${dateStr} &nbsp;|&nbsp; ${timeStr}</div>
          <div class="ref">#${order.id.slice(0, 8).toUpperCase()}</div>
        </div>

        <div class="info-block">
          <div class="info-row">
            <span class="label">Type</span>
            <span class="value">${ORDER_TYPE_LABELS[order.order_type]}</span>
          </div>
          ${order.customer_phone ? `
          <div class="info-row">
            <span class="label">Téléphone</span>
            <span class="value">${order.customer_phone}</span>
          </div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <td>Article</td>
              <td class="center">Qté</td>
              <td class="right">P.U.</td>
              <td class="right">Total</td>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>

        <div class="total-row">
          <span>TOTAL À PAYER</span>
          <span>${order.total.toFixed(2)} MRU</span>
        </div>

        ${order.note ? `
          <hr class="sep-dash" />
          <div style="margin: 8px 0;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px;">Note</div>
            <div style="font-size: 12px; color: #111; font-style: italic;">${order.note}</div>
          </div>
        ` : ''}

        <div class="footer">
          <div class="note-pay">⚠ Commande non payée — à régler à la récupération</div>
          <div>Merci !</div>
          <div style="margin-top:8px;">★ ★ ★</div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white text-center shrink-0">
          <div className="w-12 h-12 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2">
            <ClipboardList size={24} />
          </div>
          <h2 className="text-xl font-bold">Commande enregistrée !</h2>
          <p className="text-sm opacity-90 mt-1">Bon de commande</p>
        </div>

        {/* Ticket */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <div className="text-center mb-3">
            {restaurantLogo && (
              <img src={restaurantLogo} alt={restaurantName} className="w-10 h-10 rounded-lg object-cover mx-auto mb-1.5" />
            )}
            <p className="font-bold text-gray-900 dark:text-white">{restaurantName ?? 'RestoPOS'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{dateStr} - {timeStr}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Infos commande */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><TypeIcon size={14} /> Type</span>
              <span className="font-semibold text-gray-900 dark:text-white">{ORDER_TYPE_LABELS[order.order_type]}</span>
            </div>
            {order.customer_phone && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Phone size={14} /> Téléphone</span>
                <span className="font-semibold text-gray-900 dark:text-white">{order.customer_phone}</span>
              </div>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs">
                <th className="text-left pb-2 font-medium">Article</th>
                <th className="text-center pb-2 font-medium">Qté</th>
                <th className="text-right pb-2 font-medium">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item: OrderItem) => (
                <tr key={item.id} className="text-gray-900 dark:text-white">
                  <td className="py-1">{item.product_name}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right tabular-nums">{item.subtotal.toFixed(2)} MRU</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-3" />

          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900 dark:text-white">Total à payer</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums text-lg">{order.total.toFixed(2)} MRU</span>
          </div>

          {order.note && (
            <>
              <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-3" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><StickyNote size={12} /> Note</p>
                <p className="text-sm text-gray-900 dark:text-white italic">{order.note}</p>
              </div>
            </>
          )}

          <div className="mt-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-center text-xs font-semibold text-amber-700 dark:text-amber-400">
              ⚠ Non payée — à régler à la récupération
            </p>
          </div>
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