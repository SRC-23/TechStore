import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { productsApi } from '../../api/productsApi';
import { categoriesApi, flattenCategories } from '../../api/categoriesApi';
import { brandsApi } from '../../api/brandsApi';
import { Brand, Category, Product } from '../../types';
import { apiErrorMessage, formatCRC, parseSpecs } from '../../utils/format';
import AdminNav from '../../components/admin/AdminNav';
import ProductImage from '../../components/ProductImage';
import Icon from '../../components/ui/Icon';

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  brandId: string;
  imageUrls: string;
  isActive: boolean;
  specs: { key: string; value: string }[];
}

const emptyForm: ProductForm = { name: '', description: '', price: '', stock: '', categoryId: '', brandId: '', imageUrls: '', isActive: true, specs: [{ key: '', value: '' }] };

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'low'>('all');

  const loadAll = async () => {
    try {
      const [prodData, catData, brandData] = await Promise.all([
        productsApi.getAll({ page: 1, pageSize: 200, includeInactive: true }),
        categoriesApi.getAll(),
        brandsApi.getAll(),
      ]);
      setProducts(prodData.products);
      setCategories(flattenCategories(catData));
      setBrands([...brandData].sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => products.filter(p => {
    const term = search.trim().toLowerCase();
    if (term && !`${p.name} ${p.brandName}`.toLowerCase().includes(term)) return false;
    if (categoryFilter && p.categoryId !== categoryFilter) return false;
    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'inactive' && p.isActive) return false;
    if (statusFilter === 'low' && !(p.isActive && p.stock < 5)) return false;
    return true;
  }), [products, search, categoryFilter, statusFilter]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const setSpec = (index: number, field: 'key' | 'value', value: string) =>
    setForm(f => ({ ...f, specs: f.specs.map((s, i) => (i === index ? { ...s, [field]: value } : s)) }));

  const handleNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (p: Product) => {
    const specs = parseSpecs(p.specifications).map(([key, value]) => ({ key, value }));
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      stock: String(p.stock),
      categoryId: p.categoryId,
      brandId: p.brandId,
      imageUrls: p.imageUrls ?? '',
      isActive: p.isActive,
      specs: specs.length ? specs : [{ key: '', value: '' }],
    });
    setShowForm(true);
  };

  const buildPayload = (f: ProductForm, isActive: boolean) => {
    const specs = Object.fromEntries(f.specs.filter(s => s.key.trim() && s.value.trim()).map(s => [s.key.trim(), s.value.trim()]));
    return {
      name: f.name.trim(),
      description: f.description.trim(),
      specifications: Object.keys(specs).length ? JSON.stringify(specs) : null,
      price: Number(f.price),
      stock: Number(f.stock),
      categoryId: f.categoryId,
      brandId: f.brandId,
      imageUrls: f.imageUrls.trim() || null,
      isActive,
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(Number(form.price) > 0)) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      toast.error('El stock no puede ser negativo');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await productsApi.update(editing.id, buildPayload(form, form.isActive));
        toast.success('Producto actualizado');
      } else {
        await productsApi.create(buildPayload(form, true));
        toast.success('Producto creado');
      }
      setShowForm(false);
      loadAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al guardar producto'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`¿Desactivar "${p.name}"? Dejará de mostrarse en el catálogo.`)) return;
    try {
      await productsApi.delete(p.id);
      toast.success('Producto desactivado');
      loadAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al eliminar'));
    }
  };

  const handleReactivate = async (p: Product) => {
    try {
      const specs = parseSpecs(p.specifications).map(([key, value]) => ({ key, value }));
      await productsApi.update(p.id, buildPayload({
        name: p.name, description: p.description, price: String(p.price), stock: String(p.stock),
        categoryId: p.categoryId, brandId: p.brandId, imageUrls: p.imageUrls ?? '', isActive: true, specs,
      }, true));
      toast.success('Producto reactivado');
      loadAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo reactivar'));
    }
  };

  return (
    <div>
      <AdminNav title="Gestión de Productos" subtitle={`${products.filter(p => p.isActive).length} productos activos · ${products.length} en total`}
        actions={
          <button onClick={handleNew} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700">
            + Nuevo Producto
          </button>
        } />

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 grid sm:grid-cols-3 gap-3">
        <div className="relative">
          <Icon name="search" className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o marca" className={`${inputClass} pl-9`} aria-label="Buscar productos" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={inputClass} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className={inputClass} aria-label="Filtrar por estado">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="low">Stock bajo (menos de 5)</option>
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100" aria-label="Cerrar"><Icon name="x" className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre del producto" required className={inputClass} />
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Descripción" required rows={3} className={inputClass} />
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Precio (₡, IVA incluido)</span>
                  <input name="price" type="number" step="1" value={form.price} onChange={handleChange} placeholder="Precio" required className={`${inputClass} mt-1`} />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Stock</span>
                  <input name="stock" type="number" step="1" value={form.stock} onChange={handleChange} placeholder="Stock" required className={`${inputClass} mt-1`} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <select name="categoryId" value={form.categoryId} onChange={handleChange} required className={inputClass}>
                  <option value="">Seleccionar categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>)}
                </select>
                <select name="brandId" value={form.brandId} onChange={handleChange} required className={inputClass}>
                  <option value="">Seleccionar marca</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <fieldset>
                <legend className="text-sm font-semibold mb-2">Especificaciones técnicas</legend>
                <div className="space-y-2">
                  {form.specs.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={s.key} onChange={e => setSpec(i, 'key', e.target.value)} placeholder="Característica (ej. RAM)" className={inputClass} aria-label={`Característica ${i + 1}`} />
                      <input value={s.value} onChange={e => setSpec(i, 'value', e.target.value)} placeholder="Valor (ej. 16 GB)" className={inputClass} aria-label={`Valor ${i + 1}`} />
                      <button type="button" onClick={() => setForm(f => ({ ...f, specs: f.specs.filter((_, j) => j !== i) }))}
                        className="px-2 text-gray-500 hover:text-rose-600" aria-label="Quitar característica"><Icon name="trash" className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, specs: [...f.specs, { key: '', value: '' }] }))}
                  className="mt-2 text-sm text-blue-700 font-medium inline-flex items-center gap-1"><Icon name="plus" className="w-4 h-4" /> Agregar característica</button>
              </fieldset>

              <label className="block">
                <span className="text-sm font-semibold">Imágenes (URLs, una por línea, máximo 4)</span>
                <textarea name="imageUrls" value={form.imageUrls} onChange={handleChange} rows={2} placeholder="https://..." className={`${inputClass} mt-1`} />
                <span className="text-xs text-gray-500">Si no se indica una imagen, se muestra una ilustración según la categoría.</span>
              </label>

              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-blue-600" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  Producto activo (visible en el catálogo)
                </label>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {editing ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Producto</th>
              <th className="px-4 py-3 text-left font-medium">Categoría</th>
              <th className="px-4 py-3 text-right font-medium">Precio</th>
              <th className="px-4 py-3 text-center font-medium">Stock</th>
              <th className="px-4 py-3 text-center font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Cargando...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No hay productos con esos filtros.</td></tr>}
            {filtered.map(p => (
              <tr key={p.id} data-testid="product-row" data-name={p.name} className={p.isActive ? '' : 'bg-gray-50/60 text-gray-500'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductImage imageUrls={p.imageUrls} category={p.categoryName} name={p.name} className="w-11 h-11 rounded-lg shrink-0" iconClassName="w-5 h-5" />
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.brandName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{p.categoryName}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className="font-semibold">{formatCRC(p.price)}</span>
                  {p.discountedPrice != null && p.discountedPrice < p.price && (
                    <span className="block text-xs text-emerald-700">Vitrina: {formatCRC(p.discountedPrice)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-semibold ${p.stock === 0 ? 'text-rose-600' : p.stock < 5 ? 'text-amber-700' : ''}`}>{p.stock}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${p.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                    {p.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleEdit(p)} className="text-blue-700 hover:underline">Editar</button>
                    {p.isActive
                      ? <button onClick={() => handleDelete(p)} className="text-rose-600 hover:underline">Eliminar</button>
                      : <button onClick={() => handleReactivate(p)} className="text-emerald-700 hover:underline">Reactivar</button>}
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
