const tg = (window as any).Telegram?.WebApp;

function getInitData(): string {
  // انتظر initData يكون جاهز
  const data = tg?.initData;
  if (data && data.length > 10) return data;
  return '';
}

export async function api(path: string, options: RequestInit = {}, _retry = 0): Promise<any> {
  const initData = getInitData();
  
  const headers: Record<string, string> = {
    'x-telegram-init-data': initData || '',
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
  if (data?.code === 'RELOAD' && _retry < 3) {
    await new Promise(r => setTimeout(r, 1000));
    return api(path, options, _retry + 1);
  }
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
    headers: { 'x-telegram-init-data': initData || '' },
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
