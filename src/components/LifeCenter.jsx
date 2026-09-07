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
  ['life', '人生故事'],
  ['save', '存檔'],
]

const PARTNER_NAMES = ['若晴', '語彤', '子涵', '心妤', '品妍', '庭安', '子皓', '宇辰', '柏翰', '承恩', '以辰', '書豪']
const PARTNER_JOBS = [
  ['technology', '科技／工程', 170], ['finance', '金融／會計', 155], ['healthcare', '醫療／照護', 150],
  ['management', '企業管理', 175], ['legal', '法律／法遵', 165], ['public', '公共服務', 125],
]
const MEETING_METHODS = ['職場合作', '朋友聚會', '進修課程', '健身房', '咖啡店', '社群活動', '旅行途中', '投資講座']
const PERSONALITIES = ['理性穩健', '外向樂觀', '溫柔細膩', '獨立果斷', '幽默隨和', '企圖心強', '保守務實', '浪漫感性']
const EDUCATION_PATHS = [['balanced', '均衡'], ['academic', '學術'], ['creative', '創意'], ['sports', '運動']]
const GOV_STYLE_LABELS = { far_left: '全民福祉（極左）', left: '社會市場（左）', neutral: '中間平衡', right: '市場保守（右）', far_right: '資本極化（極右）' }
const OFFENSE_LABELS = {
  inside_info_purchase: '非法取得非公開消息', insider_trading: '內線交易', money_laundering: '洗錢／非法資金處理',
  market_manipulation: '市場操縱', influence_peddling: '不當關說', organized_crime: '地下組織活動', political_corruption: '非法政治介入',
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}
function pct(value, digits = 1) { return `${Number(value || 0).toFixed(digits)}%` }
function number(value, digits = 0) { return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: digits }) }
function clamp(value, lo, hi) { return Math.min(hi, Math.max(lo, Number(value || 0))) }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)] }
function childStage(ageDays) {
  const years = Number(ageDays || 0) / 365
  if (years < 3) return '幼兒'
  if (years < 7) return '兒童'
  if (years < 13) return '學童'
  if (years < 18) return '青少年'
  return '成年'
}

function Metric({ label, value, hint }) {
  return <div className="life-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}
function Section({ title, children, actions, className = '' }) {
  return <section className={`life-card ${className}`}><div className="life-card-title"><h3>{title}</h3>{actions}</div>{children}</section>
}
function ActionButton({ children, onClick, disabled, tone = '' }) {
  return <button type="button" className={`life-action ${tone}`} disabled={disabled} onClick={onClick}>{children}</button>
}
function ProgressBar({ value, max = 100, label }) {
  const width = clamp((Number(value || 0) / Math.max(1, max)) * 100, 0, 100)
  return <div className="deep-progress"><div className="deep-progress-head"><span>{label}</span><strong>{Number(value || 0).toFixed(1)}</strong></div><div className="deep-progress-track"><i style={{ width: `${width}%` }} /></div></div>
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
    {pending && <Section title="目前需要你決定" className="deep-alert-card"><div className="decision-highlight"><strong>{pending.title}</strong><p>{pending.desc}</p><small>期限：Day {pending.deadline_day || pending.deadlineDay || '—'}</small></div></Section>}
    <Section title="這段人生"><div className="life-summary-row"><span>Day {snap.day || 1}</span><span>{Number(snap.age || 25).toFixed(1)} 歲</span><span>XP {life.xp || 0}</span><span>聲望 {Number(life.reputation || career.reputation || 50).toFixed(0)}</span><span>故事記憶 {life.memories?.length || 0}</span><span>待續事件 {life.followupCount || 0}</span></div></Section>
  </div>
}

function CareerPanel({ career, busy, run }) {
  const current = career.currentJob
  const [jobId, setJobId] = useState('')
  const skills = Object.entries(career.skills || {})
  const jobs = career.jobs || []
  useEffect(() => { if (!jobId && jobs.length) setJobId(jobs[0].id) }, [jobId, jobs])
  const targetJob = jobs.find((job) => job.id === jobId)
  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="目前職位" value={current?.name || '待業'} hint={current?.description} />
      <Metric label="日薪" value={money(current?.dailySalary || 0)} />
      <Metric label="職涯經驗" value={`${career.experienceDays || 0} 天`} />
      <Metric label="任職年資" value={`${career.employerDays || 0} 天`} />
      <Metric label="滿意度" value={Number(career.satisfaction || 0).toFixed(0)} />
      <Metric label="職涯穩定" value={Number(career.stability || 0).toFixed(0)} />
      <Metric label="職涯聲望" value={Number(career.reputation || 0).toFixed(0)} />
      <Metric label="雇主" value={career.employer || '—'} />
    </div>
    <Section title="職涯操作">
      <div className="life-action-row wrap"><ActionButton disabled={busy || !current?.promotionTo} onClick={() => run(careerAction, 'promote', {})}>爭取升遷</ActionButton><ActionButton disabled={busy || current?.id === 'unemployed'} tone="danger" onClick={() => run(careerAction, 'quit', {})}>離職</ActionButton></div>
      <div className="inline-form"><select value={jobId} onChange={(e) => setJobId(e.target.value)}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.name}・Lv.{j.requiredLevel}・{money(j.dailySalary)}/日</option>)}</select><ActionButton disabled={busy || !jobId} onClick={() => run(careerAction, 'apply_job', { jobId })}>應徵</ActionButton></div>
      {targetJob && <div className="deep-note">{targetJob.description}｜技能 Lv.{targetJob.requiredLevel}｜最低經驗 {targetJob.minExperienceDays} 天</div>}
    </Section>
    <Section title="技能與訓練">{career.training && <div className="status-banner">訓練中：{career.training.skill} → Lv.{career.training.target_level}，剩 {career.training.remaining_days} 日</div>}<div className="skill-grid">{skills.map(([key, skill]) => <div className="skill-row" key={key}><div><strong>{skill.name}</strong><span>Lv.{skill.level}</span></div><ActionButton disabled={busy || Boolean(career.training) || skill.level >= 3} onClick={() => run(careerAction, 'start_training', { skill: key, targetLevel: skill.level + 1 })}>訓練</ActionButton></div>)}</div></Section>
  </div>
}

