/** Formato de colones costarricenses sin decimales: ₡549 900 */
export function formatCRC(value: number | null | undefined): string {
  const n = Math.round(value ?? 0);
  const grouped = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}₡${grouped}`;
}

export function formatDate(value: string | Date, withTime = false): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('es-CR', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Las especificaciones se guardan como JSON {"clave": "valor"}; si no lo son, se muestran como texto. */
export function parseSpecs(specs?: string | null): [string, string][] {
  if (!specs) return [];
  try {
    const parsed = JSON.parse(specs);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([k, v]) => [k, String(v)]);
    }
  } catch {
    // texto libre
  }
  return [['Detalle', specs]];
}

/** ImageUrls admite varias URLs separadas por saltos de línea o comas. */
export function parseImages(imageUrls?: string | null): string[] {
  if (!imageUrls) return [];
  return imageUrls.split(/[\n\r,]+/).map(u => u.trim()).filter(Boolean);
}

/** Mensaje de error legible a partir de una respuesta de la API. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (first?.length) return first[0];
  }
  return fallback;
}

/** Política de contraseñas (HU-01): 8+ caracteres, una mayúscula y un número. */
export const passwordRules = [
  { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un número', test: (p: string) => /\d/.test(p) },
];

export const isStrongPassword = (p: string) => passwordRules.every(r => r.test(p));

export const PROVINCIAS = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

export const statusLabels: Record<string, string> = {
  Pending: 'Pendiente',
  Confirmed: 'Confirmado',
  Shipped: 'Enviado',
  Delivered: 'Entregado',
  Cancelled: 'Cancelado',
};

export const statusStyles: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
  Shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
};
