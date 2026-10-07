import { execSync } from 'child_process';
import path from 'path';
import { expect, Page, test } from '@playwright/test';
import { Api, newClient, resetData, Session } from '../helpers/api';
import { crc, isoDaysFromNow, P, pct, RULES } from '../helpers/data';
import { cartItem, expectToast, loginAs, productCard, searchCatalog } from '../helpers/ui';

let admin: Api;
let client: Api;
let clientSession: Session;
const price: Record<string, number> = {};

test.beforeAll(async () => {
  ({ admin, client, clientSession } = await resetData());
  for (const name of [P.MX, P.BW, P.G502, P.CLOUD, P.FURY, P.NV2, P.MBA, P.S24, P.JBL]) {
    price[name] = (await admin.product(name)).price;
  }
});

test.beforeEach(async () => {
  await client.clearCart();
});

const discounts = (page: Page) => page.getByTestId('applied-discount');

async function openCart(page: Page) {
  await loginAs(page, clientSession);
  await page.goto('/cart');
  await expect(page.getByTestId('cart-total')).toBeVisible();
}

test.describe('HU-10 Ver descuentos aplicados', () => {
  test('TC-052 Desglose del descuento automático por categoría', async ({ page }) => {
    await client.addToCart(P.MX, 1);
    await openCart(page);
    const d = pct(price[P.MX], 10);
    await expect(discounts(page)).toHaveCount(1);
    await expect(discounts(page).first()).toContainText('10% en categoría');
    await expect(discounts(page).first()).toContainText(`-${crc(d)}`);
    await expect(page.getByTestId('cart-subtotal')).toHaveText(crc(price[P.MX]));
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.MX] - d));
  });

  test('TC-053 Recálculo al cambiar cantidades (acumulables)', async ({ page }) => {
    await client.addToCart(P.MX, 1);
    await openCart(page);
    const plus = cartItem(page, P.MX).getByRole('button', { name: 'Aumentar cantidad' });
    await plus.click();
    await expect(cartItem(page, P.MX).getByTestId('item-qty')).toHaveText('2');
    await plus.click();
    await expect(cartItem(page, P.MX).getByTestId('item-qty')).toHaveText('3');

    const subtotal = price[P.MX] * 3;
    const cat = pct(subtotal, 10);
    const vol = pct(subtotal, 15);
    await expect(discounts(page)).toHaveCount(2);
    await expect(page.getByText('Descuento por volumen (3+ unidades): 15% off')).toBeVisible();
    await expect(page.getByTestId('cart-total-discount')).toHaveText(`-${crc(cat + vol)}`);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(subtotal - cat - vol));
  });

  test('TC-054 El descuento desaparece al quitar el producto que lo origina', async ({ page }) => {
    await client.addToCart(P.MX, 1);
    await client.addToCart(P.NV2, 1);
    await openCart(page);
    await cartItem(page, P.MX).getByRole('button', { name: 'Eliminar' }).click();
    await expectToast(page, 'Producto eliminado del carrito');
    await expect(discounts(page)).toHaveCount(0);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.NV2]));
  });
});

