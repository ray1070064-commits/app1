import { useEffect, useMemo, useState } from 'react'
import { featureAction, getFeatureState } from '../api/client.js'

const TABS = [
  ['property', '房產／車輛'],
  ['health', '健康／醫療'],
  ['achievements', '成就'],
  ['titles', '稱號'],
  ['challenge', '挑戰／退休'],
]

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2 }).format(Number(value || 0))
}

function Metric({ label, value, hint }) {
  return <div className="feature-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}

function AssetCatalog({ title, rows, type, busy, run }) {
  return <section className="feature-card">
    <div className="feature-card-title"><h3>{title}</h3></div>
    <div className="feature-asset-grid">
      {rows.map((item) => <article className="feature-asset-card" key={item.key}>
        <div className="feature-asset-head"><div><strong>{item.name}</strong><span>{item.level}</span></div><b>{money(item.price)}</b></div>
        <p>{item.desc}</p>
        <div className="feature-asset-meta"><span>持有 {Number(item.owned || 0).toFixed(0)}</span><span>每日減壓 {Number(item.stressReduction || 0).toFixed(1)}</span><span>維護 {money(item.dailyUpkeep)}/日</span></div>
        <div className="feature-actions"><button type="button" disabled={busy} onClick={() => run(`buy_${type}`, { key: item.key, quantity: 1 })}>購入</button><button type="button" disabled={busy || Number(item.owned || 0) <= 0} onClick={() => run(`sell_${type}`, { key: item.key, quantity: 1 })}>出售</button></div>
      </article>)}
    </div>
  </section>
}

export default function FeatureCenter({ player, onMarket, onLife, onExit }) {
  const [tab, setTab] = useState('property')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [healthThreshold, setHealthThreshold] = useState(45)
  const [stressThreshold, setStressThreshold] = useState(82)

  async function load() {
    try {
      const result = await getFeatureState()
      setData(result)
      setHealthThreshold(Number(result?.health?.autoHealthThreshold ?? 45))
      setStressThreshold(Number(result?.health?.autoStressThreshold ?? 82))
    } catch (error) {
      setNotice(error.message || '擴充資料載入失敗')
    }
  }

  useEffect(() => { load() }, [])

  async function run(action, payload = {}) {
    setBusy(true); setNotice('')
    try {
      const result = await featureAction(action, payload)
      if (result?.features) setData(result.features)
      if (!result?.ok) throw new Error(result?.message || '操作失敗')
      setNotice(result.message || '操作完成')
    } catch (error) {
      setNotice(error.message || '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  const progress = data?.progress || {}
  const health = data?.health || {}
  const challenge = progress.challenge
  const unlockedAchievements = useMemo(() => (progress.achievements || []).filter((item) => item.unlocked).length, [progress.achievements])
  const unlockedTitles = useMemo(() => (progress.titles || []).filter((item) => item.unlocked).length, [progress.titles])

  if (!data) return <main className="terminal-shell feature-shell"><div className="empty-state">載入資產／健康／生涯資料…</div></main>

  return <main className="terminal-shell feature-shell">
    <header className="terminal-topbar feature-topbar">
      <div className="brand-inline"><span>◈</span><strong>資本人生</strong></div>
      <div className="top-stats"><span>Lv.{progress.level || 1}</span><span>{progress.title || '人生新手'}</span><span>XP <strong>{Number(progress.xp || 0).toLocaleString()}</strong></span><span>現金 <strong>{money(data.account?.cash)}</strong></span><span>權益 <strong>{money(data.account?.equity)}</strong></span></div>
      <div className="mode-switch"><button type="button" className="ghost-button" onClick={onMarket}>📈 市場</button><button type="button" className="ghost-button" onClick={onLife}>👤 人生／經營</button><button type="button" className="ghost-button active">🏠 資產／健康／生涯</button></div>
      <button type="button" className="ghost-button" onClick={onExit}>主選單</button>
    </header>

    <section className="feature-layout">
      <nav className="feature-nav">{TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <section className="feature-content">
        {notice && <div className="life-notice">{notice}</div>}
        {data.gameOver && <div className="feature-gameover">{data.gameOverReason || '這段人生已結束'}</div>}

        {tab === 'property' && <div className="feature-stack">
          <div className="feature-metric-grid"><Metric label="房車每日維護" value={money(data.property?.dailyUpkeep || 0)} hint="會隨每日生活結算扣除" /><Metric label="現金" value={money(data.account?.cash)} /><Metric label="總權益" value={money(data.account?.equity)} /><Metric label="持有房產" value={String((data.property?.houses || []).reduce((sum, item) => sum + Number(item.owned || 0), 0))} /></div>
          <AssetCatalog title="房地產" rows={data.property?.houses || []} type="house" busy={busy || data.gameOver} run={run} />
          <AssetCatalog title="車輛" rows={data.property?.vehicles || []} type="vehicle" busy={busy || data.gameOver} run={run} />
        </div>}

        {tab === 'health' && <div className="feature-stack">
          <div className="feature-metric-grid"><Metric label="健康" value={`${Number(health.health || 0).toFixed(0)}/100`} /><Metric label="壓力" value={`${Number(health.stress || 0).toFixed(0)}/100`} /><Metric label="健檢保護" value={`${Number(health.checkupBuffDays || 0)} 天`} /><Metric label="自動醫療累計" value={money(health.autoMedicalSpent || 0)} /></div>
          <section className="feature-card"><div className="feature-card-title"><h3>醫療與休養</h3></div><div className="feature-actions large"><button type="button" disabled={busy || data.gameOver} onClick={() => run('medical_checkup')}>健康檢查 $1,000</button><button type="button" disabled={busy || data.gameOver} onClick={() => run('stress_recovery')}>休養減壓 $800</button></div></section>
          <section className="feature-card"><div className="feature-card-title"><h3>目前疾病</h3></div>{health.activeIllnesses?.length ? <div className="feature-record-list">{health.activeIllnesses.map((illness, index) => <div className="feature-record" key={`${illness.name}-${index}`}><div><strong>{illness.name}</strong><span>剩餘 {Number(illness.remaining_days || 0)} 天</span></div><button type="button" disabled={busy || data.gameOver} onClick={() => run('treat_illness', { index })}>治療 $3,000</button></div>)}</div> : <div className="tool-empty">目前沒有持續性疾病。</div>}</section>
          <section className="feature-card"><div className="feature-card-title"><h3>自動醫療</h3></div><div className="feature-auto-grid"><label className="toggle-row compact-toggle"><span>啟用自動醫療</span><input type="checkbox" checked={Boolean(health.autoMedical)} onChange={(e) => run('set_auto_medical', { enabled: e.target.checked, healthThreshold, stressThreshold })} /></label><label><span>健康觸發門檻</span><input type="number" min="10" max="90" value={healthThreshold} onChange={(e) => setHealthThreshold(Number(e.target.value))} /></label><label><span>壓力觸發門檻</span><input type="number" min="40" max="99" value={stressThreshold} onChange={(e) => setStressThreshold(Number(e.target.value))} /></label><button type="button" disabled={busy || data.gameOver} onClick={() => run('set_auto_medical', { enabled: Boolean(health.autoMedical), healthThreshold, stressThreshold })}>儲存門檻</button></div></section>
        </div>}

        {tab === 'achievements' && <div className="feature-stack"><div className="feature-metric-grid"><Metric label="成就" value={`${unlockedAchievements}/${progress.achievements?.length || 0}`} /><Metric label="角色等級" value={`Lv.${progress.level || 1}`} /><Metric label="XP" value={Number(progress.xp || 0).toLocaleString()} /><Metric label="目前稱號" value={progress.title || '人生新手'} /></div><section className="feature-card"><div className="feature-badge-grid">{(progress.achievements || []).map((item) => <div className={`feature-badge ${item.unlocked ? 'unlocked' : ''}`} key={item.key}><strong>{item.unlocked ? '✅ ' : '⬜ '}{item.name}</strong><span>{item.desc}</span><small>XP {item.xp}・{money(item.cash)}</small></div>)}</div></section></div>}

        {tab === 'titles' && <div className="feature-stack"><div className="feature-metric-grid"><Metric label="已解鎖稱號" value={`${unlockedTitles}/${progress.titles?.length || 0}`} /><Metric label="展示中" value={progress.title || '人生新手'} /></div><section className="feature-card"><div className="feature-title-grid">{(progress.titles || []).map((item) => <button type="button" className={`feature-title ${item.unlocked ? 'unlocked' : ''} ${item.selected ? 'selected' : ''}`} key={item.key} disabled={!item.unlocked || busy} onClick={() => run('select_title', { key: item.key })}><strong>{item.name}</strong><span>{item.category}</span><small>{item.desc}</small>{item.selected && <b>展示中</b>}</button>)}</div></section></div>}

        {tab === 'challenge' && <div className="feature-stack">
          <section className="feature-card challenge-card"><div className="feature-card-title"><h3>30 天挑戰</h3><span>{challenge?.daysLeft ?? 0} 天後結算</span></div>{challenge ? <><h2>{challenge.name}</h2><p>{challenge.desc}</p><div className={`challenge-status ${challenge.met ? 'done' : ''}`}>{challenge.status}</div><div className="feature-actions"><button type="button" disabled={busy || data.gameOver} onClick={() => run('refresh_challenge')}>更換挑戰</button></div></> : <div className="tool-empty">尚未建立挑戰。</div>}</section>
          <section className="feature-card"><div className="feature-card-title"><h3>挑戰紀錄</h3></div><div className="feature-record-list">{(progress.challengeHistory || []).slice().reverse().map((row, index) => <div className="feature-record" key={`${row.day}-${index}`}><div><strong>{row.success ? '✅' : '❌'} {row.name}</strong><span>Day {row.day}</span></div></div>)}{!progress.challengeHistory?.length && <div className="tool-empty">尚無紀錄。</div>}</div></section>
          <section className="feature-card retirement-card"><div className="feature-card-title"><h3>退休／人生結算</h3></div>{progress.retirement ? <div className="retirement-result"><strong>{progress.retirement.grade}</strong><span>{Number(progress.retirement.score || 0).toFixed(1)} 分</span><small>Day {progress.retirement.day}・{Number(progress.retirement.age || 0).toFixed(1)} 歲・權益 {money(progress.retirement.equity)}</small></div> : <><p>退休會永久結束目前這段人生，依財富、投資、風控、職涯、家庭、健康、成就、守法等面向進行結算。</p><button type="button" className="retire-button" disabled={busy || data.gameOver} onClick={() => { if (window.confirm('確定退休並結束目前這段人生？此操作會進入最終評級。')) run('retire') }}>退休並結算</button></>}</section>
        </div>}
      </section>
    </section>
  </main>
}
