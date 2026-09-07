import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  careerAction,
  clearBrowserSave,
  companyAction,
  exportSave,
  familyAction,
  getBrowserSaveMeta,
  getCareer,
  getCompany,
  getFamily,
  getLife,
  getMarketSnapshot,
  getPowerRisk,
  lifeAction,
  powerRiskAction,
  restoreSaveCode,
  saveCurrentGameToBrowser,
} from '../api/client.js'

const TABS = [
  ['overview', '總覽'],
  ['career', '職涯'],
  ['family', '家庭'],
  ['company', '公司'],
  ['power', '權力／風險'],
  ['life', '人生記憶'],
  ['save', '存檔'],
]

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

function pct(value, digits = 1) { return `${Number(value || 0).toFixed(digits)}%` }
function number(value, digits = 0) { return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: digits }) }

function Metric({ label, value, hint }) {
  return <div className="life-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}

function Section({ title, children, actions }) {
  return <section className="life-card"><div className="life-card-title"><h3>{title}</h3>{actions}</div>{children}</section>
}

function ActionButton({ children, onClick, disabled, tone = '' }) {
  return <button type="button" className={`life-action ${tone}`} disabled={disabled} onClick={onClick}>{children}</button>
}

function Overview({ data }) {
  const snap = data.snapshot || {}
  const account = snap.account || {}
  const career = data.career || snap.career || {}
  const family = (data.family || snap.family || {}).family || {}
  const company = (data.company || snap.playerCompany || {}).company || {}
  const power = data.power || snap.powerRisk || {}
  const life = data.life || snap.life || {}
  const pending = life.pendingEvent
  return <div className="life-stack">
    <div className="life-metric-grid">
      <Metric label="現金" value={money(account.cash)} />
      <Metric label="總權益" value={money(account.equity)} />
      <Metric label="健康" value={`${Number(snap.health ?? 100).toFixed(0)}/100`} />
      <Metric label="壓力" value={`${Number(snap.stress ?? 0).toFixed(0)}/100`} />
      <Metric label="職涯" value={career.currentJob?.name || '待業'} hint={career.employer || ''} />
      <Metric label="家庭" value={family.married ? `已婚・${family.children || 0} 子女` : family.dating ? '交往中' : '單身'} />
      <Metric label="公司" value={company.exists ? company.name : '尚未創業'} hint={company.public ? '已上市 MYCO' : company.exists ? '私人公司' : ''} />
      <Metric label="法律 Heat" value={Number(power.legal?.heat || 0).toFixed(1)} hint={power.legal?.case?.stage || '無案件'} />
    </div>
    {pending && <Section title="目前需要你決定"><div className="decision-highlight"><strong>{pending.title}</strong><p>{pending.desc}</p></div></Section>}
    <Section title="這段人生">
      <div className="life-summary-row">
        <span>Day {snap.day || 1}</span><span>{Number(snap.age || 25).toFixed(1)} 歲</span><span>XP {life.xp || 0}</span><span>聲望 {Number(life.reputation || career.reputation || 50).toFixed(0)}</span>
      </div>
    </Section>
  </div>
}

function CareerPanel({ career, busy, run }) {
  const current = career.currentJob
  const [jobId, setJobId] = useState('')
  const skills = Object.entries(career.skills || {})
  const jobs = career.jobs || []
  useEffect(() => { if (!jobId && jobs.length) setJobId(jobs[0].id) }, [jobId, jobs])
  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="目前職位" value={current?.name || '待業'} />
      <Metric label="日薪" value={money(current?.dailySalary || 0)} />
      <Metric label="職涯經驗" value={`${career.experienceDays || 0} 天`} />
      <Metric label="任職年資" value={`${career.employerDays || 0} 天`} />
      <Metric label="滿意度" value={Number(career.satisfaction || 0).toFixed(0)} />
      <Metric label="職涯穩定" value={Number(career.stability || 0).toFixed(0)} />
    </div>
    <Section title="職涯操作">
      <div className="life-action-row">
        <ActionButton disabled={busy || !current?.promotionTo} onClick={() => run(careerAction, 'promote', {})}>爭取升遷</ActionButton>
        <ActionButton disabled={busy || current?.id === 'unemployed'} tone="danger" onClick={() => run(careerAction, 'quit', {})}>離職</ActionButton>
      </div>
      <div className="inline-form">
        <select value={jobId} onChange={(e) => setJobId(e.target.value)}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.name}・{money(j.dailySalary)}/日</option>)}</select>
        <ActionButton disabled={busy || !jobId} onClick={() => run(careerAction, 'apply_job', { jobId })}>應徵</ActionButton>
      </div>
    </Section>
    <Section title="技能">
      {career.training && <div className="status-banner">訓練中：{career.training.skill} → Lv.{career.training.target_level}，剩 {career.training.remaining_days} 日</div>}
      <div className="skill-grid">
        {skills.map(([key, skill]) => <div className="skill-row" key={key}><div><strong>{skill.name}</strong><span>Lv.{skill.level}</span></div><ActionButton disabled={busy || Boolean(career.training) || skill.level >= 3} onClick={() => run(careerAction, 'start_training', { skill: key, targetLevel: skill.level + 1 })}>訓練</ActionButton></div>)}
      </div>
    </Section>
  </div>
}