function FamilyPanel({ familyData, busy, run }) {
  const f = familyData.family || {}
  const buffs = familyData.buffs || {}
  const [profile, setProfile] = useState({ name: randomItem(PARTNER_NAMES), job: 'technology', income: 170, age: 25, meeting: randomItem(MEETING_METHODS), personality: randomItem(PERSONALITIES) })
  const [childName, setChildName] = useState('安安')
  const [educationPath, setEducationPath] = useState('balanced')
  const [settings, setSettings] = useState({ reserve: 10000, relationship: 70, parenting: 30, dating: 7 })
  useEffect(() => setSettings({ reserve: Number(f.auto_family_cash_reserve ?? 10000), relationship: Number(f.auto_relationship_threshold ?? 70), parenting: Number(f.auto_parenting_interval_days ?? 30), dating: Number(f.auto_dating_interval_days ?? 7) }), [f.auto_family_cash_reserve, f.auto_relationship_threshold, f.auto_parenting_interval_days, f.auto_dating_interval_days])
  function randomizePartner() {
    const [job, , income] = randomItem(PARTNER_JOBS)
    setProfile({ name: randomItem(PARTNER_NAMES), job, income, age: 22 + Math.floor(Math.random() * 18), meeting: randomItem(MEETING_METHODS), personality: randomItem(PERSONALITIES) })
  }
  function startDating() { run(familyAction, 'start_dating', { partnerName: profile.name, partnerJob: profile.job, partnerDailyIncome: profile.income, partnerAge: profile.age }) }
  function saveFamilySettings() { run(familyAction, 'settings', { autoFamilyCare: Boolean(f.auto_family_care), autoFamilyCashReserve: settings.reserve, autoRelationshipThreshold: settings.relationship, autoParentingIntervalDays: settings.parenting, autoDatingIntervalDays: settings.dating, autoLifeEventPolicy: f.auto_life_event_policy || 'pause' }) }
  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="關係" value={Number(f.relationship || 0).toFixed(0)} />
      <Metric label="幸福" value={Number(f.happiness || 0).toFixed(0)} />
      <Metric label="伴侶" value={f.partner_name || '無'} hint={f.partner_job || ''} />
      <Metric label="子女" value={String(f.children || 0)} />
      <Metric label="昨日家庭收入" value={money(f.last_family_income || 0)} />
      <Metric label="昨日家庭支出" value={money(f.last_family_expense || 0)} />
      <Metric label="昨日家庭淨額" value={money(f.last_family_net || 0)} />
      <Metric label="家庭累計支援" value={money(f.family_support_total || 0)} />
    </div>

    {!f.dating && !f.married && <Section title="相遇與交往">
      <div className="deep-family-profile"><div><span>姓名</span><strong>{profile.name}</strong></div><div><span>相遇方式</span><strong>{profile.meeting}</strong></div><div><span>個性</span><strong>{profile.personality}</strong></div><div><span>年齡</span><strong>{profile.age} 歲</strong></div></div>
      <div className="form-grid two"><label><span>姓名</span><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label><label><span>職涯</span><select value={profile.job} onChange={(e) => { const row = PARTNER_JOBS.find((j) => j[0] === e.target.value); setProfile({ ...profile, job: e.target.value, income: row?.[2] || profile.income }) }}>{PARTNER_JOBS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span>預估日收入</span><input type="number" min="0" value={profile.income} onChange={(e) => setProfile({ ...profile, income: Number(e.target.value) })} /></label><label><span>伴侶年齡</span><input type="number" min="18" max="70" value={profile.age} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })} /></label></div>
      <div className="life-action-row wrap"><ActionButton disabled={busy} onClick={randomizePartner}>重新隨機相遇</ActionButton><ActionButton disabled={busy || !profile.name.trim()} onClick={startDating}>開始交往</ActionButton></div>
    </Section>}

    {(f.dating || f.married) && <Section title="伴侶與關係">
      <div className="deep-grid-3"><Metric label="伴侶職涯 Lv." value={`Lv.${f.partner_level || 1}`} /><Metric label="伴侶日收入" value={money(f.partner_daily_income || 0)} /><Metric label="伴侶年齡" value={`${Number(f.partner_age || 0).toFixed(1)} 歲`} /><Metric label="交往天數" value={`${f.dating_days || 0} 天`} /><Metric label="婚姻天數" value={`${f.marriage_days || 0} 天`} /><Metric label="退休狀態" value={f.partner_retired ? '已退休' : '工作中'} /></div>
      <div className="deep-progress-pair"><ProgressBar label="關係" value={f.relationship || 0} /><ProgressBar label="幸福" value={f.happiness || 0} /></div>
      {f.dating && <div className="life-action-row wrap"><ActionButton disabled={busy} onClick={() => run(familyAction, 'talk', {})}>聊天／約會 $200</ActionButton><ActionButton disabled={busy} onClick={() => run(familyAction, 'marry', {})}>結婚</ActionButton></div>}
      {f.married && <div className="deep-note">穩定後盾：{f.stable_support_unlocked ? '已解鎖' : `尚未解鎖（高幸福連續 ${f.high_happiness_streak || 0} 天）`}｜長照累計 {money(f.long_term_care_total || 0)}</div>}
    </Section>}

    {f.married && <Section title="家庭管理">
      <div className="inline-form"><input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="孩子姓名" /><select value={educationPath} onChange={(e) => setEducationPath(e.target.value)}>{EDUCATION_PATHS.map(([key, label]) => <option key={key} value={key}>{label}教育</option>)}</select><ActionButton disabled={busy || !childName.trim()} onClick={() => run(familyAction, 'add_child', { name: childName, educationPath })}>新增子女</ActionButton></div>
      <div className="deep-settings-grid"><label className="toggle-row compact-toggle"><span>自動家庭照顧</span><input type="checkbox" checked={Boolean(f.auto_family_care)} onChange={(e) => run(familyAction, 'settings', { autoFamilyCare: e.target.checked })} /></label><label><span>保留現金</span><input type="number" min="0" value={settings.reserve} onChange={(e) => setSettings({ ...settings, reserve: Number(e.target.value) })} /></label><label><span>關係照顧門檻</span><input type="number" min="0" max="100" value={settings.relationship} onChange={(e) => setSettings({ ...settings, relationship: Number(e.target.value) })} /></label><label><span>育兒間隔（天）</span><input type="number" min="1" value={settings.parenting} onChange={(e) => setSettings({ ...settings, parenting: Number(e.target.value) })} /></label><label><span>約會間隔（天）</span><input type="number" min="1" value={settings.dating} onChange={(e) => setSettings({ ...settings, dating: Number(e.target.value) })} /></label><ActionButton disabled={busy} onClick={saveFamilySettings}>儲存家庭自動化</ActionButton></div>
    </Section>}

    <Section title="家庭加成"><div className="deep-chip-row"><span>減壓 {Number(buffs.stress_relief || 0).toFixed(2)}</span><span>升遷加成 {pct((buffs.promotion_bonus || 0) * 100)}</span><span>罹病倍率 ×{Number(buffs.illness_mult || 1).toFixed(2)}</span><span>公司營收 ×{Number(buffs.company_rev_mult || 1).toFixed(2)}</span><span>罰金倍率 ×{Number(buffs.fine_mult || 1).toFixed(2)}</span><span>伴侶貢獻 {pct((buffs.partner_contribution_rate || 0) * 100)}</span></div></Section>

    {f.child_profiles?.length > 0 && <Section title="子女與下一代"><div className="deep-child-grid">{f.child_profiles.map((c, i) => <article className="deep-child-card" key={`${c.name}-${i}`}><div className="deep-child-head"><div><strong>{c.name}</strong><span>{childStage(c.age_days)}・{(Number(c.age_days || 0) / 365).toFixed(1)} 歲</span></div><b>{EDUCATION_PATHS.find((x) => x[0] === c.education_path)?.[1] || c.education_path}</b></div><div className="deep-progress-stack"><ProgressBar label="學習" value={c.learning || 0} /><ProgressBar label="自信" value={c.confidence || 0} /><ProgressBar label="親密" value={c.parent_bond || 0} /><ProgressBar label="興趣" value={c.interest || 0} /></div>{Number(c.adult_income || 0) > 0 && <div className="deep-note">成年職涯：{c.adult_career || '—'}｜日收入 {money(c.adult_income)}｜{c.supporting_family ? '會回饋家庭' : '獨立生活'}</div>}</article>)}</div></Section>}

    {(f.milestones || []).length > 0 && <Section title="家庭里程碑"><div className="deep-chip-row">{f.milestones.map((m) => <span key={m}>✓ {m}</span>)}</div></Section>}
  </div>
}

