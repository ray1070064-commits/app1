import { useMemo, useState } from 'react'
import { createGame, placeOrder } from './api/client.js'
import { mockMarket, quickStartOptions } from './data/mockMarket.js'

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function makeQuickStart() {
  return {
    balance: randomItem(quickStartOptions.balances),
    age: randomItem(quickStartOptions.ages),
    job: randomItem(quickStartOptions.jobs),
    seed: crypto.randomUUID().replaceAll('-', '').slice(0, 12),
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 10000 ? 0 : 2,
  }).format(value)
}

function Sparkline({ values }) {
  const width = 680
  const height = 270
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - ((value - min) / range) * (height - 28) - 14
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg className="price-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="價格走勢">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="68" x2={width} y2="68" className="chart-grid" />
      <line x1="0" y1="135" x2={width} y2="135" className="chart-grid" />
      <line x1="0" y1="202" x2={width} y2="202" className="chart-grid" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#chartFill)" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function LaunchScreen({ onStart }) {
  const [quick, setQuick] = useState(makeQuickStart)
  const [quickTutorial, setQuickTutorial] = useState(true)
  const [custom, setCustom] = useState({
    balance: 100000,
    age: 25,
    job: quickStartOptions.jobs[0].id,
    seed: '',
    tutorial: true,
  })
  const [busy, setBusy] = useState(false)

  async function begin(payload) {
    setBusy(true)
    try {
      await createGame(payload)
      onStart(payload)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="launch-shell">
      <section className="launch-hero">
        <div>
          <div className="eyebrow">LIFE × MARKET</div>
          <h1>資本人生</h1>
          <p>在市場裡累積資本，在時間裡承擔選擇。</p>
        </div>
        <div className="market-tags" aria-label="市場類型">
          <span>股票</span><span>ETF</span><span>加密</span><span>商品</span><span>外匯</span>
        </div>
      </section>

      <section className="start-grid">
        <article className="start-card quick-card">
          <div className="card-heading">
            <div>
              <span className="card-kicker">QUICK START</span>
              <h2>🎲 隨機開始</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => setQuick(makeQuickStart())} aria-label="重新隨機">
              ↻
            </button>
          </div>

          <div className="quick-stats">
            <div><span>起始資金</span><strong>{formatMoney(quick.balance)}</strong></div>
            <div><span>年齡</span><strong>{quick.age} 歲</strong></div>
          </div>

          <div className="career-row">
            <div className="career-icon">◈</div>
            <div><strong>{quick.job.name}</strong><span>{quick.job.skill}</span></div>
          </div>

          <label className="toggle-row">
            <span>新手教學</span>
            <input type="checkbox" checked={quickTutorial} onChange={(event) => setQuickTutorial(event.target.checked)} />
          </label>

          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => begin({
              startBalance: quick.balance,
              startAge: quick.age,
              jobId: quick.job.id,
              seed: quick.seed,
              tutorial: quickTutorial,
              startMode: 'random',
            })}
          >
            進入市場
          </button>
        </article>

        <article className="start-card setup-card">
          <div className="card-heading">
            <div>
              <span className="card-kicker">NEW GAME</span>
              <h2>🎛️ 開局設定</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              <span>起始資金</span>
              <input
                type="number"
                min="10000"
                max="500000"
                step="5000"
                value={custom.balance}
                onChange={(event) => setCustom({ ...custom, balance: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>起始年齡</span>
              <input
                type="number"
                min="18"
                max="60"
                value={custom.age}
                onChange={(event) => setCustom({ ...custom, age: Number(event.target.value) })}
              />
            </label>
          </div>

          <label className="field-block">
            <span>職業</span>
            <select value={custom.job} onChange={(event) => setCustom({ ...custom, job: event.target.value })}>
              {quickStartOptions.jobs.map((job) => <option value={job.id} key={job.id}>{job.name}</option>)}
            </select>
          </label>

          <label className="field-block">
            <span>世界 Seed</span>
            <input
              type="text"
              value={custom.seed}
              placeholder="留空代表隨機"
              onChange={(event) => setCustom({ ...custom, seed: event.target.value })}
            />
          </label>

          <label className="toggle-row">
            <span>新手教學</span>
            <input type="checkbox" checked={custom.tutorial} onChange={(event) => setCustom({ ...custom, tutorial: event.target.checked })} />
          </label>

          <button
            className="secondary-primary-button"
            type="button"
            disabled={busy}
            onClick={() => begin({
              startBalance: custom.balance,
              startAge: custom.age,
              jobId: custom.job,
              seed: custom.seed || crypto.randomUUID().replaceAll('-', '').slice(0, 12),
              tutorial: custom.tutorial,
              startMode: 'custom',
            })}
          >
            建立人生並進入市場
          </button>
        </article>
      </section>
    </main>
  )
}

function MarketTerminal({ player, onExit }) {
  const [selectedSymbol, setSelectedSymbol] = useState(mockMarket.assets[0].symbol)
  const [quantity, setQuantity] = useState(1)
  const [side, setSide] = useState('buy')
  const [positions, setPositions] = useState([])
  const [notice, setNotice] = useState('')

  const selected = useMemo(
    () => mockMarket.assets.find((asset) => asset.symbol === selectedSymbol) || mockMarket.assets[0],
    [selectedSymbol],
  )

  async function submitOrder() {
    const qty = Math.max(1, Number(quantity || 1))
    const result = await placeOrder({ symbol: selected.symbol, side, quantity: qty, orderType: 'market' })
    if (!result?.ok) return

    setNotice(`${side === 'buy' ? '買入' : '賣出'} ${selected.symbol} × ${qty}`)
    if (side === 'buy') {
      setPositions((current) => {
        const found = current.find((position) => position.symbol === selected.symbol)
        if (found) {
          return current.map((position) => position.symbol === selected.symbol
            ? { ...position, quantity: position.quantity + qty }
            : position)
        }
        return [...current, { symbol: selected.symbol, quantity: qty, price: selected.price }]
      })
    }
  }

  const startJob = quickStartOptions.jobs.find((job) => job.id === player.jobId)

  return (
    <main className="terminal-shell">
      <header className="terminal-topbar">
        <div className="brand-inline"><span>◈</span><strong>資本人生</strong></div>
        <div className="top-stats">
          <span>Day {mockMarket.day}</span>
          <span>{player.startAge} 歲</span>
          <span>{startJob?.name || '玩家'}</span>
          <strong>{formatMoney(player.startBalance)}</strong>
        </div>
        <button type="button" className="ghost-button" onClick={onExit}>主選單</button>
      </header>

      <section className="macro-strip">
        <span><small>VIX</small><strong>{mockMarket.macro.vix}</strong></span>
        <span><small>CPI</small><strong>{mockMarket.macro.cpi}%</strong></span>
        <span><small>利率</small><strong>{mockMarket.macro.rate}%</strong></span>
      </section>

      <section className="terminal-grid">
        <aside className="watch-panel panel">
          <div className="panel-title"><span>市場</span><small>{mockMarket.assets.length} 標的</small></div>
          <div className="watch-list">
            {mockMarket.assets.map((asset) => (
              <button
                type="button"
                key={asset.symbol}
                className={`watch-row ${selected.symbol === asset.symbol ? 'active' : ''}`}
                onClick={() => setSelectedSymbol(asset.symbol)}
              >
                <span className="ticker-cell"><strong>{asset.symbol}</strong><small>{asset.category}</small></span>
                <span className="price-cell"><strong>{formatMoney(asset.price)}</strong><small className={asset.change >= 0 ? 'up' : 'down'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</small></span>
              </button>
            ))}
          </div>
        </aside>

        <section className="chart-panel panel">
          <div className="asset-header">
            <div>
              <span className="asset-symbol">{selected.symbol}</span>
              <h2>{selected.name}</h2>
              <small>{selected.category}</small>
            </div>
            <div className="asset-quote">
              <strong>{formatMoney(selected.price)}</strong>
              <span className={selected.change >= 0 ? 'up' : 'down'}>{selected.change >= 0 ? '+' : ''}{selected.change.toFixed(2)}%</span>
            </div>
          </div>
          <Sparkline values={selected.history} />
          <div className="chart-toolbar">
            <button type="button" className="active">1D</button>
            <button type="button">1W</button>
            <button type="button">1M</button>
            <button type="button">6M</button>
            <button type="button">1Y</button>
          </div>
          <div className="news-row">
            {mockMarket.news.map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>

        <aside className="trade-panel panel">
          <div className="panel-title"><span>下單</span><small>Market</small></div>
          <div className="side-switch">
            <button type="button" className={side === 'buy' ? 'active buy' : ''} onClick={() => setSide('buy')}>買入</button>
            <button type="button" className={side === 'sell' ? 'active sell' : ''} onClick={() => setSide('sell')}>賣出</button>
          </div>
          <label className="field-block">
            <span>數量</span>
            <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <div className="order-preview">
            <span>預估金額</span>
            <strong>{formatMoney(selected.price * Math.max(1, Number(quantity || 1)))}</strong>
          </div>
          <button type="button" className={`order-button ${side}`} onClick={submitOrder}>{side === 'buy' ? '確認買入' : '確認賣出'}</button>
          {notice && <div className="order-notice">{notice}</div>}

          <div className="positions-section">
            <div className="panel-title"><span>持倉</span><small>{positions.length}</small></div>
            {positions.length === 0 ? (
              <div className="empty-state">尚無持倉</div>
            ) : positions.map((position) => (
              <div className="position-row" key={position.symbol}>
                <div><strong>{position.symbol}</strong><small>{position.quantity} 股</small></div>
                <strong>{formatMoney(position.quantity * selected.price)}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default function App() {
  const [player, setPlayer] = useState(null)

  if (!player) {
    return <LaunchScreen onStart={setPlayer} />
  }

  return <MarketTerminal player={player} onExit={() => setPlayer(null)} />
}