test.describe('HU-11 Aplicar cupón de descuento', () => {
  const applyCoupon = async (page: Page, code: string) => {
    await page.getByLabel('Código de cupón').fill(code);
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  };

  test('TC-055 Cupón TECH20 (no acumulable, prioridad 1)', async ({ page }) => {
    await client.addToCart(P.MX, 1);
    await client.addToCart(P.BW, 1);
    await openCart(page);
    await applyCoupon(page, 'TECH20');
    await expectToast(page, 'Cupón aplicado!');
    const subtotal = price[P.MX] + price[P.BW];
    const coupon = pct(subtotal, 20);
    await expect(discounts(page)).toHaveCount(1);
    await expect(discounts(page).first()).toContainText('TECH20');
    await expect(discounts(page).first()).toContainText(`-${crc(coupon)}`);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(subtotal - coupon));
  });

  test('TC-056 El código de cupón no distingue mayúsculas', async ({ page }) => {
    await client.addToCart(P.MX, 1);
    await client.addToCart(P.BW, 1);
    await openCart(page);
    await applyCoupon(page, 'tech20');
    await expectToast(page, 'Cupón aplicado!');
    await expect(discounts(page).first()).toContainText(`-${crc(pct(price[P.MX] + price[P.BW], 20))}`);
  });

  test('TC-057 Rechazo de un cupón inexistente', async ({ page }) => {
    await client.addToCart(P.NV2, 1);
    await openCart(page);
    await applyCoupon(page, 'NOEXISTE');
    await expectToast(page, 'Cupón inválido o expirado');
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.NV2]));
  });

  test('TC-058 Rechazo de un cupón vencido', async ({ page }) => {
    await admin.createRule({
      name: 'Cupón VENCIDO10', type: 'Coupon', value: 10, couponCode: 'VENCIDO10', priority: 11, isStackable: false,
      startDate: isoDaysFromNow(-30), endDate: isoDaysFromNow(-1),
    });
    await client.addToCart(P.NV2, 1);
    await openCart(page);
    await applyCoupon(page, 'VENCIDO10');
    await expectToast(page, 'Este cupón ha expirado');
    await expect(discounts(page)).toHaveCount(0);
  });

  test('TC-059 Rechazo de un cupón que alcanzó su máximo de usos', async ({ page }) => {
    await admin.createRule({ name: 'Cupón UNICO5', type: 'Coupon', value: 5, couponCode: 'UNICO5', priority: 12, isStackable: false, maxUses: 1 });
    const other = await newClient('otro');
    await other.api.addToCart(P.NV2, 1);
    await other.api.applyCoupon('UNICO5');
    await other.api.createOrder();
    await other.api.dispose();

    await client.addToCart(P.NV2, 1);
    await openCart(page);
    await applyCoupon(page, 'UNICO5');
    await expectToast(page, 'Este cupón ya alcanzó su límite de usos');
    await expect(discounts(page)).toHaveCount(0);
  });

  test('TC-060 Monto mínimo del cupón (valor límite)', async ({ page }) => {
    await client.addToCart(P.NV2, 1);
    await openCart(page);
    await applyCoupon(page, 'TECH20');
    await expectToast(page, 'Cupón aplicado!');
    await expect(discounts(page)).toHaveCount(0);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.NV2]));
  });

  test('TC-061 Remover el cupón', async ({ page }) => {
    await client.addToCart(P.MX, 1);
    await client.addToCart(P.BW, 1);
    await client.applyCoupon('TECH20');
    await openCart(page);
    await page.getByRole('button', { name: 'Remover cupón' }).click();
    await expectToast(page, 'Cupón removido');
    const subtotal = price[P.MX] + price[P.BW];
    await expect(page.getByTestId('cart-total')).toHaveText(crc(subtotal - pct(subtotal, 10)));
  });

  test('TC-062 El uso del cupón se contabiliza al confirmar el pedido', async ({ page }) => {
    const before = (await admin.rule(RULES.TECH20)).timesUsed;
    await client.addToCart(P.MX, 1);
    await client.addToCart(P.BW, 1);
    await client.applyCoupon('TECH20');
    await client.createOrder();

    const adminSession = admin.session!;
    await loginAs(page, adminSession);
    await page.goto('/admin/rules');
    await expect(page.locator(`[data-testid="rule-row"][data-name="${RULES.TECH20}"]`)).toContainText(`${before + 1} / 50`);
  });
});

test.describe('HU-12 Descuento automático por volumen', () => {
  test('TC-063 Descuento por volumen al alcanzar 3 unidades', async ({ page }) => {
    await client.addToCart(P.FURY, 1);
    await openCart(page);
    const plus = cartItem(page, P.FURY).getByRole('button', { name: 'Aumentar cantidad' });
    await plus.click();
    await expect(cartItem(page, P.FURY).getByTestId('item-qty')).toHaveText('2');
    await plus.click();
    const subtotal = price[P.FURY] * 3;
    const vol = pct(subtotal, 15);
    await expect(page.getByText('Descuento por volumen (3+ unidades): 15% off')).toBeVisible();
    await expect(discounts(page).first()).toContainText(`-${crc(vol)}`);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(subtotal - vol));
  });

  test('TC-064 Con 2 unidades no aplica (valor límite)', async ({ page }) => {
    await client.addToCart(P.FURY, 2);
    await openCart(page);
    await expect(discounts(page)).toHaveCount(0);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.FURY] * 2));
  });

  test('TC-065 El descuento se retira al bajar de 3 a 2 unidades', async ({ page }) => {
    await client.addToCart(P.FURY, 3);
    await openCart(page);
    await expect(discounts(page)).toHaveCount(1);
    await cartItem(page, P.FURY).getByRole('button', { name: 'Disminuir cantidad' }).click();
    await expect(cartItem(page, P.FURY).getByTestId('item-qty')).toHaveText('2');
    await expect(discounts(page)).toHaveCount(0);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.FURY] * 2));
  });

  test('TC-066 Reglas de volumen en las pruebas unitarias del motor', async () => {
    test.setTimeout(240_000);
    // Se usa el .csproj de pruebas (no la solución) para no recompilar la API que está corriendo.
    const project = path.resolve(__dirname, '../../TechStore.Tests/TechStore.Tests.csproj');
    const output = execSync(`dotnet test "${project}" --filter "FullyQualifiedName~DescuentoPorVolumen"`, { encoding: 'utf-8' });
    expect(output).toMatch(/Failed:\s+0/);
    expect(output).toMatch(/Passed:\s+2\b/);
  });
});

