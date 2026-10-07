import { APIRequestContext, APIResponse, expect, request } from '@playwright/test';
import { ADMIN, CLIENT } from './data';

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

export interface Session {
  token: string;
  user: { id: string; firstName: string; lastName: string; email: string; role: string };
}

export interface Product {
  id: string; name: string; description: string; specifications?: string | null; price: number; stock: number;
  categoryId: string; categoryName: string; brandId: string; brandName: string; imageUrls?: string | null;
  isActive: boolean; discountedPrice?: number | null; discountPercentage?: number | null; isOnSale: boolean;
}

export interface Rule {
  id: string; name: string; description?: string | null; type: string; value: number; isPercentage: boolean;
  couponCode?: string | null; priority: number; isStackable: boolean; startDate: string; endDate: string;
  minimumAmount?: number | null; minimumQuantity?: number | null; maxUses?: number | null; isActive: boolean;
  timesUsed: number; productIds: string[]; categoryIds: string[];
}

export interface Cart {
  id: string; couponCode?: string | null; subtotal: number; totalDiscount: number; total: number;
  items: { id: string; productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number; stock: number }[];
  appliedDiscounts: { ruleName: string; description: string; discountAmount: number }[];
}

export interface Order {
  id: string; orderNumber: string; status: string; subtotal: number; totalDiscount: number; total: number; createdAt: string;
  customerEmail?: string | null; shippingAddress?: { street: string; city: string; state: string; zipCode: string } | null;
  items: { productId: string; productName: string; quantity: number }[];
  appliedDiscounts: { description: string; discountAmount: number }[];
}

export const TEST_ADDRESS = {
  street: '100 m norte del parque central, casa 12',
  city: 'Belén',
  state: 'Heredia',
  zipCode: '40701',
  country: 'Costa Rica',
};

