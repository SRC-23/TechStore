import { ReactNode } from 'react';
import Icon from '../../components/ui/Icon';

/** Marco visual compartido por las pantallas de inicio de sesión y registro. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid lg:grid-cols-2 bg-white rounded-3xl border border-gray-200 overflow-hidden max-w-5xl mx-auto shadow-sm">
      <div className="hidden lg:flex flex-col justify-between bg-linear-to-br from-gray-900 via-blue-950 to-blue-800 text-white p-10">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Icon name="zap" className="w-5 h-5" /></span>
          <span className="text-xl font-extrabold">TechStore</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Tecnología con los mejores precios de Costa Rica</h2>
          <ul className="mt-6 space-y-3 text-blue-100 text-sm">
            <li className="flex items-center gap-2"><Icon name="check" className="w-4 h-4 text-emerald-300" /> Descuentos automáticos en tu carrito</li>
            <li className="flex items-center gap-2"><Icon name="check" className="w-4 h-4 text-emerald-300" /> Seguimiento de tus pedidos en línea</li>
            <li className="flex items-center gap-2"><Icon name="check" className="w-4 h-4 text-emerald-300" /> Guarda tus direcciones de envío</li>
          </ul>
        </div>
        <p className="text-xs text-blue-200">© TechStore Costa Rica</p>
      </div>
      <div className="p-8 sm:p-12">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-gray-500 mt-1 mb-8">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