function CompanyPanel({ companyData, busy, run }) {
  const c = companyData.company || {}
  const [found, setFound] = useState({ name: 'MYCO', industry: 'software', capital: 65000, employees: 3 })
  const [amount, setAmount] = useState(10000)
  const [count, setCount] = useState(1)
  const [releaseRatio, setReleaseRatio] = useState(.25)
  const [payout, setPayout] = useState(0)
  useEffect(() => setPayout(Number(c.dividend_payout_ratio || 0)), [c.dividend_payout_ratio])
  const capacity = companyData.capacity || {}, research = companyData.research || {}, debt = companyData.debt || {}, ipo = companyData.ipo || {}
  if (!companyData.exists) return <div className="life-stack"><Section title="成立公司"><div className="form-grid two"><label><span>名稱</span><input value={found.name} onChange={(e) => setFound({ ...found, name: e.target.value })} /></label><label><span>產業</span><select value={found.industry} onChange={(e) => setFound({ ...found, industry: e.target.value })}><option value="software">軟體服務</option><option value="finance">金融服務</option><option value="health">醫療健康</option><option value="manufacturing">製造工業</option><option value="logistics">物流服務</option><option value="retail">零售消費</option></select></label><label><span>投入資本</span><input type="number" min="10000" value={found.capital} onChange={(e) => setFound({ ...found, capital: Number(e.target.value) })} /></label><label><span>初始員工</span><input type="number" min="1" max="25" value={found.employees} onChange={(e) => setFound({ ...found, employees: Number(e.target.value) })} /></label></div><div className="deep-note">成立後會把投入資本分為營運現金與固定資產，估值由實際營收、獲利、品牌與資產決定。</div><ActionButton disabled={busy || !found.name.trim()} onClick={() => run(companyAction, 'found', found)}>成立公司</ActionButton></Section></div>

  const margin = Number(c.daily_revenue || 0) > 0 ? Number(c.daily_profit || 0) / Number(c.daily_revenue || 1) * 100 : 0
  const quarterMargin = Number(c.last_quarter_revenue || 0) > 0 ? Number(c.last_quarter_profit || 0) / Number(c.last_quarter_revenue || 1) * 100 : 0
  return <div className="life-stack">
    {c.bankrupt && <div className="deep-danger-banner">公司已進入破產／重整狀態，只能先由個人注資恢復營運。</div>}
    <div className="life-metric-grid compact">
      <Metric label="公司" value={c.name} hint={c.public ? '上市公司 / MYCO' : '私人公司'} />
      <Metric label="估值" value={money(c.valuation)} />
      <Metric label="公司現金" value={money(c.cash)} />
      <Metric label="負債" value={money(c.debt)} />
      <Metric label="員工" value={number(c.employees)} />
      <Metric label="品牌" value={Number(c.brand || 0).toFixed(1)} />
      <Metric label="公司年齡" value={`${c.age_days || 0} 天`} />
      <Metric label="玩家持股" value={pct(companyData.ownershipPct || 100)} />
    </div>

    <Section title="今日營運"><div className="deep-grid-4"><Metric label="營收" value={money(c.daily_revenue)} /><Metric label="損益" value={money(c.daily_profit)} hint={`淨利率 ${pct(margin)}`} /><Metric label="公司稅" value={money(c.daily_tax)} /><Metric label="利息" value={money(c.daily_interest)} /><Metric label="固定資產" value={money(c.fixed_assets)} /><Metric label="研發資產" value={money(c.rd_asset)} /><Metric label="累計營收" value={money(c.total_revenue)} /><Metric label="累計獲利" value={money(c.total_profit)} /></div></Section>

    <Section title="季度財報"><div className="deep-grid-4"><Metric label="本季營收（進行中）" value={money(c.quarter_revenue)} hint={`Day ${c.quarter_day_count || 0}/90`} /><Metric label="本季損益（進行中）" value={money(c.quarter_profit)} /><Metric label="上季營收" value={money(c.last_quarter_revenue)} /><Metric label="上季獲利" value={money(c.last_quarter_profit)} hint={`淨利率 ${pct(quarterMargin)}`} /><Metric label="前季營收" value={money(c.prev_quarter_revenue)} /><Metric label="累計公司稅" value={money(c.total_tax)} /><Metric label="累計股息" value={money(c.total_dividends)} /><Metric label="市場價格" value={c.public ? money(companyData.marketPrice || 0) : '未上市'} /></div>
      {(c.history || []).length > 0 && <div className="deep-table"><div className="deep-table-head"><span>季度日</span><span>營收</span><span>獲利</span><span>淨利率</span></div>{c.history.slice().reverse().map((row, index) => <div className="deep-table-row" key={`${row.day}-${index}`}><span>Day {row.day}</span><span>{money(row.revenue)}</span><span className={Number(row.profit || 0) >= 0 ? 'up' : 'down'}>{money(row.profit)}</span><span>{pct(Number(row.revenue || 0) ? Number(row.profit || 0) / Number(row.revenue) * 100 : 0)}</span></div>)}</div>}
    </Section>

    <Section title="營運效率與財務風險"><div className="deep-grid-3"><Metric label="固定資產支援人數" value={number(capacity.supportedEmployees || 0, 1)} /><Metric label="產能利用率" value={pct((capacity.utilization || 0) * 100)} /><Metric label="產能營收倍率" value={`×${Number(capacity.revenueMult || 1).toFixed(2)}`} /><Metric label="每人研發資產" value={money(research.perEmployee || 0)} /><Metric label="研發生產力加成" value={pct((research.productivityBonus || 0) * 100)} /><Metric label="研發毛利加成" value={pct((research.marginBonus || 0) * 100)} /><Metric label="負債／估值" value={pct((debt.ratio || 0) * 100)} /><Metric label="年化借款利率" value={pct((debt.annualRate || 0) * 100, 2)} /><Metric label="每日利息" value={money(debt.dailyInterest || 0)} /></div></Section>

    <Section title="營運決策">
      <div className="deep-control-row"><label><span>人數</span><input type="number" min="1" max="1000" value={count} onChange={(e) => setCount(Number(e.target.value))} /></label><div className="life-action-row wrap"><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'hire', { count })}>聘用</ActionButton><ActionButton disabled={busy || c.bankrupt || Number(c.employees || 0) <= 1} tone="danger" onClick={() => run(companyAction, 'layoff', { count })}>裁員</ActionButton></div></div>
      <div className="deep-control-row"><label><span>投資金額</span><input type="number" min="0" step="1000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label><div className="life-action-row wrap"><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'invest_rd', { amount })}>研發</ActionButton><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'invest_assets', { amount })}>資本支出</ActionButton><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'invest_brand', { amount })}>品牌行銷</ActionButton></div></div>
    </Section>

    <Section title="融資與資本結構"><div className="deep-control-row"><label><span>金額</span><input type="number" min="0" step="1000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label><div className="life-action-row wrap"><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'borrow', { amount })}>公司借款</ActionButton><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'repay_debt', { amount })}>公司還債</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'inject_capital', { amount })}>個人注資</ActionButton>{c.public && <><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'issue_shares', { ratio: .05 })}>增發 5%</ActionButton><ActionButton disabled={busy || c.bankrupt} onClick={() => run(companyAction, 'buyback', { ratio: .03 })}>回購 3%</ActionButton></>}</div></div>
      {c.public && <div className="deep-control-row"><label><span>季度配息率 {pct(payout * 100)}</span><input type="range" min="0" max="0.6" step="0.05" value={payout} onChange={(e) => setPayout(Number(e.target.value))} /></label><ActionButton disabled={busy} onClick={() => run(companyAction, 'set_dividend', { payoutRatio: payout })}>設定配息政策</ActionButton></div>}
    </Section>

    {!c.public && <Section title="IPO 準備"><div className="deep-check-grid">{Object.entries(ipo.checks || {}).map(([key, ok]) => <div className={ok ? 'ok' : ''} key={key}><span>{ok ? '✅' : '⬜'}</span><strong>{({ exists: '公司存在', notPublic: '尚未上市', age: '公司滿一年', employees: '員工達標', valuation: '估值達標', profit: '季度獲利', cash: '公司現金為正', notBankrupt: '未破產' })[key] || key}</strong></div>)}</div><div className="deep-control-row"><label><span>公開釋股比例 {pct(releaseRatio * 100)}</span><input type="range" min="0.1" max="0.45" step="0.05" value={releaseRatio} onChange={(e) => setReleaseRatio(Number(e.target.value))} /></label><ActionButton disabled={busy || !ipo.ready || c.bankrupt} onClick={() => run(companyAction, 'ipo', { releaseRatio })}>正式 IPO</ActionButton></div></Section>}

    {c.public && <Section title="股權結構"><div className="deep-grid-4"><Metric label="總股數" value={number(c.total_shares)} /><Metric label="玩家股數" value={number(c.player_shares)} /><Metric label="流通股" value={number(c.public_shares)} /><Metric label="IPO 價格" value={money(c.ipo_price || 0)} /><Metric label="IPO Day" value={String(c.ipo_day || '—')} /><Metric label="目前 MYCO 價格" value={money(companyData.marketPrice || 0)} /><Metric label="配息率" value={pct((c.dividend_payout_ratio || 0) * 100)} /><Metric label="上次配息 Day" value={String(c.last_dividend_day || '—')} /></div></Section>}
  </div>
}

