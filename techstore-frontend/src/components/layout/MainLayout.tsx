import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function MainLayout() {
  const { isAuthenticated } = useAuth();
  const { refreshCart, setCart } = useCart();
  const { pathname } = useLocation();

  // El contador del carrito se carga al iniciar sesión o al recargar la página.
  useEffect(() => {
    if (isAuthenticated) refreshCart();
    else setCart(null);
  }, [isAuthenticated, refreshCart, setCart]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
