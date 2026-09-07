import { useMemo, useState } from 'react'
import {
  clearBrowserSave,
  createGame,
  getBrowserSaveMeta,
  previewSaveCode,
  restoreBrowserSave,
  restoreSaveCode,
} from './api/client.js'
import LifeCenter from './components/LifeCenter.jsx'
import MarketTerminal from './components/MarketTerminal.jsx'
import { quickStartOptions } from './data/mockMarket.js'

function randomItem(items) { return items[Math.floor(Math.random() * items.length)] }
function makeQuickStart() {
  return {
    balance: randomItem(quickStartOptions.balances),
    age: randomItem(quickStartOptions.ages),
    job: randomItem(quickStartOptions.jobs),
    seed: crypto.randomUUID().replaceAll('-', '').slice(0, 12),
  }
}
function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2 }).format(Number(value || 0))
}
function resultToPlayer(result, fallback = {}) {
  return { ...fallback, ...(result?.player || {}), gameId: result?.gameId || fallback.gameId || null, snapshot: result?.snapshot || fallback.snapshot || null }
}

function LaunchScreen({ onStart }) {
  const [quick, setQuick] = useState(makeQuickStart)
  const [quickTutorial, setQuickTutorial] = useState(true)
  const [custom, setCustom] = useState({ balance: 100000, age: 25, job: quickStartOptions.jobs[0].id, seed: '', tutorial: true })
  const [browserMeta, setBrowserMeta] = useState(() => getBrowserSaveMeta())
  const [importOpen, setImportOpen] = useState(false)
  const [importCode, setImportCode] = useState('')
  const [importPreview, setImportPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function begin(payload) {
    if (browserMeta && typeof window !== 'undefined') {
      const proceed = window.confirm('目前瀏覽器已有一段人生。開始新人生後，之後的自動保存會覆蓋原存檔。確定繼續？')
      if (!proceed) return
    }
    setBusy(true); setError('')
    try {
      const result = await createGame(payload)
      if (!result?.ok) throw new Error(result?.message || '建立遊戲失敗')
      onStart(resultToPlayer(result, payload))
    } catch (cause) { setError(cause.message || '建立遊戲失敗') } finally { setBusy(false) }
  }

  async function continueSaved() {
    setBusy(true); setError('')
    try {
      const result = await restoreBrowserSave()
      if (!result?.ok) throw new Error(result?.message || '讀取存檔失敗')
      onStart(resultToPlayer(result))
    } catch (cause) { setError(cause.message || '讀取存檔失敗') } finally { setBusy(false) }
  }

  async function inspectImport() {
    if (!importCode.trim()) return
    setBusy(true); setError('')
    try { const result = await previewSaveCode(importCode.trim()); setImportPreview(result?.preview || null) }
    catch (cause) { setImportPreview(null); setError(cause.message || '無法讀取存檔碼') } finally { setBusy(false) }
  }

  async function restoreImport() {
    setBusy(true); setError('')
    try {
      const result = await restoreSaveCode(importCode.trim())
      if (!result?.ok) throw new Error(result?.message || '恢復失敗')
      onStart(resultToPlayer(result))
    } catch (cause) { setError(cause.message || '恢復失敗') } finally { setBusy(false) }
  }

  return <main className="launch-shell">
    <section className="launch-hero">
      <div><div className="eyebrow">LIFE × MARKET</div><h1>資本人生 Capital Life AI生成</h1><p>在市場裡累積資本，在時間裡承擔選擇。</p></div>
      <div className="market-tags" aria-label="市場類型"><span>股票</span><span>ETF</span><span>加密</span><span>商品</span><span>外匯</span></div>
    </section>

    {browserMeta && <section className="continue-card">
      <div><span className="card-kicker">CONTINUE</span><h2>歡迎回來</h2><div className="continue-meta"><span>Day {browserMeta.day}</span><span>{Number(browserMeta.age || 0).toFixed(1)} 歲</span><span>{browserMeta.jobId}</span><span>{formatMoney(browserMeta.cash)}</span></div></div>
      <div className="continue-actions"><button type="button" className="primary-button" disabled={busy} onClick={continueSaved}>▶ 繼續這段人生</button><button type="button" className="ghost-button" onClick={() => { clearBrowserSave(); setBrowserMeta(null) }}>清除</button></div>
    </section>}

    <section className="start-grid">
      <article className="start-card quick-card">
        <div className="card-heading"><div><span className="card-kicker">QUICK START</span><h2>🎲 隨機開始</h2></div><button className="icon-button" type="button" onClick={() => setQuick(makeQuickStart())} aria-label="重新隨機">↻</button></div>
        <div className="quick-stats"><div><span>起始資金</span><strong>{formatMoney(quick.balance)}</strong></div><div><span>年齡</span><strong>{quick.age} 歲</strong></div></div>
        <div className="career-row"><div className="career-icon">◈</div><div><strong>{quick.job.name}</strong><span>{quick.job.skill}</span></div></div>
        <label className="toggle-row"><span>新手教學</span><input type="checkbox" checked={quickTutorial} onChange={(event) => setQuickTutorial(event.target.checked)} /></label>
        <button className="primary-button" type="button" disabled={busy} onClick={() => begin({ startBalance: quick.balance, startAge: quick.age, jobId: quick.job.id, seed: quick.seed, tutorial: quickTutorial, startMode: 'random' })}>進入市場</button>
      </article>

      <article className="start-card setup-card">
        <div className="card-heading"><div><span className="card-kicker">NEW GAME</span><h2>🎛️ 開局設定</h2></div></div>
        <div className="form-grid"><label><span>起始資金</span><input type="number" min="10000" max="500000" step="5000" value={custom.balance} onChange={(event) => setCustom({ ...custom, balance: Number(event.target.value) })} /></label><label><span>起始年齡</span><input type="number" min="18" max="60" value={custom.age} onChange={(event) => setCustom({ ...custom, age: Number(event.target.value) })} /></label></div>
        <label className="field-block"><span>職業</span><select value={custom.job} onChange={(event) => setCustom({ ...custom, job: event.target.value })}>{quickStartOptions.jobs.map((job) => <option value={job.id} key={job.id}>{job.name}</option>)}</select></label>
        <label className="field-block"><span>世界 Seed</span><input type="text" value={custom.seed} placeholder="留空代表隨機" onChange={(event) => setCustom({ ...custom, seed: event.target.value })} /></label>
        <label className="toggle-row"><span>新手教學</span><input type="checkbox" checked={custom.tutorial} onChange={(event) => setCustom({ ...custom, tutorial: event.target.checked })} /></label>
        <button className="secondary-primary-button" type="button" disabled={busy} onClick={() => begin({ startBalance: custom.balance, startAge: custom.age, jobId: custom.job, seed: custom.seed || crypto.randomUUID().replaceAll('-', '').slice(0, 12), tutorial: custom.tutorial, startMode: 'custom' })}>建立人生並進入市場</button>
      </article>
    </section>

    <section className="import-strip"><button type="button" className="ghost-button" onClick={() => setImportOpen((v) => !v)}>📥 匯入存檔</button>{importOpen && <div className="import-box"><textarea className="save-code" value={importCode} onChange={(e) => { setImportCode(e.target.value); setImportPreview(null) }} placeholder="貼上 CL181... 存檔碼" /><div className="life-action-row"><button type="button" className="ghost-button" disabled={busy || !importCode.trim()} onClick={inspectImport}>檢查</button><button type="button" className="primary-button inline-primary" disabled={busy || !importCode.trim()} onClick={restoreImport}>恢復這段人生</button></div>{importPreview && <div className="save-preview"><strong>Day {importPreview.day}</strong><span>{Number(importPreview.age || 0).toFixed(1)} 歲</span><span>{importPreview.jobId}</span><span>{formatMoney(importPreview.cash)}</span></div>}</div>}</section>
    {error && <div className="launch-error">{error}</div>}
  </main>
}

function GameShell({ player, onExit, onPlayerChange }) {
  const [mode, setMode] = useState('market')
  const key = useMemo(() => player.gameId || 'game', [player.gameId])
  if (mode === 'life') return <LifeCenter key={`life-${key}`} player={player} onMarket={() => setMode('market')} onExit={onExit} onRestored={(result) => onPlayerChange(resultToPlayer(result))} />
  return <>
    <div className="game-mode-dock" aria-label="遊戲模式">
      <button type="button" className="ghost-button active">📈 市場</button>
      <button type="button" className="ghost-button" onClick={() => setMode('life')}>👤 人生／經營</button>
    </div>
    <MarketTerminal key={`market-${key}`} player={player} onExit={onExit} />
  </>
}

export default function App() {
  const [player, setPlayer] = useState(null)
  if (!player) return <LaunchScreen onStart={setPlayer} />
  return <GameShell player={player} onPlayerChange={setPlayer} onExit={() => setPlayer(null)} />
}
