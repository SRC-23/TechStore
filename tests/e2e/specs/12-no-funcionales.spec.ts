import { execSync, spawnSync } from 'child_process';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { Api, BASE_URL, newClient, resetData, Session, TEST_ADDRESS } from '../helpers/api';
import { CLIENT, P } from '../helpers/data';
import { expectToast, loginAs, loginWithForm, productCard, searchCatalog } from '../helpers/ui';

let admin: Api;
let client: Api;
let clientSession: Session;

test.beforeAll(async () => {
  ({ admin, client, clientSession } = await resetData());
});

const E2E_DIR = path.resolve(__dirname, '..');
const REPO_DIR = path.resolve(__dirname, '../../..');

/** ¿Existe el comando en el PATH? */
function hasCommand(cmd: string): boolean {
  return spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;
}

function run(command: string, cwd = E2E_DIR, env: NodeJS.ProcessEnv = {}): string {
  return execSync(command, { cwd, encoding: 'utf-8', env: { ...process.env, ...env }, stdio: 'pipe' });
}

test.describe('RNF Eficiencia de desempeño', () => {
  test('TC-123 RNF-01 Tiempo de respuesta del catálogo (k6, 20 usuarios, p95 < 2 s)', async () => {
    test.skip(!hasCommand('k6'), 'Requiere Grafana k6 instalado (winget install k6)');
    test.setTimeout(600_000);
    // k6 termina con código distinto de 0 si no se cumplen los umbrales
    const out = run('k6 run k6/catalog-load.js', E2E_DIR, { BASE_URL });
    expect(out).toContain('http_req_duration');
  });

  test('TC-124 RNF-02 Tiempo de cálculo del carrito (k6, 10 usuarios, p95 < 1 s)', async () => {
    test.skip(!hasCommand('k6'), 'Requiere Grafana k6 instalado (winget install k6)');
    test.setTimeout(600_000);
    const out = run('k6 run k6/cart-load.js', E2E_DIR, { BASE_URL, CLIENT_EMAIL: CLIENT.email, CLIENT_PASSWORD: CLIENT.password });
    expect(out).toContain('http_req_duration');
  });

  test('TC-125 RNF-03 Carga inicial del frontend (LCP < 3 s)', async ({ page }) => {
    for (const url of ['/', '/catalog']) {
      await page.goto(url, { waitUntil: 'load' });
      const lcp = await page.evaluate(() => new Promise<number>(resolve => {
        let value = 0;
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) value = Math.max(value, entry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(value), 1500);
      }));
      test.info().annotations.push({ type: 'LCP', description: `${url}: ${Math.round(lcp)} ms` });
      expect(lcp, `LCP de ${url}`).toBeLessThan(3000);
    }
  });
});

