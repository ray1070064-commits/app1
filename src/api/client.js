import { mockMarket } from '../data/mockMarket.js'
import { getMockAssetDetails } from '../data/mockAssetDetails.js'

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS ?? 'false') === 'true'
const GAME_ID_KEY = 'capital-life-game-id'
const SAVE_CODE_KEY = 'capital-life-public-save-v181'
const SAVE_META_KEY = 'capital-life-public-save-meta-v181'
let ACTIVE_GAME_ID = typeof window !== 'undefined' ? window.sessionStorage.getItem(GAME_ID_KEY) : null

function rememberGameId(gameId) {
  ACTIVE_GAME_ID = gameId || null
  if (typeof window === 'undefined') return
  if (ACTIVE_GAME_ID) window.sessionStorage.setItem(GAME_ID_KEY, ACTIVE_GAME_ID)
  else window.sessionStorage.removeItem(GAME_ID_KEY)
}

async function request(path, options = {}) {
  if (!API_BASE) throw new Error('正式後端尚未設定：請設定 VITE_API_BASE_URL')
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(ACTIVE_GAME_ID ? { 'X-Game-Id': ACTIVE_GAME_ID } : {}),
      ...(options.headers || {}),
    },
    credentials: 'include',
    ...options,
  })
  if (!response.ok) {
    let message = ''
    try {
      const body = await response.json()
      message = body?.detail || body?.message || JSON.stringify(body)
    } catch {
      message = await response.text()
    }
    throw new Error(message || `HTTP ${response.status}`)
  }
  if (response.status === 204) return null
  return response.json()
}

function writeBrowserSave(result) {
  if (typeof window === 'undefined' || !result?.code) return
  window.localStorage.setItem(SAVE_CODE_KEY, result.code)
  window.localStorage.setItem(SAVE_META_KEY, JSON.stringify(result.preview || {}))
}

export function isMockMode() { return USE_MOCKS }
export function getBrowserSaveCode() { return typeof window === 'undefined' ? '' : (window.localStorage.getItem(SAVE_CODE_KEY) || '') }
export function getBrowserSaveMeta() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(window.localStorage.getItem(SAVE_META_KEY) || 'null') }
  catch { return null }
}
export function clearBrowserSave() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SAVE_CODE_KEY)
  window.localStorage.removeItem(SAVE_META_KEY)
}

export async function getMarketSnapshot() {
  if (USE_MOCKS) return structuredClone(mockMarket)
  return request('/api/v1/market/snapshot')
}

export async function getMarketHistory(symbol, timeframe = '3M') {
  if (USE_MOCKS) {
    const asset = mockMarket.assets.find((item) => item.symbol === symbol)
    return { ok: Boolean(asset), symbol, timeframe, candles: structuredClone(asset?.candles || []) }
  }
  return request(`/api/v1/market/${encodeURIComponent(symbol)}/history?timeframe=${encodeURIComponent(timeframe)}`)
}

export async function getAssetDetails(symbol) {
  if (USE_MOCKS) return structuredClone(getMockAssetDetails(symbol))
  return request(`/api/v1/assets/${encodeURIComponent(symbol)}`)
}

export async function getAssetNews(symbol) {
  if (USE_MOCKS) return { ok: true, symbol, news: structuredClone(getMockAssetDetails(symbol)?.news || []) }
  return request(`/api/v1/assets/${encodeURIComponent(symbol)}/news`)
}

export async function getAssetPtt(symbol, nonce = 0) {
  if (USE_MOCKS) return { ok: true, symbol, rows: structuredClone(getMockAssetDetails(symbol, nonce)?.ptt || []) }
  return request(`/api/v1/assets/${encodeURIComponent(symbol)}/ptt?nonce=${encodeURIComponent(nonce)}`)
}

