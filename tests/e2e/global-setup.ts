import { request } from '@playwright/test';

/** Verifica que la API esté arriba y que el modo de pruebas esté activo antes de empezar. */
export default async function globalSetup() {
  const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';
  const ctx = await request.newContext({ baseURL });

  let lastError = '';
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await ctx.get('/api/products?pageSize=1');
      if (res.ok()) break;
      lastError = `HTTP ${res.status()}`;
    } catch (err) {
      lastError = String(err);
    }
    await new Promise(r => setTimeout(r, 2000));
    if (attempt === 29) {
      throw new Error(`La API no responde en ${baseURL}/api (${lastError}). ¿Están corriendo "dotnet run" y "npm run dev"?`);
    }
  }

  // La prueba de humo corre contra producción: nunca se restablecen los datos.
  if (process.argv.join(' ').includes('@smoke')) {
    await ctx.dispose();
    return;
  }

  const reset = await ctx.post('/api/testing/reset');
  if (reset.status() === 404) {
    throw new Error('El endpoint /api/testing/reset no está habilitado. Activa "Testing:Enabled": true (appsettings.Development.json o variable Testing__Enabled).');
  }
  if (!reset.ok()) {
    throw new Error(`No se pudo restablecer la base de datos: HTTP ${reset.status()} ${await reset.text()}`);
  }
  await ctx.dispose();
}