function FamilyPanel({ familyData, busy, run }) {
  const f = familyData.family || {}
  const [partnerName, setPartnerName] = useState('若晴')
  const [partnerJob, setPartnerJob] = useState('technology')
  const [childName, setChildName] = useState('安安')
  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="關係" value={Number(f.relationship || 0).toFixed(0)} />
      <Metric label="幸福" value={Number(f.happiness || 0).toFixed(0)} />
      <Metric label="伴侶" value={f.partner_name || '無'} hint={f.partner_job || ''} />
      <Metric label="子女" value={String(f.children || 0)} />
      <Metric label="昨日家庭收入" value={money(f.last_family_income || 0)} />
      <Metric label="昨日家庭支出" value={money(f.last_family_expense || 0)} />
    </div>
    {!f.dating && !f.married && <Section title="開始一段關係"><div className="form-grid two"><label><span>姓名</span><input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} /></label><label><span>職涯</span><select value={partnerJob} onChange={(e) => setPartnerJob(e.target.value)}><option value="technology">科技</option><option value="finance">金融</option><option value="healthcare">醫療</option><option value="management">管理</option><option value="legal">法律</option><option value="public">公共</option></select></label></div><ActionButton disabled={busy} onClick={() => run(familyAction, 'start_dating', { partnerName, partnerJob, partnerDailyIncome: 120 })}>開始交往</ActionButton></Section>}
    {f.dating && <Section title="交往"><div className="life-action-row"><ActionButton disabled={busy} onClick={() => run(familyAction, 'talk', {})}>聊天／約會</ActionButton><ActionButton disabled={busy} onClick={() => run(familyAction, 'marry', {})}>結婚</ActionButton></div></Section>}
    {f.married && <Section title="家庭生活"><div className="inline-form"><input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="孩子姓名" /><ActionButton disabled={busy} onClick={() => run(familyAction, 'add_child', { name: childName, educationPath: 'balanced' })}>新增子女</ActionButton></div><label className="toggle-row compact-toggle"><span>自動家庭照顧</span><input type="checkbox" checked={Boolean(f.auto_family_care)} onChange={(e) => run(familyAction, 'settings', { autoFamilyCare: e.target.checked })} /></label></Section>}
    {f.child_profiles?.length > 0 && <Section title="子女"><div className="record-list">{f.child_profiles.map((c, i) => <div className="record-row" key={`${c.name}-${i}`}><div><strong>{c.name}</strong><span>{(Number(c.age_days || 0) / 365).toFixed(1)} 歲・{c.education_path}</span></div><div><small>學習 {Number(c.learning || 0).toFixed(0)} / 自信 {Number(c.confidence || 0).toFixed(0)} / 親密 {Number(c.parent_bond || 0).toFixed(0)}</small></div></div>)}</div></Section>}
  </div>
}

