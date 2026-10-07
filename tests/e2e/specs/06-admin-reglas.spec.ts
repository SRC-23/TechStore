import { expect, Page, test } from '@playwright/test';
import { Api, resetData, Session } from '../helpers/api';
import { localDate, P, pct, RULES, SEED_RULE_NAMES } from '../helpers/data';
import { acceptDialogs, expectToast, loginAs, productCard, ruleRow, searchCatalog } from '../helpers/ui';

let admin: Api;
let client: Api;
let adminSession: Session;

test.beforeAll(async () => {
  ({ admin, client, adminSession } = await resetData());
});

test.beforeEach(async () => {
  await client.clearCart();
});

async function openRules(page: Page) {
  await loginAs(page, adminSession);
  await page.goto('/admin/rules');
  await expect(page.getByTestId('rule-row').first()).toBeVisible();
}

async function newRuleForm(page: Page, name: string, type: string, value: string, priority: string) {
  await page.getByRole('button', { name: '+ Nueva Regla' }).click();
  await page.getByPlaceholder('Nombre de la regla').fill(name);
  await page.getByLabel('Tipo de descuento').selectOption({ label: type });
  await page.locator('input[name="value"]').fill(value);
  await page.locator('input[name="priority"]').fill(priority);
}

test.describe('HU-14 Crear regla de descuento', () => {
  test('TC-072 Crear una regla porcentual acumulable', async ({ page }) => {
    await openRules(page);
    await newRuleForm(page, 'QA 5% General', 'Porcentaje', '5', '20');
    await expect(page.locator('input[name="isStackable"]')).toBeChecked();
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'Regla creada');
    await expect(ruleRow(page, 'QA 5% General')).toBeVisible();

    const nv2 = await admin.product(P.NV2);
    const cart = await client.addToCart(P.NV2, 1);
    const applied = cart.appliedDiscounts.find(d => d.ruleName === 'QA 5% General');
    expect(applied?.discountAmount).toBe(pct(nv2.price, 5));
    expect(cart.total).toBe(nv2.price - pct(nv2.price, 5));
    await admin.setRuleActive('QA 5% General', false);
  });

  test('TC-073 Crear un cupón y usarlo', async ({ page }) => {
    await openRules(page);
    await newRuleForm(page, 'Cupón QA15', 'Cupón', '15', '21');
    await page.getByPlaceholder('Código del cupón (ej: TECH20)').fill('QA15');
    await page.getByPlaceholder('Monto mínimo (₡)').fill('20000');
    await expect(page.locator('input[name="isStackable"]')).not.toBeChecked();
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'Regla creada');

    const nv2 = await admin.product(P.NV2);
    await client.addToCart(P.NV2, 1);
    const cart = await client.applyCoupon('QA15');
    expect(cart.totalDiscount).toBe(pct(nv2.price, 15));
    expect(cart.total).toBe(nv2.price - pct(nv2.price, 15));
  });

  test('TC-074 Regla por categoría seleccionada en el formulario', async ({ page }) => {
    await openRules(page);
    await newRuleForm(page, 'QA 10% Almacenamiento', 'Por categoría', '10', '22');
    await page.getByRole('button', { name: 'Almacenamiento', exact: true }).click();
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'Regla creada');

    const nv2 = await admin.product(P.NV2);
    const mx = await admin.product(P.MX);
    await client.addToCart(P.NV2, 1);
    const cart = await client.addToCart(P.MX, 1);
    expect(cart.appliedDiscounts.find(d => d.ruleName === 'QA 10% Almacenamiento')?.discountAmount).toBe(pct(nv2.price, 10));
    expect(cart.appliedDiscounts.find(d => d.ruleName === RULES.PERIFERICOS)?.discountAmount).toBe(pct(mx.price, 10));
  });

  test('TC-075 No se permiten dos reglas activas con la misma prioridad', async ({ page }) => {
    const used = new Set((await admin.rules()).filter(r => r.isActive).map(r => r.priority));
    let free = 1;
    while (used.has(free)) free++;

    await openRules(page);
    await page.getByRole('button', { name: '+ Nueva Regla' }).click();
    await expect(page.locator('input[name="priority"]')).toHaveValue(String(free));
    await page.getByPlaceholder('Nombre de la regla').fill('QA Prioridad repetida');
    await page.locator('input[name="value"]').fill('5');
    await page.locator('input[name="priority"]').fill('1');
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'La prioridad 1 ya la usa la regla activa "Cupón TECH20". Elige otra prioridad.');
    await expect(ruleRow(page, 'QA Prioridad repetida')).toHaveCount(0);
  });

  test('TC-076 No se permiten cupones con código duplicado', async ({ page }) => {
    await openRules(page);
    await newRuleForm(page, 'Cupón duplicado', 'Cupón', '10', '30');
    await page.getByPlaceholder('Código del cupón (ej: TECH20)').fill('TECH20');
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'Ya existe un cupón con el código TECH20');
  });

  test('TC-077 Validación de porcentaje mayor a 100 y de fechas', async ({ page }) => {
    await openRules(page);
    await newRuleForm(page, 'QA Inválida', 'Porcentaje', '150', '31');
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'Un descuento porcentual no puede ser mayor a 100 %');

    await page.locator('input[name="value"]').fill('10');
    await page.locator('input[name="startDate"]').fill(localDate(0));
    await page.locator('input[name="endDate"]').fill(localDate(-2));
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'La fecha de fin debe ser posterior a la fecha de inicio');
    await expect(ruleRow(page, 'QA Inválida')).toHaveCount(0);
  });

  test('TC-078 Un cliente no puede crear reglas', async () => {
    const res = await client.ctx.post('/api/pricing-rules', {
      data: { name: 'Hack', type: 'Percentage', value: 50, isPercentage: true, priority: 99, isStackable: true,
        startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86_400_000).toISOString(), productIds: [], categoryIds: [] },
    });
    expect(res.status()).toBe(403);
    expect((await admin.rules()).some(r => r.name === 'Hack')).toBe(false);
  });
});

