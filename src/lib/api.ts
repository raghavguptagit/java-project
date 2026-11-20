const TOKEN_KEY = 'societysync_token';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function statusColorClass(status: string): string {
  switch (status) {
    case 'PAID':
    case 'VERIFIED':
    case 'CONFIRMED':
    case 'APPROVED':
    case 'RESOLVED':
    case 'CLOSED':
    case 'OCCUPIED':
    case 'CHECKED_OUT':
    case 'PUBLISHED':
      return 'text-emerald-700';
    case 'OVERDUE':
    case 'REJECTED':
    case 'DENIED':
    case 'URGENT':
    case 'CANCELLED':
    case 'REVOKED':
      return 'text-rose-700';
    case 'PENDING_VERIFICATION':
    case 'PARTIALLY_PAID':
    case 'REQUESTED':
    case 'SUBMITTED':
    case 'AWAITING_APPROVAL':
    case 'IN_PROGRESS':
    case 'HIGH':
    case 'CHECKED_IN':
      return 'text-amber-700';
    default:
      return 'text-slate-600';
  }
}

export function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}
