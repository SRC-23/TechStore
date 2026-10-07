import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { pricingRulesApi } from '../../api/pricingRulesApi';
import { categoriesApi, flattenCategories } from '../../api/categoriesApi';
import { productsApi } from '../../api/productsApi';
import { Category, DiscountRule, DiscountType, Product } from '../../types';
import { apiErrorMessage, formatCRC, formatDate } from '../../utils/format';
import AdminNav from '../../components/admin/AdminNav';
import Icon from '../../components/ui/Icon';

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none';

const discountTypes: { value: DiscountType; label: string; help: string }[] = [
  { value: 'Percentage', label: 'Porcentaje', help: 'Porcentaje sobre el carrito o sobre las categorías/productos seleccionados.' },
  { value: 'FixedAmount', label: 'Monto fijo', help: 'Monto en colones que se descuenta al superar el monto mínimo.' },
  { value: 'Coupon', label: 'Cupón', help: 'Requiere que el cliente escriba el código en el carrito.' },
  { value: 'Volume', label: 'Por volumen', help: 'Aplica a cada producto del que se lleven la cantidad mínima o más.' },
  { value: 'TimeLimited', label: 'Oferta temporal', help: 'Muestra el badge OFERTA y un contador hasta la fecha de fin.' },
  { value: 'Category', label: 'Por categoría', help: 'Aplica a todos los productos de las categorías seleccionadas.' },
  { value: 'Bundle', label: 'Combo/Bundle', help: 'Aplica solo cuando el carrito contiene todos los productos seleccionados.' },
];

const typeLabel = (t: DiscountType) => discountTypes.find(d => d.value === t)?.label ?? t;
const toDateInput = (iso: string) => iso.slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

interface RuleForm {
  name: string;
  description: string;
  type: DiscountType;
  value: string;
  isPercentage: boolean;
  couponCode: string;
  priority: string;
  isStackable: boolean;
  startDate: string;
  endDate: string;
  minimumAmount: string;
  minimumQuantity: string;
  maxUses: string;
  categoryIds: string[];
  productIds: string[];
}

