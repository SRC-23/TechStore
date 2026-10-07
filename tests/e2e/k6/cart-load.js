// RNF-02: 10 usuarios autenticados agregando productos al carrito durante 3 minutos.
// Criterio: percentil 95 < 1 s y respuestas correctas del motor de precios.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const VUS = 10;

export const options = {
  vus: VUS,
  duration: '3m',
  thresholds: {
    'http_req_duration{name:addItem}': ['p(95)<1000'],
    checks: ['rate==1'],
  },
};

const json = { headers: { 'Content-Type': 'application/json' } };

// Cada usuario virtual tiene su propia cuenta para no compartir carrito.
export function setup() {
  const stamp = Date.now();
  const tokens = [];
  for (let i = 0; i < VUS; i++) {
    const email = `k6.${stamp}.${i}@test.com`;
    const body = JSON.stringify({ firstName: 'K6', lastName: `Usuario${i}`, email, password: 'Prueba123', confirmPassword: 'Prueba123' });
    const res = http.post(`${BASE_URL}/api/auth/register`, body, json);
    tokens.push(res.json('token'));
  }
  const products = http.get(`${BASE_URL}/api/products?pageSize=40&inStock=true`).json('products')
    .filter(p => p.stock > 5)
    .map(p => p.id);
  return { tokens, products };
}

export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  const auth = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
  const productId = data.products[Math.floor(Math.random() * data.products.length)];

  const res = http.post(`${BASE_URL}/api/cart/items`, JSON.stringify({ productId, quantity: 1 }), { ...auth, tags: { name: 'addItem' } });
  check(res, {
    'status 200': r => r.status === 200,
    'total = subtotal - descuentos': r => {
      const c = r.json();
      return c && Math.abs(c.total - (c.subtotal - c.totalDiscount)) < 0.01;
    },
  });

  // Vacía el carrito cada cierto tiempo para no agotar el stock
  if (Math.random() < 0.3) {
    const cart = http.get(`${BASE_URL}/api/cart`, auth).json();
    for (const item of cart.items || []) http.del(`${BASE_URL}/api/cart/items/${item.id}`, null, auth);
  }
  sleep(1);
}
