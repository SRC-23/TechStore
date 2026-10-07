import { expect, Page, test } from '@playwright/test';
import { Api, newClient, Order, resetData, Session } from '../helpers/api';
import { localDate, P } from '../helpers/data';
import { acceptDialogs, expectToast, loginAs } from '../helpers/ui';

let admin: Api;
let adminSession: Session;

test.beforeAll(async () => {
  ({ admin, adminSession } = await resetData());
});

async function orderFor(prefix: string, product = P.NV2, qty = 1): Promise<{ order: Order; email: string }> {
  const buyer = await newClient(prefix);
  await buyer.api.addToCart(product, qty);
  const order = await buyer.api.createOrder();
  await buyer.api.dispose();
  return { order, email: buyer.email };
}

const orderRow = (page: Page, number: string) => page.locator(`[data-testid="admin-order-row"][data-number="${number}"]`);

async function openOrders(page: Page) {
  await loginAs(page, adminSession);
  await page.goto('/admin/orders');
}

test.describe('HU-19 Gestionar pedidos (Admin)', () => {
  test('TC-099 Listado de todos los pedidos con cliente', async ({ page }) => {
    const a = await orderFor('cliente.a');
    const b = await orderFor('cliente.b');
    await openOrders(page);
    await expect(orderRow(page, a.order.orderNumber)).toContainText(a.email);
    await expect(orderRow(page, b.order.orderNumber)).toContainText(b.email);

    await orderRow(page, a.order.orderNumber).getByRole('button', { name: a.order.orderNumber }).click();
    await expect(page.getByText('Dirección de envío')).toBeVisible();
  });

  test('TC-100 Filtros por estado y por fecha', async ({ page }) => {
    const { order } = await orderFor('filtro');
    await admin.setOrderStatus(order.id, 'Confirmed');
    await orderFor('pendiente');

    await openOrders(page);
    await page.getByLabel('Estado').selectOption('Pending');
    await page.getByLabel('Desde').fill(localDate(0));
    await page.getByLabel('Hasta').fill(localDate(0));
    const rows = page.getByTestId('admin-order-row');
    await expect(rows.first()).toBeVisible();
    await expect(orderRow(page, order.orderNumber)).toHaveCount(0);
    for (const row of await rows.all()) await expect(row).toContainText('Pendiente');
  });

  test('TC-101 Flujo completo de estados', async ({ page }) => {
    const { order } = await orderFor('flujo');
    await openOrders(page);
    const row = orderRow(page, order.orderNumber);
    for (const [button, label] of [['Confirmado', 'Confirmado'], ['Enviado', 'Enviado'], ['Entregado', 'Entregado']]) {
      await row.getByRole('button', { name: button, exact: true }).click();
      await expectToast(page, `Estado actualizado a ${label}`);
      await expect(row).toContainText(label);
    }
    const all = await admin.ctx.get('/api/orders/admin/all');
    const updated = ((await all.json()) as Order[]).find(o => o.id === order.id);
    expect(updated?.status).toBe('Delivered');
  });

  test('TC-102 No se puede saltar estados', async () => {
    const { order } = await orderFor('salto');
    const res = await admin.ctx.put(`/api/orders/${order.id}/status`, { data: { status: 'Delivered' } });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('No se puede cambiar de Pending a Delivered');
  });

  test('TC-103 Cancelar un pedido confirmado restaura el stock', async ({ page }) => {
    const stockBefore = (await admin.product(P.CORSAIR_HS)).stock;
    const { order } = await orderFor('cancelar', P.CORSAIR_HS, 2);
    await admin.setOrderStatus(order.id, 'Confirmed');
    expect((await admin.product(P.CORSAIR_HS)).stock).toBe(stockBefore - 2);

    acceptDialogs(page);
    await openOrders(page);
    await orderRow(page, order.orderNumber).getByRole('button', { name: 'Cancelado', exact: true }).click();
    await expectToast(page, 'Estado actualizado a Cancelado');
    expect((await admin.product(P.CORSAIR_HS)).stock).toBe(stockBefore);
  });

  test('TC-104 No se puede cancelar un pedido enviado', async ({ page }) => {
    const { order } = await orderFor('enviado');
    await admin.setOrderStatus(order.id, 'Confirmed');
    await admin.setOrderStatus(order.id, 'Shipped');
    await openOrders(page);
    const row = orderRow(page, order.orderNumber);
    await expect(row.getByRole('button', { name: 'Entregado', exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Cancelado', exact: true })).toHaveCount(0);
  });
});