function CompanyPanel({ companyData, busy, run }) {
  const c = companyData.company || {}
  const [found, setFound] = useState({ name: 'MYCO', industry: 'software', capital: 50000, employees: 3 })
  const [amount, setAmount] = useState(10000)
  if (!companyData.exists) return <Section title="成立公司"><div className="form-grid two"><label><span>名稱</span><input value={found.name} onChange={(e) => setFound({ ...found, name: e.target.value })} /></label><label><span>產業</span><select value={found.industry} onChange={(e) => setFound({ ...found, industry: e.target.value })}><option value="software">軟體</option><option value="finance">金融</option><option value="healthcare">醫療</option><option value="manufacturing">製造</option><option value="logistics">物流</option><option value="retail">零售</option></select></label><label><span>投入資本</span><input type="number" value={found.capital} onChange={(e) => setFound({ ...found, capital: Number(e.target.value) })} /></label><label><span>初始員工</span><input type="number" min="1" max="25" value={found.employees} onChange={(e) => setFound({ ...found, employees: Number(e.target.value) })} /></label></div><ActionButton disabled={busy} onClick={() => run(companyAction, 'found', found)}>成立公司</ActionButton></Section>
  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="公司" value={c.name} hint={c.public ? 'Public / MYCO' : 'Private'} />
      <Metric label="估值" value={money(c.valuation)} />
      <Metric label="公司現金" value={money(c.cash)} />
      <Metric label="負債" value={money(c.debt)} />
      <Metric label="員工" value={number(c.employees)} />
      <Metric label="今日營收" value={money(c.daily_revenue)} />
      <Metric label="今日損益" value={money(c.daily_profit)} />
      <Metric label="玩家持股" value={pct(companyData.ownershipPct || 100)} />
    </div>
    <Section title="營運"><div className="life-action-row wrap"><ActionButton disabled={busy} onClick={() => run(companyAction, 'hire', { count: 1 })}>聘 1 人</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'layoff', { count: 1 })}>裁 1 人</ActionButton></div><div className="inline-form"><input type="number" value={amount} min="0" onChange={(e) => setAmount(Number(e.target.value))} /><ActionButton disabled={busy} onClick={() => run(companyAction, 'invest_rd', { amount })}>投入研發</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'invest_assets', { amount })}>資本支出</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'invest_brand', { amount })}>品牌</ActionButton></div></Section>
    <Section title="資本結構"><div className="life-action-row wrap"><ActionButton disabled={busy} onClick={() => run(companyAction, 'borrow', { amount })}>借款</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'repay_debt', { amount })}>還債</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'inject_capital', { amount })}>個人注資</ActionButton>{!c.public && <ActionButton disabled={busy || !companyData.ipo?.ready} onClick={() => run(companyAction, 'ipo', { releaseRatio: .25 })}>IPO</ActionButton>}{c.public && <><ActionButton disabled={busy} onClick={() => run(companyAction, 'issue_shares', { ratio: .05 })}>增發 5%</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'buyback', { ratio: .03 })}>回購 3%</ActionButton></>}</div></Section>
  </div>
}

function PowerPanel({ power, market, busy, run }) {
  const politics = power.politics || {}, underworld = power.underworld || {}, legal = power.legal || {}, insider = power.insider || {}
  const [donation, setDonation] = useState(10000)
  const [insideSymbol, setInsideSymbol] = useState(market?.assets?.[0]?.symbol || 'AAPL')
  const [stake, setStake] = useState(5000)
  return <div className="life-stack">
    <div className="life-metric-grid compact"><Metric label="政治 Lv." value={politics.level || 0} /><Metric label="影響力" value={Number(politics.influence || 0).toFixed(1)} /><Metric label="政治信任" value={Number(politics.trust || 0).toFixed(1)} /><Metric label="地下勢力" value={`Lv.${underworld.rank || 0}`} /><Metric label="非法資金" value={money(underworld.dirtyMoney)} /><Metric label="Legal Heat" value={Number(legal.heat || 0).toFixed(1)} /><Metric label="案件" value={legal.case?.stage || '無案件'} /><Metric label="監禁" value={`${legal.prisonDays || 0} 天`} /></div>
    <Section title="政治"><div className="life-action-row wrap"><ActionButton disabled={busy || politics.level >= 3} onClick={() => run(powerRiskAction, 'train_politics', { targetLevel: (politics.level || 0) + 1 })}>政治訓練</ActionButton><div className="inline-form"><input type="number" value={donation} onChange={(e) => setDonation(Number(e.target.value))} /><ActionButton disabled={busy || politics.level < 1} onClick={() => run(powerRiskAction, 'donate', { amount: donation, direction: .35 })}>政治捐款</ActionButton></div></div></Section>
    <Section title="地下勢力"><div className="life-action-row wrap"><ActionButton disabled={busy || underworld.rank >= 3} onClick={() => run(powerRiskAction, 'train_underworld', { targetLevel: (underworld.rank || 0) + 1 })}>提升勢力</ActionButton><ActionButton disabled={busy || !underworld.dirtyMoney} onClick={() => run(powerRiskAction, 'launder', { amount: underworld.dirtyMoney })}>處理全部非法資金</ActionButton><ActionButton disabled={busy || underworld.rank < 1} onClick={() => run(powerRiskAction, 'pause_underworld', { paused: !underworld.paused })}>{underworld.paused ? '恢復地下活動' : '暫停地下活動'}</ActionButton></div></Section>
    <Section title="內線"><div className="inline-form"><select value={insideSymbol} onChange={(e) => setInsideSymbol(e.target.value)}>{(market?.assets || []).map((a) => <option value={a.symbol} key={a.symbol}>{a.displayTicker || a.symbol}</option>)}</select><ActionButton disabled={busy} onClick={() => run(powerRiskAction, 'buy_inside_info', { symbol: insideSymbol, source: politics.level >= 2 ? 'politics' : underworld.rank >= 1 ? 'underworld' : 'skill', skill: 'finance' })}>取得消息</ActionButton></div>{insider.tip && <div className="status-banner">{insider.tip.symbol}・{insider.tip.direction}・有效至 Day {insider.tip.expiresDay}</div>}<div className="inline-form"><input type="number" value={stake} onChange={(e) => setStake(Number(e.target.value))} /><ActionButton disabled={busy || !insider.tip || Boolean(insider.position)} onClick={() => run(powerRiskAction, 'open_insider_position', { stake })}>建立內線部位</ActionButton></div></Section>
    {legal.case?.stage && legal.case.stage !== '無案件' && <Section title="法律案件"><div className="status-banner">{legal.case.stage}・證據 {Number(legal.case.evidence || 0).toFixed(1)}</div><ActionButton disabled={busy} onClick={() => run(powerRiskAction, 'legal_defense', { amount: 5000 })}>投入 $5,000 法律防禦</ActionButton></Section>}
  </div>
}

