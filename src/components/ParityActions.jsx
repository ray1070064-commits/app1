import { useEffect, useMemo, useState } from 'react'
import { companyAction, getCompany, getMarketSnapshot, getPowerRisk, powerRiskAction } from '../api/client.js'

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

function CompanyDecisionOverlay() {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const result = await getCompany()
      setData(result)
    } catch {
      // The game may be switching/restoring. The next poll will retry.
    }
  }

  useEffect(() => {
    let alive = true
    const refresh = async () => { if (alive) await load() }
    refresh()
    const timer = window.setInterval(refresh, 2600)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  const pending = data?.events?.pending
  if (!pending) return null

  async function choose(index) {
    setBusy(true); setNotice('')
    try {
      const result = await companyAction('resolve_event', { choiceIndex: index })
      if (!result?.ok) throw new Error(result?.message || '公司決策失敗')
      setData(result)
      setNotice(result.message || '公司決策已執行')
    } catch (error) {
      setNotice(error.message || '公司決策失敗')
    } finally {
      setBusy(false)
    }
  }

  return <div className="parity-company-backdrop" role="dialog" aria-modal="true" aria-label="公司重大決策">
    <section className="parity-company-modal">
      <div className="parity-eyebrow">COMPANY DECISION</div>
      <div className="parity-modal-head">
        <div><h2>{pending.title || '公司重大決策'}</h2><p>{pending.desc}</p></div>
        <span>期限 Day {pending.deadlineDay ?? pending.deadline_day ?? '—'}</span>
      </div>
      <div className="parity-choice-grid">
        {(pending.choices || []).map((choice, index) => <button type="button" key={`${choice.label}-${index}`} disabled={busy} onClick={() => choose(index)}>
          <strong>{choice.label || `方案 ${index + 1}`}</strong>
          <span>{choice.result || '採取此方案。'}</span>
          <small>
            現金 {Number(choice.cash || 0) >= 0 ? '+' : ''}{money(choice.cash || 0)}　
            品牌 {Number(choice.brand || 0) >= 0 ? '+' : ''}{Number(choice.brand || 0).toFixed(1)}　
            法律 Heat {Number(choice.legal || 0) >= 0 ? '+' : ''}{Number(choice.legal || 0).toFixed(1)}
          </small>
        </button>)}
      </div>
      {notice && <div className="parity-notice">{notice}</div>}
      <div className="parity-modal-foot">長時間推進在「暫停等待」策略下會停在這裡，不會自動替你跳過重大公司決策。</div>
    </section>
  </div>
}

function PowerSpecialDock({ active }) {
  const [open, setOpen] = useState(false)
  const [power, setPower] = useState(null)
  const [assets, setAssets] = useState([])
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState('neutral')
  const [amount, setAmount] = useState(10000)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    if (!active) return
    try {
      const [p, snap] = await Promise.all([getPowerRisk(), getMarketSnapshot()])
      setPower(p)
      const rows = (snap?.assets || []).filter((item) => item.symbol && item.symbol !== 'MYCO')
      setAssets(rows)
      setSymbol((current) => current || rows[0]?.symbol || '')
    } catch (error) {
      setNotice(error.message || '權力資料載入失敗')
    }
  }

  useEffect(() => {
    if (!active) return undefined
    load()
    const timer = window.setInterval(load, 6000)
    return () => window.clearInterval(timer)
  }, [active])

  const politics = power?.politics || {}
  const underworld = power?.underworld || {}
  const selected = useMemo(() => assets.find((item) => item.symbol === symbol), [assets, symbol])

  async function run(action, payload = {}) {
    setBusy(true); setNotice('')
    try {
      const result = await powerRiskAction(action, payload)
      if (!result?.ok) throw new Error(result?.message || '操作失敗')
      setPower(result.powerRisk || power)
      setNotice(result.message || '操作完成')
    } catch (error) {
      setNotice(error.message || '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  if (!active) return null

  return <aside className={`parity-power-dock ${open ? 'open' : ''}`}>
    <button type="button" className="parity-power-toggle" onClick={() => setOpen((value) => !value)}>
      ⚡ 特殊權力行動 {open ? '×' : '›'}
    </button>
    {open && <div className="parity-power-body">
      <div className="parity-power-stats">
        <span>政治 Lv.{politics.level || 0}</span><span>影響力 {Number(politics.influence || 0).toFixed(1)}</span>
        <span>地下 Lv.{underworld.rank || 0}</span><span>黑金 {money(underworld.dirtyMoney || 0)}</span>
      </div>
      <label><span>市場標的</span><select value={symbol} onChange={(event) => setSymbol(event.target.value)}>{assets.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}・{item.name}</option>)}</select></label>
      {selected && <small className="parity-selected-asset">目前：{selected.name}｜{money(selected.price)}</small>}

      <div className="parity-special-card">
        <div><strong>政治關說</strong><span>冷卻 {Number(politics.stockCooldownDays || 0)} 日</span></div>
        <p>消耗現金與政治影響力，安排隔日正面市場事件；會留下法律風險。</p>
        <button type="button" disabled={busy || !symbol || Number(politics.level || 0) < 1 || Number(politics.stockCooldownDays || 0) > 0} onClick={() => run('political_lobby', { symbol })}>對 {symbol || '標的'} 發動</button>
      </div>

      <div className="parity-special-card">
        <div><strong>地下黑函</strong><span>冷卻 {Number(underworld.marketCooldownDays || 0)} 日</span></div>
        <p>使用非法資金安排隔日負面市場事件；失敗時可能形成反向效果。</p>
        <button type="button" disabled={busy || !symbol || Number(underworld.rank || 0) < 1 || Number(underworld.marketCooldownDays || 0) > 0} onClick={() => run('underworld_smear', { symbol })}>對 {symbol || '標的'} 散布黑函</button>
      </div>

      <div className="parity-special-card dangerous">
        <div><strong>地下政治介入</strong><span>冷卻 {Number(underworld.blackPoliticalCooldownDays || 0)} 日</span></div>
        <p>使用黑金干預遊戲內政治方向，失敗或曝光會提高法律與聲望風險。</p>
        <div className="parity-inline-form">
          <select value={direction} onChange={(event) => setDirection(event.target.value)}><option value="far_left">全民福祉（極左）</option><option value="left">社會市場（左）</option><option value="neutral">中間平衡</option><option value="right">市場保守（右）</option><option value="far_right">資本極化（極右）</option></select>
          <input type="number" min="5000" step="1000" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </div>
        <button type="button" disabled={busy || Number(underworld.rank || 0) < 2 || Number(underworld.blackPoliticalCooldownDays || 0) > 0 || amount < 5000} onClick={() => run('black_political_intervention', { direction, amount })}>投入 {money(amount)}</button>
      </div>
      {notice && <div className="parity-notice">{notice}</div>}
    </div>}
  </aside>
}

export default function ParityActions({ mode }) {
  return <>
    <CompanyDecisionOverlay />
    <PowerSpecialDock active={mode === 'life'} />
  </>
}
