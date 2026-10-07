import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../../api/productsApi';
import { categoriesApi } from '../../api/categoriesApi';
import { Category, Product } from '../../types';
import ProductCard, { hasDiscount } from '../../components/ProductCard';
import { getCategoryStyle } from '../../components/ProductImage';
import Icon from '../../components/ui/Icon';

function SectionTitle({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1">
          Ver todo <Icon name="chevronRight" className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newest, setNewest] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.getAll({ page: 1, pageSize: 200, inStock: true }),
      productsApi.getAll({ page: 1, pageSize: 8, sortBy: 'newest' }),
      categoriesApi.getAll(),
    ])
      .then(([all, latest, cats]) => {
        setProducts(all.products);
        setNewest(latest.products);
        setCategories(cats);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const flashDeals = products.filter(p => p.isOnSale).slice(0, 4);
  const discounted = products
    .filter(p => hasDiscount(p) && !p.isOnSale)
    .sort((a, b) => (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0))
    .slice(0, 8);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-gray-900 via-blue-950 to-blue-800 text-white">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-10 bottom-0 w-72 h-72 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative grid lg:grid-cols-2 gap-10 px-8 py-14 md:px-14 md:py-20 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-white/10 ring-1 ring-white/20 rounded-full px-3 py-1 text-xs font-medium">
              <Icon name="zap" className="w-3.5 h-3.5 text-orange-300" /> Temporada de Laptops: 10 % de descuento
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
              La mejor tecnología,<br />al mejor precio de Costa Rica
            </h1>
            <p className="mt-4 text-lg text-blue-100 max-w-lg">
              Laptops, celulares, consolas y componentes de las mejores marcas, con garantía y descuentos que se aplican automáticamente en tu carrito.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalog" className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50">Ver catálogo</Link>
              {categories[0] && (
                <Link to={`/catalog?category=${categories.find(c => c.name === 'Laptops')?.id ?? categories[0].id}`}
                  className="bg-white/10 ring-1 ring-white/30 font-semibold px-6 py-3 rounded-xl hover:bg-white/20">
                  Ver laptops
                </Link>
              )}
            </div>
            <div className="mt-8 inline-flex items-center gap-3 bg-orange-500/15 ring-1 ring-orange-300/30 rounded-xl px-4 py-3">
              <Icon name="tag" className="w-5 h-5 text-orange-300" />
              <span className="text-sm">Usa el cupón <strong className="font-mono text-orange-200">TECH20</strong> y obtén 20 % en compras desde ₡50 000</span>
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-4">
            {['laptop', 'phone', 'headphones', 'gamepad', 'monitor', 'watch'].map((icon, i) => (
              <div key={icon} className={`aspect-square rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center ${i % 2 ? 'translate-y-6' : ''}`}>
                <Icon name={icon} className="w-14 h-14 text-blue-100" strokeWidth={1.3} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: 'truck', title: 'Envíos a todo el país', text: 'Entrega en 24-72 horas hábiles' },
          { icon: 'shield', title: 'Garantía oficial', text: 'Productos nuevos y sellados' },
          { icon: 'tag', title: 'Descuentos automáticos', text: 'Se calculan en tu carrito' },
          { icon: 'card', title: 'Pago seguro', text: 'Tarjeta, SINPE Móvil o transferencia' },
        ].map(b => (
          <div key={b.title} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Icon name={b.icon} className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold">{b.title}</p>
              <p className="text-sm text-gray-500">{b.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categorías */}
      <section>
        <SectionTitle title="Compra por categoría" to="/catalog" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map(c => {
            const style = getCategoryStyle(c.name);
            return (
              <Link key={c.id} to={`/catalog?category=${c.id}`}
                className="group bg-white rounded-2xl border border-gray-200 p-4 text-center hover:border-blue-300 hover:shadow-md transition-all">
                <span className={`mx-auto w-14 h-14 rounded-2xl bg-linear-to-br ${style.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon name={style.icon} className={`w-7 h-7 ${style.fg}`} />
                </span>
                <p className="mt-3 text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-gray-500">{c.productCount} productos</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Ofertas relámpago */}
      {flashDeals.length > 0 && (
        <section className="bg-orange-50 border border-orange-200 rounded-3xl p-6 md:p-8">
          <SectionTitle title="Ofertas relámpago" subtitle="Descuentos por tiempo limitado: ¡aprovecha antes de que terminen!" to="/catalog" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {flashDeals.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Productos con descuento */}
      {discounted.length > 0 && (
        <section>
          <SectionTitle title="Productos con descuento" subtitle="Precios rebajados por las promociones vigentes" to="/catalog" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {discounted.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Novedades */}
      <section>
        <SectionTitle title="Productos destacados" subtitle="Lo más reciente en nuestro catálogo" to="/catalog?sort=newest" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-80 bg-white rounded-2xl border animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {newest.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