test.describe('HU-15 Gestionar reglas de descuento', () => {
  test('TC-079 Listado de reglas', async ({ page }) => {
    await openRules(page);
    for (const name of SEED_RULE_NAMES) await expect(ruleRow(page, name)).toBeVisible();
    const tech20 = ruleRow(page, RULES.TECH20);
    await expect(tech20).toContainText('Cupón');
    await expect(tech20).toContainText('20%');
    await expect(tech20).toContainText('Activa');
    await expect(page.getByTestId('rule-row').first().locator('td').first()).toHaveText('1');
  });

  test('TC-080 Filtros del listado por tipo y estado', async ({ page }) => {
    await admin.setRuleActive('QA 5% General', false);
    await openRules(page);
    await page.getByLabel('Filtrar por tipo').selectOption({ label: 'Oferta temporal' });
    await expect(page.getByTestId('rule-row')).toHaveCount(2);
    await expect(ruleRow(page, RULES.SEASON)).toBeVisible();
    await expect(ruleRow(page, RULES.FLASH)).toBeVisible();

    await page.getByLabel('Filtrar por tipo').selectOption('');
    await page.getByLabel('Filtrar por estado').selectOption('inactive');
    const rows = page.getByTestId('rule-row');
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) await expect(row).toContainText('Inactiva');
  });

  test('TC-081 Editar una regla y ver su efecto en el carrito', async ({ page }) => {
    acceptDialogs(page);
    await openRules(page);
    await ruleRow(page, RULES.PERIFERICOS).getByRole('button', { name: 'Editar' }).click();
    await page.locator('input[name="value"]').fill('12');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expectToast(page, 'Regla actualizada');
    try {
      const mx = await admin.product(P.MX);
      const cart = await client.addToCart(P.MX, 1);
      expect(cart.totalDiscount).toBe(pct(mx.price, 12));
      expect(cart.total).toBe(mx.price - pct(mx.price, 12));
    } finally {
      await admin.updateRule(RULES.PERIFERICOS, { value: 10 });
    }
  });

  test('TC-082 Desactivar y reactivar una regla', async ({ page }) => {
    await openRules(page);
    const row = ruleRow(page, RULES.PERIFERICOS);
    await row.getByRole('button', { name: 'Desactivar' }).click();
    await expectToast(page, 'Regla desactivada');
    await expect(row).toContainText('Inactiva');

    const mx = await admin.product(P.MX);
    let cart = await client.addToCart(P.MX, 1);
    expect(cart.totalDiscount).toBe(0);
    expect(cart.total).toBe(mx.price);

    const catalog = await page.context().newPage();
    await searchCatalog(catalog, P.MX);
    await expect(productCard(catalog, P.MX).getByTestId('badge-discount')).toHaveCount(0);
    await catalog.close();

    await row.getByRole('button', { name: 'Activar' }).click();
    await expectToast(page, 'Regla activada');
    cart = await client.cart();
    expect(cart.totalDiscount).toBe(pct(mx.price, 10));
  });

  test('TC-083 Eliminación lógica (soft delete) de una regla', async ({ page }) => {
    await admin.setRuleActive('QA 5% General', true);
    acceptDialogs(page);
    await openRules(page);
    await ruleRow(page, 'QA 5% General').getByRole('button', { name: 'Eliminar' }).click();
    await expectToast(page, 'Regla desactivada');

    const rule = await admin.rule('QA 5% General');
    expect(rule.isActive).toBe(false); // el registro sigue existiendo con IsActive = 0
    const cart = await client.addToCart(P.NV2, 1);
    expect(cart.appliedDiscounts.some(d => d.ruleName === 'QA 5% General')).toBe(false);
  });
});

test.describe('HU-16 Combo desde el panel', () => {
  test('TC-086 Crear un combo exige al menos 2 productos', async ({ page }) => {
    await openRules(page);
    await page.getByRole('button', { name: '+ Nueva Regla' }).click();
    await page.getByPlaceholder('Nombre de la regla').fill('Combo QA');
    await page.getByLabel('Tipo de descuento').selectOption({ label: 'Combo/Bundle' });
    await page.locator('input[name="value"]').fill('5');
    await page.getByLabel('Buscar producto').fill('Kingston NV2');
    await page.getByRole('checkbox', { name: P.NV2 }).check();
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'Un combo requiere al menos 2 productos');

    await page.getByLabel('Buscar producto').fill('Samsung 990');
    await page.getByRole('checkbox', { name: P.SSD990 }).check();
    await page.getByRole('button', { name: 'Crear Regla' }).click();
    await expectToast(page, 'Regla creada');
    await expect(ruleRow(page, 'Combo QA')).toContainText('2 producto(s)');
  });
});
