import { expect, Page, test } from '@playwright/test';
import { Api, newClient, resetData, Session, TEST_ADDRESS } from '../helpers/api';
import { crc, P, pct } from '../helpers/data';
import { acceptDialogs, expectToast, loginAs } from '../helpers/ui';

let admin: Api;
let client: Api;
let clientSession: Session;

test.beforeAll(async () => {
  ({ admin, client, clientSession } = await resetData());
});

async function fillNewAddress(page: Page, city = 'Belén') {
  await page.getByLabel('Dirección exacta').fill(TEST_ADDRESS.street);
  await page.getByLabel('Provincia').selectOption('Heredia');
  await page.getByLabel('Cantón').fill(city);
  await page.getByLabel('Código postal').fill(TEST_ADDRESS.zipCode);
}

test.describe('HU-17 Realizar checkout', () => {
  let buyer: { api: Api; session: Session };

  test('TC-087 Checkout exitoso con dirección nueva', async ({ page }) => {
    buyer = await newClient('checkout');
    await buyer.api.addToCart(P.NV2, 1);
    await loginAs(page, buyer.session);
    await page.goto('/cart');
    await page.getByRole('link', { name: 'Proceder al Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    await fillNewAddress(page);
    await expect(page.getByLabel('Guardar esta dirección en mi perfil')).toBeChecked();
    await page.getByText('SINPE Móvil').click();
    await page.getByRole('button', { name: 'Confirmar Pedido' }).click();

    await expectToast(page, /Pedido TS-\d{8}-[A-Z0-9]{6} creado!/);
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByTestId('cart-count')).toHaveCount(0);
    expect(await buyer.api.addresses()).toHaveLength(1);
  });

  test('TC-088 El stock se descuenta al confirmar', async ({ page }) => {
    const nv2 = await admin.product(P.NV2);
    expect(nv2.stock).toBe(39); // semilla: 40, menos el pedido del caso anterior
    await page.goto(`/products/${nv2.id}`);
    await expect(page.getByTestId('detail-stock')).toContainText('39 disponibles');
  });

  test('TC-089 Checkout con una dirección guardada', async ({ page }) => {
    await buyer.api.addToCart(P.NV2, 1);
    await loginAs(page, buyer.session);
    await page.goto('/checkout');
    await expect(page.getByRole('radio', { name: /Dirección/ }).first()).toBeChecked();
    await page.getByRole('button', { name: 'Confirmar Pedido' }).click();
    await expectToast(page, /Pedido TS-.* creado!/);

    const [latest] = await buyer.api.myOrders();
    expect(latest.shippingAddress?.street).toBe(TEST_ADDRESS.street);
  });

  test('TC-090 El resumen del checkout coincide con el carrito', async ({ page }) => {
    await client.clearCart();
    await client.addToCart(P.MX, 1);
    await client.addToCart(P.BW, 1);
    const cart = await client.applyCoupon('TECH20');
    await loginAs(page, clientSession);
    await page.goto('/checkout');
    await expect(page.getByTestId('checkout-discount')).toHaveText(`-${crc(cart.totalDiscount)}`);
    await expect(page.getByTestId('checkout-total')).toHaveText(crc(cart.total));
    await expect(page.getByText(`${P.MX}`)).toBeVisible();
    await expect(page.getByText(`${P.BW}`)).toBeVisible();
    expect(cart.totalDiscount).toBe(pct(cart.subtotal, 20));
  });

  test('TC-091 Validación de dirección incompleta', async ({ page }) => {
    const fresh = await newClient('incompleta');
    await fresh.api.addToCart(P.NV2, 1);
    await loginAs(page, fresh.session);
    await page.goto('/checkout');
    await fillNewAddress(page, '');
    await page.getByRole('button', { name: 'Confirmar Pedido' }).click();
    await expectToast(page, 'Completa todos los campos de dirección');
    await expect(page).toHaveURL(/\/checkout$/);
    expect(await fresh.api.myOrders()).toHaveLength(0);
  });

  test('TC-092 No se puede hacer checkout con el carrito vacío', async ({ page }) => {
    await client.clearCart();
    await loginAs(page, clientSession);
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/cart$/);
  });

  test('TC-093 Validación de stock al confirmar el pedido', async ({ page }) => {
    const original = (await admin.product(P.PROART)).stock;
    await client.clearCart();
    await client.addToCart(P.PROART, 2);
    await admin.updateProduct(P.PROART, { stock: 1 });
    try {
      await loginAs(page, clientSession);
      await page.goto('/checkout');
      await fillNewAddress(page);
      await page.getByRole('button', { name: 'Confirmar Pedido' }).click();
      await expectToast(page, `Stock insuficiente para ${P.PROART}. Disponible: 1`);
    } finally {
      await client.clearCart();
      await admin.updateProduct(P.PROART, { stock: original });
    }
  });
});

