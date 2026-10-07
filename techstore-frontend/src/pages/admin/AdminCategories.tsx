import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { categoriesApi } from '../../api/categoriesApi';
import { Category } from '../../types';
import { apiErrorMessage } from '../../utils/format';
import AdminNav from '../../components/admin/AdminNav';
import { getCategoryStyle } from '../../components/ProductImage';
import Icon from '../../components/ui/Icon';

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none';
const emptyForm = { name: '', description: '', parentId: '', isActive: true };

/** Administración de categorías y subcategorías (HU-21). */
export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setCategories(await categoriesApi.getAll(true));
    } catch {
      toast.error('Error cargando categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = (c: Category | 'new', parentId = '') => {
    setEditing(c);
    setForm(c === 'new'
      ? { ...emptyForm, parentId }
      : { name: c.name, description: c.description ?? '', parentId: c.parentId ?? '', isActive: c.isActive });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, parentId: form.parentId || null };
    try {
      if (editing === 'new') {
        await categoriesApi.create(payload);
        toast.success('Categoría creada');
      } else if (editing) {
        await categoriesApi.update(editing.id, { ...payload, isActive: form.isActive });
        toast.success('Categoría actualizada');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo guardar la categoría'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`¿Desactivar la categoría "${c.name}"?`)) return;
    try {
      await categoriesApi.delete(c.id);
      toast.success('Categoría desactivada');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo eliminar la categoría'));
    }
  };

  const handleReactivate = async (c: Category) => {
    try {
      await categoriesApi.update(c.id, { name: c.name, description: c.description ?? undefined, parentId: c.parentId ?? null, isActive: true });
      toast.success('Categoría reactivada');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo reactivar la categoría'));
    }
  };

  // Solo las categorías principales pueden ser padres (un nivel de jerarquía).
  const parentOptions = categories.filter(c => editing === 'new' || !editing || c.id !== editing.id);

  const row = (c: Category, isChild: boolean) => {
    const style = getCategoryStyle(isChild ? undefined : c.name);
    return (
      <li key={c.id} data-testid="category-row" data-name={c.name} className={`flex items-center gap-4 px-5 py-3.5 ${isChild ? 'pl-14 bg-gray-50/50' : ''} ${c.isActive ? '' : 'opacity-60'}`}>
        {!isChild && (
          <span className={`w-10 h-10 rounded-xl bg-linear-to-br ${style.bg} flex items-center justify-center shrink-0`}>
            <Icon name={style.icon} className={`w-5 h-5 ${style.fg}`} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold flex items-center gap-2">
            {isChild && <Icon name="chevronRight" className="w-4 h-4 text-gray-500" />}
            {c.name}
            {!c.isActive && <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Inactiva</span>}
          </p>
          {c.description && <p className="text-xs text-gray-500 truncate">{c.description}</p>}
        </div>
        <span className="text-sm text-gray-600 whitespace-nowrap">{c.productCount} productos</span>
        <div className="flex gap-3 text-sm whitespace-nowrap">
          {!isChild && c.isActive && (
            <button onClick={() => open('new', c.id)} className="text-gray-600 hover:text-blue-700">+ Subcategoría</button>
          )}
          <button onClick={() => open(c)} className="text-blue-700 hover:underline">Editar</button>
          {c.isActive
            ? <button onClick={() => handleDelete(c)} className="text-rose-600 hover:underline">Eliminar</button>
            : <button onClick={() => handleReactivate(c)} className="text-emerald-700 hover:underline">Reactivar</button>}
        </div>
      </li>
    );
  };

  return (
    <div>
      <AdminNav title="Gestión de Categorías" subtitle="Organiza el catálogo en categorías y subcategorías"
        actions={
          <button onClick={() => open('new')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700">
            + Nueva Categoría
          </button>
        } />

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-5">{editing === 'new' ? 'Nueva Categoría' : 'Editar Categoría'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre" required className={inputClass} aria-label="Nombre" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción (opcional)" rows={2} className={inputClass} aria-label="Descripción" />
              <label className="block">
                <span className="text-sm font-medium">Categoría padre</span>
                <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))} className={`${inputClass} mt-1`}>
                  <option value="">Ninguna (categoría principal)</option>
                  {parentOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              {editing !== 'new' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-blue-600" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  Categoría activa
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">Guardar</button>
                <button type="button" onClick={() => setEditing(null)} className="flex-1 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-gray-500">Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No hay categorías.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {categories.flatMap(c => [row(c, false), ...c.subCategories.map(sc => row(sc, true))])}
          </ul>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Una categoría con productos o subcategorías activas no se puede eliminar. Eliminar es un borrado lógico: la categoría se puede reactivar.
      </p>
    </div>
  );
}
