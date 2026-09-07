import { useState } from 'react'
import { createGame } from './api/client.js'
import MarketTerminal from './components/MarketTerminal.jsx'
import { quickStartOptions } from './data/mockMarket.js'

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
  const [error, setError] = useState('')

  async function begin(payload) {
    setBusy(true)
    setError('')
    try {
      const result = await createGame(payload)
      if (!result?.ok) throw new Error(result?.message || '建立遊戲失敗')
      onStart({ ...payload, gameId: result.gameId || null, snapshot: result.snapshot || null })
    } catch (cause) {
      setError(cause.message || '建立遊戲失敗')
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
            <button className="icon-button" type="button" onClick={() => setQuick(makeQuickStart())} aria-label="重新隨機">↻</button>
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
              <input type="number" min="10000" max="500000" step="5000" value={custom.balance} onChange={(event) => setCustom({ ...custom, balance: Number(event.target.value) })} />
            </label>
            <label>
              <span>起始年齡</span>
              <input type="number" min="18" max="60" value={custom.age} onChange={(event) => setCustom({ ...custom, age: Number(event.target.value) })} />
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
            <input type="text" value={custom.seed} placeholder="留空代表隨機" onChange={(event) => setCustom({ ...custom, seed: event.target.value })} />
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

      {error && <div className="launch-error">{error}</div>}
    </main>
  )
}

export default function App() {
  const [player, setPlayer] = useState(null)
  if (!player) return <LaunchScreen onStart={setPlayer} />
  return <MarketTerminal player={player} onExit={() => setPlayer(null)} />
}
