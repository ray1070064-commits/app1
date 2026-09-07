import { useEffect, useMemo, useState } from 'react'
import { featureAction, getFeatureState } from '../api/client.js'

const TABS = [['analytics', '資產總覽'], ['property', '房產／車輛'], ['health', '生活／健康'], ['achievements', '成就'], ['titles', '稱號'], ['challenge', '挑戰／退休']]
function money(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2 }).format(Number(value || 0)) }
function Metric({ label, value, hint }) { return <div className="feature-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div> }
function AssetCatalog({ title, rows, type, busy, run }) { return <section className="feature-card"><div className="feature-card-title"><h3>{title}</h3></div><div className="feature-asset-grid">{rows.map((item) => <article className="feature-asset-card" key={item.key}><div className="feature-asset-head"><div><strong>{item.name}</strong><span>{item.level}</span></div><b>{money(item.price)}</b></div><p>{item.desc}</p><div className="feature-asset-meta"><span>持有 {Number(item.owned || 0).toFixed(0)}</span><span>每日減壓 {Number(item.stressReduction || 0).toFixed(1)}</span><span>維護 {money(item.dailyUpkeep)}/日</span></div><div className="feature-actions"><button type="button" disabled={busy} onClick={() => run(`buy_${type}`, { key: item.key, quantity: 1 })}>購入</button><button type="button" disabled={busy || Number(item.owned || 0) <= 0} onClick={() => run(`sell_${type}`, { key: item.key, quantity: 1 })}>出售</button></div></article>)}</div></section> }

function EquityCurve({ rows }) {
  if (!rows?.length) return <div className="tool-empty">權益曲線會在遊戲推進後開始累積。</div>
  const width = 760, height = 220, pad = 18
  const values = rows.map((row) => Number(row.equity || 0))
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(1, max - min)
  const points = rows.map((row, index) => {
    const x = pad + (index / Math.max(1, rows.length - 1)) * (width - pad * 2)
    const y = height - pad - ((Number(row.equity || 0) - min) / span) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return <div className="p1-equity-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="權益曲線"><line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} /><polyline points={points} /></svg><div><span>Day {rows[0].day}</span><strong>{money(rows.at(-1)?.equity)}</strong><span>Day {rows.at(-1)?.day}</span></div></div>
}

function RiskRadar({ radar }) {
  const axes = radar?.axes || []
  if (axes.length < 3) return <div className="tool-empty">風險雷達等待資料。</div>
  const center = 120, radius = 90
  function point(index, value = 100) { const angle = -Math.PI / 2 + index * (Math.PI * 2 / axes.length); const r = radius * Number(value || 0) / 100; return [center + Math.cos(angle) * r, center + Math.sin(angle) * r] }
  const outer = axes.map((_, index) => point(index, 100).map((v) => v.toFixed(1)).join(',')).join(' ')
  const actual = axes.map((axis, index) => point(index, axis.value).map((v) => v.toFixed(1)).join(',')).join(' ')
  return <div className="p1-radar-wrap"><svg viewBox="0 0 240 240" role="img" aria-label="Risk Radar"><polygon className="radar-outer" points={outer} />{axes.map((_, index) => { const [x, y] = point(index, 100); return <line key={index} x1={center} y1={center} x2={x} y2={y} /> })}<polygon className="radar-value" points={actual} />{axes.map((axis, index) => { const [x, y] = point(index, 116); return <text key={axis.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{axis.label}</text> })}</svg><div className="p1-risk-score"><strong>{Number(radar.score || 0).toFixed(1)}</strong><span>整體風險・{radar.level || '—'}</span></div></div>
}

function AnalyticsPanel({ data }) {
  const analytics = data.analytics || {}, allocation = analytics.allocation || {}, radar = analytics.riskRadar || {}, expenses = analytics.expenses || {}
  const maxExpense = Math.max(1, ...(expenses.lifetime || []).map((row) => Number(row.value || 0)))
  return <div className="feature-stack">
    <div className="feature-metric-grid">
      <Metric label="總權益" value={money(allocation.equity || data.account?.equity)} />
      <Metric label="現金" value={money(allocation.cash || data.account?.cash)} />
      <Metric label="房車資產" value={money(allocation.propertyValue)} />
      <Metric label="Gross Exposure" value={money(allocation.grossExposure)} hint={`槓桿 ${Number(allocation.leverageRatio || 0).toFixed(2)}×`} />
      <Metric label="最大回撤" value={`${Number(radar.maxDrawdown || 0).toFixed(2)}%`} />
      <Metric label="現金緩衝" value={`${Number(radar.cashBufferDays || 0).toFixed(1)} 天`} />
    </div>

    <div className="p1-analytics-grid">
      <section className="feature-card p1-span-2"><div className="feature-card-title"><h3>權益曲線</h3><span>最多顯示最近 730 日</span></div><EquityCurve rows={analytics.equityCurve || []} /></section>
      <section className="feature-card"><div className="feature-card-title"><h3>Risk Radar</h3><span>0 低風險 → 100 高風險</span></div><RiskRadar radar={radar} /><div className="p1-risk-details"><span>日權益波動 {Number(radar.dailyEquityVolatility || 0).toFixed(2)}%</span><span>Gross {money(radar.grossExposure)}</span></div></section>
    </div>

    <div className="p1-analytics-grid">
      <section className="feature-card"><div className="feature-card-title"><h3>資產配置</h3></div><div className="p1-bar-list">{(allocation.components || []).map((row) => <div className="p1-bar-row" key={row.key}><div><span>{row.label}</span><strong>{money(row.value)}・{Number(row.weight || 0).toFixed(1)}%</strong></div><div><i style={{ width: `${Math.max(0, Math.min(100, Number(row.weight || 0)))}%` }} /></div></div>)}</div></section>
      <section className="feature-card"><div className="feature-card-title"><h3>市場曝險</h3></div><div className="feature-record-list">{(allocation.exposures || []).slice(0, 10).map((row) => <div className="feature-record" key={row.symbol}><div><strong>{row.symbol}・{row.name}</strong><span>{row.category}・{Number(row.grossWeight || 0).toFixed(1)}%</span></div><small>Gross {money(row.grossExposure)}｜Net {money(row.netExposure)}</small></div>)}{!allocation.exposures?.length && <div className="tool-empty">尚無市場持倉。</div>}</div></section>
      <section className="feature-card p1-span-2"><div className="feature-card-title"><h3>完整費用統計</h3><span>已追蹤 {money(expenses.trackedTotal)}</span></div><div className="p1-expense-summary"><span>家庭累計收入 {money(expenses.familyIncomeTotal)}</span><span>投資現金流收入 {money(expenses.investmentIncomeReceived)}</span>{(expenses.daily || []).map((row) => <span key={row.key}>{row.label} {money(row.value)}</span>)}</div><div className="p1-expense-grid">{(expenses.lifetime || []).map((row) => <div key={row.key}><div><span>{row.label}</span><strong>{money(row.value)}</strong></div><div><i style={{ width: `${Math.max(1, Number(row.value || 0) / maxExpense * 100)}%` }} /></div></div>)}</div></section>
    </div>
  </div>
}

function Settlement({ result }) {
  const components = Object.entries(result.components || {})
  return <div className="settlement-full"><div className="settlement-hero"><strong>{result.grade}</strong><div><h2>{result.finalTitle || '人生結算'}</h2><p>{Number(result.score || 0).toFixed(2)} 分・主導路線「{result.dominantRoute || '人生'}」</p>{result.retirementRoute && <small>退休路線：{result.retirementRoute}{result.successorName ? `・接班人 ${result.successorName}` : ''}</small>}</div></div><div className="feature-metric-grid"><Metric label="最終權益" value={money(result.equity)} /><Metric label="ROI" value={`${Number(result.roi || 0).toFixed(2)}%`} /><Metric label="最大回撤" value={`${Number(result.maxDrawdown || 0).toFixed(2)}%`} /><Metric label="人生時間" value={`Day ${result.day}・${Number(result.age || 0).toFixed(1)} 歲`} /></div><div className="settlement-score-grid">{components.map(([key, value]) => <div key={key}><span>{key}</span><strong>{Number(value || 0).toFixed(1)}</strong><div><i style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></div></div>)}</div><div className="settlement-rank-row"><div><span>最強三項</span><strong>{(result.topDimensions || []).map((x) => x[0]).join('・') || '—'}</strong></div><div><span>最弱三項</span><strong>{(result.weakDimensions || []).map((x) => x[0]).join('・') || '—'}</strong></div></div></div>
}

export default function P1FeatureCenter({ player, onMarket, onLife, onExit }) {
  const [tab, setTab] = useState('analytics')
  const [data, setData] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const [healthThreshold, setHealthThreshold] = useState(45), [stressThreshold, setStressThreshold] = useState(82), [livingCost, setLivingCost] = useState(50)
  const [retirementRoute, setRetirementRoute] = useState('stable'), [successorIndex, setSuccessorIndex] = useState('')

  async function load() {
    try {
      const result = await getFeatureState(); setData(result)
      setHealthThreshold(Number(result?.health?.autoHealthThreshold ?? 45)); setStressThreshold(Number(result?.health?.autoStressThreshold ?? 82)); setLivingCost(Number(result?.economy?.dailyLivingCost ?? 50))
      const routes = result?.retirementRoutes || []
      if (routes.length && !routes.some((row) => row.id === retirementRoute && row.eligible)) setRetirementRoute(routes.find((row) => row.eligible)?.id || 'stable')
    } catch (error) { setNotice(error.message || '擴充資料載入失敗') }
  }
  useEffect(() => { load() }, [])

  async function run(action, payload = {}) {
    setBusy(true); setNotice('')
    try {
      const result = await featureAction(action, payload)
      if (!result?.ok) throw new Error(result?.message || '操作失敗')
      if (result?.features) setData(result.features); else await load()
      setNotice(result.message || '操作完成')
      return result
    } catch (error) { setNotice(error.message || '操作失敗'); return null }
    finally { setBusy(false) }
  }

  const progress = data?.progress || {}, health = data?.health || {}, challenge = progress.challenge
  const unlockedAchievements = useMemo(() => (progress.achievements || []).filter((item) => item.unlocked).length, [progress.achievements])
  const unlockedTitles = useMemo(() => (progress.titles || []).filter((item) => item.unlocked).length, [progress.titles])
  const routes = data?.retirementRoutes || [], selectedRoute = routes.find((row) => row.id === retirementRoute)
  useEffect(() => { const list = selectedRoute?.successors || []; if (list.length && !list.some((row) => String(row.index) === String(successorIndex))) setSuccessorIndex(String(list[0].index)) }, [retirementRoute, data?.account?.equity])

  if (!data) return <main className="terminal-shell feature-shell"><div className="empty-state">載入資產／健康／生涯資料…</div></main>

  async function retire() {
    if (!selectedRoute?.eligible) return
    if (!window.confirm(`確定選擇「${selectedRoute.name}」並結束目前這段人生？`)) return
    await run('retire', { route: selectedRoute.id, successorIndex: successorIndex === '' ? undefined : Number(successorIndex) })
  }

  return <main className="terminal-shell feature-shell">
    <header className="terminal-topbar feature-topbar"><div className="brand-inline"><span>◈</span><strong>資本人生</strong></div><div className="top-stats"><span>Lv.{progress.level || 1}</span><span>{progress.title || '人生新手'}</span><span>XP <strong>{Number(progress.xp || 0).toLocaleString()}</strong></span><span>現金 <strong>{money(data.account?.cash)}</strong></span><span>權益 <strong>{money(data.account?.equity)}</strong></span></div><div className="mode-switch"><button type="button" className="ghost-button" onClick={onMarket}>📈 市場</button><button type="button" className="ghost-button" onClick={onLife}>👤 人生／經營</button><button type="button" className="ghost-button active">🏠 資產／健康／生涯</button></div><button type="button" className="ghost-button" onClick={onExit}>主選單</button></header>
    <section className="feature-layout"><nav className="feature-nav">{TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><section className="feature-content">{notice && <div className="life-notice">{notice}</div>}{data.gameOver && <div className="feature-gameover">{data.gameOverReason || '這段人生已結束'}</div>}
      {tab === 'analytics' && <AnalyticsPanel data={data} />}
      {tab === 'property' && <div className="feature-stack"><div className="feature-metric-grid"><Metric label="房車每日維護" value={money(data.property?.dailyUpkeep || 0)} hint="會隨每日生活結算扣除" /><Metric label="現金" value={money(data.account?.cash)} /><Metric label="總權益" value={money(data.account?.equity)} /><Metric label="持有房產" value={String((data.property?.houses || []).reduce((sum, item) => sum + Number(item.owned || 0), 0))} /></div>{data.property?.lastMarketEvent && <section className="feature-card"><div className="feature-card-title"><h3>最近房車市場事件</h3><span>Day {data.property.lastMarketEvent.day}</span></div><p>{data.property.lastMarketEvent.title}｜{data.property.lastMarketEvent.desc}</p></section>}<AssetCatalog title="房地產" rows={data.property?.houses || []} type="house" busy={busy || data.gameOver} run={run} /><AssetCatalog title="車輛" rows={data.property?.vehicles || []} type="vehicle" busy={busy || data.gameOver} run={run} /></div>}
      {tab === 'health' && <div className="feature-stack"><div className="feature-metric-grid"><Metric label="健康" value={`${Number(health.health || 0).toFixed(0)}/100`} /><Metric label="壓力" value={`${Number(health.stress || 0).toFixed(0)}/100`} /><Metric label="健檢保護" value={`${Number(health.checkupBuffDays || 0)} 天`} /><Metric label="自動醫療累計" value={money(health.autoMedicalSpent || 0)} /></div><section className="feature-card"><div className="feature-card-title"><h3>每日生活費</h3><span>最低 {money(data.economy?.minimumLivingCost || 30)}</span></div><div className="feature-metric-grid"><Metric label="設定生活費" value={money(data.economy?.dailyLivingCost)} /><Metric label="昨日實際生活費" value={money(data.economy?.actualLivingCost)} /><Metric label="昨日個人稅" value={money(data.economy?.lastPersonalTax)} /><Metric label="昨日房車維護" value={money(data.economy?.dailyPropertyUpkeep)} /></div><div className="p1-inline-setting"><input type="number" min={data.economy?.minimumLivingCost || 30} step="10" value={livingCost} onChange={(e) => setLivingCost(Number(e.target.value))} /><button type="button" disabled={busy || Number(livingCost) < Number(data.economy?.minimumLivingCost || 30)} onClick={() => run('set_living_cost', { amount: livingCost })}>更新生活費</button></div></section><section className="feature-card"><div className="feature-card-title"><h3>醫療與休養</h3></div><div className="feature-actions large"><button type="button" disabled={busy || data.gameOver} onClick={() => run('medical_checkup')}>健康檢查 $3,000・健康 +25</button><button type="button" disabled={busy || data.gameOver} onClick={() => run('stress_recovery')}>休養 $2,000・壓力 -35</button></div></section><section className="feature-card"><div className="feature-card-title"><h3>目前疾病</h3></div>{health.activeIllnesses?.length ? <div className="feature-record-list">{health.activeIllnesses.map((illness, index) => <div className="feature-record" key={`${illness.name}-${index}`}><div><strong>{illness.name}</strong><span>剩餘 {Number(illness.remaining_days || 0)} 天</span></div><button type="button" disabled={busy || data.gameOver} onClick={() => run('treat_illness', { index })}>治療 $3,000</button></div>)}</div> : <div className="tool-empty">目前沒有持續性疾病。</div>}</section><section className="feature-card"><div className="feature-card-title"><h3>自動醫療</h3></div><div className="feature-auto-grid"><label className="toggle-row compact-toggle"><span>啟用自動醫療</span><input type="checkbox" checked={Boolean(health.autoMedical)} onChange={(e) => run('set_auto_medical', { enabled: e.target.checked, healthThreshold, stressThreshold })} /></label><label><span>健康觸發門檻</span><input type="number" min="10" max="90" value={healthThreshold} onChange={(e) => setHealthThreshold(Number(e.target.value))} /></label><label><span>壓力觸發門檻</span><input type="number" min="40" max="99" value={stressThreshold} onChange={(e) => setStressThreshold(Number(e.target.value))} /></label><button type="button" disabled={busy || data.gameOver} onClick={() => run('set_auto_medical', { enabled: Boolean(health.autoMedical), healthThreshold, stressThreshold })}>儲存門檻</button></div></section></div>}
      {tab === 'achievements' && <div className="feature-stack"><div className="feature-metric-grid"><Metric label="成就" value={`${unlockedAchievements}/${progress.achievements?.length || 0}`} /><Metric label="角色等級" value={`Lv.${progress.level || 1}`} /><Metric label="XP" value={Number(progress.xp || 0).toLocaleString()} /><Metric label="目前稱號" value={progress.title || '人生新手'} /></div><section className="feature-card"><div className="feature-badge-grid">{(progress.achievements || []).map((item) => <div className={`feature-badge ${item.unlocked ? 'unlocked' : ''}`} key={item.key}><strong>{item.unlocked ? '✅ ' : '⬜ '}{item.name}</strong><span>{item.desc}</span><small>XP {item.xp}・{money(item.cash)}</small></div>)}</div></section></div>}
      {tab === 'titles' && <div className="feature-stack"><div className="feature-metric-grid"><Metric label="已解鎖稱號" value={`${unlockedTitles}/${progress.titles?.length || 0}`} /><Metric label="展示中" value={progress.title || '人生新手'} /></div><section className="feature-card"><div className="feature-title-grid">{(progress.titles || []).map((item) => <button type="button" className={`feature-title ${item.unlocked ? 'unlocked' : ''} ${item.selected ? 'selected' : ''}`} key={item.key} disabled={!item.unlocked || busy} onClick={() => run('select_title', { key: item.key })}><strong>{item.name}</strong><span>{item.category}</span><small>{item.desc}</small>{item.selected && <b>展示中</b>}</button>)}</div></section></div>}
      {tab === 'challenge' && <div className="feature-stack"><section className="feature-card challenge-card"><div className="feature-card-title"><h3>30 天挑戰</h3><span>{challenge?.daysLeft ?? 0} 天後結算</span></div>{challenge ? <><h2>{challenge.name}</h2><p>{challenge.desc}</p><div className={`challenge-status ${challenge.met ? 'done' : ''}`}>{challenge.status}</div><div className="feature-actions"><button type="button" disabled={busy || data.gameOver} onClick={() => run('refresh_challenge')}>更換挑戰</button></div></> : <div className="tool-empty">尚未建立挑戰。</div>}</section><section className="feature-card"><div className="feature-card-title"><h3>挑戰紀錄</h3></div><div className="feature-record-list">{(progress.challengeHistory || []).slice().reverse().map((row, index) => <div className="feature-record" key={`${row.day}-${index}`}><div><strong>{row.success ? '✅' : '❌'} {row.name}</strong><span>Day {row.day}</span></div></div>)}{!progress.challengeHistory?.length && <div className="tool-empty">尚無紀錄。</div>}</div></section><section className="feature-card retirement-card"><div className="feature-card-title"><h3>退休／人生最終結算</h3></div>{progress.retirement ? <Settlement result={progress.retirement} /> : <><p>退休會永久結束目前這段人生。請先選擇退休／傳承路線，再進入 13 維度最終評級。</p><div className="p1-retirement-grid">{routes.map((route) => <button type="button" key={route.id} className={`${retirementRoute === route.id ? 'selected' : ''}`} disabled={!route.eligible || busy} onClick={() => setRetirementRoute(route.id)}><strong>{route.name}</strong><span>{route.desc}</span>{!route.eligible && <small>尚未符合條件</small>}</button>)}</div>{selectedRoute?.successors?.length > 0 && <label className="p1-successor"><span>接班子女</span><select value={successorIndex} onChange={(e) => setSuccessorIndex(e.target.value)}>{selectedRoute.successors.map((row) => <option key={row.index} value={row.index}>{row.name}・教育 Lv.{row.educationLevel}</option>)}</select></label>}<button type="button" className="retire-button" disabled={busy || data.gameOver || !selectedRoute?.eligible} onClick={retire}>以「{selectedRoute?.name || '退休'}」結束人生</button></>}</section></div>}
    </section></section>
  </main>
}
