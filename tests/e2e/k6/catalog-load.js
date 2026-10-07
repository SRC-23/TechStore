// RNF-01: 20 usuarios concurrentes consultando el catálogo durante 5 minutos.
// Criterio: percentil 95 < 2 s y 0 % de errores. k6 falla (código ≠ 0) si no se cumple.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const searches = ['', 'laptop', 'samsung', 'mouse', 'monitor', 'ssd'];

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '4m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  const term = searches[Math.floor(Math.random() * searches.length)];
  const page = 1 + Math.floor(Math.random() * 3);
  const res = http.get(`${BASE_URL}/api/products?page=${page}&pageSize=12&search=${term}`);
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}
