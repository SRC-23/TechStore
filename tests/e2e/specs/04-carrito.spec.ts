import { expect, test } from '@playwright/test';
import { Api, resetData, Session } from '../helpers/api';
import { CLIENT, crc, P } from '../helpers/data';
import { cartItem, expectToast, loginAs, loginWithForm, productCard, searchCatalog } from '../helpers/ui';

let admin: Api;
let client: Api;
let clientSession: Session;

test.beforeAll(async () => {
  ({ admin, client, clientSession } = await resetData());
});

test.beforeEach(async () => {
  await client.clearCart();
});

test.describe('HU-08 Agregar producto al carrito', () => {
  test('TC-041 Agregar un producto nuevo al carrito (regresión error 500)', async ({ page }) => {
    const serverErrors: string[] = [];
    page.on('response', r => { if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`); });

    const mx = await admin.product(P.MX);
    await loginAs(page, clientSession);
    await page.goto(`/products/${mx.id}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();

    await expectToast(page, 'Producto agregado al carrito');
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await page.getByRole('link', { name: 'Carrito', exact: true }).click();
    await expect(cartItem(page, P.MX).getByTestId('item-qty')).toHaveText('1');
    expect(serverErrors).toEqual([]);
  });

  test('TC-042 Agregar el mismo producto incrementa la cantidad', async ({ page }) => {
    await client.addToCart(P.MX, 1);
    await loginAs(page, clientSession);
    await searchCatalog(page, P.MX);
    await productCard(page, P.MX).getByRole('button', { name: 'Agregar al carrito' }).click();
    await expectToast(page, 'Producto agregado al carrito');

    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    await expect(cartItem(page, P.MX).getByTestId('item-qty')).toHaveText('2');
  });

  test('TC-043 Agregar varias unidades desde el detalle', async ({ page }) => {
    const nv2 = await admin.product(P.NV2);
    await loginAs(page, clientSession);
    await page.goto(`/products/${nv2.id}`);
    await page.getByRole('button', { name: 'Aumentar cantidad' }).click();
    await page.getByRole('button', { name: 'Aumentar cantidad' }).click();
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await expectToast(page, 'Producto agregado al carrito');
    expect((await client.cart()).items.find(i => i.productName === P.NV2)?.quantity).toBe(3);
  });

  test('TC-044 No se puede superar el stock disponible (valor límite)', async ({ page }) => {
    const original = (await admin.product(P.SSD990)).stock;
    await admin.updateProduct(P.SSD990, { stock: 1 });
    try {
      await loginAs(page, clientSession);
      await searchCatalog(page, P.SSD990);
      const button = productCard(page, P.SSD990).getByRole('button', { name: 'Agregar al carrito' });
      await button.click();
      await expectToast(page, 'Producto agregado al carrito');
      await button.click();
      await expectToast(page, 'Stock insuficiente. Disponible: 1');
      expect((await client.cart()).items.find(i => i.productName === P.SSD990)?.quantity).toBe(1);
    } finally {
      await client.clearCart();
      await admin.updateProduct(P.SSD990, { stock: original });
    }
  });

  test('TC-045 La API rechaza cantidad 0', async () => {
    const nv2 = await admin.product(P.NV2);
    const res = await client.ctx.post('/api/cart/items', { data: { productId: nv2.id, quantity: 0 } });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('La cantidad debe ser mayor a 0');
  });

  test('TC-046 La API del carrito exige autenticación', async () => {
    const anon = await Api.anonymous();
    const nv2 = await admin.product(P.NV2);
    const res = await anon.ctx.post('/api/cart/items', { data: { productId: nv2.id, quantity: 1 } });
    expect(res.status()).toBe(401);
    await anon.dispose();
  });
});

test.describe('HU-09 Gestionar carrito', () => {
  test('TC-047 Información mostrada en el carrito', async ({ page }) => {
    const nv2 = await admin.product(P.NV2);
    await client.addToCart(P.NV2, 1);
    await loginAs(page, clientSession);
    await page.goto('/cart');
    const item = cartItem(page, P.NV2);
    await expect(item).toContainText(P.NV2);
    await expect(item).toContainText(nv2.brandName);
    await expect(item).toContainText(`${crc(nv2.price)} c/u`);
    await expect(item.getByTestId('item-qty')).toHaveText('1');
    await expect(page.getByTestId('cart-subtotal')).toHaveText(crc(nv2.price));
    await expect(page.getByTestId('cart-total')).toHaveText(crc(nv2.price));
  });

  test('TC-048 Modificar cantidad y recálculo', async ({ page }) => {
    const nv2 = await admin.product(P.NV2);
    await client.addToCart(P.NV2, 1);
    await loginAs(page, clientSession);
    await page.goto('/cart');
    await cartItem(page, P.NV2).getByRole('button', { name: 'Aumentar cantidad' }).click();
    await expect(cartItem(page, P.NV2).getByTestId('item-qty')).toHaveText('2');
    await expect(page.getByTestId('cart-total')).toHaveText(crc(nv2.price * 2));
  });

  test('TC-049 La cantidad no puede superar el stock desde el carrito', async ({ page }) => {
    const original = (await admin.product(P.SSD990)).stock;
    await admin.updateProduct(P.SSD990, { stock: 2 });
    try {
      await client.addToCart(P.SSD990, 2);
      await loginAs(page, clientSession);
      await page.goto('/cart');
      await expect(cartItem(page, P.SSD990).getByRole('button', { name: 'Aumentar cantidad' })).toBeDisabled();
      await expect(cartItem(page, P.SSD990)).toContainText('Alcanzaste el stock disponible (2).');
    } finally {
      await client.clearCart();
      await admin.updateProduct(P.SSD990, { stock: original });
    }
  });

  test('TC-050 Eliminar un producto del carrito', async ({ page }) => {
    await client.addToCart(P.NV2, 1);
    await loginAs(page, clientSession);
    await page.goto('/cart');
    await cartItem(page, P.NV2).getByRole('button', { name: 'Eliminar' }).click();
    await expectToast(page, 'Producto eliminado del carrito');
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible();
  });

  test('TC-051 El carrito persiste entre sesiones', async ({ page }) => {
    await client.addToCart(P.BW, 1);
    await loginWithForm(page, CLIENT.email, CLIENT.password);
    await expect(page.getByTestId('cart-count')).toHaveText('1');

    await page.getByTestId('user-menu').click();
    await page.getByRole('menu').getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();

    await loginWithForm(page, CLIENT.email, CLIENT.password);
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await page.goto('/cart');
    await expect(cartItem(page, P.BW).getByTestId('item-qty')).toHaveText('1');
  });
});
