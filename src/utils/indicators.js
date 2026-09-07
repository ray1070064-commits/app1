export function sma(values, period) {
  const result = new Array(values.length).fill(null)
  if (!Array.isArray(values) || period <= 0) return result

  let sum = 0
  for (let index = 0; index < values.length; index += 1) {
    sum += Number(values[index] || 0)
    if (index >= period) sum -= Number(values[index - period] || 0)
    if (index >= period - 1) result[index] = sum / period
  }
  return result
}

export function ema(values, period) {
  const result = new Array(values.length).fill(null)
  if (!Array.isArray(values) || values.length === 0 || period <= 0) return result

  const multiplier = 2 / (period + 1)
  let previous = Number(values[0] || 0)
  result[0] = previous
  for (let index = 1; index < values.length; index += 1) {
    const value = Number(values[index] || 0)
    previous = (value - previous) * multiplier + previous
    result[index] = previous
  }
  return result
}

export function rsi(values, period = 14) {
  const result = new Array(values.length).fill(null)
  if (!Array.isArray(values) || values.length <= period) return result

  let gains = 0
  let losses = 0
  for (let index = 1; index <= period; index += 1) {
    const delta = Number(values[index] || 0) - Number(values[index - 1] || 0)
    gains += Math.max(delta, 0)
    losses += Math.max(-delta, 0)
  }

  let averageGain = gains / period
  let averageLoss = losses / period
  result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss)

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = Number(values[index] || 0) - Number(values[index - 1] || 0)
    averageGain = ((averageGain * (period - 1)) + Math.max(delta, 0)) / period
    averageLoss = ((averageLoss * (period - 1)) + Math.max(-delta, 0)) / period
    result[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss)
  }

  return result
}

export function macd(values, fast = 12, slow = 26, signal = 9) {
  const fastLine = ema(values, fast)
  const slowLine = ema(values, slow)
  const line = values.map((_, index) => {
    if (fastLine[index] == null || slowLine[index] == null) return null
    return fastLine[index] - slowLine[index]
  })

  const normalized = line.map((value) => value ?? 0)
  const signalLine = ema(normalized, signal)
  const histogram = line.map((value, index) => {
    if (value == null || signalLine[index] == null) return null
    return value - signalLine[index]
  })

  return { line, signal: signalLine, histogram }
}

export function sliceByTimeframe(candles, timeframe) {
  const limits = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    ALL: candles.length,
  }
  const limit = limits[timeframe] || 90
  return candles.slice(Math.max(0, candles.length - limit))
}

export function latestValue(values) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] != null && Number.isFinite(values[index])) return values[index]
  }
  return null
}
