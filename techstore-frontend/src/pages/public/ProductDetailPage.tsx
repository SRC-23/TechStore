import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productsApi } from '../../api/productsApi';
import { cartApi } from '../../api/cartApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Product } from '../../types';
import { apiErrorMessage, formatCRC, parseImages, parseSpecs } from '../../utils/format';
import ProductImage from '../../components/ProductImage';
import ProductCard, { hasDiscount } from '../../components/ProductCard';
import Countdown from '../../components/Countdown';
import Icon from '../../components/ui/Icon';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const { isAuthenticated } = useAuth();
  const { setCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setQuantity(1);
    setImageIndex(0);
    productsApi.getById(id)
      .then(p => {
        setProduct(p);
        return productsApi.getAll({ page: 1, pageSize: 5, categoryIds: [p.categoryId], inStock: true });
      })
      .then(r => setRelated(r.products.filter(p => p.id !== id).slice(0, 4)))
      .catch(() => {
        toast.error('Producto no encontrado');
        navigate('/catalog');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!product) return;
    setAdding(true);
    try {
      setCart(await cartApi.addItem(product.id, quantity));
      toast.success('Producto agregado al carrito');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al agregar al carrito'));
    } finally {
      setAdding(false);
    }
  };

  if (loading || !product) {
    return (
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="aspect-square bg-white rounded-3xl border animate-pulse" />
        <div className="space-y-4"><div className="h-8 bg-white rounded animate-pulse" /><div className="h-40 bg-white rounded animate-pulse" /></div>
      </div>
    );
  }

  const specs = parseSpecs(product.specifications);
  const images = parseImages(product.imageUrls);
  const discounted = hasDiscount(product);
  const outOfStock = product.stock <= 0;
  const savings = discounted ? product.price - (product.discountedPrice ?? product.price) : 0;

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap" aria-label="Ruta de navegación">
        <Link to="/" className="hover:text-blue-700">Inicio</Link>
        <Icon name="chevronRight" className="w-3.5 h-3.5" />
        <Link to={`/catalog?category=${product.categoryId}`} className="hover:text-blue-700">{product.categoryName}</Link>
        <Icon name="chevronRight" className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Imagen */}
        <div>
          <div className="relative bg-white rounded-3xl border border-gray-200 overflow-hidden">
            <ProductImage imageUrls={images[imageIndex] ?? product.imageUrls} category={product.categoryName} name={product.name}
              className="aspect-square" iconClassName="w-40 h-40" />
            <div className="absolute top-4 left-4 flex gap-2">
              {product.isOnSale && <span className="bg-orange-700 text-white text-xs font-bold px-2.5 py-1 rounded-md">OFERTA</span>}
              {discounted && <span className="bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">-{product.discountPercentage}%</span>}
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 mt-3">
              {images.map((img, i) => (
                <button key={img} onClick={() => setImageIndex(i)}
                  className={`w-20 h-20 rounded-xl border-2 overflow-hidden bg-white ${i === imageIndex ? 'border-blue-600' : 'border-gray-200'}`}>
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{product.brandName}</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-2">Categoría: {product.categoryName}</p>

          <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
            {discounted ? (
              <>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span data-testid="detail-price" className="text-4xl font-extrabold">{formatCRC(product.discountedPrice)}</span>
                  <span data-testid="detail-original-price" className="text-lg text-gray-500 line-through">{formatCRC(product.price)}</span>
                </div>
                <p data-testid="detail-savings" className="text-emerald-700 text-sm font-medium mt-1">Ahorras {formatCRC(savings)} ({product.discountPercentage}%)</p>
              </>
            ) : (
              <span data-testid="detail-price" className="text-4xl font-extrabold">{formatCRC(product.price)}</span>
            )}
            <p className="text-xs text-gray-500 mt-1">IVA incluido</p>

            {product.isOnSale && product.offerEndsAt && (
              <div data-testid="offer-countdown" className="mt-5 p-4 rounded-xl bg-orange-50 border border-orange-200">
                <p className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-1.5">
                  <Icon name="clock" className="w-4 h-4" /> {product.offerName ?? 'Oferta por tiempo limitado'} · termina en:
                </p>
                <Countdown endsAt={product.offerEndsAt} />
              </div>
            )}

            <div data-testid="detail-stock" className="mt-5 flex items-center gap-2 text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${outOfStock ? 'bg-rose-500' : product.stock < 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {outOfStock
                ? <span className="font-medium text-rose-600">Agotado</span>
                : <span><span className="font-medium">{product.stock < 5 ? '¡Últimas unidades!' : 'En stock'}</span> · {product.stock} disponibles</span>}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <div className="flex items-center border border-gray-300 rounded-xl w-fit">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={outOfStock || quantity <= 1}
                  className="p-3 disabled:opacity-30" aria-label="Disminuir cantidad"><Icon name="minus" className="w-4 h-4" /></button>
                <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} disabled={outOfStock || quantity >= product.stock}
                  className="p-3 disabled:opacity-30" aria-label="Aumentar cantidad"><Icon name="plus" className="w-4 h-4" /></button>
              </div>
              <button onClick={handleAddToCart} disabled={outOfStock || adding}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">
                <Icon name="cart" className="w-5 h-5" />
                {outOfStock ? 'Agotado' : adding ? 'Agregando...' : 'Agregar al carrito'}
              </button>
            </div>
            {!isAuthenticated && !outOfStock && (
              <p className="text-xs text-gray-500 mt-2">Debes iniciar sesión para comprar.</p>
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-gray-600">
            <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-white rounded-xl border"><Icon name="truck" className="w-5 h-5 text-blue-600" />Envío a todo el país</div>
            <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-white rounded-xl border"><Icon name="shield" className="w-5 h-5 text-blue-600" />Garantía oficial</div>
            <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-white rounded-xl border"><Icon name="card" className="w-5 h-5 text-blue-600" />Pago seguro</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 mt-12">
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-3">Descripción</h2>
          <p className="text-gray-700 leading-relaxed">{product.description}</p>
        </section>
        {specs.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-3">Especificaciones</h2>
            <dl data-testid="specs" className="divide-y divide-gray-100">
              {specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-4 py-2.5 text-sm">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="col-span-2 font-medium text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight mb-5">También te puede interesar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
