import { expect, test } from '@playwright/test';
import { Api, resetData } from '../helpers/api';
import { crc, P, pct } from '../helpers/data';
import { expectToast, productCard, searchCatalog } from '../helpers/ui';

let admin: Api;
let total: number;

test.beforeAll(async () => {
  ({ admin } = await resetData());
  total = (await admin.products()).totalCount;
});

const cards = (page: import('@playwright/test').Page) => page.getByTestId('product-card');

test.describe('HU-04 Navegar catálogo', () => {
  test('TC-020 El catálogo muestra los productos en tarjetas sin iniciar sesión', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.getByTestId('result-count')).toHaveText(`${total} productos encontrados`);
    await expect(cards(page)).toHaveCount(12);
    const first = cards(page).first();
    await expect(first.getByTestId('card-brand')).not.toBeEmpty();
    await expect(first.getByTestId('card-price')).toContainText('₡');
  });

  test('TC-021 Paginación de 12 productos por página', async ({ page }) => {
    const pages = Math.ceil(total / 12);
    await page.goto('/catalog');
    await expect(page.getByTestId('page-indicator')).toHaveText(`Página 1 de ${pages}`);
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    for (let i = 2; i <= pages; i++) {
      await page.getByRole('button', { name: 'Siguiente' }).click();
      await expect(page.getByTestId('page-indicator')).toHaveText(`Página ${i} de ${pages}`);
    }
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await expect(cards(page)).toHaveCount(total - 12 * (pages - 1));
  });

  test('TC-022 Un producto sin stock se marca como Agotado', async ({ page }) => {
    await searchCatalog(page, P.AGOTADO);
    const card = productCard(page, P.AGOTADO);
    await expect(card).toContainText('Agotado');
    await expect(card.getByRole('button', { name: 'Agotado' })).toBeDisabled();
  });

  test('TC-023 Precio con descuento en la tarjeta', async ({ page }) => {
    const mx = await admin.product(P.MX);
    await searchCatalog(page, P.MX);
    const card = productCard(page, P.MX);
    await expect(card.getByTestId('badge-discount')).toHaveText('-10%');
    await expect(card.getByTestId('card-price')).toHaveText(crc(mx.price - pct(mx.price, 10)));
    await expect(card.getByTestId('card-original-price')).toHaveText(crc(mx.price));
  });

  test('TC-024 Un producto desactivado no aparece en el catálogo', async ({ page }) => {
    await admin.deactivateProduct(P.HP15);
    await searchCatalog(page, 'HP 15');
    await expect(productCard(page, P.HP15)).toHaveCount(0);
    await admin.updateProduct(P.HP15, { isActive: true });
  });
});

test.describe('HU-05 Buscar productos', () => {
  test('TC-025 Búsqueda desde la barra del encabezado', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('header-search').fill('MacBook');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Resultados para "MacBook"' })).toBeVisible();
    await expect(cards(page)).toHaveCount(2);
    await expect(productCard(page, 'Apple MacBook Air 13 M2')).toBeVisible();
    await expect(productCard(page, 'Apple MacBook Pro 14 M3')).toBeVisible();
  });

  test('TC-026 La búsqueda no distingue mayúsculas', async ({ page }) => {
    await searchCatalog(page, 'IPHONE');
    await expect(cards(page)).toHaveCount(2);
    await expect(productCard(page, 'Apple iPhone 15 128GB')).toBeVisible();
    await expect(productCard(page, 'Apple iPhone 15 Pro Max 256GB')).toBeVisible();
  });

  test('TC-027 Búsqueda por descripción', async ({ page }) => {
    await searchCatalog(page, 'mouse');
    await expect(cards(page)).toHaveCount(5);
    for (const name of [P.MX, P.G502, 'Logitech G Pro X Superlight 2', 'Razer DeathAdder V3', 'Logitech MK270 Combo Inalámbrico']) {
      await expect(productCard(page, name)).toBeVisible();
    }
  });

  test('TC-028 Mensaje cuando no hay resultados', async ({ page }) => {
    await searchCatalog(page, 'zzzzzz');
    await expect(page.getByText('No se encontraron productos')).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });
});