async function json<T>(res: APIResponse, what: string): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${what} falló: HTTP ${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Cliente HTTP de la API de TechStore con el token de una sesión (o anónimo). */
export class Api {
  private constructor(public readonly ctx: APIRequestContext, public readonly session?: Session) {}

  static async anonymous(): Promise<Api> {
    return new Api(await request.newContext({ baseURL: BASE_URL }));
  }

  static async as(session: Session): Promise<Api> {
    const ctx = await request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { Authorization: `Bearer ${session.token}` } });
    return new Api(ctx, session);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  // ---------- Autenticación ----------
  async login(email: string, password: string): Promise<Session> {
    return json<Session>(await this.ctx.post('/api/auth/login', { data: { email, password } }), `Login ${email}`);
  }

  async register(email: string, password = CLIENT.password, firstName = CLIENT.firstName, lastName = CLIENT.lastName): Promise<Session> {
    return json<Session>(await this.ctx.post('/api/auth/register', {
      data: { firstName, lastName, email, password, confirmPassword: password },
    }), `Registro ${email}`);
  }

  // ---------- Productos ----------
  async products(params: Record<string, string | number | boolean> = {}): Promise<{ products: Product[]; totalCount: number }> {
    return json(await this.ctx.get('/api/products', { params: { pageSize: 200, ...params } }), 'Listar productos');
  }

  async product(name: string): Promise<Product> {
    const { products } = await this.products({ search: name, includeInactive: true });
    const found = products.find(p => p.name === name);
    if (!found) throw new Error(`No existe el producto "${name}"`);
    return found;
  }

  async updateProduct(name: string, changes: Partial<Product>): Promise<Product> {
    const p = await this.product(name);
    const body = {
      name: p.name, description: p.description, specifications: p.specifications ?? null, price: p.price, stock: p.stock,
      categoryId: p.categoryId, brandId: p.brandId, imageUrls: p.imageUrls ?? null, isActive: p.isActive, ...changes,
    };
    return json<Product>(await this.ctx.put(`/api/products/${p.id}`, { data: body }), `Actualizar producto ${name}`);
  }

  async deactivateProduct(name: string) {
    const p = await this.product(name);
    expect((await this.ctx.delete(`/api/products/${p.id}`)).ok()).toBeTruthy();
  }

  // ---------- Reglas ----------
  async rules(): Promise<Rule[]> {
    return json<Rule[]>(await this.ctx.get('/api/pricing-rules'), 'Listar reglas');
  }

  async rule(name: string): Promise<Rule> {
    const r = (await this.rules()).find(x => x.name === name);
    if (!r) throw new Error(`No existe la regla "${name}"`);
    return r;
  }

  private ruleBody(r: Partial<Rule>) {
    return {
      name: r.name, description: r.description ?? null, type: r.type, value: r.value, isPercentage: r.isPercentage ?? true,
      couponCode: r.couponCode ?? null, priority: r.priority, isStackable: r.isStackable ?? true,
      startDate: r.startDate ?? new Date(Date.now() - 86_400_000).toISOString(),
      endDate: r.endDate ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
      minimumAmount: r.minimumAmount ?? null, minimumQuantity: r.minimumQuantity ?? null, maxUses: r.maxUses ?? null,
      productIds: r.productIds ?? [], categoryIds: r.categoryIds ?? [],
    };
  }

  async createRule(r: Partial<Rule>): Promise<Rule> {
    return json<Rule>(await this.ctx.post('/api/pricing-rules', { data: this.ruleBody(r) }), `Crear regla ${r.name}`);
  }

  async updateRule(name: string, changes: Partial<Rule>): Promise<Rule> {
    const r = await this.rule(name);
    return json<Rule>(await this.ctx.put(`/api/pricing-rules/${r.id}`, { data: this.ruleBody({ ...r, ...changes }) }), `Actualizar regla ${name}`);
  }

  async setRuleActive(name: string, active: boolean) {
    const r = await this.rule(name);
    if (r.isActive !== active) expect((await this.ctx.put(`/api/pricing-rules/${r.id}/toggle`)).ok()).toBeTruthy();
  }

  // ---------- Categorías ----------
  async categories(includeInactive = true): Promise<{ id: string; name: string; parentId?: string | null; isActive: boolean; subCategories: { id: string; name: string }[] }[]> {
    return json(await this.ctx.get('/api/categories', { params: includeInactive ? { includeInactive: true } : {} }), 'Listar categorías');
  }

  async categoryId(name: string): Promise<string> {
    const flat = (await this.categories()).flatMap(c => [c, ...c.subCategories]);
    const found = flat.find(c => c.name === name);
    if (!found) throw new Error(`No existe la categoría "${name}"`);
    return found.id;
  }

  // ---------- Carrito ----------
  async cart(): Promise<Cart> {
    return json<Cart>(await this.ctx.get('/api/cart'), 'Obtener carrito');
  }

  /** Deja el carrito vacío y sin cupón. */
  async clearCart() {
    const cart = await this.cart();
    for (const item of cart.items) await this.ctx.delete(`/api/cart/items/${item.id}`);
    if (cart.couponCode) await this.ctx.delete('/api/cart/remove-coupon');
  }

  async addToCart(productName: string, quantity = 1, admin?: Api): Promise<Cart> {
    const p = await (admin ?? this).product(productName);
    return json<Cart>(await this.ctx.post('/api/cart/items', { data: { productId: p.id, quantity } }), `Agregar ${productName}`);
  }

  async applyCoupon(code: string): Promise<Cart> {
    return json<Cart>(await this.ctx.post('/api/cart/apply-coupon', { data: { couponCode: code } }), `Aplicar cupón ${code}`);
  }

  // ---------- Pedidos ----------
  async createOrder(data: Record<string, unknown> = TEST_ADDRESS): Promise<Order> {
    return json<Order>(await this.ctx.post('/api/orders', { data }), 'Crear pedido');
  }

  async myOrders(): Promise<Order[]> {
    return json<Order[]>(await this.ctx.get('/api/orders'), 'Mis pedidos');
  }

  async setOrderStatus(orderId: string, status: string): Promise<Order> {
    return json<Order>(await this.ctx.put(`/api/orders/${orderId}/status`, { data: { status } }), `Estado ${status}`);
  }

  async stats(): Promise<Record<string, unknown> & { salesToday: number; salesWeek: number; salesMonth: number; averageOrderValue: number; cancelledOrders: number }> {
    return json(await this.ctx.get('/api/orders/admin/stats'), 'Estadísticas');
  }

  // ---------- Direcciones ----------
  async addresses(): Promise<{ id: string; label?: string | null; street: string; isDefault: boolean }[]> {
    return json(await this.ctx.get('/api/users/me/addresses'), 'Direcciones');
  }

  async addAddress(label: string, isDefault = false) {
    return json(await this.ctx.post('/api/users/me/addresses', { data: { ...TEST_ADDRESS, label, isDefault, street: `${TEST_ADDRESS.street} (${label})` } }), 'Agregar dirección');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    expect((await this.ctx.put('/api/users/me/password', { data: { currentPassword, newPassword } })).ok()).toBeTruthy();
  }

  // ---------- Modo pruebas ----------
  async setOrderDaysAgo(orderId: string, daysAgo: number) {
    expect((await this.ctx.put(`/api/testing/orders/${orderId}/created-at`, { params: { daysAgo } })).ok()).toBeTruthy();
  }
}

/** Restablece los datos semilla y crea el cliente de prueba. Se usa en el beforeAll de cada archivo. */
export async function resetData(): Promise<{ admin: Api; client: Api; adminSession: Session; clientSession: Session }> {
  const anon = await Api.anonymous();
  const res = await anon.ctx.post('/api/testing/reset');
  if (!res.ok()) throw new Error(`Reset falló: HTTP ${res.status()} ${await res.text()}`);

  const adminSession = await anon.login(ADMIN.email, ADMIN.password);
  const clientSession = await anon.register(CLIENT.email);
  await anon.dispose();

  return {
    admin: await Api.as(adminSession),
    client: await Api.as(clientSession),
    adminSession,
    clientSession,
  };
}

/** Registra un cliente nuevo (para escenarios que requieren un usuario "limpio"). */
export async function newClient(prefix: string): Promise<{ api: Api; session: Session; email: string }> {
  const anon = await Api.anonymous();
  const email = `${prefix}.${Date.now()}${Math.floor(Math.random() * 1000)}@test.com`;
  const session = await anon.register(email);
  await anon.dispose();
  return { api: await Api.as(session), session, email };
}
