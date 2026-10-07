import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { cartApi } from '../../api/cartApi';
import { useCart } from '../../context/CartContext';
import { Cart } from '../../types';
import { apiErrorMessage, formatCRC } from '../../utils/format';
import ProductImage from '../../components/ProductImage';
import Icon from '../../components/ui/Icon';

export default function CartPage() {
  const { cart, setCart } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  useEffect(() => {
    cartApi.get()
      .then(setCart)
      .catch(() => toast.error('Error cargando el carrito'))
      .finally(() => setLoading(false));
  }, [setCart]);

  const run = async (itemId: string | null, action: () => Promise<Cart>, success?: string, fallback = 'Error actualizando el carrito') => {
    setBusyItem(itemId);
    try {
      setCart(await action());
      if (success) toast.success(success);
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err, fallback));
      return false;
    } finally {
      setBusyItem(null);
    }
  };

  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const ok = await run(null, () => cartApi.applyCoupon(couponInput.trim()), 'Cupón aplicado!', 'Cupón inválido o expirado');
    if (ok) setCouponInput('');
  };

  if (loading) {
    return <div className="grid lg:grid-cols-3 gap-6">{[0, 1].map(i => <div key={i} className="h-48 bg-white rounded-2xl border animate-pulse lg:col-span-2" />)}</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 text-center py-20 px-6 max-w-2xl mx-auto">
        <span className="mx-auto w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <Icon name="cart" className="w-10 h-10" />
        </span>
        <h2 className="text-2xl font-bold mt-6">Tu carrito está vacío</h2>
        <p className="text-gray-500 mt-2 mb-8">Explora el catálogo y agrega los productos que te gusten.</p>
        <Link to="/catalog" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">Ir al Catálogo</Link>
      </div>
    );
  }

  const units = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Mi Carrito</h1>
      <p className="text-gray-500 mt-1 mb-6">{units} {units === 1 ? 'producto' : 'productos'}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <ul className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {cart.items.map(item => (
            <li key={item.id} data-testid="cart-item" data-name={item.productName} className={`p-4 sm:p-5 flex gap-4 ${busyItem === item.id ? 'opacity-60' : ''}`}>
              <Link to={`/products/${item.productId}`} className="shrink-0">
                <ProductImage imageUrls={item.productImage} category={item.categoryName} name={item.productName}
                  className="w-24 h-24 rounded-xl" iconClassName="w-10 h-10" />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-500">{item.brandName}</p>
                <Link to={`/products/${item.productId}`} className="font-semibold hover:text-blue-700 line-clamp-2">{item.productName}</Link>
                <p className="text-sm text-gray-500 mt-1">{formatCRC(item.unitPrice)} c/u</p>

                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center border border-gray-300 rounded-xl">
                    <button onClick={() => run(item.id, () => cartApi.updateItem(item.id, item.quantity - 1), undefined, 'Error actualizando cantidad')}
                      disabled={busyItem !== null || item.quantity <= 1} className="p-2 disabled:opacity-30" aria-label="Disminuir cantidad">
                      <Icon name="minus" className="w-4 h-4" />
                    </button>
                    <span data-testid="item-qty" className="w-9 text-center font-semibold tabular-nums">{item.quantity}</span>
                    <button onClick={() => run(item.id, () => cartApi.updateItem(item.id, item.quantity + 1), undefined, 'Error actualizando cantidad')}
                      disabled={busyItem !== null || item.quantity >= item.stock} className="p-2 disabled:opacity-30" aria-label="Aumentar cantidad">
                      <Icon name="plus" className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => run(item.id, () => cartApi.removeItem(item.id), 'Producto eliminado del carrito', 'Error eliminando producto')}
                    disabled={busyItem !== null} className="inline-flex items-center gap-1 text-sm text-rose-600 hover:underline">
                    <Icon name="trash" className="w-4 h-4" /> Eliminar
                  </button>
                </div>
                {item.quantity >= item.stock && (
                  <p className="text-xs text-amber-700 mt-2">Alcanzaste el stock disponible ({item.stock}).</p>
                )}
              </div>
              <p className="font-bold text-right whitespace-nowrap">{formatCRC(item.subtotal)}</p>
            </li>
          ))}
        </ul>

        <aside className="bg-white rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-40">
          <h2 className="text-lg font-bold mb-4">Resumen</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd data-testid="cart-subtotal" className="font-medium">{formatCRC(cart.subtotal)}</dd></div>

            {cart.appliedDiscounts.length > 0 && (
              <div className="border-t border-dashed pt-3 mt-3">
                <p className="font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><Icon name="tag" className="w-4 h-4" /> Descuentos aplicados:</p>
                <ul className="space-y-1.5">
                  {cart.appliedDiscounts.map((d, i) => (
                    <li key={i} data-testid="applied-discount" className="flex justify-between gap-3 text-emerald-700">
                      <span className="text-xs leading-snug">{d.description}</span>
                      <span className="font-medium whitespace-nowrap">-{formatCRC(d.discountAmount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {cart.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold border-t pt-2">
                <dt>Total descuento</dt><dd data-testid="cart-total-discount">-{formatCRC(cart.totalDiscount)}</dd>
              </div>
            )}

            <div className="flex justify-between text-xl font-bold border-t pt-3 mt-2">
              <dt>Total</dt><dd data-testid="cart-total">{formatCRC(cart.total)}</dd>
            </div>
            <p className="text-xs text-gray-500">IVA incluido. El envío se coordina después de la compra.</p>
          </dl>

          <div className="mt-5">
            {cart.couponCode ? (
              <div className="flex items-center justify-between bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2.5 rounded-xl">
                <span className="text-sm text-emerald-800 flex items-center gap-1.5"><Icon name="tag" className="w-4 h-4" /> Cupón: <strong className="font-mono">{cart.couponCode}</strong></span>
                <button onClick={() => run(null, cartApi.removeCoupon, 'Cupón removido', 'Error removiendo cupón')}
                  className="text-rose-600 p-1 rounded hover:bg-rose-50" aria-label="Remover cupón">
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value)}
                  placeholder="Código de cupón" aria-label="Código de cupón"
                  className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-xl text-sm uppercase placeholder:normal-case" />
                <button type="submit" className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
                  Aplicar
                </button>
              </form>
            )}
          </div>

          <Link to="/checkout"
            className="block mt-5 w-full bg-blue-600 text-white py-3.5 rounded-xl text-center font-semibold hover:bg-blue-700">
            Proceder al Checkout
          </Link>
          <Link to="/catalog" className="block text-center text-sm text-blue-700 mt-3 hover:underline">Seguir comprando</Link>
        </aside>
      </div>
    </div>
  );
}
