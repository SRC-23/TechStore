import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon';

const links = [
  { to: '/admin', label: 'Dashboard', icon: 'chart', end: true },
  { to: '/admin/products', label: 'Productos', icon: 'box' },
  { to: '/admin/categories', label: 'Categorías', icon: 'layers' },
  { to: '/admin/rules', label: 'Reglas de descuento', icon: 'tag' },
  { to: '/admin/orders', label: 'Pedidos', icon: 'list' },
];

/** Encabezado común de las pantallas de administración. */
export default function AdminNav({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8">
      <nav className="flex gap-1 overflow-x-auto bg-white border border-gray-200 rounded-2xl p-1.5 mb-6" aria-label="Administración">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Icon name={l.icon} className="w-4 h-4" />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}
