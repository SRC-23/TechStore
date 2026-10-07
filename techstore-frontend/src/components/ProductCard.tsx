import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Product } from '../types';
import { formatCRC, apiErrorMessage } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { cartApi } from '../api/cartApi';
import ProductImage from './ProductImage';
import Countdown from './Countdown';
import Icon from './ui/Icon';

export function hasDiscount(p: Product) {
  return p.discountedPrice != null && p.discountedPrice < p.price;
}

export default function ProductCard({ product }: { product: Product }) {
  const { isAuthenticated } = useAuth();
  const { setCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const discounted = hasDiscount(product);
  const outOfStock = product.stock <= 0;

  const handleAdd = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setAdding(true);
    try {
      setCart(await cartApi.addItem(product.id, 1));
      toast.success('Producto agregado al carrito');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al agregar al carrito'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <article data-testid="product-card" data-name={product.name} className="group bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all flex flex-col overflow-hidden">
      <Link to={`/products/${product.id}`} className="relative block">
        <ProductImage imageUrls={product.imageUrls} category={product.categoryName} name={product.name}
          className="aspect-[4/3] group-hover:scale-[1.02] transition-transform" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isOnSale && (
            <span data-testid="badge-oferta" className="bg-orange-700 text-white text-[11px] font-bold tracking-wide px-2 py-1 rounded-md shadow-sm">
              OFERTA
            </span>
          )}
          {discounted && (
            <span data-testid="badge-discount" className="bg-rose-600 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-sm">
              -{product.discountPercentage}%
            </span>
          )}
        </div>
        {outOfStock && (
          <span className="absolute top-3 right-3 bg-gray-900/80 text-white text-[11px] font-semibold px-2 py-1 rounded-md">
            Agotado
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <p data-testid="card-brand" className="text-xs font-medium uppercase tracking-wide text-gray-500">{product.brandName}</p>
        <Link to={`/products/${product.id}`}
          className="mt-1 font-semibold text-gray-900 leading-snug line-clamp-2 hover:text-blue-700 min-h-[2.75rem]">
          {product.name}
        </Link>

        {product.isOnSale && product.offerEndsAt && (
          <div className="mt-2" data-testid="card-countdown"><Countdown endsAt={product.offerEndsAt} compact /></div>
        )}

        <div className="mt-auto pt-3">
          {discounted ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span data-testid="card-price" className="text-xl font-bold text-gray-900">{formatCRC(product.discountedPrice)}</span>
              <span data-testid="card-original-price" className="text-sm text-gray-500 line-through">{formatCRC(product.price)}</span>
            </div>
          ) : (
            <span data-testid="card-price" className="text-xl font-bold text-gray-900">{formatCRC(product.price)}</span>
          )}
          <p className={`text-xs mt-1 ${outOfStock ? 'text-rose-600' : product.stock < 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {outOfStock ? 'Agotado' : product.stock < 5 ? `¡Últimas ${product.stock} unidades!` : 'En stock'}
          </p>

          <button
            onClick={handleAdd}
            disabled={outOfStock || adding}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="cart" className="w-4 h-4" />
            {outOfStock ? 'Agotado' : adding ? 'Agregando...' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </article>
  );
}
