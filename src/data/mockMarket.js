export const mockMarket = {
  day: 1,
  age: 25,
  cash: 100000,
  equity: 100000,
  macro: {
    vix: 18.4,
    cpi: 2.8,
    rate: 4.5,
  },
  assets: [
    { symbol: 'NVDA', name: 'NVIDIA', category: '股票', price: 184.62, change: 2.81, history: [162,164,161,166,169,168,172,171,176,179,177,181,180,184,183,186,184.62] },
    { symbol: 'AAPL', name: 'Apple', category: '股票', price: 248.31, change: 0.64, history: [239,241,240,243,245,244,246,247,245,246,249,248,247,249,248.31] },
    { symbol: 'TSLA', name: 'Tesla', category: '股票', price: 391.14, change: -1.92, history: [420,416,421,414,409,403,406,400,398,395,401,397,394,392,391.14] },
    { symbol: 'SPY', name: 'S&P 500 ETF', category: 'ETF', price: 691.08, change: 0.37, history: [677,680,681,679,683,685,684,687,688,690,689,691,690,692,691.08] },
    { symbol: 'QQQ', name: 'NASDAQ 100 ETF', category: 'ETF', price: 631.72, change: 0.91, history: [608,611,615,614,618,621,619,623,625,628,626,629,630,631.72] },
    { symbol: 'BTC', name: 'Bitcoin', category: '加密', price: 126420, change: 3.24, history: [116000,118300,117200,119900,121500,120700,122800,124000,123300,125600,124900,126420] },
    { symbol: 'GOLD', name: 'Gold', category: '商品', price: 3827.4, change: -0.28, history: [3798,3805,3812,3808,3819,3825,3832,3824,3830,3827.4] },
    { symbol: 'USDJPY', name: 'USD / JPY', category: '外匯', price: 147.82, change: -0.16, history: [148.4,148.2,148.5,148.1,147.9,148,147.8,147.82] },
  ],
  positions: [],
  news: [
    '科技股領漲，市場風險偏好回升。',
    '投資人等待下一份通膨與利率訊號。',
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
