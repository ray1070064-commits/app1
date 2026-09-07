import { useCallback, useEffect, useState } from 'react'
import {
  getCareer,
  getCompany,
  getFamily,
  getLife,
  getMarketSnapshot,
  getPowerRisk,
} from '../api/client.js'
import CareerPanel from './p1/CareerPanel.jsx'
import CompanyPanel from './p2/CompanyPanel.jsx'
import FamilyPanel from './p1/FamilyPanel.jsx'
import { LifeStoryPanel, SavePanel } from './p1/LifeStoryPanel.jsx'
import PowerPanel from './p2/PowerPanel.jsx'
import { Metric, Section, money } from './p1/P1Ui.jsx'

const TABS = [
  ['overview', '總覽'], ['career', '職涯'], ['family', '家庭'], ['company', '公司'],
  ['power', '權力／法律'], ['life', '人生故事'], ['save', '存檔'],
]

function Overview({ data }) {
  const snap = data.snapshot || {}, account = snap.account || {}, career = data.career || snap.career || {}
  const family = (data.family || snap.family || {}).family || {}
  const company = (data.company || snap.playerCompany || {}).company || {}
  const power = data.power || snap.powerRisk || {}, life = data.life || snap.life || {}
  return <div className="life-stack">
    <div className="life-metric-grid">
      <Metric label="現金" value={money(account.cash)} /><Metric label="總權益" value={money(account.equity)} />
      <Metric label="健康" value={`${Number(snap.health ?? 100).toFixed(0)}/100`} /><Metric label="壓力" value={`${Number(snap.stress ?? 0).toFixed(0)}/100`} />
      <Metric label="職涯" value={career.currentJob?.name || '待業'} hint={career.currentEmployer?.name || career.employer || ''} />
      <Metric label="家庭" value={family.married ? `已婚・${family.children || 0} 子女` : family.dating ? '交往中' : '單身'} />
      <Metric label="公司" value={company.exists ? company.name : '尚未創業'} hint={company.exists ? `${company.ticker || 'PCOR'}・${company.public ? '已上市' : '私人公司'}` : ''} />
      <Metric label="法律 Heat" value={Number(power.legal?.heat || 0).toFixed(1)} hint={power.legal?.case?.stage || '無案件'} />
    </div>
    {life.pendingEvent && <Section title="目前需要你決定" className="deep-alert-card"><div className="decision-highlight"><strong>{life.pendingEvent.title}</strong><p>{life.pendingEvent.desc}</p><small>期限 Day {life.pendingEvent.deadline_day || life.pendingEvent.deadlineDay || '—'}</small></div></Section>}
    <Section title="這段人生"><div className="life-summary-row"><span>Day {snap.day || 1}</span><span>{Number(snap.age || 25).toFixed(1)} 歲</span><span>XP {life.xp || 0}</span><span>聲望 {Number(life.reputation || career.reputation || 50).toFixed(0)}</span><span>故事記憶 {life.memories?.length || 0}</span><span>待續事件 {life.followupCount || 0}</span></div></Section>
    <Section title="正式頁整合"><div className="deep-chip-row"><span>職涯：公司跳槽已整合</span><span>家庭：候選人／冷卻／婚育已整合</span><span>公司：創業／MYCO／批次人事已整合</span><span>權力：特殊行動／非法資金 Ledger 已整合</span></div></Section>
  </div>
}

export default function P1LifeCenter({ player, onMarket, onExit, onRestored }) {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({ snapshot: player.snapshot || null, career: null, family: null, company: null, power: null, life: null })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const results = await Promise.allSettled([getMarketSnapshot(), getCareer(), getFamily(), getCompany(), getPowerRisk(), getLife()])
    setData((current) => ({
      ...current,
      snapshot: results[0].status === 'fulfilled' ? results[0].value : current.snapshot,
      career: results[1].status === 'fulfilled' ? results[1].value : current.career,
      family: results[2].status === 'fulfilled' ? results[2].value : current.family,
      company: results[3].status === 'fulfilled' ? results[3].value : current.company,
      power: results[4].status === 'fulfilled' ? results[4].value : current.power,
      life: results[5].status === 'fulfilled' ? results[5].value : current.life,
    }))
    const failed = results.find((row) => row.status === 'rejected')
    if (failed) setNotice(failed.reason?.message || '部分人生資料載入失敗')
  }, [])

  useEffect(() => { load() }, [load])

  async function run(fn, action, payload = {}) {
    setBusy(true); setNotice('')
    try {
      const result = await fn(action, payload)
      if (result?.ok === false) throw new Error(result.message || '操作失敗')
      setNotice(result?.message || '操作完成')
      await load()
      return result
    } catch (error) {
      setNotice(error.message || '操作失敗')
      return null
    } finally { setBusy(false) }
  }

  const snapshot = data.snapshot || {}, account = snapshot.account || {}
  let content = <Overview data={data} />
  if (tab === 'career') content = data.career ? <CareerPanel career={data.career} busy={busy} run={run} /> : null
  if (tab === 'family') content = data.family ? <FamilyPanel familyData={data.family} busy={busy} run={run} /> : null
  if (tab === 'company') content = data.company ? <CompanyPanel companyData={data.company} busy={busy} run={run} /> : null
  if (tab === 'power') content = data.power ? <PowerPanel power={data.power} market={snapshot} busy={busy} run={run} /> : null
  if (tab === 'life') content = data.life ? <LifeStoryPanel life={data.life} busy={busy} run={run} /> : null
  if (tab === 'save') content = <SavePanel onRestored={onRestored} busy={busy} setBusy={setBusy} setNotice={setNotice} />

  return <main className="terminal-shell life-shell">
    <header className="terminal-topbar life-topbar">
      <div className="brand-inline"><span>◈</span><strong>資本人生</strong></div>
      <div className="top-stats"><span>Day {snapshot.day || 1}</span><span>{Number(snapshot.age || player.startAge || 25).toFixed(1)} 歲</span><span>現金 <strong>{money(account.cash)}</strong></span><span>權益 <strong>{money(account.equity)}</strong></span></div>
      <div className="mode-switch"><button type="button" className="ghost-button" onClick={onMarket}>📈 市場</button><button type="button" className="ghost-button active">👤 人生／經營</button></div>
      <button type="button" className="ghost-button" onClick={onExit}>主選單</button>
    </header>
    <section className="life-layout"><nav className="life-nav">{TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><section className="life-content">{notice && <div className="life-notice">{notice}</div>}{content || <div className="empty-state">載入中…</div>}</section></section>
  </main>
}
