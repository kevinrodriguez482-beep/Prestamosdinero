const STORAGE_KEY = 'prestamos-v1';

export function loadData() {
  if (typeof window === 'undefined') return { prestamos: [], nextId: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { prestamos: [], nextId: 1 };
  } catch { return { prestamos: [], nextId: 1 }; }
}

export function saveData(data) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function formatCOP(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(n);
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function diasRestantes(fechaVence) {
  if (!fechaVence) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(fechaVence + 'T12:00:00');
  return Math.ceil((vence - hoy) / 86400000);
}

export function calcTotal(monto, interes) {
  return (monto || 0) + (monto || 0) * ((interes || 0) / 100);
}