export async function getMarketDepth(symbol) {
  if (USE_MOCKS) return { ok: true, symbol, depth: structuredClone(getMockAssetDetails(symbol)?.depth || null) }
  return request(`/api/v1/assets/${encodeURIComponent(symbol)}/depth`)
}

export async function createGame(payload) {
  const result = USE_MOCKS
    ? { ok: true, gameId: 'local-preview', player: payload, snapshot: structuredClone(mockMarket) }
    : await request('/api/v1/games', { method: 'POST', body: JSON.stringify(payload) })
  if (result?.gameId) rememberGameId(result.gameId)
  return result
}

export async function placeOrder(payload) {
  if (USE_MOCKS) return { ok: true, order: { id: `preview-${Date.now()}`, ...payload, status: payload.orderType === 'limit' ? 'pending' : 'filled' } }
  return request('/api/v1/orders', { method: 'POST', body: JSON.stringify(payload) })
}

export async function closePosition(payload) {
  if (USE_MOCKS) return { ok: true, closed: payload }
  return request(`/api/v1/positions/${encodeURIComponent(payload.positionId)}/close`, { method: 'POST', body: JSON.stringify({ quantity: payload.quantity }) })
}

export async function cancelOrder(orderId) {
  if (USE_MOCKS) return { ok: true, orderId, status: 'cancelled' }
  return request(`/api/v1/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' })
}

export async function advanceTime(days) {
  if (USE_MOCKS) return { ok: true, advancedDays: days }
  return request('/api/v1/time/advance', { method: 'POST', body: JSON.stringify({ days }) })
}

export async function getCareer() { return request('/api/v1/career') }
export async function careerAction(action, payload = {}) { return request('/api/v1/career/action', { method: 'POST', body: JSON.stringify({ action, payload }) }) }
export async function getFamily() { return request('/api/v1/family') }
export async function familyAction(action, payload = {}) { return request('/api/v1/family/action', { method: 'POST', body: JSON.stringify({ action, payload }) }) }
export async function getCompany() { return request('/api/v1/company') }
export async function companyAction(action, payload = {}) { return request('/api/v1/company/action', { method: 'POST', body: JSON.stringify({ action, payload }) }) }
export async function getPowerRisk() { return request('/api/v1/power-risk') }
export async function powerRiskAction(action, payload = {}) { return request('/api/v1/power-risk/action', { method: 'POST', body: JSON.stringify({ action, payload }) }) }
export async function getLife() { return request('/api/v1/life') }
export async function lifeAction(action, payload = {}) { return request('/api/v1/life/action', { method: 'POST', body: JSON.stringify({ action, payload }) }) }

export async function exportSave() {
  if (USE_MOCKS) throw new Error('Mock 模式不提供正式存檔')
  return request('/api/v1/save/export')
}

export async function saveCurrentGameToBrowser() {
  if (USE_MOCKS) return null
  const result = await exportSave()
  writeBrowserSave(result)
  return result
}

export async function previewSaveCode(code) {
  if (USE_MOCKS) return { ok: true, preview: null }
  return request('/api/v1/save/preview', { method: 'POST', body: JSON.stringify({ code }) })
}

export async function restoreSaveCode(code) {
  if (USE_MOCKS) throw new Error('Mock 模式不提供正式恢復')
  const result = await request('/api/v1/save/restore', { method: 'POST', body: JSON.stringify({ code }), headers: {} })
  if (result?.gameId) rememberGameId(result.gameId)
  if (typeof window !== 'undefined' && code) {
    window.localStorage.setItem(SAVE_CODE_KEY, code)
    try {
      const preview = await previewSaveCode(code)
      window.localStorage.setItem(SAVE_META_KEY, JSON.stringify(preview?.preview || {}))
    } catch { /* restored save is still valid even if preview refresh fails */ }
  }
  return result
}

export async function restoreBrowserSave() {
  const code = getBrowserSaveCode()
  if (!code) throw new Error('這個瀏覽器目前沒有公開版存檔')
  return restoreSaveCode(code)
}