function LifePanel({ life, busy, run }) {
  const pending = life.pendingEvent
  return <div className="life-stack">
    {pending ? <Section title={pending.title || '人生抉擇'}><p className="life-copy">{pending.desc}</p><div className="choice-grid">{(pending.choices || []).map((choice, index) => <button type="button" className="choice-card" disabled={busy} key={`${choice.label}-${index}`} onClick={() => run(lifeAction, 'resolve', { choiceIndex: index })}><strong>{choice.label}</strong><span>{choice.result || ''}</span></button>)}</div></Section> : <Section title="人生事件"><div className="empty-state">目前沒有待處理事件</div></Section>}
    <Section title="自動處理"><div className="life-action-row wrap"><ActionButton disabled={busy} onClick={() => run(lifeAction, 'set_auto_policy', { policy: 'pause', cashReserve: life.cashReserve || 0 })}>暫停等待</ActionButton><ActionButton disabled={busy} onClick={() => run(lifeAction, 'set_auto_policy', { policy: 'safe', cashReserve: life.cashReserve || 0 })}>保守自動</ActionButton><ActionButton disabled={busy} onClick={() => run(lifeAction, 'set_auto_policy', { policy: 'ignore', cashReserve: life.cashReserve || 0 })}>自動忽略</ActionButton></div></Section>
    <Section title="人生記憶"><div className="record-list">{life.memories?.length ? life.memories.map((m) => <div className="record-row" key={m.key}><div><strong>{m.label}</strong><span>{m.status === 'active' ? '延續中' : '已完成'}・Stage {m.stage}</span></div><p>{m.summary}</p></div>) : <div className="empty-state">故事還在累積</div>}</div></Section>
    <Section title="最近的人生選擇"><div className="record-list">{(life.history || []).slice().reverse().map((h, i) => <div className="record-row" key={`${h.day}-${i}`}><div><strong>Day {h.day}・{h.title}</strong><span>{h.choice}</span></div><p>{h.result}</p></div>)}</div></Section>
  </div>
}

