import { useEffect, useMemo, useState } from 'react'
import {
  careerAction,
  companyAction,
  getCareer,
  getCompany,
  getMarketSnapshot,
  getPowerRisk,
  powerRiskAction,
} from '../api/client.js'

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
      <div className="parity-modal-foot">若長期快轉前已經存在未處理決策，系統會先停下來讓你決定；快轉途中才產生的事件會用保守方案處理。</div>
    </section>
  </div>
}

function CareerStartupDock({ active }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('career')
  const [career, setCareer] = useState(null)
  const [company, setCompany] = useState(null)
  const [jobId, setJobId] = useState('')
  const [employerSymbol, setEmployerSymbol] = useState('')
  const [industry, setIndustry] = useState('software')
  const [startupName, setStartupName] = useState('玩家控股公司')
  const [capital, setCapital] = useState(65000)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    if (!active) return
    try {
      const [careerResult, companyResult] = await Promise.all([getCareer(), getCompany()])
      setCareer(careerResult)
      setCompany(companyResult)
      const jobs = (careerResult?.jobs || []).filter((job) => job.id !== 'unemployed')
      setJobId((current) => current || careerResult?.currentJob?.id || jobs[0]?.id || '')
      const requirements = companyResult?.startupRequirements?.industries || []
      const selectedReq = requirements.find((row) => row.id === industry) || requirements[0]
      if (selectedReq && !requirements.some((row) => row.id === industry)) setIndustry(selectedReq.id)
    } catch (error) {
      setNotice(error.message || '職涯／創業資料載入失敗')
    }
  }

  useEffect(() => {
    if (!active) return undefined
    load()
    const timer = window.setInterval(load, 7000)
    return () => window.clearInterval(timer)
  }, [active])

  const jobs = (career?.jobs || []).filter((job) => job.id !== 'unemployed')
  const selectedJob = jobs.find((job) => job.id === jobId) || jobs[0]
  const employers = selectedJob ? (career?.employersBySkill?.[selectedJob.skill] || []) : []
  const selectedEmployer = employers.find((row) => row.symbol === employerSymbol) || employers[0]
  const startupRows = company?.startupRequirements?.industries || []
  const startup = startupRows.find((row) => row.id === industry) || startupRows[0]

  useEffect(() => {
    if (!selectedEmployer) {
      setEmployerSymbol('')
      return
    }
    if (!employers.some((row) => row.symbol === employerSymbol)) setEmployerSymbol(selectedEmployer.symbol)
  }, [jobId, career])

  useEffect(() => {
    if (!startup) return
    if (capital < Number(startup.startCost || 0)) setCapital(Number(startup.startCost || 0))
  }, [industry, company])

  async function applyJob() {
    if (!selectedJob || !selectedEmployer) return
    setBusy(true); setNotice('')
    try {
      const result = await careerAction('apply_job', { jobId: selectedJob.id, employerSymbol: selectedEmployer.symbol })
      setCareer(result?.career || career)
      setNotice(result?.message || (result?.success ? '應徵成功' : '本次未錄取'))
    } catch (error) {
      setNotice(error.message || '應徵失敗')
    } finally { setBusy(false) }
  }

  async function foundCompany() {
    if (!startup) return
    setBusy(true); setNotice('')
    try {
      const result = await companyAction('found', { name: startupName, industry: startup.id, capital: Number(capital), employees: 2 })
      if (!result?.ok) throw new Error(result?.message || '創立公司失敗')
      setCompany(result)
      setNotice(result.message || '公司已成立')
    } catch (error) {
      setNotice(error.message || '創立公司失敗')
    } finally { setBusy(false) }
  }

  if (!active) return null

  const requiredLevel = Number(startup?.requiredLevel || 3)
  const currentLevel = Number(startup?.currentLevel || 0)
  const startCost = Number(startup?.startCost || 0)
  const canFound = Boolean(startup && currentLevel >= requiredLevel && Number(capital) >= startCost && Number(company?.startupRequirements?.prisonDays || 0) <= 0 && Number(company?.startupRequirements?.cash || 0) >= Number(capital) && !company?.exists)
  const offerPay = selectedJob && selectedEmployer ? Number(selectedJob.dailySalary || 0) * 0.70 * Number(selectedEmployer.salaryMultiplier || 1) : 0
  const eligibleExp = Number(career?.totalWorkDays || 0) >= Number(selectedJob?.minExperienceDays || 0)
  const eligibleSkill = Number(career?.skills?.[selectedJob?.skill]?.level || 0) >= Number(selectedJob?.requiredLevel || 0)
  const sameCombo = career?.currentJob?.id === selectedJob?.id && career?.employer === selectedEmployer?.symbol

  return <aside className={`parity-restore-dock ${open ? 'open' : ''}`}>
    <button type="button" className="parity-restore-toggle" onClick={() => setOpen((value) => !value)}>
      🧰 完整職涯／創業 {open ? '×' : '›'}
    </button>
    {open && <div className="parity-restore-body">
      <div className="parity-restore-tabs">
        <button type="button" className={tab === 'career' ? 'active' : ''} onClick={() => setTab('career')}>公司跳槽</button>
        <button type="button" className={tab === 'startup' ? 'active' : ''} onClick={() => setTab('startup')}>創業門檻</button>
      </div>

      {tab === 'career' && <div className="parity-special-card">
        <div><strong>應徵／在職跳槽</strong><span>每職缺 × 公司冷卻 {Number(career?.applicationCooldownDays || 30)} 日</span></div>
        <p>可以維持同一職位改投其他公司；公司規模會影響實際薪資。</p>
        <label><span>職位</span><select value={selectedJob?.id || ''} onChange={(event) => setJobId(event.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.name}・基準 {money(Number(job.dailySalary || 0) * .70)}/日</option>)}</select></label>
        <label><span>公司</span><select value={selectedEmployer?.symbol || ''} onChange={(event) => setEmployerSymbol(event.target.value)}>{employers.map((row) => <option key={row.symbol} value={row.symbol}>{row.displayTicker || row.symbol}・{row.name}・薪資倍率 {Number(row.salaryMultiplier || 1).toFixed(3)}</option>)}</select></label>
        {selectedJob && <div className="parity-requirement-grid">
          <span>技能 Lv.{Number(career?.skills?.[selectedJob.skill]?.level || 0)} / {selectedJob.requiredLevel}</span>
          <span>總年資 {Number(career?.totalWorkDays || 0)} / {selectedJob.minExperienceDays} 日</span>
          <span>預估日薪 {money(offerPay)}</span>
          <span>現職 {career?.currentEmployer?.displayTicker || career?.employer || '待業'}</span>
        </div>}
        <button type="button" disabled={busy || !selectedEmployer || !eligibleExp || !eligibleSkill || sameCombo} onClick={applyJob}>{sameCombo ? '目前已在此職位' : career?.currentJob?.id !== 'unemployed' ? '提出跳槽／應徵' : '提出應徵'}</button>
      </div>}

      {tab === 'startup' && <div className="parity-special-card">
        <div><strong>創立公司門檻</strong><span>{company?.exists ? '已成立公司' : '必須對應技能 Lv.3'}</span></div>
        <p>創業不能再繞過專業門檻；最低資本依產業不同，推薦資本高於最低門檻。</p>
        <label><span>產業</span><select value={startup?.id || ''} onChange={(event) => setIndustry(event.target.value)}>{startupRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        {startup && <div className="parity-requirement-grid">
          <span>{startup.requiredSkillName} Lv.{currentLevel} / {requiredLevel}</span>
          <span>最低資本 {money(startCost)}</span>
          <span>推薦資本 {money(startup.recommendedCapital)}</span>
          <span>現金 {money(company?.startupRequirements?.cash)}</span>
        </div>}
        {!company?.exists && <>
          <label><span>公司名稱</span><input value={startupName} onChange={(event) => setStartupName(event.target.value)} /></label>
          <label><span>投入資本</span><input type="number" min={startCost || 10000} step="5000" value={capital} onChange={(event) => setCapital(Number(event.target.value))} /></label>
          <button type="button" disabled={busy || !canFound || !startupName.trim()} onClick={foundCompany}>成立公司</button>
        </>}
        {!company?.exists && currentLevel < requiredLevel && <small className="parity-selected-asset">尚缺：{startup?.requiredSkillName || '對應技能'}需升至 Lv.{requiredLevel}</small>}
      </div>}
      {notice && <div className="parity-notice">{notice}</div>}
    </div>}
  </aside>
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
      <label><span>市場標的</span><select value={symbol} onChange={(event) => setSymbol(event.target.value)}>{assets.map((item) => <option key={item.symbol} value={item.symbol}>{item.displayTicker || item.symbol}・{item.name}</option>)}</select></label>
      {selected && <small className="parity-selected-asset">目前：{selected.name}｜{money(selected.price)}</small>}

      <div className="parity-special-card">
        <div><strong>政治關說</strong><span>冷卻 {Number(politics.stockCooldownDays || 0)} 日</span></div>
        <p>消耗現金與政治影響力，安排隔日正面市場事件；會留下法律風險。</p>
        <button type="button" disabled={busy || !symbol || Number(politics.level || 0) < 1 || Number(politics.stockCooldownDays || 0) > 0} onClick={() => run('political_lobby', { symbol })}>對 {selected?.displayTicker || symbol || '標的'} 發動</button>
      </div>

      <div className="parity-special-card">
        <div><strong>地下黑函</strong><span>冷卻 {Number(underworld.marketCooldownDays || 0)} 日</span></div>
        <p>使用非法資金安排隔日負面市場事件；失敗時可能形成反向效果。</p>
        <button type="button" disabled={busy || !symbol || Number(underworld.rank || 0) < 1 || Number(underworld.marketCooldownDays || 0) > 0} onClick={() => run('underworld_smear', { symbol })}>對 {selected?.displayTicker || symbol || '標的'} 散布黑函</button>
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
    <CareerStartupDock active={mode === 'life'} />
    <PowerSpecialDock active={mode === 'life'} />
  </>
}
