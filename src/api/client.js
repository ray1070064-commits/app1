import { mockMarket } from '../data/mockMarket.js'

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS ?? 'true') === 'true' || !API_BASE

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export function isMockMode() {
  return USE_MOCKS
}

export async function getMarketSnapshot() {
  if (USE_MOCKS) return structuredClone(mockMarket)
  return request('/api/v1/market/snapshot')
}

export async function createGame(payload) {
  if (USE_MOCKS) {
    return {
      ok: true,
      gameId: 'local-preview',
      player: payload,
      snapshot: structuredClone(mockMarket),
    }
  }

  return request('/api/v1/games', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function placeOrder(payload) {
  if (USE_MOCKS) {
    return {
      ok: true,
      order: {
        id: `preview-${Date.now()}`,
        ...payload,
        status: 'filled',
      },
    }
  }

  return request('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function advanceTime(days) {
  if (USE_MOCKS) {
    return { ok: true, advancedDays: days }
  }

  return request('/api/v1/time/advance', {
    method: 'POST',
    body: JSON.stringify({ days }),
  })
}
