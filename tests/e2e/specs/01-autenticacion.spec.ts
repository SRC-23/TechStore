import { expect, test } from '@playwright/test';
import { Api, resetData, Session } from '../helpers/api';
import { ADMIN, CLIENT } from '../helpers/data';
import { expectToast, loginAs, loginWithForm } from '../helpers/ui';

let clientSession: Session;

test.beforeAll(async () => {
  ({ clientSession } = await resetData());
});

test.describe('HU-01 Registro de cliente', () => {
  const fillRegister = async (page: import('@playwright/test').Page, email: string, password: string, confirm = password) => {
    await page.goto('/register');
    await page.getByLabel('Nombre').fill('Ana');
    await page.getByLabel('Apellido').fill('Pérez');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByLabel('Confirmar Contraseña').fill(confirm);
  };

  test('TC-001 Registro con datos válidos', async ({ page }) => {
    await fillRegister(page, 'ana.qa01@test.com', 'Prueba123');
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();

    await expectToast(page, 'Cuenta creada exitosamente!');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('user-menu')).toContainText('Ana');

    const api = await Api.anonymous();
    const session = await api.login('ana.qa01@test.com', 'Prueba123');
    expect(session.user.role).toBe('Client');
    await api.dispose();
  });

  test('TC-002 No permite registrar un email existente', async ({ page }) => {
    await fillRegister(page, ADMIN.email, 'Prueba123');
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();
    await expectToast(page, 'El email ya está registrado');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('TC-003 Longitud mínima de contraseña (7 caracteres)', async ({ page }) => {
    await fillRegister(page, 'corta@test.com', 'Prueba1');
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();
    await expectToast(page, 'La contraseña debe tener al menos 8 caracteres');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('TC-004 La confirmación de contraseña debe coincidir', async ({ page }) => {
    await fillRegister(page, 'distinta@test.com', 'Prueba123', 'Prueba124');
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();
    await expectToast(page, 'Las contraseñas no coinciden');
  });

  test('TC-005 Política de complejidad (mayúscula y número)', async ({ page }) => {
    await fillRegister(page, 'debil@test.com', 'pruebaqa1');
    const rule = page.locator('li', { hasText: 'Una letra mayúscula' });
    await expect(rule).toHaveClass(/text-gray-500/); // requisito sin cumplir
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();
    await expectToast(page, 'La contraseña debe incluir al menos una mayúscula y un número');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('TC-006 La API también valida la política de contraseña', async () => {
    const api = await Api.anonymous();
    const res = await api.ctx.post('/api/auth/register', {
      data: { firstName: 'Api', lastName: 'Test', email: 'api.debil@test.com', password: 'abcdefgh', confirmPassword: 'abcdefgh' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número');
    await api.dispose();
  });

  test('TC-007 Los campos obligatorios no pueden quedar vacíos', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();
    await expect(page).toHaveURL(/\/register$/);
    const missing = await page.getByLabel('Nombre').evaluate(el => (el as HTMLInputElement).validity.valueMissing);
    expect(missing).toBe(true);
  });
});

test.describe('HU-02 Inicio de sesión', () => {
  test('TC-008 Inicio de sesión del administrador', async ({ page }) => {
    await loginWithForm(page, ADMIN.email, ADMIN.password);
    await expectToast(page, `Bienvenido, ${ADMIN.firstName}!`);
    await expect(page).toHaveURL(/\/$/);
    await page.getByTestId('user-menu').click();
    await expect(page.getByRole('menu').getByRole('link', { name: 'Admin' })).toBeVisible();
  });

  test('TC-009 Mensaje genérico con contraseña incorrecta', async ({ page }) => {
    await loginWithForm(page, ADMIN.email, 'Incorrecta1');
    await expectToast(page, 'Email o contraseña incorrectos');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('TC-010 Mensaje genérico con email no registrado', async ({ page }) => {
    await loginWithForm(page, 'noexiste@test.com', 'Prueba123');
    await expectToast(page, 'Email o contraseña incorrectos');
  });

  test('TC-011 Cierre de sesión', async ({ page }) => {
    await loginWithForm(page, CLIENT.email, CLIENT.password);
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await page.getByTestId('user-menu').click();
    await page.getByRole('menu').getByRole('button', { name: 'Salir' }).click();

    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC-012 Un cliente no puede acceder al panel de administración', async ({ page }) => {
    await loginAs(page, clientSession);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    await page.getByTestId('user-menu').click();
    await expect(page.getByRole('menu').getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });

  test('TC-013 El token JWT expira a las 24 horas', async () => {
    const payload = JSON.parse(Buffer.from(clientSession.token.split('.')[1], 'base64url').toString());
    const lifetime = payload.exp - payload.iat;
    expect(lifetime).toBeGreaterThanOrEqual(86_399);
    expect(lifetime).toBeLessThanOrEqual(86_400);
  });
});
