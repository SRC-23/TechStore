import { expect, Page, test } from '@playwright/test';
import { Api, newClient, Order, resetData, Session } from '../helpers/api';
import { crc, P } from '../helpers/data';
import { loginAs } from '../helpers/ui';

let admin: Api;
let adminSession: Session;

test.beforeAll(async () => {
  ({ admin, adminSession } = await resetData());
});

test.describe.configure({ mode: 'serial' });

async function placeOrder(items: [string, number][]): Promise<Order> {
  const buyer = await newClient('dashboard');
  for (const [name, qty] of items) await buyer.api.addToCart(name, qty);
  const order = await buyer.api.createOrder();
  await buyer.api.dispose();
  return order;
}

async function openDashboard(page: Page) {
  await loginAs(page, adminSession);
  await page.goto('/admin');
  await expect(page.getByTestId('kpi').first()).toBeVisible();
}

const kpi = (page: Page, label: string) => page.locator(`[data-testid="kpi"][data-label="${label}"]`).getByTestId('kpi-value');

test.describe('HU-22 Dashboard de administración', () => {
  test('TC-118 Ventas de hoy, semana y mes', async ({ page }) => {
    const order = await placeOrder([[P.NV2, 2]]);
    await admin.setOrderStatus(order.id, 'Confirmed');
    const stats = await admin.stats();

    await openDashboard(page);
    await expect(kpi(page, 'Ventas de hoy')).toHaveText(crc(stats.salesToday));
    await expect(kpi(page, 'Ventas de la semana')).toHaveText(crc(stats.salesWeek));
    await expect(kpi(page, 'Ventas del mes')).toHaveText(crc(stats.salesMonth));
    await expect(kpi(page, 'Ticket promedio')).toHaveText(crc(stats.averageOrderValue));
    expect(stats.salesToday).toBeGreaterThanOrEqual(order.total);
  });

  test('TC-119 Gráfico de ventas de los últimos 7 días', async ({ page }) => {
    const older = await placeOrder([[P.FURY, 1]]);
    await admin.setOrderDaysAgo(older.id, 2);
    const stats = await admin.stats();
    const days = stats.salesLast7Days as { date: string; total: number; orders: number }[];

    await openDashboard(page);
    await expect(page.getByTestId('sales-chart').locator('svg').first()).toBeVisible();
    await page.getByText('Ver datos en tabla').click();
    await expect(page.getByTestId('sales-row')).toHaveCount(7);

    const today = days[6];
    const twoDaysAgo = days[4];
    await expect(page.locator(`[data-testid="sales-row"][data-date="${today.date}"]`)).toContainText(crc(today.total));
    await expect(page.locator(`[data-testid="sales-row"][data-date="${twoDaysAgo.date}"]`)).toContainText(crc(older.total));

    // Tooltip al pasar el mouse sobre la barra de hoy (la última)
    await page.locator('.recharts-bar-rectangle').last().hover();
    await expect(page.locator('.recharts-tooltip-wrapper')).toContainText('Ventas');
  });

  test('TC-120 Los ingresos excluyen pedidos cancelados', async ({ page }) => {
    const order = await placeOrder([[P.MX, 1]]);
    const before = await admin.stats();
    await admin.setOrderStatus(order.id, 'Cancelled');
    const after = await admin.stats();
    expect(after.salesToday).toBe(before.salesToday - order.total);
    expect(after.cancelledOrders).toBe(before.cancelledOrders + 1);

    await openDashboard(page);
    await expect(kpi(page, 'Ventas de hoy')).toHaveText(crc(after.salesToday));
    await expect(page.locator('[data-testid="status-count"][data-status="Cancelled"]')).toContainText(String(after.cancelledOrders));
  });

  test('TC-121 Alertas de productos con stock bajo', async ({ page }) => {
    const low = (await admin.products()).products.filter(p => p.isActive && p.stock < 5);
    await openDashboard(page);
    await expect(page.getByTestId('low-stock-summary')).toHaveText(`${low.length} productos con menos de 5 unidades`);
    await expect(page.getByTestId('low-stock-item')).toHaveCount(low.length);
    for (const p of low) {
      await expect(page.getByTestId('low-stock-item').filter({ hasText: p.name })).toContainText(p.stock === 0 ? 'Agotado' : `${p.stock} unid.`);
    }
  });

  test('TC-122 Top 5 de productos más vendidos', async ({ page }) => {
    await placeOrder([[P.G502, 4]]);
    await placeOrder([[P.CLOUD, 3]]);
    const stats = await admin.stats();
    const top = stats.topProducts as { productName: string; unitsSold: number }[];
    expect(top.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].unitsSold).toBeGreaterThanOrEqual(top[i].unitsSold);

    await openDashboard(page);
    const rows = page.getByTestId('top-product');
    await expect(rows).toHaveCount(top.length);
    await expect(rows.first()).toContainText(top[0].productName);
    await expect(rows.first()).toContainText(String(top[0].unitsSold));
  });
});
