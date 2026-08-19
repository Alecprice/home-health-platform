const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

export async function apiGet<T>(path: string, timeoutMs = 10_000): Promise<T> {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${safePath}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) throw new Error('API returned an unexpected content type.');
    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('API request timed out.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
