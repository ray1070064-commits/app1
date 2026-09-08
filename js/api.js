import { CONFIG, hasBackendConfig } from './config.js';

const SESSION_KEY = 'capital-life-api-session-v1';
let sessionToken = sessionStorage.getItem(SESSION_KEY) || '';
let sessionPromise = null;

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

function authHeaders(extra = {}) {
  return {
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    ...extra,
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return null;
}

function normalizeNetworkError(error) {
  if (error?.name === 'AbortError') return new ApiError('連線逾時，請稍後再試。');
  if (error instanceof TypeError) {
    return new ApiError('無法連線到遊戲後端。請重新整理頁面後再試；若持續發生，可能是瀏覽器阻擋跨網域請求。');
  }
  return error;
}

export function clearSession() {
  sessionToken = '';
  sessionStorage.removeItem(SESSION_KEY);
}

export async function ensureSession(force = false) {
  if (!hasBackendConfig()) throw new ApiError('尚未設定遊戲後端。');
  if (!force && sessionToken) return sessionToken;
  if (!force && sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    try {
      // Session creation deliberately uses a simple cross-origin POST: no JSON body,
      // no Content-Type header and no third-party cookies. The returned opaque token
      // is used as Bearer auth for all subsequent API requests.
      const response = await fetch(buildUrl('/session'), {
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new ApiError(payload?.detail || payload?.message || `無法建立遊戲 Session (${response.status})`, response.status, payload);
      }
      const token = String(payload?.session_token || '');
      if (!token) throw new ApiError('後端沒有回傳遊戲 Session。');
      sessionToken = token;
      sessionStorage.setItem(SESSION_KEY, token);
      return token;
    } catch (error) {
      throw normalizeNetworkError(error);
    }
  })();

  try {
    return await sessionPromise;
  } finally {
    sessionPromise = null;
  }
}

async function request(path, options = {}, retryAuth = true) {
  if (!hasBackendConfig()) throw new ApiError('尚未設定遊戲後端。');
  if (path !== '/session') await ensureSession(false);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      // Authentication is Bearer-token based; avoid third-party cookies entirely.
      credentials: 'omit',
      cache: 'no-store',
      ...options,
      headers: authHeaders({
        ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      }),
      signal: controller.signal,
    });

    const payload = await parseResponse(response);
    if (response.status === 401 && retryAuth) {
      clearSession();
      await ensureSession(true);
      return request(path, options, false);
    }
    if (!response.ok) {
      const message = payload?.detail || payload?.message || `請求失敗 (${response.status})`;
      throw new ApiError(message, response.status, payload);
    }
    return payload;
  } catch (error) {
    throw normalizeNetworkError(error);
  } finally {
    clearTimeout(timer);
  }
}

export async function loadStartupConfig() { return request('/startup', { method: 'GET' }); }
export async function loadMarketPanel() { return request('/market', { method: 'GET' }); }
export async function loadLifePanel() { return request('/life', { method: 'GET' }); }
export async function loadFamilyPanel() { return request('/family', { method: 'GET' }); }
export async function loadCompanyPanel() { return request('/company', { method: 'GET' }); }
export async function loadPowerPanel() { return request('/power', { method: 'GET' }); }
export async function loadNewsPanel() { return request('/news', { method: 'GET' }); }
export async function loadPttPanel() { return request('/ptt', { method: 'GET' }); }
export async function loadProgressPanel() { return request('/progress', { method: 'GET' }); }
export async function loadSettlementPanel() { return request('/settlement', { method: 'GET' }); }
export async function loadSaveTools() { return request('/save-tools', { method: 'GET' }); }

export async function exportLegacySave() {
  return request('/legacy-save/export', { method: 'POST' });
}

export async function importLegacySave({ saveCode = null, fileBase64 = null } = {}) {
  return request('/legacy-save/import', {
    method: 'POST',
    body: JSON.stringify({
      save_code: saveCode == null ? null : String(saveCode),
      file_base64: fileBase64 == null ? null : String(fileBase64),
    }),
  });
}

export async function loadGameState(includeUi = false) {
  return request(`/state?include_ui=${includeUi ? 'true' : 'false'}`, { method: 'GET' });
}

export async function loadLegacyUi() { return request('/ui', { method: 'GET' }); }

export async function loadChart(symbol, limit = 365) {
  return request(`/chart/${encodeURIComponent(symbol)}?limit=${encodeURIComponent(limit)}`, { method: 'GET' });
}

export async function sendGameAction(action, payload = {}, options = {}) {
  return request('/action', {
    method: 'POST',
    body: JSON.stringify({
      action,
      payload,
      action_id: crypto.randomUUID(),
      include_ui: Boolean(options.includeUi),
    }),
  });
}

export async function exportEncryptedBrowserSave() { return request('/browser-save/export', { method: 'POST' }); }

export async function importEncryptedBrowserSave(saveCode) {
  return request('/browser-save/import', {
    method: 'POST',
    body: JSON.stringify({ save_code: String(saveCode || '') }),
  });
}

export async function saveGame(slot = 'default') {
  return request('/save', { method: 'POST', body: JSON.stringify({ slot }) });
}

export async function loadSave(slot = 'default') {
  return request(`/save/${encodeURIComponent(slot)}`, { method: 'GET' });
}

export async function healthCheck() {
  if (!hasBackendConfig()) return false;
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL.replace(/\/$/, '')}/health`, {
      credentials: 'omit',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