test.describe('HU-18 Ver historial de pedidos', () => {
  test('TC-094 Listado de pedidos ordenado por fecha', async ({ page }) => {
    const buyer = await newClient('historial');
    await buyer.api.addToCart(P.NV2, 1);
    const first = await buyer.api.createOrder();
    await buyer.api.addToCart(P.FURY, 1);
    const second = await buyer.api.createOrder();

    await loginAs(page, buyer.session);
    await page.goto('/orders');
    const rows = page.getByTestId('order-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute('data-number', second.orderNumber);
    await expect(rows.nth(1)).toHaveAttribute('data-number', first.orderNumber);
    await expect(rows.nth(0)).toContainText(crc(second.total));
    await expect(rows.nth(0)).toContainText('Pendiente');
  });

  test('TC-095 Detalle de un pedido', async ({ page }) => {
    const buyer = await newClient('detalle');
    await buyer.api.addToCart(P.MX, 1);
    await buyer.api.addToCart(P.BW, 1);
    await buyer.api.applyCoupon('TECH20');
    const order = await buyer.api.createOrder();

    await loginAs(page, buyer.session);
    await page.goto('/orders');
    await page.getByTestId('order-row').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(`Pedido ${order.orderNumber}`);
    await expect(dialog).toContainText(P.MX);
    await expect(dialog).toContainText('TECH20');
    await expect(dialog).toContainText(`-${crc(order.totalDiscount)}`);
    await expect(dialog).toContainText(crc(order.total));
    await expect(dialog).toContainText(TEST_ADDRESS.street);
  });

  test('TC-096 Mensaje cuando el cliente no tiene pedidos', async ({ page }) => {
    const fresh = await newClient('sinpedidos');
    await loginAs(page, fresh.session);
    await page.goto('/orders');
    await expect(page.getByText('No tienes pedidos')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir al Catálogo' })).toBeVisible();
  });

  test('TC-097 Un cliente no puede ver pedidos de otro cliente', async () => {
    const ana = await newClient('ana');
    await ana.api.addToCart(P.NV2, 1);
    const order = await ana.api.createOrder();
    const res = await client.ctx.get(`/api/orders/${order.id}`);
    expect(res.status()).toBe(403);
  });

  test('TC-098 El cliente cancela un pedido pendiente', async ({ page }) => {
    const buyer = await newClient('cancela');
    await buyer.api.addToCart(P.NV2, 1);
    await buyer.api.createOrder();
    const stockBefore = (await admin.product(P.NV2)).stock;

    acceptDialogs(page);
    await loginAs(page, buyer.session);
    await page.goto('/orders');
    await page.getByTestId('order-row').first().click();
    await page.getByRole('button', { name: 'Cancelar pedido' }).click();
    await expectToast(page, 'Pedido cancelado');
    await expect(page.getByRole('dialog')).toContainText('Este pedido fue cancelado');
    expect((await admin.product(P.NV2)).stock).toBe(stockBefore + 1);
  });
});
