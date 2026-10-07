/** Datos de prueba compartidos (coinciden con los datos semilla de catalog.py / SeedData.cs). */

export const ADMIN = { email: 'admin@techstore.com', password: 'Admin123!', firstName: 'Alfredo' };
export const CLIENT = { email: 'cliente.qa@test.com', password: 'Prueba123', firstName: 'Cliente', lastName: 'QA' };

export const P = {
  MX: 'Logitech MX Master 3S',
  BW: 'Razer BlackWidow V4',
  G502: 'Logitech G502 HERO',
  CLOUD: 'HyperX Cloud II',
  FURY: 'Kingston Fury Beast 32GB DDR5',
  NV2: 'Kingston NV2 1TB NVMe',
  SSD990: 'Samsung 990 Pro 1TB NVMe',
  MBA: 'Apple MacBook Air 13 M2',
  S24: 'Samsung Galaxy S24 Ultra 256GB',
  IDEAPAD: 'Lenovo IdeaPad Slim 3 15',
  ROG: 'ASUS ROG Strix G16',
  HP15: 'HP 15 fd0000',
  JBL: 'JBL Flip 6',
  PROART: 'ASUS ProArt PA278QV 27"',
  AGOTADO: 'AMD Ryzen 7 7800X3D',
  CORSAIR_HS: 'Corsair HS80 RGB Wireless',
};

export const RULES = {
  TECH20: 'Cupón TECH20',
  PERIFERICOS: '10 % en Periféricos',
  FIXED: '₡25 000 en compras desde ₡300 000',
  VOLUME: '15 % llevando 3 o más',
  SEASON: 'Temporada de Laptops',
  COMBO: 'Combo Gamer',
  FLASH: 'Oferta Relámpago',
};

export const SEED_RULE_NAMES = Object.values(RULES);

/** Mismo formato que el frontend: ₡549 900 */
export function crc(value: number): string {
  const n = Math.round(value);
  return `${n < 0 ? '-' : ''}₡${Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

/** Descuento porcentual redondeado a colones (igual que el motor: mitad hacia arriba). */
export function pct(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

export const isoDaysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/** yyyy-mm-dd en hora local, para inputs type="date". */
export function localDate(daysFromToday = 0): string {
  const d = new Date(Date.now() + daysFromToday * 86_400_000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}${Math.floor(Math.random() * 1000)}@test.com`;
