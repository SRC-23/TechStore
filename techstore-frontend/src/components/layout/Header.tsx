import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { categoriesApi } from '../../api/categoriesApi';
import { Category } from '../../types';
import Icon from '../ui/Icon';

export default function Header() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount, setCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = search.trim();
    navigate(term ? `/catalog?search=${encodeURIComponent(term)}` : '/catalog');
  };

  const handleLogout = () => {
    logout();
    setCart(null);
    navigate('/');
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
      {/* Barra superior */}
      <div className="bg-gray-900 text-gray-200 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5"><Icon name="truck" className="w-4 h-4" /> Envíos a todo Costa Rica · Retiro en tienda en San José</span>
          <span className="hidden md:flex items-center gap-4">
            <span>Precios con IVA incluido</span>
            <span>Atención: 2222-0000</span>
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <button className="lg:hidden p-2 -ml-2 text-gray-700" onClick={() => setMobileOpen(o => !o)} aria-label="Abrir menú">
          <Icon name="menu" className="w-6 h-6" />
        </button>

        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="TechStore inicio">
          <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Icon name="zap" className="w-5 h-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">Tech<span className="text-blue-600">Store</span></span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-4">
          <div className="relative w-full">
            <Icon name="search" className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              data-testid="header-search"
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
            <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-blue-700">
              Buscar
            </button>
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/cart" className="relative p-2 rounded-xl text-gray-700 hover:bg-gray-100" aria-label="Carrito">
                <Icon name="cart" className="w-6 h-6" />
                {itemCount > 0 && (
                  <span data-testid="cart-count" className="absolute -top-0.5 -right-0.5 bg-orange-700 text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              <div className="relative" ref={menuRef}>
                <button data-testid="user-menu" onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100" aria-haspopup="menu" aria-expanded={menuOpen}>
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">{initials || 'U'}</span>
                  <span className="hidden sm:block text-sm text-left leading-tight">
                    <span className="block text-gray-500 text-xs">Hola,</span>
                    <span className="block font-semibold text-gray-900">{user?.firstName}</span>
                  </span>
                  <Icon name="chevronDown" className="w-4 h-4 text-gray-500" />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 text-sm">
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"><Icon name="user" className="w-4 h-4" /> Mi perfil</Link>
                    <Link to="/orders" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"><Icon name="box" className="w-4 h-4" /> Mis pedidos</Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-blue-700 font-medium"><Icon name="chart" className="w-4 h-4" /> Admin</Link>
                    )}
                    <div className="border-t my-1" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-rose-600">
                      <Icon name="logout" className="w-4 h-4" /> Salir
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700">Iniciar sesión</Link>
              <Link to="/register" className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700">Registrarse</Link>
            </>
          )}
        </nav>
      </div>

      {/* Navegación de categorías */}
      <div className={`border-t border-gray-100 ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <form onSubmit={handleSearch} className="md:hidden py-3">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm" aria-label="Buscar productos" />
          </form>
          <ul className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 py-2 lg:py-0 text-sm overflow-x-auto">
            <li>
              <NavLink to="/catalog" end className={({ isActive }) =>
                `block px-3 py-2.5 font-semibold whitespace-nowrap ${isActive && !location.search ? 'text-blue-700' : 'text-gray-800 hover:text-blue-700'}`}>
                Todo el catálogo
              </NavLink>
            </li>
            {categories.map(c => (
              <li key={c.id}>
                <Link to={`/catalog?category=${c.id}`}
                  className={`block px-3 py-2.5 whitespace-nowrap ${searchParams.get('category') === c.id ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-blue-700'}`}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
