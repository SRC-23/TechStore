import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ordersApi } from '../../api/ordersApi';
import { OrderStats } from '../../types';
import { apiErrorMessage, formatCRC, statusLabels } from '../../utils/format';
import AdminNav from '../../components/admin/AdminNav';
import Icon from '../../components/ui/Icon';

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric' });
};

/** Abrevia montos grandes en el eje: ₡1.2 M, ₡350 mil. */
const axisCRC = (v: number) => (v >= 1_000_000 ? `₡${(v / 1_000_000).toFixed(1)} M` : v >= 1000 ? `₡${Math.round(v / 1000)} mil` : `₡${v}`);

function Kpi({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: string }) {
  return (
    <div data-testid="kpi" data-label={label} className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Icon name={icon} className="w-5 h-5" /></span>
      </div>
      <p data-testid="kpi-value" className="text-2xl font-bold mt-2 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ordersApi.getStats()
      .then(setStats)
      .catch(err => setError(apiErrorMessage(err, 'No se pudieron cargar las estadísticas')));
  }, []);

  const chartData = stats?.salesLast7Days.map(d => ({ ...d, label: dayLabel(d.date) })) ?? [];
  const weekOrders = chartData.reduce((s, d) => s + d.orders, 0);

  return (
    <div>
      <AdminNav title="Panel de Administración" subtitle="Resumen del negocio de TechStore" />

      {error && <div className="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6">{error}</div>}
      {!stats && !error && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-2xl border animate-pulse" />)}</div>}

      {stats && (
        <div className="space-y-6">
          {/* Ventas por periodo */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Ventas de hoy" value={formatCRC(stats.salesToday)} icon="zap" />
            <Kpi label="Ventas de la semana" value={formatCRC(stats.salesWeek)} hint="Últimos 7 días" icon="chart" />
            <Kpi label="Ventas del mes" value={formatCRC(stats.salesMonth)} hint="Mes en curso" icon="card" />
            <Kpi label="Ticket promedio" value={formatCRC(stats.averageOrderValue)} hint={`${stats.totalOrders} pedidos en total`} icon="cart" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Gráfico de ventas de 7 días */}
            <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold">Ventas de los últimos 7 días</h2>
                  <p className="text-sm text-gray-500">{weekOrders} pedidos · {formatCRC(stats.salesWeek)} (sin cancelados)</p>
                </div>
              </div>
              <div className="h-72" data-testid="sales-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} stroke="#eef0f3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#d1d5db' }} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tickFormatter={axisCRC} tickLine={false} axisLine={false} width={72} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                      formatter={(value) => [formatCRC(Number(value)), 'Ventas']}
                      labelFormatter={(label, payload) => {
                        const orders = payload?.[0]?.payload?.orders ?? 0;
                        return `${label} · ${orders} ${orders === 1 ? 'pedido' : 'pedidos'}`;
                      }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
                    />
                    <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Vista de tabla para accesibilidad */}
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-gray-500">Ver datos en tabla</summary>
                <table className="w-full mt-2">
                  <thead><tr className="text-left text-gray-500"><th className="py-1">Día</th><th>Pedidos</th><th className="text-right">Ventas</th></tr></thead>
                  <tbody>
                    {chartData.map(d => (
                      <tr key={d.date} data-testid="sales-row" data-date={d.date} className="border-t"><td className="py-1">{d.label}</td><td>{d.orders}</td><td className="text-right tabular-nums">{formatCRC(d.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>

            {/* Pedidos por estado */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold mb-4">Pedidos por estado</h2>
              <ul className="space-y-3">
                {[
                  ['Pending', stats.pendingOrders],
                  ['Confirmed', stats.confirmedOrders],
                  ['Shipped', stats.shippedOrders],
                  ['Delivered', stats.deliveredOrders],
                  ['Cancelled', stats.cancelledOrders],
                ].map(([status, count]) => (
                  <li key={status} data-testid="status-count" data-status={status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{statusLabels[status as string]}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t mt-5 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Ingresos totales</span><span className="font-semibold">{formatCRC(stats.totalRevenue)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Descuentos otorgados</span><span className="font-semibold">{formatCRC(stats.totalDiscountsGiven)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Productos activos</span><span className="font-semibold">{stats.totalProducts}</span></div>
              </div>
              <Link to="/admin/orders" className="mt-5 block text-center text-sm font-semibold text-blue-700 hover:underline">Gestionar pedidos</Link>
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top productos */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold mb-4">Productos más vendidos</h2>
              {stats.topProducts.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no hay ventas registradas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 font-medium">#</th><th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium text-center">Unidades</th><th className="pb-2 font-medium text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topProducts.map((p, i) => (
                      <tr key={p.productId} data-testid="top-product" className="border-b last:border-0">
                        <td className="py-2.5 text-gray-500">{i + 1}</td>
                        <td className="py-2.5">{p.productName}</td>
                        <td className="py-2.5 text-center font-semibold">{p.unitsSold}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatCRC(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Alertas de stock */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold mb-1 flex items-center gap-2">
                <Icon name="alert" className="w-5 h-5 text-amber-500" /> Stock bajo
              </h2>
              <p data-testid="low-stock-summary" className="text-sm text-gray-500 mb-4">{stats.lowStockProducts} productos con menos de {stats.lowStockThreshold} unidades</p>
              {stats.lowStockItems.length === 0 ? (
                <p className="text-sm text-emerald-700">Todo el inventario tiene stock suficiente.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.lowStockItems.map(item => (
                    <li key={item.productId} data-testid="low-stock-item" className="flex items-center justify-between py-2.5 text-sm">
                      <span>{item.productName}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${item.stock === 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                        <Icon name="alert" className="w-3 h-3" />
                        {item.stock === 0 ? 'Agotado' : `${item.stock} unid.`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/admin/products" className="mt-4 block text-center text-sm font-semibold text-blue-700 hover:underline">Actualizar inventario</Link>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
