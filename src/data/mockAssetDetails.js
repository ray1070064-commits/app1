import { mockMarket } from './mockMarket.js'

const COMPANY_META = {
  NVDA: ['成長型科技', '半導體與加速運算平台，營運表現對資料中心與 AI 資本支出高度敏感。', 0.0004, 0.04],
  AAPL: ['成熟科技', '消費電子、裝置生態系與服務收入並重，現金流與股東回饋能力較強。', 0.0042, 0.15],
  MSFT: ['成熟成長科技', '企業軟體、雲端與 AI 服務並重，收入來源相對分散。', 0.0065, 0.23],
  TSLA: ['高波動成長', '電動車、能源與自動化題材驅動，市場預期變動對估值影響明顯。', 0, 0],
  AMZN: ['成長型平台', '電子商務與雲端服務並重，現金流受到零售投資與雲端週期共同影響。', 0, 0],
  META: ['成長型平台', '廣告平台與 AI 基礎建設為核心，資本支出與廣告景氣是重要觀察項。', 0.0025, 0.08],
  GOOGL: ['成長型平台', '搜尋、廣告、雲端與 AI 產品組合，現金部位相對充足。', 0.003, 0.1],
  JPM: ['成熟金融', '大型綜合金融機構，利差、信貸品質與資本適足率影響獲利。', 0.018, 0.28],
  XOM: ['成熟能源', '上游油氣與煉化業務並重，現金流高度連動能源價格與產能利用率。', 0.032, 0.42],
}

const ETF_META = {
  SPY: {
    description: '大型股分散 ETF，提供廣泛美國大型企業曝險。',
    expenseRatio: 0.0009,
    annualYield: 0.012,
    components: [
      ['NVDA', 'NVIDIA', 0.082], ['AAPL', 'Apple', 0.071], ['MSFT', 'Microsoft', 0.067],
      ['AMZN', 'Amazon', 0.038], ['META', 'Meta Platforms', 0.029], ['GOOGL', 'Alphabet', 0.026],
    ],
  },
  QQQ: {
    description: '大型成長與科技權重較高的 ETF，集中度高於廣泛大盤型基金。',
    expenseRatio: 0.002,
    annualYield: 0.006,
    components: [
      ['NVDA', 'NVIDIA', 0.091], ['AAPL', 'Apple', 0.087], ['MSFT', 'Microsoft', 0.079],
      ['AMZN', 'Amazon', 0.052], ['META', 'Meta Platforms', 0.041], ['GOOGL', 'Alphabet', 0.036],
    ],
  },
  IWM: {
    description: '中小型企業 ETF，對景氣、融資環境與市場風險偏好通常更敏感。',
    expenseRatio: 0.0019,
    annualYield: 0.013,
    components: [
      ['SMALL-A', 'Industrial Basket', 0.019], ['SMALL-B', 'Financial Basket', 0.017],
      ['SMALL-C', 'Healthcare Basket', 0.016], ['SMALL-D', 'Technology Basket', 0.015],
    ],
  },
}

const CATEGORY_DESCRIPTIONS = {
  加密: '高波動數位資產，價格容易受到流動性、風險偏好與事件消息影響。',
  商品: '商品價格主要受到供需、庫存、美元與全球景氣變化驅動。',
  外匯: '主要貨幣對，央行政策、利差與宏觀數據是核心影響因素。',
}

function hashSeed(text) {
  return [...String(text)].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 11), 131)
}

function moneyScale(symbol, price) {
  const seed = hashSeed(symbol)
  const marketCap = Math.max(4_000_000_000, price * (180_000_000 + (seed % 800_000_000)))
  const quarterRevenue = marketCap / (12 + (seed % 26))
  const margin = 0.08 + (seed % 24) / 100
  const quarterProfit = quarterRevenue * margin
  const fcfMargin = Math.max(0.03, margin * (0.55 + (seed % 20) / 100))
  return {
    marketCap,
    quarterRevenue,
    quarterProfit,
    netMargin: margin,
    freeCashFlow: quarterRevenue * fcfMargin,
    fcfMargin,
    debtRatio: 0.08 + (seed % 38) / 100,
    currentPe: 15 + (seed % 34),
    eps: Math.max(0.1, price / (15 + (seed % 34))),
  }
}

function nextDividendDay(symbol) {
  return 14 + (hashSeed(symbol) % 72)
}