test.describe('RNF Seguridad', () => {
  test('TC-126 RNF-04 Contraseñas almacenadas con BCrypt', async () => {
    const fresh = await newClient('hash');
    const res = await admin.ctx.get('/api/testing/password-hash-prefix', { params: { email: fresh.email } });
    const body = await res.json();
    expect(body.prefix).toMatch(/^\$2[aby]\$/);
    expect(body.length).toBe(60);
    await fresh.api.dispose();
  });

  test('TC-127 RNF-05 Control de acceso por rol (401 sin token, 403 con token de cliente)', async () => {
    const anon = await Api.anonymous();
    const someId = '00000000-0000-0000-0000-000000000001';
    const adminEndpoints: [string, string][] = [
      ['get', '/api/pricing-rules'],
      ['get', '/api/orders/admin/all'],
      ['get', '/api/orders/admin/stats'],
      ['post', '/api/products'],
      ['post', '/api/categories'],
      ['put', `/api/orders/${someId}/status`],
    ];
    for (const [method, url] of adminEndpoints) {
      const send = (api: Api) => (api.ctx as unknown as Record<string, (u: string, o?: object) => Promise<{ status(): number }>>)[method](url, { data: {} });
      expect((await send(anon)).status(), `${method.toUpperCase()} ${url} sin token`).toBe(401);
      expect((await send(client)).status(), `${method.toUpperCase()} ${url} con token de cliente`).toBe(403);
    }
    await anon.dispose();
  });

  test('TC-128 RNF-06 Vigencia (24 h) e integridad del token JWT', async () => {
    const payload = JSON.parse(Buffer.from(clientSession.token.split('.')[1], 'base64url').toString());
    expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(86_399);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(86_400);

    const parts = clientSession.token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}AAAA`;
    const anon = await Api.anonymous();
    const res = await anon.ctx.get('/api/cart', { headers: { Authorization: `Bearer ${tampered}` } });
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test('TC-129 RNF-07 Resistencia a inyección SQL y XSS', async ({ page }) => {
    const injection = "' OR 1=1 --";
    const api = await client.products({ search: injection });
    expect(api.totalCount).toBe(0);
    await searchCatalog(page, injection);
    await expect(page.getByText('No se encontraron productos')).toBeVisible();

    const xssName = '<script>alert(1)</script>';
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    const created = await admin.ctx.post('/api/products', {
      data: { name: xssName, description: 'Prueba XSS', price: 1000, stock: 1,
        categoryId: (await admin.product(P.NV2)).categoryId, brandId: (await admin.product(P.NV2)).brandId },
    });
    expect(created.ok()).toBeTruthy();
    const product = await created.json();
    await page.goto(`/products/${product.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(xssName);
    expect(dialogs).toEqual([]);
    await admin.ctx.delete(`/api/products/${product.id}`);
  });

  test('TC-130 RNF-08 Comunicación cifrada (HTTP redirige a HTTPS)', async () => {
    test.skip(!BASE_URL.startsWith('https://'), 'Solo aplica al ambiente publicado en Azure (BASE_URL con https)');
    const anon = await Api.anonymous();
    const res = await anon.ctx.get(BASE_URL.replace('https://', 'http://'), { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/^https:\/\//);
    await anon.dispose();
  });

  test('TC-131 RNF-09 Escaneo OWASP ZAP baseline (0 alertas de riesgo alto)', async () => {
    test.skip(!hasCommand('docker'), 'Requiere Docker Desktop para ejecutar OWASP ZAP');
    test.setTimeout(900_000);
    const target = BASE_URL.replace('localhost', 'host.docker.internal');
    // -I: las advertencias (WARN) no fallan; los riesgos altos (FAIL) sí.
    run(`docker run --rm -v "${path.join(E2E_DIR, 'reports')}:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t ${target} -I -r zap-report.html`);
  });

  test('TC-132 RNF-10 Manejo seguro de errores', async () => {
    const anon = await Api.anonymous();
    const responses = [
      await anon.ctx.get('/api/products/no-es-un-guid'),
      await anon.ctx.post('/api/auth/login', { headers: { 'Content-Type': 'application/json' }, data: '{"email": ' }),
      await anon.ctx.get('/api/no-existe'),
    ];
    for (const res of responses) {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
      const text = await res.text();
      for (const leak of ['StackTrace', '   at ', 'Server=', 'Password=', 'Microsoft.Data.SqlClient']) {
        expect(text, `La respuesta no debe exponer "${leak}"`).not.toContain(leak);
      }
    }
    await anon.dispose();
  });
});

test.describe('RNF Usabilidad y compatibilidad', () => {
  test('TC-133 RNF-11 Diseño adaptable en 375, 768 y 1366 px', async ({ page }) => {
    await client.clearCart();
    await client.addToCart(P.NV2, 1);
    await loginAs(page, clientSession);
    for (const width of [375, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      for (const url of ['/', '/catalog', '/cart', '/checkout']) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `Desplazamiento horizontal en ${url} a ${width}px`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('TC-134 RNF-12 Accesibilidad básica (axe-core: 0 violaciones graves o críticas)', async ({ page }) => {
    const mx = await admin.product(P.MX);
    await client.clearCart();
    await client.addToCart(P.MX, 1);
    await loginAs(page, clientSession);
    for (const url of ['/', '/catalog', `/products/${mx.id}`, '/cart']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
      test.info().annotations.push({ type: 'axe', description: `${url}: ${results.violations.length} hallazgos (${serious.length} graves)` });
      expect(serious.map(v => `${v.id}: ${v.help}`), `Violaciones en ${url}`).toEqual([]);
    }
  });

  test('TC-135 RNF-13 Flujo de compra completo @compat', async ({ page }) => {
    const buyer = await newClient('compat');
    await loginWithForm(page, buyer.email, CLIENT.password);
    await expectToast(page, 'Bienvenido');

    await searchCatalog(page, P.MX);
    await productCard(page, P.MX).getByRole('button', { name: 'Agregar al carrito' }).click();
    await expectToast(page, 'Producto agregado al carrito');

    await page.goto('/cart');
    await page.getByLabel('Código de cupón').fill('TECH20');
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expectToast(page, 'Cupón aplicado!');

    await page.getByRole('link', { name: 'Proceder al Checkout' }).click();
    await page.getByLabel('Dirección exacta').fill(TEST_ADDRESS.street);
    await page.getByLabel('Provincia').selectOption('San José');
    await page.getByLabel('Cantón').fill('Escazú');
    await page.getByLabel('Código postal').fill('10201');
    await page.getByRole('button', { name: 'Confirmar Pedido' }).click();
    await expectToast(page, /Pedido TS-.* creado!/);
    await expect(page).toHaveURL(/\/orders$/);
    await buyer.api.dispose();
  });
});

test.describe('RNF Fiabilidad, mantenibilidad y portabilidad', () => {
  test('TC-136 RNF-14 Integridad de cálculos e inventario', async () => {
    const carts: [string, number][][] = [
      [[P.MX, 3]],
      [[P.MX, 1], [P.BW, 1]],
      [[P.G502, 1], [P.BW, 1], [P.CLOUD, 1]],
      [[P.MBA, 1]],
      [[P.FURY, 3], [P.NV2, 2]],
    ];
    for (const items of carts) {
      await client.clearCart();
      let cart = await client.cart();
      for (const [name, qty] of items) cart = await client.addToCart(name, qty);
      const sum = cart.appliedDiscounts.reduce((s, d) => s + d.discountAmount, 0);
      expect(sum, 'El desglose suma el total de descuentos').toBe(cart.totalDiscount);
      expect(cart.totalDiscount).toBeLessThanOrEqual(cart.subtotal);
      expect(cart.total).toBe(cart.subtotal - cart.totalDiscount);
    }

    // Inventario: el pedido descuenta stock y la cancelación lo restaura
    const before = (await admin.product(P.FURY)).stock;
    await client.clearCart();
    await client.addToCart(P.FURY, 2);
    const order = await client.createOrder();
    expect((await admin.product(P.FURY)).stock).toBe(before - 2);
    await client.ctx.put(`/api/orders/${order.id}/cancel`);
    expect((await admin.product(P.FURY)).stock).toBe(before);

    // No se puede vender más del stock disponible
    const tooMany = await client.ctx.post('/api/cart/items', { data: { productId: (await admin.product(P.AGOTADO)).id, quantity: 1 } });
    expect(tooMany.status()).toBe(400);
  });

  test('TC-137 RNF-15 Disponibilidad del servicio (comprobación periódica)', async () => {
    // El monitoreo continuo en producción lo hace una prueba de disponibilidad de
    // Application Insights; aquí se verifica la misma condición en 10 sondeos.
    const anon = await Api.anonymous();
    for (let i = 0; i < 10; i++) {
      const started = Date.now();
      const home = await anon.ctx.get('/');
      const apiRes = await anon.ctx.get('/api/products', { params: { pageSize: 1 } });
      expect(home.status()).toBe(200);
      expect(apiRes.status()).toBe(200);
      expect(Date.now() - started).toBeLessThan(5000);
    }
    await anon.dispose();
  });

  test('TC-138 RNF-16 Respaldo y recuperación de la base de datos (Azure SQL PITR)', async () => {
    test.skip(!process.env.AZURE_SQL_SERVER, 'Requiere variables AZURE_RESOURCE_GROUP, AZURE_SQL_SERVER y AZURE_SQL_DB (ambiente Azure)');
    test.setTimeout(3_600_000);
    run('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/azure/test-restore.ps1', E2E_DIR);
  });

  test('TC-139 RNF-17 Pruebas unitarias del core (dotnet test)', async () => {
    test.setTimeout(300_000);
    const project = path.join(REPO_DIR, 'tests', 'TechStore.Tests', 'TechStore.Tests.csproj');
    const out = run(`dotnet test "${project}"`, REPO_DIR);
    expect(out).toMatch(/Failed:\s+0/);
    expect(out).toMatch(/Passed:\s+28\b/);
  });
});
