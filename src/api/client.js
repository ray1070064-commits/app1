import { mockMarket } from '../data/mockMarket.js'
import { getMockAssetDetails } from '../data/mockAssetDetails.js'

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS ?? 'true') === 'true' || !API_BASE
const GAME_ID_KEY = 'capital-life-game-id'
let ACTIVE_GAME_ID = typeof window !== 'undefined' ? window.sessionStorage.getItem(GAME_ID_KEY) : null

function rememberGameId(gameId) {
  ACTIVE_GAME_ID = gameId || null
  if (typeof window === 'undefined') return
  if (ACTIVE_GAME_ID) window.sessionStorage.setItem(GAME_ID_KEY, ACTIVE_GAME_ID)
  else window.sessionStorage.removeItem(GAME_ID_KEY)
}

async function request(path, options = {}) {
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
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export function isMockMode() { return USE_MOCKS }

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
