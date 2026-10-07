import { expect, test } from '@playwright/test';
import { Api, newClient, resetData, Session } from '../helpers/api';
import { CLIENT } from '../helpers/data';
import { acceptDialogs, expectToast, loginAs } from '../helpers/ui';

let client: Api;
let clientSession: Session;

test.beforeAll(async () => {
  ({ client, clientSession } = await resetData());
});

test.describe('HU-03 Gestión de perfil', () => {
  test('TC-014 Editar nombre, apellido y teléfono', async ({ page }) => {
    await loginAs(page, clientSession);
    await page.goto('/profile');
    await page.getByLabel('Nombre').fill('Carlos');
    await page.getByLabel('Teléfono').fill('8888-0000');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expectToast(page, 'Perfil actualizado');
    await expect(page.getByTestId('user-menu')).toContainText('Carlos');

    // Tras recargar, los datos vienen de la API (persistidos en la base de datos)
    await page.reload();
    await expect(page.getByLabel('Nombre')).toHaveValue('Carlos');
    await expect(page.getByLabel('Teléfono')).toHaveValue('8888-0000');
  });

  test('TC-015 El email no es editable', async ({ page }) => {
    await loginAs(page, clientSession);
    await page.goto('/profile');
    await expect(page.getByLabel('Email')).toBeDisabled();
    await expect(page.getByText('El email es tu identificador y no se puede cambiar.')).toBeVisible();
  });

  test('TC-016 Agregar una dirección de envío', async ({ page }) => {
    const fresh = await newClient('direccion');
    await loginAs(page, fresh.session);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Direcciones' }).click();
    await page.getByRole('button', { name: 'Agregar dirección' }).click();
    await page.getByLabel('Nombre de la dirección').fill('Casa');
    await page.getByLabel('Dirección exacta').fill('100 m norte del parque');
    await page.getByLabel('Provincia').selectOption('Heredia');
    await page.getByLabel('Cantón').fill('Belén');
    await page.getByLabel('Código postal').fill('40701');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();

    await expectToast(page, 'Dirección guardada');
    const card = page.locator('li', { hasText: '100 m norte del parque' });
    await expect(card).toContainText('Casa');
    await expect(card).toContainText('Principal');
    await fresh.api.dispose();
  });

  test('TC-017 Editar y eliminar una dirección', async ({ page }) => {
    const fresh = await newClient('direcciones');
    await fresh.api.addAddress('Casa', true);
    await fresh.api.addAddress('Oficina');
    acceptDialogs(page);
    await loginAs(page, fresh.session);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Direcciones' }).click();

    await page.locator('li', { hasText: '(Oficina)' }).getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Usar como dirección principal').check();
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expectToast(page, 'Dirección guardada');
    await expect(page.locator('li', { hasText: '(Oficina)' })).toContainText('Principal');

    await page.locator('li', { hasText: '(Casa)' }).getByRole('button', { name: 'Eliminar' }).click();
    await expectToast(page, 'Dirección eliminada');
    await expect(page.locator('li', { hasText: '(Casa)' })).toHaveCount(0);
    await fresh.api.dispose();
  });

  test('TC-018 Cambio de contraseña', async ({ page }) => {
    await loginAs(page, clientSession);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Seguridad' }).click();
    await page.getByLabel('Contraseña actual').fill(CLIENT.password);
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva1234');
    await page.getByLabel('Confirmar nueva contraseña').fill('Nueva1234');
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
    await expectToast(page, 'Contraseña actualizada');

    const anon = await Api.anonymous();
    expect((await anon.ctx.post('/api/auth/login', { data: { email: CLIENT.email, password: CLIENT.password } })).status()).toBe(401);
    await anon.login(CLIENT.email, 'Nueva1234');
    await anon.dispose();

    // Restaura la contraseña original para el resto de pruebas
    await client.changePassword('Nueva1234', CLIENT.password);
  });

  test('TC-019 Rechazo con contraseña actual incorrecta', async ({ page }) => {
    await loginAs(page, clientSession);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Seguridad' }).click();
    await page.getByLabel('Contraseña actual').fill('Incorrecta1');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva1234');
    await page.getByLabel('Confirmar nueva contraseña').fill('Nueva1234');
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
    await expectToast(page, 'La contraseña actual es incorrecta');
  });
});
