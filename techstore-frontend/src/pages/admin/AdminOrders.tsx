import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ordersApi } from '../../api/ordersApi';
import { Order } from '../../types';
import { apiErrorMessage, formatCRC, formatDate, statusLabels } from '../../utils/format';
import AdminNav from '../../components/admin/AdminNav';
import { StatusBadge } from '../customer/OrdersPage';
import Icon from '../../components/ui/Icon';

const inputClass = 'px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none';

/** Flujo de estados permitido (HU-19); el backend valida lo mismo. */
const nextStatus: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadOrders = async (status: string) => {
    setLoading(true);
    try {
      setOrders(await ordersApi.getAllAdmin(status || undefined));
    } catch {
      toast.error('Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(filter);
  }, [filter]);

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (newStatus === 'Cancelled' && !window.confirm(`¿Cancelar el pedido ${order.orderNumber}? El stock se devolverá al inventario.`)) return;
    setUpdating(order.id);
    try {
      await ordersApi.updateStatus(order.id, newStatus);
      toast.success(`Estado actualizado a ${statusLabels[newStatus]}`);
      loadOrders(filter);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error actualizando estado'));
    } finally {
      setUpdating(null);
    }
  };

  const visible = useMemo(() => orders.filter(o => {
    const term = search.trim().toLowerCase();
    if (term && !`${o.orderNumber} ${o.customerName ?? ''} ${o.customerEmail ?? ''}`.toLowerCase().includes(term)) return false;
    const created = new Date(o.createdAt);
    if (fromDate && created < new Date(`${fromDate}T00:00:00`)) return false;
    if (toDate && created > new Date(`${toDate}T23:59:59`)) return false;
    return true;
  }), [orders, search, fromDate, toDate]);

  const total = visible.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <AdminNav title="Gestión de Pedidos" subtitle={`${visible.length} pedidos · ${formatCRC(total)} en ventas (sin cancelados)`} />

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Estado
          <select value={filter} onChange={e => setFilter(e.target.value)} className={inputClass}>
            <option value="">Todos los estados</option>
            <option value="Pending">Pendientes</option>
            <option value="Confirmed">Confirmados</option>
            <option value="Shipped">Enviados</option>
            <option value="Delivered">Entregados</option>
            <option value="Cancelled">Cancelados</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Desde
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Hasta
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600 flex-1 min-w-48">
          Buscar
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Número de orden, cliente o email" className={inputClass} />
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Orden</th>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Items</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-center font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Cargando...</td></tr>}
            {!loading && visible.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No hay pedidos.</td></tr>}
            {!loading && visible.map(order => (
              <Fragment key={order.id}>
                <tr className="hover:bg-gray-50/60" data-testid="admin-order-row" data-number={order.orderNumber}>
                  <td className="px-4 py-3">
                    <button onClick={() => setExpanded(e => (e === order.id ? null : order.id))}
                      className="font-semibold text-gray-900 inline-flex items-center gap-1 hover:text-blue-700" aria-expanded={expanded === order.id}>
                      <Icon name={expanded === order.id ? 'chevronDown' : 'chevronRight'} className="w-4 h-4" />
                      {order.orderNumber}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div>{order.customerName || '—'}</div>
                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                  <td className="px-4 py-3">{order.items.length} producto(s)</td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCRC(order.total)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {nextStatus[order.status]?.map(ns => (
                        <button key={ns} onClick={() => handleStatusChange(order, ns)} disabled={updating === order.id}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg disabled:opacity-50 ${ns === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                          {statusLabels[ns]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
                {expanded === order.id && (
                  <tr className="bg-gray-50/60">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid md:grid-cols-3 gap-6 text-sm">
                        <div className="md:col-span-2">
                          <p className="font-semibold mb-2">Productos</p>
                          <ul className="space-y-1">
                            {order.items.map((i, idx) => (
                              <li key={idx} className="flex justify-between gap-3">
                                <span>{i.productName} <span className="text-gray-500">×{i.quantity}</span></span>
                                <span>{formatCRC(i.total)}</span>
                              </li>
                            ))}
                          </ul>
                          {order.appliedDiscounts.length > 0 && (
                            <ul className="mt-2 pt-2 border-t space-y-1 text-emerald-700">
                              {order.appliedDiscounts.map((d, idx) => (
                                <li key={idx} className="flex justify-between gap-3"><span className="text-xs">{d.description}</span><span>-{formatCRC(d.discountAmount)}</span></li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {order.shippingAddress && (
                          <div>
                            <p className="font-semibold mb-2">Dirección de envío</p>
                            <p className="text-gray-600">{order.shippingAddress.street}</p>
                            <p className="text-gray-600">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
