import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsApi } from '../../api/productsApi';
import { categoriesApi } from '../../api/categoriesApi';
import { brandsApi } from '../../api/brandsApi';
import { Brand, Category, Product, SortOption } from '../../types';
import ProductCard from '../../components/ProductCard';
import Icon from '../../components/ui/Icon';

const PAGE_SIZE = 12;

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Nombre (A-Z)' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'newest', label: 'Más recientes' },
];

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // El estado de los filtros vive en la URL para poder compartir y recargar búsquedas.
  const search = params.get('search') ?? '';
  const selectedCategories = params.getAll('category');
  const selectedBrands = params.getAll('brand');
  const minPrice = params.get('min') ?? '';
  const maxPrice = params.get('max') ?? '';
  const inStock = params.get('stock') === '1';
  const sortBy = (params.get('sort') as SortOption) || 'name';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => setPriceDraft({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);

  useEffect(() => {
    Promise.all([categoriesApi.getAll(), brandsApi.getAll()])
      .then(([c, b]) => {
        setCategories(c);
        setBrands([...b].sort((x, y) => x.name.localeCompare(y.name)));
      })
      .catch(() => undefined);
  }, []);

  const queryKey = params.toString();
  useEffect(() => {
    setLoading(true);
    productsApi.getAll({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      categoryIds: selectedCategories.length ? selectedCategories : undefined,
      brandIds: selectedBrands.length ? selectedBrands : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock || undefined,
      sortBy,
    })
      .then(data => {
        setProducts(data.products);
        setTotalCount(data.totalCount);
      })
      .catch(() => {
        setProducts([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const update = (changes: Record<string, string | string[] | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      next.delete(key);
      if (Array.isArray(value)) value.forEach(v => next.append(key, v));
      else if (value) next.set(key, value);
    });
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const toggle = (key: 'category' | 'brand', id: string, current: string[]) =>
    update({ [key]: current.includes(id) ? current.filter(x => x !== id) : [...current, id] });

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    update({ min: priceDraft.min || null, max: priceDraft.max || null });
  };

  const goToPage = (p: number) => {
    update({ page: p > 1 ? String(p) : null }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categoryName = useMemo(() => {
    const all = categories.flatMap(c => [c, ...c.subCategories]);
    return (id: string) => all.find(c => c.id === id)?.name ?? '';
  }, [categories]);

  const activeChips = [
    ...(search ? [{ label: `"${search}"`, remove: () => update({ search: null }) }] : []),
    ...selectedCategories.map(id => ({ label: categoryName(id), remove: () => toggle('category', id, selectedCategories) })),
    ...selectedBrands.map(id => ({ label: brands.find(b => b.id === id)?.name ?? '', remove: () => toggle('brand', id, selectedBrands) })),
    ...(minPrice || maxPrice ? [{ label: `₡${minPrice || '0'} – ₡${maxPrice || '∞'}`, remove: () => update({ min: null, max: null }) }] : []),
    ...(inStock ? [{ label: 'Solo en stock', remove: () => update({ stock: null }) }] : []),
  ];

  const title = search
    ? `Resultados para "${search}"`
    : selectedCategories.length === 1 ? categoryName(selectedCategories[0]) : 'Catálogo de Productos';

  const filters = (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Categorías</h3>
        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {categories.map(c => (
            <li key={c.id}>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-700">
                <input type="checkbox" className="rounded border-gray-300 accent-blue-600"
                  checked={selectedCategories.includes(c.id)} onChange={() => toggle('category', c.id, selectedCategories)} />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-gray-500">{c.productCount}</span>
              </label>
              {c.subCategories.map(sc => (
                <label key={sc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-700 ml-5 mt-1.5">
                  <input type="checkbox" className="accent-blue-600"
                    checked={selectedCategories.includes(sc.id)} onChange={() => toggle('category', sc.id, selectedCategories)} />
                  <span className="flex-1">{sc.name}</span>
                </label>
              ))}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Marcas</h3>
        <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {brands.map(b => (
            <li key={b.id}>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-700">
                <input type="checkbox" className="accent-blue-600"
                  checked={selectedBrands.includes(b.id)} onChange={() => toggle('brand', b.id, selectedBrands)} />
                {b.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={applyPrice}>
        <h3 className="text-sm font-semibold mb-3">Precio (₡)</h3>
        <div className="flex items-center gap-2">
          <input type="number" min={0} inputMode="numeric" placeholder="Mínimo" value={priceDraft.min}
            onChange={e => setPriceDraft(d => ({ ...d, min: e.target.value }))} aria-label="Precio mínimo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <span className="text-gray-500">–</span>
          <input type="number" min={0} inputMode="numeric" placeholder="Máximo" value={priceDraft.max}
            onChange={e => setPriceDraft(d => ({ ...d, max: e.target.value }))} aria-label="Precio máximo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button type="submit" className="mt-2 w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800">
          Aplicar precio
        </button>
      </form>

      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input type="checkbox" className="accent-blue-600" checked={inStock} onChange={() => update({ stock: inStock ? null : '1' })} />
        Solo productos en stock
      </label>

      {activeChips.length > 0 && (
        <button onClick={() => setParams(new URLSearchParams())} className="text-sm text-rose-600 hover:underline">
          Limpiar todos los filtros
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p data-testid="result-count" className="text-gray-500 mt-1">{loading ? 'Buscando...' : `${totalCount} ${totalCount === 1 ? 'producto encontrado' : 'productos encontrados'}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(s => !s)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium bg-white">
            <Icon name="filter" className="w-4 h-4" /> Filtros
          </button>
          <label className="text-sm text-gray-500 hidden sm:block" htmlFor="sort">Ordenar por</label>
          <select id="sort" value={sortBy} onChange={e => update({ sort: e.target.value === 'name' ? null : e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white">
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {activeChips.map((chip, i) => (
            <button key={i} data-testid="filter-chip" onClick={chip.remove}
              className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-sm px-3 py-1.5 rounded-full ring-1 ring-blue-200 hover:bg-blue-100">
              {chip.label} <Icon name="x" className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block bg-white rounded-2xl border border-gray-200 p-5 h-fit lg:sticky lg:top-40`}>
          {filters}
        </aside>

        <section>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-96 bg-white rounded-2xl border animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 px-6">
              <Icon name="search" className="w-12 h-12 text-gray-300 mx-auto" />
              <h2 className="text-xl font-semibold mt-4">No se encontraron productos</h2>
              <p className="text-gray-500 mt-1">Intenta con otra palabra o quita algunos filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Paginación">
              <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 bg-white rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">
                <Icon name="chevronLeft" className="w-4 h-4" /> Anterior
              </button>
              <span data-testid="page-indicator" className="px-4 py-2 text-sm text-gray-600">Página {page} de {totalPages}</span>
              <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 bg-white rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">
                Siguiente <Icon name="chevronRight" className="w-4 h-4" />
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