function buildNews(asset) {
  const direction = asset.change >= 0 ? '走強' : '承壓'
  return [
    { day: 1, importance: '重要', category: '🏢 公司', title: `${asset.name} 盤中${direction}`, desc: `市場持續評估 ${asset.sector} 的成長與估值變化。` },
    { day: 1, importance: '一般', category: '📌 其他', title: '市場風險偏好震盪', desc: '大型資產成交量與宏觀數據仍是短線觀察重點。' },
    { day: 0, importance: '財報', category: '📑 財報', title: `${asset.name} 財務預期受到關注`, desc: '投資人重新評估營收成長、利潤率與自由現金流。' },
    { day: 0, importance: '重要', category: '🏛️ 政策', title: '利率路徑影響估值', desc: '市場等待下一輪政策與通膨訊號。' },
  ]
}

function buildPtt(asset, nonce = 0) {
  const up = asset.change >= 0
  const seed = hashSeed(`${asset.symbol}:${nonce}`)
  const users = ['八卦韭菜王', '夜盤不睡覺', '長線存股仔', '技術分析宅', '隔日沖勇者', '市場觀察員']
  const bull = ['量有出來，今天氣勢不差', '這根如果站穩我會續抱', '基本面沒壞，先看趨勢', '多方還沒完全退場']
  const bear = ['這位置我不敢追', '漲多先收一點比較實在', '量價開始怪怪的', '小心消息出盡']
  const neutral = ['先看下一根再說', '今天就是震盪盤吧', '等數據公布比較有方向', '價位到了自然會選邊']
  return Array.from({ length: 10 }, (_, index) => {
    const pool = index % 3 === 0 ? neutral : up ? bull : bear
    return {
      user: users[(seed + index * 3) % users.length],
      message: pool[(seed + index) % pool.length],
      tone: index % 3 === 0 ? 'neutral' : up ? 'bull' : 'bear',
    }
  })
}

function buildDepth(asset) {
  const seed = hashSeed(asset.symbol)
  const tick = Math.max(asset.price * 0.00035, asset.price >= 1000 ? 0.5 : asset.price >= 100 ? 0.05 : 0.0001)
  const mid = asset.price
  const bids = []
  const asks = []
  for (let level = 1; level <= 8; level += 1) {
    const bidSize = 20 + ((seed + level * 41) % 180)
    const askSize = 20 + ((seed + level * 67) % 180)
    bids.push({ price: mid - tick * level, size: bidSize })
    asks.push({ price: mid + tick * level, size: askSize })
  }
  const bidTotal = bids.reduce((sum, row) => sum + row.size, 0)
  const askTotal = asks.reduce((sum, row) => sum + row.size, 0)
  return {
    spreadPct: ((asks[0].price - bids[0].price) / mid) * 100,
    imbalance: (bidTotal - askTotal) / Math.max(bidTotal + askTotal, 1),
    bids,
    asks,
  }
}

export function getMockAssetDetails(symbol, nonce = 0) {
  const asset = mockMarket.assets.find((row) => row.symbol === symbol)
  if (!asset) return null

  const companyMeta = COMPANY_META[symbol]
  const etfMeta = ETF_META[symbol]
  const financials = asset.category === '股票' ? moneyScale(symbol, asset.price) : null
  const annualYield = companyMeta?.[2] ?? etfMeta?.annualYield ?? 0
  const payoutRatio = companyMeta?.[3] ?? (asset.category === 'ETF' ? 0.82 : 0)

  return {
    symbol: asset.symbol,
    profile: {
      nature: companyMeta?.[0] || (asset.category === 'ETF' ? '基金' : asset.category),
      description: companyMeta?.[1] || etfMeta?.description || CATEGORY_DESCRIPTIONS[asset.category] || `${asset.name} 市場標的。`,
      sector: asset.sector,
      category: asset.category,
    },
    financials,
    dividend: {
      type: annualYield > 0 ? (asset.category === 'ETF' ? '配息' : '股息') : '無',
      annualYield,
      payoutRatio,
      nextDay: annualYield > 0 ? nextDividendDay(symbol) : null,
      estimatedPerShare: annualYield > 0 ? (asset.price * annualYield) / 4 : 0,
      intervalDays: 90,
    },
    fund: etfMeta ? {
      expenseRatio: etfMeta.expenseRatio,
      components: etfMeta.components.map(([componentSymbol, name, weight]) => ({ symbol: componentSymbol, name, weight })),
    } : null,
    news: buildNews(asset),
    ptt: buildPtt(asset, nonce),
    depth: buildDepth(asset),
  }
}