test.describe('HU-13 Ofertas por tiempo limitado', () => {
  test('TC-067 Badge OFERTA y contador regresivo en el catálogo', async ({ page }) => {
    await searchCatalog(page, P.JBL);
    const card = productCard(page, P.JBL);
    await expect(card.getByTestId('badge-oferta')).toHaveText('OFERTA');
    await expect(card.getByTestId('badge-discount')).toHaveText('-15%');
    await expect(card.getByTestId('card-price')).toHaveText(crc(price[P.JBL] - pct(price[P.JBL], 15)));
    await expect(card.getByTestId('card-original-price')).toHaveText(crc(price[P.JBL]));

    const countdown = card.getByTestId('card-countdown');
    const first = await countdown.textContent();
    await expect(countdown).not.toHaveText(first ?? '', { timeout: 3000 });
  });

  test('TC-068 Contador regresivo en el detalle del producto', async ({ page }) => {
    const jbl = await admin.product(P.JBL);
    await page.goto(`/products/${jbl.id}`);
    const box = page.getByTestId('offer-countdown');
    await expect(box).toContainText('Oferta Relámpago · termina en:');
    for (const unit of ['días', 'horas', 'min', 'seg']) await expect(box).toContainText(unit);
    const first = await box.textContent();
    await expect(box).not.toHaveText(first ?? '', { timeout: 3000 });
  });

  test('TC-069 Oferta de Laptops vigente dentro del carrito', async ({ page }) => {
    await client.addToCart(P.MBA, 1);
    await openCart(page);
    const season = pct(price[P.MBA], 10);
    await expect(discounts(page)).toHaveCount(2);
    await expect(page.getByText('Oferta limitada: Temporada de Laptops')).toBeVisible();
    await expect(page.getByText(`₡25 000 de descuento`)).toBeVisible();
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.MBA] - 25000 - season));
  });

  test('TC-070 La oferta de Laptops no aplica a otras categorías', async ({ page }) => {
    await client.addToCart(P.S24, 1);
    await openCart(page);
    await expect(discounts(page)).toHaveCount(1);
    await expect(page.getByText('Oferta limitada', { exact: false })).toHaveCount(0);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.S24] - 25000));
  });

  test('TC-071 Una oferta vencida deja de aplicar', async ({ page }) => {
    const season = await admin.rule(RULES.SEASON);
    await admin.updateRule(RULES.SEASON, { startDate: isoDaysFromNow(-10), endDate: isoDaysFromNow(-1) });
    try {
      await client.addToCart(P.MBA, 1);
      await openCart(page);
      await expect(page.getByText('Oferta limitada', { exact: false })).toHaveCount(0);
      await expect(page.getByTestId('cart-total')).toHaveText(crc(price[P.MBA] - 25000));

      await searchCatalog(page, P.MBA);
      await expect(productCard(page, P.MBA).getByTestId('badge-oferta')).toHaveCount(0);
    } finally {
      await admin.updateRule(RULES.SEASON, { startDate: season.startDate, endDate: season.endDate });
    }
  });
});

test.describe('HU-16 Descuento por combo', () => {
  test('TC-084 El combo aplica con todos sus productos en el carrito', async ({ page }) => {
    for (const p of [P.G502, P.BW, P.CLOUD]) await client.addToCart(p, 1);
    await openCart(page);
    const subtotal = price[P.G502] + price[P.BW] + price[P.CLOUD];
    const cat = pct(price[P.G502] + price[P.BW], 10);
    const combo = pct(subtotal, 10);
    await expect(page.getByText('Combo: Combo Gamer', { exact: false })).toBeVisible();
    await expect(page.getByTestId('cart-total-discount')).toHaveText(`-${crc(cat + combo)}`);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(subtotal - cat - combo));
  });

  test('TC-085 El combo no aplica si falta un producto', async ({ page }) => {
    await client.addToCart(P.G502, 1);
    await client.addToCart(P.BW, 1);
    await openCart(page);
    const subtotal = price[P.G502] + price[P.BW];
    await expect(page.getByText('Combo:', { exact: false })).toHaveCount(0);
    await expect(page.getByTestId('cart-total')).toHaveText(crc(subtotal - pct(subtotal, 10)));
  });
});
