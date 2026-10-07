import { expect, test } from '@playwright/test';
import { Api } from '../helpers/api';
import { ADMIN } from '../helpers/data';
import { expectToast, loginWithForm } from '../helpers/ui';

/**
 * Prueba de humo post-instalación (RNF-18 / PR02).
 *
 * Se ejecuta contra el ambiente recién desplegado y NO modifica datos:
 *   $env:BASE_URL="https://techstore-cr.azurewebsites.net"; npm run test:smoke
 * Si la contraseña del admin ya se cambió en producción, defínela en ADMIN_PASSWORD.
 */
test('TC-140 RNF-18 Instalabilidad: prueba de humo post-instalación @smoke', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'TechStore inicio' })).toBeVisible();

  await page.goto('/catalog');
  await expect(page.getByTestId('product-card').first()).toBeVisible();

  const anon = await Api.anonymous();
  const res = await anon.ctx.get('/api/products', { params: { pageSize: 1 } });
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).totalCount).toBeGreaterThan(0);
  await anon.dispose();

  await loginWithForm(page, ADMIN.email, process.env.ADMIN_PASSWORD ?? ADMIN.password);
  await expectToast(page, 'Bienvenido');
  await page.goto('/admin');
  await expect(page.getByTestId('kpi').first()).toBeVisible();
});