function SavePanel({ onRestored, busy, setBusy, setNotice }) {
  const [meta, setMeta] = useState(() => getBrowserSaveMeta())
  const [code, setCode] = useState('')
  const [exported, setExported] = useState('')
  async function saveNow() {
    setBusy(true)
    try { const result = await saveCurrentGameToBrowser(); setMeta(result?.preview || getBrowserSaveMeta()); setExported(result?.code || ''); setNotice('已保存到這個瀏覽器') }
    catch (e) { setNotice(e.message || '存檔失敗') } finally { setBusy(false) }
  }
  async function restore() {
    setBusy(true)
    try { const result = await restoreSaveCode(code.trim()); onRestored(result); setMeta(getBrowserSaveMeta()); setNotice('存檔已恢復') }
    catch (e) { setNotice(e.message || '恢復失敗') } finally { setBusy(false) }
  }
  return <div className="life-stack">
    <Section title="瀏覽器存檔" actions={<ActionButton disabled={busy} onClick={saveNow}>立即保存</ActionButton>}>
      {meta ? <div className="save-preview"><strong>Day {meta.day}</strong><span>{Number(meta.age || 0).toFixed(1)} 歲</span><span>{meta.jobId}</span><span>{money(meta.cash)}</span></div> : <div className="empty-state">尚未在這個瀏覽器保存</div>}
      <button type="button" className="text-danger" onClick={() => { clearBrowserSave(); setMeta(null) }}>清除瀏覽器存檔</button>
    </Section>
    {exported && <Section title="可攜式存檔碼"><textarea className="save-code" readOnly value={exported} /></Section>}
    <Section title="匯入存檔碼"><textarea className="save-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="貼上 CL181... 存檔碼" /><ActionButton disabled={busy || !code.trim()} onClick={restore}>恢復這段人生</ActionButton></Section>
  </div>
}

export default function LifeCenter({ player, onMarket, onExit, onRestored }) {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({ snapshot: player.snapshot || null, career: null, family: null, company: null, power: null, life: null })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const results = await Promise.allSettled([getMarketSnapshot(), getCareer(), getFamily(), getCompany(), getPowerRisk(), getLife()])
    setData((current) => ({
      snapshot: results[0].status === 'fulfilled' ? results[0].value : current.snapshot,
      career: results[1].status === 'fulfilled' ? results[1].value : current.career,
      family: results[2].status === 'fulfilled' ? results[2].value : current.family,
      company: results[3].status === 'fulfilled' ? results[3].value : current.company,
      power: results[4].status === 'fulfilled' ? results[4].value : current.power,
      life: results[5].status === 'fulfilled' ? results[5].value : current.life,
    }))
    const failed = results.find((r) => r.status === 'rejected')
    if (failed) setNotice(failed.reason?.message || '部分人生資料載入失敗')
  }, [])

  useEffect(() => { load() }, [load])

  async function run(fn, action, payload) {
    setBusy(true); setNotice('')
    try { const result = await fn(action, payload); if (result?.ok === false) throw new Error(result.message || '操作失敗'); setNotice(result?.message || '操作完成'); await load() }
    catch (e) { setNotice(e.message || '操作失敗') } finally { setBusy(false) }
  }

  const snapshot = data.snapshot || {}
  const account = snapshot.account || {}
  const tabContent = useMemo(() => {
    if (tab === 'career') return data.career ? <CareerPanel career={data.career} busy={busy} run={run} /> : null
    if (tab === 'family') return data.family ? <FamilyPanel familyData={data.family} busy={busy} run={run} /> : null
    if (tab === 'company') return data.company ? <CompanyPanel companyData={data.company} busy={busy} run={run} /> : null
    if (tab === 'power') return data.power ? <PowerPanel power={data.power} market={snapshot} busy={busy} run={run} /> : null
    if (tab === 'life') return data.life ? <LifePanel life={data.life} busy={busy} run={run} /> : null
    if (tab === 'save') return <SavePanel onRestored={onRestored} busy={busy} setBusy={setBusy} setNotice={setNotice} />
    return <Overview data={data} />
  }, [tab, data, busy, snapshot])

  return <main className="terminal-shell life-shell">
    <header className="terminal-topbar life-topbar">
      <div className="brand-inline"><span>◈</span><strong>資本人生</strong></div>
      <div className="top-stats"><span>Day {snapshot.day || 1}</span><span>{Number(snapshot.age || player.startAge || 25).toFixed(1)} 歲</span><span>現金 <strong>{money(account.cash)}</strong></span><span>權益 <strong>{money(account.equity)}</strong></span></div>
      <div className="mode-switch"><button type="button" className="ghost-button" onClick={onMarket}>📈 市場</button><button type="button" className="ghost-button active">👤 人生／經營</button></div>
      <button type="button" className="ghost-button" onClick={onExit}>主選單</button>
    </header>
    <section className="life-layout">
      <nav className="life-nav">{TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <section className="life-content">
        {notice && <div className="life-notice">{notice}</div>}
        {tabContent || <div className="empty-state">載入中…</div>}
      </section>
    </section>
  </main>
}
