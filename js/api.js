import { CONFIG, hasBackendConfig } from './config.js';

const SESSION_KEY = 'capital-life-api-session-v1';
const LOADING_DELAY_MS = 5000;
let sessionToken = sessionStorage.getItem(SESSION_KEY) || '';
let sessionPromise = null;
let loadingDepth = 0;

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

function beginLoading(title, detail = '') {
  if (!title) return;
  loadingDepth += 1;
  const root = document.getElementById('global-loading');
  if (!root) return;
  const titleNode = document.getElementById('global-loading-title');
  const detailNode = document.getElementById('global-loading-detail');
  if (titleNode) titleNode.textContent = title;
  if (detailNode) detailNode.textContent = detail || '遊戲核心正在運算，請稍候。';
  root.classList.add('is-visible');
  root.setAttribute('aria-hidden', 'false');
}

function endLoading(title) {
  if (!title) return;
  loadingDepth = Math.max(0, loadingDepth - 1);
  if (loadingDepth > 0) return;
  const root = document.getElementById('global-loading');
  if (!root) return;
  root.classList.remove('is-visible');
  root.setAttribute('aria-hidden', 'true');
}

function advanceTimeout(days) {
  if (days >= 365) return 300000;
  if (days >= 180) return 180000;
  if (days >= 30) return 120000;
  if (days >= 7) return 90000;
  return 60000;
}

function actionRequestMeta(action, payload = {}, options = {}) {
  if (Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0) {
    return {
      timeoutMs: Number(options.timeoutMs),
      loadingLabel: String(options.loadingLabel || ''),
      loadingDetail: String(options.loadingDetail || ''),
    };
  }

  if (action === 'advance_time') {
    const days = Math.max(1, Number(payload.days || 1));
    const label = days >= 365 ? '正在推進 1 年…' : days >= 180 ? '正在推進半年…' : `正在推進 ${days} 天…`;
    return {
      timeoutMs: advanceTimeout(days),
      loadingLabel: label,
      loadingDetail: '市場、人生、家庭與公司系統正在逐日運算，請不要關閉頁面。',
    };
  }
  if (action === 'new_game') {
    return { timeoutMs: 120000, loadingLabel: '正在建立新人生…', loadingDetail: '正在生成市場、角色與初始世界狀態。' };
  }
  if (action === 'trade') {
    return { timeoutMs: 60000, loadingLabel: '正在送出委託…', loadingDetail: '後端正在驗證價格、資金與持倉。' };
  }
  if (action.startsWith('company_') || action.startsWith('life_') || action.startsWith('family_') || action.startsWith('politics_') || action.startsWith('underworld_') || action.startsWith('insider_')) {
    return { timeoutMs: 60000, loadingLabel: '正在處理決策…', loadingDetail: '遊戲核心正在計算這次選擇的結果。' };
  }
  if (action.startsWith('settlement_')) {
    return { timeoutMs: 90000, loadingLabel: '正在處理結算…', loadingDetail: '正在整理最終資產與人生評級。' };
  }
  return { timeoutMs: CONFIG.REQUEST_TIMEOUT_MS, loadingLabel: '', loadingDetail: '' };
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

  const {
    timeoutMs = CONFIG.REQUEST_TIMEOUT_MS,
    loadingLabel = '',
    loadingDetail = '',
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || CONFIG.REQUEST_TIMEOUT_MS));
  let loadingStarted = false;
  const loadingTimer = loadingLabel
    ? window.setTimeout(() => {
        loadingStarted = true;
        beginLoading(loadingLabel, loadingDetail);
      }, LOADING_DELAY_MS)
    : null;

  try {
    const response = await fetch(buildUrl(path), {
      credentials: 'omit',
      cache: 'no-store',
      ...fetchOptions,
      headers: authHeaders({
        ...(fetchOptions.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(fetchOptions.headers || {}),
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
    if (loadingTimer != null) window.clearTimeout(loadingTimer);
    if (loadingStarted) endLoading(loadingLabel);
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
  return request('/legacy-save/export', { method: 'POST', loadingLabel: '正在匯出舊版存檔…' });
}

export async function importLegacySave({ saveCode = null, fileBase64 = null } = {}) {
  return request('/legacy-save/import', {
    method: 'POST',
    timeoutMs: 90000,
    loadingLabel: '正在匯入舊版存檔…',
    loadingDetail: '後端正在解析並轉換舊版本資料。',
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
  const meta = actionRequestMeta(action, payload, options);
  return request('/action', {
    method: 'POST',
    timeoutMs: meta.timeoutMs,
    loadingLabel: meta.loadingLabel,
    loadingDetail: meta.loadingDetail,
    body: JSON.stringify({
      action,
      payload,
      action_id: crypto.randomUUID(),
      include_ui: Boolean(options.includeUi),
    }),
  });
}

export async function exportEncryptedBrowserSave() {
  return request('/browser-save/export', { method: 'POST', loadingLabel: '正在加密儲存…' });
}

export async function importEncryptedBrowserSave(saveCode) {
  return request('/browser-save/import', {
    method: 'POST',
    timeoutMs: 90000,
    loadingLabel: '正在載入存檔…',
    loadingDetail: '正在驗證並恢復這台瀏覽器的加密進度。',
    body: JSON.stringify({ save_code: String(saveCode || '') }),
  });
}

export async function saveGame(slot = 'default') {
  return request('/save', { method: 'POST', loadingLabel: '正在儲存…', body: JSON.stringify({ slot }) });
}

export async function loadSave(slot = 'default') {
  return request(`/save/${encodeURIComponent(slot)}`, { method: 'GET', loadingLabel: '正在載入存檔…' });
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