function PowerPanel({ power, market, busy, run }) {
  const politics = power.politics || {}, underworld = power.underworld || {}, legal = power.legal || {}, insider = power.insider || {}
  const [donation, setDonation] = useState(10000)
  const [direction, setDirection] = useState(0)
  const [insideSymbol, setInsideSymbol] = useState(market?.assets?.[0]?.symbol || 'AAPL')
  const [insideSource, setInsideSource] = useState('skill')
  const [stake, setStake] = useState(5000)
  const [defense, setDefense] = useState(5000)
  const [launder, setLaunder] = useState(0)
  useEffect(() => { if (!insideSymbol && market?.assets?.[0]) setInsideSymbol(market.assets[0].symbol) }, [insideSymbol, market])
  useEffect(() => setLaunder(Number(underworld.dirtyMoney || 0)), [underworld.dirtyMoney])
  const offenses = Object.entries(legal.offenses || {})
  const cooldowns = Object.entries(insider.cooldowns || {})
  return <div className="life-stack">
    <div className="life-metric-grid compact"><Metric label="政治 Lv." value={politics.level || 0} /><Metric label="影響力" value={Number(politics.influence || 0).toFixed(1)} /><Metric label="政治信任" value={Number(politics.trust || 0).toFixed(1)} /><Metric label="政府風格" value={GOV_STYLE_LABELS[politics.governmentStyle] || politics.governmentStyle || '中間平衡'} /><Metric label="地下勢力" value={`Lv.${underworld.rank || 0}`} /><Metric label="非法資金" value={money(underworld.dirtyMoney)} /><Metric label="Legal Heat" value={Number(legal.heat || 0).toFixed(1)} /><Metric label="案件" value={legal.case?.stage || '無案件'} /></div>

    <Section title="政治影響力">
      {politics.training && <div className="status-banner">政治訓練中：Lv.{politics.training.target_level}，剩 {politics.training.remaining_days} 天</div>}
      <div className="deep-grid-3"><Metric label="累計政治獻金" value={money(politics.donationsTotal || 0)} /><Metric label="政府偏向" value={Number(politics.governmentBias || 0).toFixed(3)} hint="-1 偏左 / +1 偏右" /><Metric label="目前風格" value={GOV_STYLE_LABELS[politics.governmentStyle] || politics.governmentStyle} /></div>
      <div className="life-action-row wrap"><ActionButton disabled={busy || politics.level >= 3 || politics.training} onClick={() => run(powerRiskAction, 'train_politics', { targetLevel: (politics.level || 0) + 1 })}>政治訓練</ActionButton></div>
      <div className="deep-control-row"><label><span>倡議／捐款金額</span><input type="number" min="0" step="1000" value={donation} onChange={(e) => setDonation(Number(e.target.value))} /></label><div className="segmented-control"><button type="button" className={direction === -1 ? 'active' : ''} onClick={() => setDirection(-1)}>偏左</button><button type="button" className={direction === 0 ? 'active' : ''} onClick={() => setDirection(0)}>中性</button><button type="button" className={direction === 1 ? 'active' : ''} onClick={() => setDirection(1)}>偏右</button></div><ActionButton disabled={busy || politics.level < 1 || donation <= 0} onClick={() => run(powerRiskAction, 'donate', { amount: donation, direction })}>執行政治倡議</ActionButton></div>
    </Section>

    <Section title="地下勢力與非法資金">
      {underworld.training && <div className="status-banner">地下勢力建立中：Lv.{underworld.training.target_level}，剩 {underworld.training.remaining_days} 天</div>}
      <div className="deep-grid-3"><Metric label="累計非法收入" value={money(underworld.totalEarned || 0)} /><Metric label="活動狀態" value={underworld.paused ? '已暫停' : '運作中'} /><Metric label="可處理非法資金" value={money(underworld.dirtyMoney || 0)} /></div>
      <div className="life-action-row wrap"><ActionButton disabled={busy || underworld.rank >= 3 || underworld.training} onClick={() => run(powerRiskAction, 'train_underworld', { targetLevel: (underworld.rank || 0) + 1 })}>提升地下勢力</ActionButton><ActionButton disabled={busy || underworld.rank < 1} onClick={() => run(powerRiskAction, 'pause_underworld', { paused: !underworld.paused })}>{underworld.paused ? '恢復地下活動' : '暫停地下活動'}</ActionButton></div>
      <div className="deep-control-row"><label><span>處理金額</span><input type="number" min="0" max={Number(underworld.dirtyMoney || 0)} value={launder} onChange={(e) => setLaunder(Number(e.target.value))} /></label><ActionButton disabled={busy || launder <= 0 || !underworld.dirtyMoney} tone="danger" onClick={() => run(powerRiskAction, 'launder', { amount: launder })}>處理非法資金（高法律風險）</ActionButton></div>
    </Section>

    <Section title="非公開消息／內線風險">
      <div className="deep-control-row"><label><span>標的</span><select value={insideSymbol} onChange={(e) => setInsideSymbol(e.target.value)}>{(market?.assets || []).map((a) => <option value={a.symbol} key={a.symbol}>{a.displayTicker || a.symbol}・{a.name}</option>)}</select></label><label><span>消息管道</span><select value={insideSource} onChange={(e) => setInsideSource(e.target.value)}><option value="skill">職業技能</option><option value="politics">政治管道</option><option value="underworld">地下管道</option></select></label><ActionButton disabled={busy || !insideSymbol} onClick={() => run(powerRiskAction, 'buy_inside_info', { symbol: insideSymbol, source: insideSource, skill: 'finance' })}>取得消息</ActionButton></div>
      {insider.tip && <div className="deep-tip-card"><strong>{insider.tip.symbol}・{insider.tip.direction}</strong><span>來源 {insider.tip.source}｜可信度 {pct(Number(insider.tip.accuracy || 0) * 100)}｜有效至 Day {insider.tip.expiresDay}</span></div>}
      {cooldowns.length > 0 && <div className="deep-chip-row">{cooldowns.map(([source, day]) => <span key={source}>{source} 冷卻至 Day {day}</span>)}</div>}
      <div className="deep-control-row"><label><span>內線部位投入</span><input type="number" min="1000" step="1000" value={stake} onChange={(e) => setStake(Number(e.target.value))} /></label><ActionButton disabled={busy || !insider.tip || Boolean(insider.position)} tone="danger" onClick={() => run(powerRiskAction, 'open_insider_position', { stake })}>建立內線部位</ActionButton></div>
      {insider.position && <div className="status-banner">待結算：{insider.position.symbol}・{insider.position.direction}・投入 {money(insider.position.stake)}・Day {insider.position.resolve_day || insider.position.resolveDay} 結算</div>}
    </Section>

    <Section title="法律案件與風險">
      <div className="deep-grid-4"><Metric label="案件階段" value={legal.case?.stage || '無案件'} /><Metric label="證據" value={Number(legal.case?.evidence || 0).toFixed(1)} /><Metric label="階段天數" value={`${legal.case?.days_in_stage || 0} 天`} /><Metric label="永久案底" value={legal.criminalRecord ? '有' : '無'} /><Metric label="監禁剩餘" value={`${legal.prisonDays || 0} 天`} /><Metric label="案件來源" value={legal.case?.source || '—'} /><Metric label="法律 Heat" value={Number(legal.heat || 0).toFixed(1)} /><Metric label="違法紀錄項目" value={String(offenses.length)} /></div>
      {offenses.length > 0 && <div className="deep-offense-grid">{offenses.map(([code, count]) => <div key={code}><strong>{OFFENSE_LABELS[code] || code}</strong><span>× {count}</span></div>)}</div>}
      {legal.case?.stage && legal.case.stage !== '無案件' && <div className="deep-control-row"><label><span>法律防禦預算</span><input type="number" min="3000" step="1000" value={defense} onChange={(e) => setDefense(Number(e.target.value))} /></label><ActionButton disabled={busy || defense < 3000} onClick={() => run(powerRiskAction, 'legal_defense', { amount: defense })}>投入法律防禦</ActionButton></div>}
      {(legal.history || []).length > 0 && <div className="deep-timeline">{legal.history.slice().reverse().map((row, index) => <article key={`${row.day}-${index}`}><strong>Day {row.day}・判決</strong><span>{(row.offenses || []).join('、') || row.trigger}</span><small>刑期 {row.days} 天｜罰金 {money(row.fine)}｜政府環境 {GOV_STYLE_LABELS[row.govStyle] || row.govStyle}</small></article>)}</div>}
    </Section>
  </div>
}