test.describe('HU-06 Filtrar productos', () => {
  test('TC-029 Filtro por categoría', async ({ page }) => {
    const expected = (await admin.products({ categoryId: await admin.categoryId('Periféricos') })).totalCount;
    await page.goto('/catalog');
    await page.getByRole('checkbox', { name: 'Periféricos' }).check();
    await expect(page.getByTestId('result-count')).toHaveText(`${expected} productos encontrados`);
    await expect(cards(page)).toHaveCount(expected);
  });

  test('TC-030 Filtro por varias categorías a la vez', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByRole('checkbox', { name: 'Tablets' }).check();
    await page.getByRole('checkbox', { name: 'Smartwatches' }).check();
    await expect(page.getByTestId('result-count')).toHaveText('8 productos encontrados');
    await expect(page.getByTestId('filter-chip')).toHaveCount(2);
  });

  test('TC-031 Filtro por marca', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByRole('checkbox', { name: 'Logitech' }).check();
    await expect(page.getByTestId('result-count')).toHaveText('6 productos encontrados');
    const brands = await page.getByTestId('card-brand').allTextContents();
    expect(brands).toHaveLength(6);
    expect(brands.every(b => b.trim().toLowerCase() === 'logitech')).toBe(true);
  });

  test('TC-032 Filtro por rango de precio (valores límite)', async ({ page }) => {
    const expected = (await admin.products({ minPrice: 100000, maxPrice: 150000 })).totalCount;
    await page.goto('/catalog');
    await page.getByLabel('Precio mínimo').fill('100000');
    await page.getByLabel('Precio máximo').fill('150000');
    await page.getByRole('button', { name: 'Aplicar precio' }).click();
    await expect(page.getByTestId('result-count')).toHaveText(`${expected} productos encontrados`);
    // Límites incluidos: ₡149 900 y ₡109 900
    await expect(productCard(page, 'Motorola Moto G84 256GB')).toBeVisible();
    await expect(productCard(page, 'Dell S2721HN 27" FHD')).toBeVisible();
  });

  test('TC-033 Filtro de disponibilidad combinado con categoría', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByRole('checkbox', { name: 'Componentes' }).check();
    await expect(productCard(page, P.AGOTADO)).toBeVisible();
    await page.getByRole('checkbox', { name: 'Solo productos en stock' }).check();
    await expect(productCard(page, P.AGOTADO)).toHaveCount(0);
    await expect(productCard(page, 'AMD Ryzen 5 7600')).toBeVisible();
  });

  test('TC-034 Ordenamiento por precio', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByRole('checkbox', { name: 'Laptops' }).check();
    await page.getByLabel('Ordenar por').selectOption('price_asc');
    await expect(cards(page).first()).toHaveAttribute('data-name', P.HP15);
    await expect(cards(page).last()).toHaveAttribute('data-name', P.ROG);
  });

  test('TC-035 Limpiar todos los filtros restablece el listado', async ({ page }) => {
    await page.goto('/catalog?category=x&brand=y&min=1000&max=5000');
    await page.getByRole('button', { name: 'Limpiar todos los filtros' }).click();
    await expect(page.getByTestId('result-count')).toHaveText(`${total} productos encontrados`);
    await expect(page.getByTestId('filter-chip')).toHaveCount(0);
  });
});

test.describe('HU-07 Ver detalle de producto', () => {
  test('TC-036 Información completa del detalle', async ({ page }) => {
    const rog = await admin.product(P.ROG);
    await page.goto(`/products/${rog.id}`);
    await expect(page.getByRole('heading', { level: 1, name: P.ROG })).toBeVisible();
    await expect(page.getByText('Categoría: Laptops')).toBeVisible();
    await expect(page.getByTestId('specs')).toContainText('Procesador');
    await expect(page.getByTestId('specs')).toContainText('Intel Core i7-13650HX');
    await expect(page.getByTestId('detail-stock')).toContainText(`${rog.stock} disponibles`);
    await expect(page.getByTestId('detail-price')).toContainText('₡');
  });

  test('TC-037 Precio original tachado y ahorro con descuento', async ({ page }) => {
    const p = await admin.product(P.IDEAPAD);
    const discount = pct(p.price, 10);
    await page.goto(`/products/${p.id}`);
    await expect(page.getByTestId('detail-price')).toHaveText(crc(p.price - discount));
    await expect(page.getByTestId('detail-original-price')).toHaveText(crc(p.price));
    await expect(page.getByTestId('detail-savings')).toHaveText(`Ahorras ${crc(discount)} (10%)`);
  });

  test('TC-038 Sin sesión, Agregar al carrito redirige al login', async ({ page }) => {
    const mx = await admin.product(P.MX);
    await page.goto(`/products/${mx.id}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC-039 Botón deshabilitado para productos agotados', async ({ page }) => {
    const p = await admin.product(P.AGOTADO);
    await page.goto(`/products/${p.id}`);
    await expect(page.getByTestId('detail-stock')).toContainText('Agotado');
    await expect(page.getByRole('button', { name: 'Agotado' })).toBeDisabled();
  });

  test('TC-040 Producto inexistente', async ({ page }) => {
    await page.goto('/products/00000000-0000-0000-0000-000000000001');
    await expectToast(page, 'Producto no encontrado');
    await expect(page).toHaveURL(/\/catalog$/);
  });
});