export default function AdminRules() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DiscountRule | 'new' | null>(null);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'' | DiscountType>('');
  const [stateFilter, setStateFilter] = useState<'' | 'active' | 'inactive'>('');
  const [productSearch, setProductSearch] = useState('');

  const loadRules = async () => {
    try {
      setRules(await pricingRulesApi.getAll());
    } catch {
      toast.error('Error cargando reglas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
    Promise.all([categoriesApi.getAll(), productsApi.getAll({ page: 1, pageSize: 200 })])
      .then(([c, p]) => {
        setCategories(flattenCategories(c));
        setProducts(p.products);
      })
      .catch(() => undefined);
  }, []);

  const nextFreePriority = () => {
    const used = new Set(rules.filter(r => r.isActive).map(r => r.priority));
    let p = 1;
    while (used.has(p)) p++;
    return p;
  };

  const openNew = () => {
    setEditing('new');
    setProductSearch('');
    setForm({
      name: '', description: '', type: 'Percentage', value: '', isPercentage: true, couponCode: '',
      priority: String(nextFreePriority()), isStackable: true, startDate: today(), endDate: inDays(30),
      minimumAmount: '', minimumQuantity: '', maxUses: '', categoryIds: [], productIds: [],
    });
  };

  const openEdit = (r: DiscountRule) => {
    setEditing(r);
    setProductSearch('');
    setForm({
      name: r.name, description: r.description ?? '', type: r.type, value: String(r.value), isPercentage: r.isPercentage,
      couponCode: r.couponCode ?? '', priority: String(r.priority), isStackable: r.isStackable,
      startDate: toDateInput(r.startDate), endDate: toDateInput(r.endDate),
      minimumAmount: r.minimumAmount != null ? String(r.minimumAmount) : '',
      minimumQuantity: r.minimumQuantity != null ? String(r.minimumQuantity) : '',
      maxUses: r.maxUses != null ? String(r.maxUses) : '',
      categoryIds: r.categoryIds, productIds: r.productIds,
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(f => {
      if (!f) return f;
      if (type === 'checkbox') return { ...f, [name]: (e.target as HTMLInputElement).checked };
      if (name === 'type') {
        const t = value as DiscountType;
        return { ...f, type: t, isPercentage: t !== 'FixedAmount', isStackable: t === 'Coupon' ? false : f.isStackable };
      }
      return { ...f, [name]: value };
    });
  };

  const toggleId = (field: 'categoryIds' | 'productIds', id: string) =>
    setForm(f => f && ({ ...f, [field]: f[field].includes(id) ? f[field].filter(x => x !== id) : [...f[field], id] }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    // Fechas a medianoche local; la fecha de fin incluye todo ese día.
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T23:59:59`);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      type: form.type,
      value: Number(form.value),
      isPercentage: form.isPercentage,
      couponCode: form.type === 'Coupon' ? form.couponCode.trim().toUpperCase() : undefined,
      priority: Number(form.priority),
      isStackable: form.isStackable,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      minimumAmount: form.minimumAmount ? Number(form.minimumAmount) : undefined,
      minimumQuantity: form.minimumQuantity ? Number(form.minimumQuantity) : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      categoryIds: form.categoryIds,
      productIds: form.productIds,
    };

    setSaving(true);
    try {
      if (editing === 'new') {
        await pricingRulesApi.create(payload);
        toast.success('Regla creada');
      } else if (editing) {
        await pricingRulesApi.update(editing.id, payload);
        toast.success('Regla actualizada');
      }
      setEditing(null);
      loadRules();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error creando regla'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r: DiscountRule) => {
    try {
      await pricingRulesApi.toggle(r.id);
      toast.success(r.isActive ? 'Regla desactivada' : 'Regla activada');
      loadRules();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error cambiando estado'));
    }
  };

  const handleDelete = async (r: DiscountRule) => {
    if (!window.confirm(`¿Desactivar la regla "${r.name}"?`)) return;
    try {
      await pricingRulesApi.delete(r.id);
      toast.success('Regla desactivada');
      loadRules();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error eliminando regla'));
    }
  };

  const filtered = rules.filter(r =>
    (!typeFilter || r.type === typeFilter) &&
    (!stateFilter || (stateFilter === 'active' ? r.isActive : !r.isActive)));

  const visibleProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter(p => !term || p.name.toLowerCase().includes(term)).slice(0, 60);
  }, [products, productSearch]);

  const scopeSummary = (r: DiscountRule) => {
    const parts: string[] = [];
    if (r.categoryIds.length) parts.push(r.categoryIds.map(id => categories.find(c => c.id === id)?.name ?? 'Categoría').join(', '));
    if (r.productIds.length) parts.push(`${r.productIds.length} producto(s)`);
    return parts.join(' · ') || 'Todo el carrito';
  };

  const showCategories = form && ['Percentage', 'Category', 'TimeLimited'].includes(form.type);
  const showProducts = form && ['Percentage', 'TimeLimited', 'Volume', 'Bundle'].includes(form.type);

  return (
    <div>
      <AdminNav title="Reglas de Descuento" subtitle="Configura el motor de precios: cupones, ofertas, combos y más"
        actions={<button onClick={openNew} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700">+ Nueva Regla</button>} />

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as '' | DiscountType)} className={`${inputClass} w-auto`} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          {discountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value as '' | 'active' | 'inactive')} className={`${inputClass} w-auto`} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
        <p className="text-sm text-gray-500 self-center ml-auto">Prioridad 1 = se aplica primero. Una regla no acumulable detiene las siguientes.</p>
      </div>

      {editing && form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editing === 'new' ? 'Nueva Regla de Descuento' : 'Editar Regla'}</h2>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-gray-100" aria-label="Cerrar"><Icon name="x" className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre de la regla" required className={inputClass} />
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Descripción (opcional)" rows={2} className={inputClass} />

              <div>
                <select name="type" value={form.type} onChange={handleChange} className={inputClass} aria-label="Tipo de descuento">
                  {discountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">{discountTypes.find(t => t.value === form.type)?.help}</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">{form.isPercentage ? 'Descuento (%)' : 'Descuento (₡)'}</span>
                  <input name="value" type="number" step="any" min="0" value={form.value} onChange={handleChange} required className={`${inputClass} mt-1`} />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Prioridad (1 = mayor)</span>
                  <input name="priority" type="number" min="1" value={form.priority} onChange={handleChange} required className={`${inputClass} mt-1`} />
                </label>
                {form.type !== 'FixedAmount' && (
                  <label className="flex items-center gap-2 text-sm mt-6">
                    <input type="checkbox" name="isPercentage" checked={form.isPercentage} onChange={handleChange} className="accent-blue-600" />
                    Es porcentaje
                  </label>
                )}
              </div>

              {form.type === 'Coupon' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <input name="couponCode" value={form.couponCode} onChange={handleChange} placeholder="Código del cupón (ej: TECH20)" required className={`${inputClass} uppercase`} />
                  <input name="maxUses" type="number" min="1" value={form.maxUses} onChange={handleChange} placeholder="Máximo de usos (vacío = ilimitado)" className={inputClass} />
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Fecha inicio</span>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} required className={`${inputClass} mt-1`} />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Fecha fin</span>
                  <input name="endDate" type="date" value={form.endDate} onChange={handleChange} required className={`${inputClass} mt-1`} />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <input name="minimumAmount" type="number" min="0" value={form.minimumAmount} onChange={handleChange} placeholder="Monto mínimo (₡)" className={inputClass} />
                <input name="minimumQuantity" type="number" min="1" value={form.minimumQuantity} onChange={handleChange}
                  placeholder="Cantidad mínima" required={form.type === 'Volume'} className={inputClass} />
              </div>

              {showCategories && (
                <fieldset>
                  <legend className="text-sm font-semibold mb-2">
                    Categorías {form.type === 'Category' ? '(requerido)' : '(opcional: vacío = todas)'}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button type="button" key={c.id} onClick={() => toggleId('categoryIds', c.id)}
                        className={`px-3 py-1.5 rounded-full text-sm ring-1 ${form.categoryIds.includes(c.id) ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-gray-700 ring-gray-300 hover:ring-gray-400'}`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {showProducts && (
                <fieldset>
                  <legend className="text-sm font-semibold mb-2">
                    Productos {form.type === 'Bundle' ? '(mínimo 2 para el combo)' : '(opcional)'} · {form.productIds.length} seleccionados
                  </legend>
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar producto..." className={`${inputClass} mb-2`} aria-label="Buscar producto" />
                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {visibleProducts.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" className="accent-blue-600" checked={form.productIds.includes(p.id)} onChange={() => toggleId('productIds', p.id)} />
                        <span className="flex-1">{p.name}</span>
                        <span className="text-gray-500">{formatCRC(p.price)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <label className="flex items-center gap-2">
                <input type="checkbox" name="isStackable" checked={form.isStackable} onChange={handleChange} className="accent-blue-600" />
                <span className="text-sm">Acumulable con otros descuentos</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {editing === 'new' ? 'Crear Regla' : 'Guardar cambios'}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="flex-1 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-center font-medium">Prior.</th>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Valor</th>
              <th className="px-4 py-3 text-left font-medium">Vigencia</th>
              <th className="px-4 py-3 text-center font-medium">Usos</th>
              <th className="px-4 py-3 text-center font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Cargando...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">No hay reglas con esos filtros.</td></tr>}
            {filtered.map(rule => (
              <tr key={rule.id} data-testid="rule-row" data-name={rule.name} className={rule.isActive ? '' : 'text-gray-500'}>
                <td className="px-4 py-3 text-center font-semibold">{rule.priority}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{rule.name}</p>
                  {rule.couponCode && <p className="text-xs text-violet-700 font-mono">Cupón: {rule.couponCode}</p>}
                  <p className="text-xs text-gray-500">{scopeSummary(rule)}{rule.isStackable ? ' · Acumulable' : ' · No acumulable'}</p>
                </td>
                <td className="px-4 py-3">{typeLabel(rule.type)}</td>
                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                  {rule.isPercentage ? `${rule.value}%` : formatCRC(rule.value)}
                  {rule.minimumAmount != null && <span className="block text-xs font-normal text-gray-500">Mín. {formatCRC(rule.minimumAmount)}</span>}
                  {rule.minimumQuantity != null && <span className="block text-xs font-normal text-gray-500">Desde {rule.minimumQuantity} unid.</span>}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDate(rule.startDate)} – {formatDate(rule.endDate)}</td>
                <td className="px-4 py-3 text-center">{rule.timesUsed}{rule.maxUses ? ` / ${rule.maxUses}` : ''}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${rule.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                    {rule.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3 whitespace-nowrap">
                    <button onClick={() => openEdit(rule)} className="text-blue-700 hover:underline">Editar</button>
                    <button onClick={() => handleToggle(rule)} className="text-gray-700 hover:underline">{rule.isActive ? 'Desactivar' : 'Activar'}</button>
                    {rule.isActive && <button onClick={() => handleDelete(rule)} className="text-rose-600 hover:underline">Eliminar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