function LifePanel({ life, busy, run }) {
  const pending = life.pendingEvent
  const [reserve, setReserve] = useState(Number(life.cashReserve || 0))
  useEffect(() => setReserve(Number(life.cashReserve || 0)), [life.cashReserve])
  const memories = life.memories || []
  const activeMemories = memories.filter((m) => m.status === 'active')
  const completedMemories = memories.filter((m) => m.status !== 'active')
  const policyLabel = { pause: '暫停等待玩家', safe: '保守自動處理', ignore: '自動忽略' }[life.autoPolicy] || life.autoPolicy
  return <div className="life-stack">
    {pending ? <Section title={pending.title || '人生抉擇'} className="deep-alert-card"><p className="life-copy">{pending.desc}</p><div className="deep-event-meta"><span>產生 Day {pending.generated_day || pending.generatedDay || '—'}</span><span>期限 Day {pending.deadline_day || pending.deadlineDay || '—'}</span>{pending.followup && <span>後續事件</span>}{pending.named_chain && <span>長期故事鏈</span>}</div><div className="choice-grid">{(pending.choices || []).map((choice, index) => <button type="button" className="choice-card deep-choice" disabled={busy} key={`${choice.label}-${index}`} onClick={() => run(lifeAction, 'resolve', { choiceIndex: index })}><strong>{choice.label}</strong><div className="deep-effect-row">{Number(choice.cash || 0) !== 0 && <span>現金 {money(choice.cash)}</span>}{Number(choice.health || 0) !== 0 && <span>健康 {choice.health > 0 ? '+' : ''}{choice.health}</span>}{Number(choice.stress || 0) !== 0 && <span>壓力 {choice.stress > 0 ? '+' : ''}{choice.stress}</span>}{Number(choice.reputation || 0) !== 0 && <span>聲望 {choice.reputation > 0 ? '+' : ''}{choice.reputation}</span>}{Number(choice.xp || 0) !== 0 && <span>XP +{choice.xp}</span>}</div><span>{choice.result || '選擇後才會知道完整結果。'}</span></button>)}</div></Section> : <Section title="人生事件"><div className="empty-state">目前沒有待處理事件。時間推進後，普通事件、後續事件與長期故事記憶都可能重新出現。</div></Section>}

    <Section title="事件自動處理"><div className="deep-grid-3"><Metric label="目前策略" value={policyLabel || '暫停'} /><Metric label="現金保留" value={money(life.cashReserve || 0)} /><Metric label="待續事件" value={String(life.followupCount || 0)} /></div><div className="deep-control-row"><label><span>保守模式現金保留</span><input type="number" min="0" step="1000" value={reserve} onChange={(e) => setReserve(Number(e.target.value))} /></label><div className="segmented-control three"><button type="button" className={life.autoPolicy === 'pause' ? 'active' : ''} onClick={() => run(lifeAction, 'set_auto_policy', { policy: 'pause', cashReserve: reserve })}>暫停</button><button type="button" className={life.autoPolicy === 'safe' ? 'active' : ''} onClick={() => run(lifeAction, 'set_auto_policy', { policy: 'safe', cashReserve: reserve })}>保守</button><button type="button" className={life.autoPolicy === 'ignore' ? 'active' : ''} onClick={() => run(lifeAction, 'set_auto_policy', { policy: 'ignore', cashReserve: reserve })}>忽略</button></div><ActionButton disabled={busy || !pending} onClick={() => run(lifeAction, 'auto_resolve', { policy: 'safe', cashReserve: reserve })}>現在保守處理</ActionButton></div></Section>

    <Section title="延續中的長期故事"><div className="deep-story-grid">{activeMemories.length ? activeMemories.map((m) => <article className="deep-story-card active" key={m.key}><div><strong>{m.label}</strong><span>Stage {m.stage}</span></div><p>{m.summary}</p><small>開始 Day {m.startedDay || 0}・最近 Day {m.lastDay || 0}</small></article>) : <div className="empty-state">目前沒有延續中的長期故事。</div>}</div></Section>

    {completedMemories.length > 0 && <Section title="已完成的人生篇章"><div className="deep-story-grid">{completedMemories.map((m) => <article className="deep-story-card" key={m.key}><div><strong>{m.label}</strong><span>已完成</span></div><p>{m.summary}</p><small>開始 Day {m.startedDay || 0}・最後 Day {m.lastDay || 0}</small></article>)}</div></Section>}

    <Section title="人生選擇時間線"><div className="deep-timeline">{(life.history || []).length ? (life.history || []).slice().reverse().map((h, i) => <article key={`${h.day}-${i}`}><strong>Day {h.day}・{h.title}</strong><span>選擇：{h.choice}</span><small>{h.result}</small></article>) : <div className="empty-state">尚無人生事件紀錄。</div>}</div></Section>
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
  async function exportNow() {
    setBusy(true)
    try { const result = await exportSave(); setExported(result?.code || ''); setNotice('已產生可攜式存檔碼') }
    catch (e) { setNotice(e.message || '匯出失敗') } finally { setBusy(false) }
  }
  async function restore() {
    setBusy(true)
    try { const result = await restoreSaveCode(code.trim()); onRestored(result); setMeta(getBrowserSaveMeta()); setNotice('存檔已恢復') }
    catch (e) { setNotice(e.message || '恢復失敗') } finally { setBusy(false) }
  }
  return <div className="life-stack">
    <Section title="瀏覽器存檔" actions={<div className="life-action-row"><ActionButton disabled={busy} onClick={saveNow}>立即保存</ActionButton><ActionButton disabled={busy} onClick={exportNow}>匯出存檔碼</ActionButton></div>}>{meta ? <div className="save-preview"><strong>Day {meta.day}</strong><span>{Number(meta.age || 0).toFixed(1)} 歲</span><span>{meta.jobId}</span><span>{money(meta.cash)}</span></div> : <div className="empty-state">尚未在這個瀏覽器保存</div>}<button type="button" className="text-danger" onClick={() => { clearBrowserSave(); setMeta(null) }}>清除瀏覽器存檔</button></Section>
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
    const keys = ['snapshot', 'career', 'family', 'company', 'power', 'life']
    setData((current) => {
      const next = { ...current }
      results.forEach((result, index) => { if (result.status === 'fulfilled') next[keys[index]] = result.value })
      return next
    })
    const failed = results.find((r) => r.status === 'rejected')
    if (failed) setNotice(failed.reason?.message || '部分人生資料載入失敗')
  }, [])

  useEffect(() => { load() }, [load])

  async function run(fn, action, payload) {
    setBusy(true); setNotice('')
    try {
      const result = await fn(action, payload)
      if (result?.ok === false) throw new Error(result.message || '操作失敗')
      setNotice(result?.message || '操作完成')
      await load()
      return result
    } catch (e) { setNotice(e.message || '操作失敗'); return null }
    finally { setBusy(false) }
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
    <header className="terminal-topbar life-topbar"><div className="brand-inline"><span>◈</span><strong>資本人生</strong></div><div className="top-stats"><span>Day {snapshot.day || 1}</span><span>{Number(snapshot.age || player.startAge || 25).toFixed(1)} 歲</span><span>現金 <strong>{money(account.cash)}</strong></span><span>權益 <strong>{money(account.equity)}</strong></span><span>健康 <strong>{Number(snapshot.health ?? 100).toFixed(0)}</strong></span><span>壓力 <strong>{Number(snapshot.stress ?? 0).toFixed(0)}</strong></span></div><div className="mode-switch"><button type="button" className="ghost-button" onClick={onMarket}>📈 市場</button><button type="button" className="ghost-button active">👤 人生／經營</button></div><button type="button" className="ghost-button" onClick={onExit}>主選單</button></header>
    <section className="life-layout"><nav className="life-nav">{TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><section className="life-content">{notice && <div className="life-notice">{notice}</div>}{snapshot.gameOver && <div className="deep-danger-banner">{snapshot.gameOverReason || '這段人生已結束'}</div>}{tabContent || <div className="empty-state">載入中…</div>}</section></section>
  </main>
}
