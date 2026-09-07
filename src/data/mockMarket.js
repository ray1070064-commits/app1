function hashSeed(text) {
  return [...String(text)].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 97)
}

function buildCandles(symbol, finalPrice, baseVolume = 1_000_000, points = 365) {
  const seed = hashSeed(symbol)
  const rows = []
  const end = new Date('2026-09-07T00:00:00Z')
  let close = Math.max(finalPrice * (0.82 + ((seed % 17) / 100)), finalPrice * 0.3)

  for (let index = 0; index < points; index += 1) {
    const wave = Math.sin((index + seed) / 8.3) * 0.007 + Math.sin((index + seed * 0.7) / 22) * 0.004
    const drift = ((seed % 5) - 1.5) * 0.00008 + 0.00042
    const open = close * (1 + Math.sin(index * 1.7 + seed) * 0.0018)
    close = Math.max(0.0001, open * (1 + wave + drift))
    const spread = Math.abs(Math.sin(index * 0.91 + seed * 0.2)) * 0.006 + 0.002
    const high = Math.max(open, close) * (1 + spread)
    const low = Math.min(open, close) * (1 - spread * 0.86)
    const volume = Math.max(1, baseVolume * (0.72 + Math.abs(Math.sin(index / 5.3 + seed)) * 0.8))
    const date = new Date(end)
    date.setUTCDate(end.getUTCDate() - (points - 1 - index))
    rows.push({
      date: date.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
    })
  }

  const scale = finalPrice / rows[rows.length - 1].close
  return rows.map((row) => ({
    ...row,
    open: row.open * scale,
    high: row.high * scale,
    low: row.low * scale,
    close: row.close * scale,
  }))
}

function asset(symbol, name, category, sector, price, change, baseVolume) {
  return {
    symbol,
    name,
    category,
    sector,
    price,
    change,
    candles: buildCandles(symbol, price, baseVolume),
  }
}

export const mockMarket = {
  day: 1,
  age: 25,
  cash: 100000,
  equity: 100000,
  macro: {
    vix: 18.4,
    cpi: 2.8,
    rate: 4.5,
    dxy: 98.7,
  },
  assets: [
    asset('NVDA', 'NVIDIA', '股票', '半導體', 184.62, 2.81, 188_000_000),
    asset('AAPL', 'Apple', '股票', '消費電子', 248.31, 0.64, 61_000_000),
    asset('MSFT', 'Microsoft', '股票', '軟體', 522.46, 1.12, 28_000_000),
    asset('TSLA', 'Tesla', '股票', '電動車', 391.14, -1.92, 115_000_000),
    asset('AMZN', 'Amazon', '股票', '電子商務', 238.73, 0.83, 43_000_000),
    asset('META', 'Meta Platforms', '股票', '網路服務', 812.15, 1.47, 20_000_000),
    asset('GOOGL', 'Alphabet', '股票', '網路服務', 246.08, -0.42, 31_000_000),
    asset('JPM', 'JPMorgan Chase', '股票', '金融', 326.42, 0.35, 10_000_000),
    asset('XOM', 'Exxon Mobil', '股票', '能源', 131.77, -0.76, 19_000_000),
    asset('SPY', 'S&P 500 ETF', 'ETF', '美股大盤', 691.08, 0.37, 72_000_000),
    asset('QQQ', 'NASDAQ 100 ETF', 'ETF', '科技大盤', 631.72, 0.91, 55_000_000),
    asset('IWM', 'Russell 2000 ETF', 'ETF', '中小型股', 265.44, -0.18, 39_000_000),
    asset('BTC', 'Bitcoin', '加密', '加密資產', 126420, 3.24, 32_000),
    asset('ETH', 'Ethereum', '加密', '加密資產', 4528.4, 2.11, 260_000),
    asset('GOLD', 'Gold', '商品', '貴金屬', 3827.4, -0.28, 240_000),
    asset('OIL', 'WTI Crude Oil', '商品', '能源商品', 74.82, 1.05, 520_000),
    asset('EURUSD', 'EUR / USD', '外匯', '主要貨幣', 1.1682, 0.14, 4_200_000),
    asset('USDJPY', 'USD / JPY', '外匯', '主要貨幣', 147.82, -0.16, 3_900_000),
  ],
  positions: [],
  orders: [],
  news: [
    '科技股領漲，市場風險偏好回升。',
    '投資人等待下一份通膨與利率訊號。',
    '大型科技股成交量放大，指數維持高檔震盪。',
    '商品與外匯波動仍維持在近期區間。',
  ],
}

export const quickStartOptions = {
  balances: [50000, 75000, 100000, 125000, 150000, 200000],
  ages: [18, 20, 22, 25, 28, 31, 35, 40],
  jobs: [
    { id: 'software_junior', name: '初階軟體工程師', skill: '程式技能' },
    { id: 'finance_junior', name: '初階金融分析師', skill: '金融技能' },
    { id: 'sales_junior', name: '初階業務', skill: '銷售技能' },
    { id: 'designer_junior', name: '初階設計師', skill: '設計技能' },
    { id: 'operator_junior', name: '初階營運專員', skill: '營運技能' },
  ],
}
