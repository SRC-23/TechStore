import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ordersApi } from '../../api/ordersApi';
import { Order } from '../../types';
import { apiErrorMessage, formatCRC, formatDate, statusLabels, statusStyles } from '../../utils/format';
import Icon from '../../components/ui/Icon';

const steps = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${statusStyles[status] ?? ''}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}

/** Línea de tiempo del estado del pedido. */
function StatusTimeline({ status }: { status: string }) {
  if (status === 'Cancelled') {
    return <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3">Este pedido fue cancelado y el stock fue devuelto al inventario.</p>;
  }
  const current = steps.indexOf(status);
  return (
    <ol className="flex items-center">
      {steps.map((s, i) => (
        <li key={s} className="flex-1 flex flex-col items-center relative">
          {i > 0 && <span className={`absolute top-3 right-1/2 w-full h-0.5 ${i <= current ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${i <= current ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {i <= current ? <Icon name="check" className="w-3.5 h-3.5" /> : <span className="text-[10px]">{i + 1}</span>}
          </span>
          <span className={`mt-1.5 text-xs ${i <= current ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{statusLabels[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const location = useLocation();
  const highlight = (location.state as { highlight?: string } | null)?.highlight;

  useEffect(() => {
    ordersApi.getMyOrders()
      .then(setOrders)
      .catch(() => toast.error('Error cargando pedidos'))
      .finally(() => setLoading(false));
  }, []);

  // HU-17/18: el cliente cancela su pedido y el stock se devuelve al inventario.
  const handleCancel = async (order: Order) => {
    if (!window.confirm(`¿Cancelar el pedido ${order.orderNumber}?`)) return;
    setCancelling(order.id);
    try {
      const updated = await ordersApi.cancel(order.id);
      setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
      setSelectedOrder(prev => (prev && prev.id === updated.id ? updated : prev));
      toast.success('Pedido cancelado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo cancelar el pedido'));
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (o: Order) => o.status === 'Pending' || o.status === 'Confirmed';

  if (loading) return <div className="space-y-4">{[0, 1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl border animate-pulse" />)}</div>;

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 text-center py-20 px-6 max-w-2xl mx-auto">
        <span className="mx-auto w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Icon name="box" className="w-10 h-10" /></span>
        <h2 className="text-2xl font-bold mt-6">No tienes pedidos</h2>
        <p className="text-gray-500 mt-2 mb-8">Tus pedidos aparecerán aquí después de comprar.</p>
        <Link to="/catalog" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">Ir al Catálogo</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Mis Pedidos</h1>
      <p className="text-gray-500 mt-1 mb-6">Haz clic en un pedido para ver su detalle.</p>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Pedido {selectedOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500">{formatDate(selectedOrder.createdAt, true)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <StatusTimeline status={selectedOrder.status} />

            <ul className="mt-6 divide-y divide-gray-100 text-sm">
              {selectedOrder.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3 py-2.5">
                  <span>{item.productName} <span className="text-gray-500">×{item.quantity}</span></span>
                  <span className="font-medium whitespace-nowrap">{formatCRC(item.total)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 pt-3 border-t space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{formatCRC(selectedOrder.subtotal)}</dd></div>
              {selectedOrder.appliedDiscounts.map((d, i) => (
                <div key={i} className="flex justify-between gap-3 text-emerald-700">
                  <dt className="text-xs">{d.description}</dt><dd className="whitespace-nowrap">-{formatCRC(d.discountAmount)}</dd>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg border-t pt-2"><dt>Total</dt><dd>{formatCRC(selectedOrder.total)}</dd></div>
            </dl>

            {selectedOrder.shippingAddress && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
                <p className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5"><Icon name="pin" className="w-4 h-4" /> Dirección de envío</p>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                <p>{selectedOrder.shippingAddress.country}</p>
              </div>
            )}

            {canCancel(selectedOrder) && (
              <button onClick={() => handleCancel(selectedOrder)} disabled={cancelling === selectedOrder.id}
                className="w-full mt-5 border border-rose-300 text-rose-700 py-2.5 rounded-xl font-semibold hover:bg-rose-50 disabled:opacity-50">
                {cancelling === selectedOrder.id ? 'Cancelando...' : 'Cancelar pedido'}
              </button>
            )}
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {orders.map(order => (
          <li key={order.id}>
            <button data-testid="order-row" data-number={order.orderNumber} onClick={() => setSelectedOrder(order)}
              className={`w-full text-left bg-white rounded-2xl border p-5 flex items-center justify-between gap-4 hover:shadow-md hover:border-blue-200 transition-all ${
                order.id === highlight ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Icon name="box" className="w-6 h-6" /></span>
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">{formatDate(order.createdAt)} · {order.items.length} producto(s)</p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className="font-bold text-lg">{formatCRC(order.total)}</p>
                <StatusBadge status={order.status} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
