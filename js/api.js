import { CONFIG, hasBackendConfig } from './config.js';

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(path) {
  const base = CONFIG.API_BASE_URL.replace(/\/$/, '');
  return `${base}${CONFIG.API_PREFIX}${path}`;
}

async function request(path, options = {}) {
  if (!hasBackendConfig()) {
    throw new ApiError('尚未設定遊戲後端。');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });

    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json();
    }

    if (!response.ok) {
      const message = payload?.detail || payload?.message || `請求失敗 (${response.status})`;
      throw new ApiError(message, response.status, payload);
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('連線逾時，請稍後再試。');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadGameState() {
  return request('/state', { method: 'GET' });
}

export async function sendGameAction(action, payload = {}) {
  return request('/action', {
    method: 'POST',
    body: JSON.stringify({
      action,
      payload,
      action_id: crypto.randomUUID(),
    }),
  });
}

export async function saveGame(slot = 'default') {
  return request('/save', {
    method: 'POST',
    body: JSON.stringify({ slot }),
  });
}

export async function loadSave(slot = 'default') {
  return request(`/save/${encodeURIComponent(slot)}`, { method: 'GET' });
}

export async function healthCheck() {
  if (!hasBackendConfig()) return false;
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL.replace(/\/$/, '')}/health`, {
      credentials: 'include',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
