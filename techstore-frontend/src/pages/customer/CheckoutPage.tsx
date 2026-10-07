import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { cartApi } from '../../api/cartApi';
import { ordersApi } from '../../api/ordersApi';
import { usersApi } from '../../api/usersApi';
import { useCart } from '../../context/CartContext';
import { Cart, SavedAddress } from '../../types';
import { apiErrorMessage, formatCRC, PROVINCIAS } from '../../utils/format';
import Icon from '../../components/ui/Icon';

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none';
const emptyAddress = { street: '', city: '', state: '', zipCode: '', country: 'Costa Rica' };

const paymentMethods = [
  { id: 'card', label: 'Tarjeta de crédito o débito', icon: 'card' },
  { id: 'sinpe', label: 'SINPE Móvil', icon: 'phone' },
  { id: 'transfer', label: 'Transferencia bancaria', icon: 'shield' },
];

export default function CheckoutPage() {
  const [cart, setCartState] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selected, setSelected] = useState<string>('new');
  const [address, setAddress] = useState(emptyAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [payment, setPayment] = useState('card');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { setCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([cartApi.get(), usersApi.getAddresses().catch(() => [] as SavedAddress[])])
      .then(([cartData, saved]) => {
        if (!cartData.items.length) {
          navigate('/cart');
          return;
        }
        setCartState(cartData);
        setAddresses(saved);
        const def = saved.find(a => a.isDefault) ?? saved[0];
        if (def) setSelected(def.id);
      })
      .catch(() => navigate('/cart'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const useNew = selected === 'new';

    if (useNew && (!address.street.trim() || !address.city.trim() || !address.state.trim() || !address.zipCode.trim())) {
      toast.error('Completa todos los campos de dirección');
      return;
    }

    setProcessing(true);
    try {
      const order = await ordersApi.create(useNew
        ? {
            street: address.street.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            zipCode: address.zipCode.trim(),
            country: address.country.trim() || 'Costa Rica',
            saveAddress,
          }
        : { addressId: selected });
      setCart({ id: '', items: [], subtotal: 0, totalDiscount: 0, total: 0, appliedDiscounts: [] });
      toast.success(`Pedido ${order.orderNumber} creado!`);
      navigate('/orders', { state: { highlight: order.id } });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al procesar el pedido'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="h-96 bg-white rounded-2xl border animate-pulse" />;
  if (!cart) return null;

  const set = (field: keyof typeof emptyAddress) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddress(a => ({ ...a, [field]: e.target.value }));

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
        <Link to="/cart" className="hover:text-blue-700">Carrito</Link>
        <Icon name="chevronRight" className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium">Checkout</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Dirección */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Icon name="pin" className="w-5 h-5 text-blue-600" /> Dirección de Envío</h2>

            {addresses.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {addresses.map(a => (
                  <label key={a.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer text-sm ${selected === a.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="address" className="sr-only" checked={selected === a.id} onChange={() => setSelected(a.id)} />
                    <span className="font-semibold flex items-center gap-2">
                      {a.label || 'Dirección'}
                      {a.isDefault && <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Principal</span>}
                    </span>
                    <span className="block text-gray-600 mt-1">{a.street}</span>
                    <span className="block text-gray-600">{a.city}, {a.state} {a.zipCode}</span>
                  </label>
                ))}
                <label className={`p-4 rounded-xl border-2 border-dashed cursor-pointer text-sm flex items-center justify-center gap-2 ${selected === 'new' ? 'border-blue-600 text-blue-700' : 'border-gray-300 text-gray-600'}`}>
                  <input type="radio" name="address" className="sr-only" checked={selected === 'new'} onChange={() => setSelected('new')} />
                  <Icon name="plus" className="w-4 h-4" /> Usar otra dirección
                </label>
              </div>
            )}

            {selected === 'new' && (
              <div className="space-y-3">
                <input type="text" placeholder="Dirección exacta (calle, número, otras señas)" value={address.street}
                  onChange={set('street')} className={inputClass} aria-label="Dirección exacta" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <select value={address.state} onChange={set('state')} className={inputClass} aria-label="Provincia">
                    <option value="">Provincia</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="text" placeholder="Cantón" value={address.city} onChange={set('city')} className={inputClass} aria-label="Cantón" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Código postal" value={address.zipCode} onChange={set('zipCode')} className={inputClass} aria-label="Código postal" />
                  <input type="text" placeholder="País" value={address.country} onChange={set('country')} className={inputClass} aria-label="País" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="accent-blue-600" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} />
                  Guardar esta dirección en mi perfil
                </label>
              </div>
            )}
          </section>

          {/* Pago */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Icon name="card" className="w-5 h-5 text-blue-600" /> Método de Pago</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {paymentMethods.map(m => (
                <label key={m.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer text-sm flex flex-col items-center gap-2 text-center ${payment === m.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" className="sr-only" checked={payment === m.id} onChange={() => setPayment(m.id)} />
                  <Icon name={m.icon} className="w-6 h-6 text-gray-700" />
                  {m.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <Icon name="lock" className="w-3.5 h-3.5" /> Simulación de pago (sin integración real).
            </p>
          </section>
        </div>

        {/* Resumen */}
        <aside className="bg-white rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-40">
          <h2 className="text-lg font-bold mb-4">Resumen del Pedido</h2>
          <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cart.items.map(item => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="text-gray-700">{item.productName} <span className="text-gray-500">×{item.quantity}</span></span>
                <span className="font-medium whitespace-nowrap">{formatCRC(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="border-t mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{formatCRC(cart.subtotal)}</dd></div>
            {cart.appliedDiscounts.map((d, i) => (
              <div key={i} className="flex justify-between gap-3 text-emerald-700">
                <dt className="text-xs">{d.description}</dt><dd className="whitespace-nowrap">-{formatCRC(d.discountAmount)}</dd>
              </div>
            ))}
            {cart.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold"><dt>Descuentos</dt><dd data-testid="checkout-discount">-{formatCRC(cart.totalDiscount)}</dd></div>
            )}
            <div className="flex justify-between text-xl font-bold border-t pt-3"><dt>Total</dt><dd data-testid="checkout-total">{formatCRC(cart.total)}</dd></div>
          </dl>
          <button type="submit" disabled={processing}
            className="w-full mt-5 bg-emerald-700 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-800 disabled:opacity-50">
            {processing ? 'Procesando...' : 'Confirmar Pedido'}
          </button>
        </aside>
      </form>
    </div>
  );
}
