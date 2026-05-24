const tg = (window as any).Telegram?.WebApp;

function getInitData(): string {
  // انتظر initData يكون جاهز
  const data = tg?.initData;
  if (data && data.length > 10) return data;
  return '';
}

let retryCount = 0;

export async function api(path: string, options: RequestInit = {}): Promise<any> {
  const initData = getInitData();
  
  const headers: Record<string, string> = {
    'x-telegram-init-data': initData || 'empty',
  };
  
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as any || {}) }
  });
  
  const data = await res.json();
  
  // إذا initData مش جاهز بعد، انتظر وأعد المحاولة
  if (data?.code === 'RELOAD' && retryCount < 3) {
    retryCount++;
    await new Promise(r => setTimeout(r, 1000));
    return api(path, options);
  }
  
  retryCount = 0;
  if (!res.ok) throw new Error(data.error || 'خطأ في الطلب');
  return data;
}

export const apiGet    = (path: string)            => api(path);
export const apiPost   = (path: string, body: any) => api(path, { method: 'POST',   body: JSON.stringify(body) });
export const apiPut    = (path: string, body: any) => api(path, { method: 'PUT',    body: JSON.stringify(body) });
export const apiDelete = (path: string)            => api(path, { method: 'DELETE' });

export async function apiForm(path: string, formData: FormData, method = 'POST') {
  const initData = getInitData();
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: { 'x-telegram-init-data': initData || 'empty' },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'خطأ في الرفع');
  return data;
}

export function getTgUser() {
  try {
    return tg?.initDataUnsafe?.user || null;
  } catch { return null; }
}

export function haptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  tg?.HapticFeedback?.impactOccurred(type);
}

// ── Extra methods ────────────────────────────────────────────
export async function apiPut(path: string, body: any = {}): Promise<any> {
  const res = await fetch(`/api${path}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'خطأ');
  return data;
}
export async function apiDelete(path: string): Promise<any> {
  const res = await fetch(`/api${path}`, { method: 'DELETE', headers: getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'خطأ');
  return data;
}
