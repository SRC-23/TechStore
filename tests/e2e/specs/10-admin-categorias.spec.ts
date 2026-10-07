import { expect, Page, test } from '@playwright/test';
import { Api, resetData, Session } from '../helpers/api';
import { acceptDialogs, categoryRow, expectToast, loginAs } from '../helpers/ui';

let admin: Api;
let adminSession: Session;

test.beforeAll(async () => {
  ({ admin, adminSession } = await resetData());
});

test.describe.configure({ mode: 'serial' });

async function openCategories(page: Page) {
  await loginAs(page, adminSession);
  await page.goto('/admin/categories');
  await expect(page.getByTestId('category-row').first()).toBeVisible();
}

const modal = (page: Page) => page.getByRole('dialog');

test.describe('HU-21 CRUD de categorías (Admin)', () => {
  test('TC-112 Crear una categoría', async ({ page }) => {
    await openCategories(page);
    await page.getByRole('button', { name: '+ Nueva Categoría' }).click();
    await modal(page).getByLabel('Nombre').fill('Impresoras');
    await modal(page).getByLabel('Descripción').fill('Impresoras y tintas');
    await modal(page).getByRole('button', { name: 'Guardar' }).click();
    await expectToast(page, 'Categoría creada');
    await expect(categoryRow(page, 'Impresoras')).toContainText('0 productos');

    await page.reload();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Impresoras', exact: true })).toBeVisible();
  });

  test('TC-113 Crear una subcategoría', async ({ page }) => {
    await openCategories(page);
    await categoryRow(page, 'Impresoras').getByRole('button', { name: '+ Subcategoría' }).click();
    await expect(modal(page).getByRole('combobox')).toHaveValue(await admin.categoryId('Impresoras'));
    await modal(page).getByLabel('Nombre').fill('Tintas');
    await modal(page).getByRole('button', { name: 'Guardar' }).click();
    await expectToast(page, 'Categoría creada');
    await expect(categoryRow(page, 'Tintas')).toBeVisible();

    const parent = (await admin.categories()).find(c => c.name === 'Impresoras');
    expect(parent?.subCategories.map(s => s.name)).toContain('Tintas');

    await page.goto('/catalog');
    await expect(page.getByRole('checkbox', { name: 'Tintas' })).toBeVisible();
  });

  test('TC-114 Editar una categoría', async ({ page }) => {
    await openCategories(page);
    await categoryRow(page, 'Impresoras').getByRole('button', { name: 'Editar' }).click();
    await modal(page).getByLabel('Descripción').fill('Impresoras, tintas y tóner');
    await modal(page).getByRole('button', { name: 'Guardar' }).click();
    await expectToast(page, 'Categoría actualizada');
    await expect(categoryRow(page, 'Impresoras')).toContainText('Impresoras, tintas y tóner');
  });

  test('TC-115 No se elimina una categoría con productos', async ({ page }) => {
    acceptDialogs(page);
    await openCategories(page);
    await categoryRow(page, 'Periféricos').getByRole('button', { name: 'Eliminar' }).click();
    await expectToast(page, 'No se puede eliminar una categoría con productos asociados');
    await expect(categoryRow(page, 'Periféricos')).not.toContainText('Inactiva');
  });

  test('TC-116 No se permiten nombres duplicados', async ({ page }) => {
    await openCategories(page);
    await page.getByRole('button', { name: '+ Nueva Categoría' }).click();
    await modal(page).getByLabel('Nombre').fill('Laptops');
    await modal(page).getByRole('button', { name: 'Guardar' }).click();
    await expectToast(page, 'Ya existe una categoría con ese nombre');
  });

  test('TC-117 Desactivar y reactivar una categoría vacía', async ({ page }) => {
    acceptDialogs(page);
    await openCategories(page);
    await categoryRow(page, 'Tintas').getByRole('button', { name: 'Eliminar' }).click();
    await expectToast(page, 'Categoría desactivada');
    await expect(categoryRow(page, 'Tintas')).toContainText('Inactiva');

    const catalog = await page.context().newPage();
    await catalog.goto('/catalog');
    await expect(catalog.getByRole('checkbox', { name: 'Periféricos' })).toBeVisible();
    await expect(catalog.getByRole('checkbox', { name: 'Tintas' })).toHaveCount(0);
    await catalog.close();

    await categoryRow(page, 'Tintas').getByRole('button', { name: 'Reactivar' }).click();
    await expectToast(page, 'Categoría reactivada');
    await expect(categoryRow(page, 'Tintas')).not.toContainText('Inactiva');
  });
});
