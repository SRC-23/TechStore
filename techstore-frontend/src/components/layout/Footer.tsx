import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Icon name="zap" className="w-4 h-4" /></span>
            <span className="text-lg font-extrabold">TechStore</span>
          </div>
          <p className="mt-4 leading-relaxed text-gray-400">
            Tu tienda de tecnología en Costa Rica. Laptops, celulares, componentes y accesorios con garantía y los mejores precios.
          </p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Comprar</h3>
          <ul className="space-y-2">
            <li><Link to="/catalog" className="hover:text-white">Catálogo completo</Link></li>
            <li><Link to="/catalog?sort=newest" className="hover:text-white">Novedades</Link></li>
            <li><Link to="/cart" className="hover:text-white">Mi carrito</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Mi cuenta</h3>
          <ul className="space-y-2">
            <li><Link to="/profile" className="hover:text-white">Mi perfil</Link></li>
            <li><Link to="/orders" className="hover:text-white">Mis pedidos</Link></li>
            <li><Link to="/register" className="hover:text-white">Crear cuenta</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Contacto</h3>
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-center gap-2"><Icon name="pin" className="w-4 h-4" /> San José, Costa Rica</li>
            <li>Tel: 2222-0000</li>
            <li>ventas@techstore.cr</li>
            <li>Lunes a sábado, 9:00 a. m. – 7:00 p. m.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-5 text-xs text-gray-400 flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} TechStore · Propietario: Alfredo Rodríguez. Todos los derechos reservados.</span>
          <span>Precios en colones costarricenses con IVA incluido.</span>
        </div>
      </div>
    </footer>
  );
}
