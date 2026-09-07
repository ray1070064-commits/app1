import { useEffect, useMemo, useState } from 'react'
import { featureAction, getFeatureState } from '../api/client.js'

const FREQUENCIES = [
  [7, '每 7 天'],
  [14, '每 14 天'],
  [30, '每 30 天'],
  [90, '每 90 天'],
]

export default function MarketAutomationPanel({ asset, positions = [] }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [amount, setAmount] = useState('500')
  const [frequency, setFrequency] = useState(30)
  const [side, setSide] = useState('SPOT')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [trailingPct, setTrailingPct] = useState('')

  const heldSides = useMemo(() => positions
    .filter((position) => position.symbol === asset.symbol && Number(position.quantity || 0) > 0)
    .map((position) => position.mode), [positions, asset.symbol])

  useEffect(() => {
    if (heldSides.length && !heldSides.includes(side)) setSide(heldSides[0])
  }, [heldSides, side])

  useEffect(() => {
    let active = true
    getFeatureState()
      .then((result) => { if (active) setData(result) })
      .catch(() => {})
    return () => { active = false }
  }, [asset.symbol])

  const plan = data?.marketTools?.dcaPlans?.[asset.symbol]
  const protectiveKey = `${asset.symbol}:${side}`
  const protective = data?.marketTools?.protectiveOrders?.[protectiveKey]

  async function run(action, payload) {
    setBusy(true); setNotice('')
    try {
      const result = await featureAction(action, payload)
      if (result?.features) setData(result.features)
      if (!result?.ok) throw new Error(result?.message || '操作失敗')
      setNotice(result.message || '已更新')
    } catch (error) {
      setNotice(error.message || '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  return <section className="market-tools-block">
    <div className="section-mini-title">自動投資／風控</div>

    <div className="market-tool-card">
      <div className="market-tool-heading">
        <div><strong>DCA 定期定額</strong><small>{asset.symbol}</small></div>
        {plan?.enabled && <span className="tool-status active">啟用中</span>}
      </div>
      <div className="tool-grid two">
        <label><span>每次投入</span><input type="number" min="10" step="10" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label><span>頻率</span><select value={frequency} onChange={(e) => setFrequency(Number(e.target.value))}>{FREQUENCIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {plan && <div className="tool-summary">目前：${Number(plan.amount || 0).toLocaleString()} ／ {Number(plan.frequency || 30)} 天一次 ／ 下次 Day {Number(plan.next_day ?? plan.nextDay ?? 0)}</div>}
      <div className="tool-actions">
        <button type="button" disabled={busy || Number(amount) < 10} onClick={() => run('set_dca', { symbol: asset.symbol, amount: Number(amount), frequency })}>儲存 DCA</button>
        <button type="button" disabled={busy || !plan?.enabled} onClick={() => run('stop_dca', { symbol: asset.symbol })}>停止</button>
      </div>
    </div>

    <div className="market-tool-card">
      <div className="market-tool-heading"><div><strong>停損／停利／追蹤停損</strong><small>依日內 O-H-L-C／O-L-H-C 路徑觸發</small></div></div>
      {heldSides.length > 0 ? <>
        <div className="tool-side-tabs">{heldSides.map((item) => <button type="button" key={item} className={side === item ? 'active' : ''} onClick={() => setSide(item)}>{item}</button>)}</div>
        <div className="tool-grid three">
          <label><span>停損價</span><input type="number" min="0" step="0.0001" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="選填" /></label>
          <label><span>停利價</span><input type="number" min="0" step="0.0001" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="選填" /></label>
          <label><span>追蹤停損 %</span><input type="number" min="0.1" max="50" step="0.1" value={trailingPct} onChange={(e) => setTrailingPct(e.target.value)} placeholder="選填" /></label>
        </div>
        {protective && <div className="tool-summary">目前：停損 {protective.stop_loss ?? '—'} ／ 停利 {protective.take_profit ?? '—'} ／ 追蹤 {protective.trailing_pct ? `${(Number(protective.trailing_pct) * 100).toFixed(1)}%` : '—'}</div>}
        <div className="tool-actions">
          <button type="button" disabled={busy || (!stopLoss && !takeProfit && !trailingPct)} onClick={() => run('set_protective', { symbol: asset.symbol, side, stopLoss, takeProfit, trailingPct })}>套用風控</button>
          <button type="button" disabled={busy || !protective} onClick={() => run('clear_protective', { symbol: asset.symbol, side })}>清除</button>
        </div>
      </> : <div className="tool-empty">先建立 {asset.symbol} 持倉後即可設定風控單。</div>}
    </div>

    {notice && <div className="tool-notice">{notice}</div>}
  </section>
}
