import { expect, Locator, Page } from '@playwright/test';
import { Session } from './api';

/**
 * Inicia sesión sin pasar por el formulario: guarda el token en localStorage antes
 * de cargar la página (igual que hace la app al iniciar sesión).
 */
export async function loginAs(page: Page, session: Session) {
  await page.addInitScript(s => {
    localStorage.setItem('token', s.token);
    localStorage.setItem('user', JSON.stringify(s.user));
  }, session);
}

/** Inicia sesión usando el formulario (para los casos que prueban el login o el logout). */
export async function loginWithForm(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
}

/** Notificación (react-toastify) con un texto dado. */
export function toast(page: Page, text: string | RegExp): Locator {
  return page.locator('.Toastify__toast').filter({ hasText: text }).first();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(toast(page, text)).toBeVisible();
}

export const productCard = (page: Page, name: string) => page.locator(`[data-testid="product-card"][data-name="${name.replace(/"/g, '\\"')}"]`);
export const cartItem = (page: Page, name: string) => page.locator(`[data-testid="cart-item"][data-name="${name.replace(/"/g, '\\"')}"]`);
export const ruleRow = (page: Page, name: string) => page.locator(`[data-testid="rule-row"][data-name="${name.replace(/"/g, '\\"')}"]`);
export const productRow = (page: Page, name: string) => page.locator(`[data-testid="product-row"][data-name="${name.replace(/"/g, '\\"')}"]`);
export const categoryRow = (page: Page, name: string) => page.locator(`[data-testid="category-row"][data-name="${name.replace(/"/g, '\\"')}"]`);

/** Acepta automáticamente los cuadros de confirmación (window.confirm). */
export function acceptDialogs(page: Page) {
  page.on('dialog', dialog => dialog.accept());
}

/** Abre el catálogo filtrado por búsqueda y espera los resultados. */
export async function searchCatalog(page: Page, term: string) {
  await page.goto(`/catalog?search=${encodeURIComponent(term)}`);
  await expect(page.getByTestId('result-count')).not.toHaveText('Buscando...');
}
