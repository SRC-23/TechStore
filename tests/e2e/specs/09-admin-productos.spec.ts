import { expect, Page, test } from '@playwright/test';
import { Api, resetData, Session } from '../helpers/api';
import { crc, pct } from '../helpers/data';
import { acceptDialogs, expectToast, loginAs, productCard, productRow, searchCatalog } from '../helpers/ui';

let admin: Api;
let client: Api;
let adminSession: Session;

test.beforeAll(async () => {
  ({ admin, client, adminSession } = await resetData());
});

async function openProducts(page: Page) {
  await loginAs(page, adminSession);
  await page.goto('/admin/products');
  await expect(page.getByTestId('product-row').first()).toBeVisible();
}

async function fillProduct(page: Page, price: string, stock: string, name = 'Teclado QA') {
  await page.getByRole('button', { name: '+ Nuevo Producto' }).click();
  await page.getByPlaceholder('Nombre del producto').fill(name);
  await page.getByPlaceholder('Descripción', { exact: true }).fill('Teclado de prueba automatizada');
  await page.getByLabel('Precio (₡, IVA incluido)').fill(price);
  await page.getByLabel('Stock').fill(stock);
  await page.locator('select[name="categoryId"]').selectOption({ label: 'Periféricos' });
  await page.locator('select[name="brandId"]').selectOption({ label: 'Logitech' });
}

test.describe.configure({ mode: 'serial' });

test.describe('HU-20 CRUD de productos (Admin)', () => {
  test('TC-105 Crear un producto válido con especificaciones', async ({ page }) => {
    await openProducts(page);
    await fillProduct(page, '24900', '10');
    await page.getByLabel('Característica 1').fill('Conexión');
    await page.getByLabel('Valor 1').fill('USB');
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await expectToast(page, 'Producto creado');

    await searchCatalog(page, 'Teclado QA');
    await expect(productCard(page, 'Teclado QA').getByTestId('card-price')).toHaveText(crc(24900 - pct(24900, 10)));
    await productCard(page, 'Teclado QA').getByRole('link', { name: 'Teclado QA' }).last().click();
    await expect(page.getByTestId('specs')).toContainText('Conexión');
    await expect(page.getByTestId('specs')).toContainText('USB');
  });

  test('TC-106 Validación de precio mayor a 0 (valor límite)', async ({ page }) => {
    await openProducts(page);
    await fillProduct(page, '0', '5', 'Producto precio cero');
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await expectToast(page, 'El precio debe ser mayor a 0');
    expect((await admin.products({ search: 'Producto precio cero' })).totalCount).toBe(0);
  });

  test('TC-107 Validación de stock no negativo', async ({ page }) => {
    await openProducts(page);
    await fillProduct(page, '10000', '-1', 'Producto stock negativo');
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await expectToast(page, 'El stock no puede ser negativo');
  });

  test('TC-108 Editar un producto (regresión error 401)', async ({ page }) => {
    await openProducts(page);
    await productRow(page, 'Teclado QA').getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Precio (₡, IVA incluido)').fill('19900');
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await expectToast(page, 'Producto actualizado');
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(productRow(page, 'Teclado QA')).toContainText(crc(19900));
  });

  test('TC-109 Eliminación lógica y reactivación de un producto', async ({ page }) => {
    acceptDialogs(page);
    await openProducts(page);
    await productRow(page, 'Teclado QA').getByRole('button', { name: 'Eliminar' }).click();
    await expectToast(page, 'Producto desactivado');
    expect((await admin.product('Teclado QA')).isActive).toBe(false);

    const catalog = await page.context().newPage();
    await searchCatalog(catalog, 'Teclado QA');
    await expect(productCard(catalog, 'Teclado QA')).toHaveCount(0);
    await catalog.close();

    await page.getByLabel('Filtrar por estado').selectOption('inactive');
    await productRow(page, 'Teclado QA').getByRole('button', { name: 'Reactivar' }).click();
    await expectToast(page, 'Producto reactivado');
    expect((await admin.product('Teclado QA')).isActive).toBe(true);
  });

  test('TC-110 Búsqueda y filtros del panel de productos', async ({ page }) => {
    const lowStock = (await admin.products()).products.filter(p => p.isActive && p.stock < 5).map(p => p.name);
    await openProducts(page);
    await page.getByPlaceholder('Buscar por nombre o marca').fill('Galaxy');
    const rows = page.getByTestId('product-row');
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) await expect(row).toContainText('Galaxy');

    await page.getByPlaceholder('Buscar por nombre o marca').fill('');
    await page.getByLabel('Filtrar por estado').selectOption('low');
    await expect(rows).toHaveCount(lowStock.length);
    for (const name of lowStock) await expect(productRow(page, name)).toBeVisible();
  });

  test('TC-111 Un cliente no puede crear productos', async () => {
    const res = await client.ctx.post('/api/products', {
      data: { name: 'Hack', description: 'x', price: 1, stock: 1, categoryId: await admin.categoryId('Audio'), brandId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(403);
  });
});
