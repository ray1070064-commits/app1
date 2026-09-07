import { useEffect, useMemo, useState } from 'react'
import {
  companyAction,
  familyAction,
  featureAction,
  getCompany,
  getFamily,
  getFeatureState,
} from '../api/client.js'

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

function pct(value, digits = 1) { return `${Number(value || 0).toFixed(digits)}%` }

function Metric({ label, value, hint }) {
  return <div className="p0-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}

export default function P0GameplayDock({ active = true, onRetired }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('family')
  const [family, setFamily] = useState(null)
  const [features, setFeatures] = useState(null)
  const [company, setCompany] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [meeting, setMeeting] = useState('friend')
  const [childName, setChildName] = useState('安安')
  const [livingCost, setLivingCost] = useState(50)
  const [industry, setIndustry] = useState('software')
  const [startupName, setStartupName] = useState('玩家控股公司')
  const [ticker, setTicker] = useState('PCOR')
  const [capital, setCapital] = useState(65000)
  const [targetYield, setTargetYield] = useState(0)
  const [retirementRoute, setRetirementRoute] = useState('stable')
  const [successorIndex, setSuccessorIndex] = useState('')

  async function load() {
    if (!active) return
    const results = await Promise.allSettled([getFamily(), getFeatureState(), getCompany()])
    if (results[0].status === 'fulfilled') {
      const value = results[0].value
      setFamily(value)
      if (value?.family?.partner_meeting_method) setMeeting(value.family.partner_meeting_method)
    }
    if (results[1].status === 'fulfilled') {
      const value = results[1].value
      setFeatures(value)
      setLivingCost(Number(value?.economy?.dailyLivingCost ?? 50))
      const routes = value?.retirementRoutes || []
      if (routes.length && !routes.some((row) => row.id === retirementRoute && row.eligible)) {
        setRetirementRoute(routes.find((row) => row.eligible)?.id || 'stable')
      }
    }
    if (results[2].status === 'fulfilled') {
      const value = results[2].value
      setCompany(value)
      setTargetYield(Number(value?.dividendPolicy?.targetYield || 0) * 100)
      const reqs = value?.startupRequirements?.industries || []
      if (reqs.length && !reqs.some((row) => row.id === industry)) setIndustry(reqs[0].id)
    }
    const failed = results.find((row) => row.status === 'rejected')
    if (failed) setNotice(failed.reason?.message || '部分深度人生資料載入失敗')
  }

  useEffect(() => {
    if (!active) return undefined
    load()
    const timer = window.setInterval(() => { if (open) load() }, 5000)
    return () => window.clearInterval(timer)
  }, [active, open])

  const f = family?.family || {}
  const candidate = family?.candidate || {}
  const datingActions = family?.datingActions || {}
  const retirementRoutes = features?.retirementRoutes || []
  const selectedRoute = retirementRoutes.find((row) => row.id === retirementRoute)
  const startupRows = company?.startupRequirements?.industries || []
  const startup = startupRows.find((row) => row.id === industry) || startupRows[0]

  useEffect(() => {
    if (startup && Number(capital) < Number(startup.startCost || 0)) setCapital(Number(startup.startCost || 0))
  }, [industry, company])

  useEffect(() => {
    const successors = selectedRoute?.successors || []
    if (successors.length && !successors.some((row) => String(row.index) === String(successorIndex))) {
      setSuccessorIndex(String(successors[0].index))
    }
  }, [retirementRoute, features])

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

  async function retire() {
    if (!selectedRoute?.eligible) return
    const label = selectedRoute.name || '退休'
    if (!window.confirm(`確定選擇「${label}」並結束目前人生？`)) return
    const result = await run(featureAction, 'retire', {
      route: retirementRoute,
      successorIndex: successorIndex === '' ? undefined : Number(successorIndex),
    })
    if (result?.ok) onRetired?.(result)
  }

  if (!active) return null

  const startupCanFound = Boolean(
    startup && !company?.exists && Number(startup.currentLevel || 0) >= Number(startup.requiredLevel || 3)
    && Number(capital) >= Number(startup.startCost || 0)
    && Number(company?.startupRequirements?.cash || 0) >= Number(capital)
    && Number(company?.startupRequirements?.prisonDays || 0) <= 0
    && /^[A-Za-z]{2,5}$/.test(ticker.trim()) && startupName.trim(),
  )

  return <aside className={`p0-dock ${open ? 'open' : ''}`}>
    <button type="button" className="p0-toggle" onClick={() => setOpen((value) => !value)}>
      🧭 深度人生 {open ? '×' : '›'}
    </button>
    {open && <div className="p0-body">
      <div className="p0-tabs">
        <button type="button" className={tab === 'family' ? 'active' : ''} onClick={() => setTab('family')}>戀愛／家庭</button>
        <button type="button" className={tab === 'life' ? 'active' : ''} onClick={() => setTab('life')}>生活／健康</button>
        <button type="button" className={tab === 'company' ? 'active' : ''} onClick={() => setTab('company')}>公司</button>
        <button type="button" className={tab === 'retire' ? 'active' : ''} onClick={() => setTab('retire')}>退休傳承</button>
      </div>

      {tab === 'family' && <div className="p0-stack">
        {!f.married && !f.dating && <section className="p0-card">
          <div className="p0-title"><strong>尋找對象</strong><span>先遇見，再決定是否交往</span></div>
          <label><span>相遇方式</span><select value={meeting} onChange={(e) => setMeeting(e.target.value)}>{(family?.meetingMethods || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          {(family?.meetingMethods || []).find((row) => row.id === meeting)?.desc && <p>{(family.meetingMethods || []).find((row) => row.id === meeting)?.desc}</p>}
          {!candidate.name && <button type="button" disabled={busy} onClick={() => run(familyAction, 'find_partner', { meetingMethod: meeting })}>認識新對象</button>}
          {candidate.name && <article className="p0-candidate">
            <div><strong>{candidate.name}</strong><span>{Number(candidate.age || 0).toFixed(1)} 歲</span></div>
            <div className="p0-grid"><Metric label="職涯" value={candidate.careerName || candidate.career} /><Metric label="個性" value={candidate.personalityName || candidate.personality} /><Metric label="相遇" value={candidate.meetingName || meeting} /><Metric label="初始化學反應" value={Number(candidate.chemistry || 0).toFixed(1)} /></div>
            <p>{candidate.personalityDesc || candidate.careerDesc}</p>
            <div className="p0-actions"><button type="button" disabled={busy} onClick={() => run(familyAction, 'accept_candidate')}>接受並開始交往</button><button type="button" disabled={busy} onClick={() => run(familyAction, 'skip_candidate')}>略過</button></div>
          </article>}
        </section>}

        {f.dating && !f.married && <section className="p0-card">
          <div className="p0-title"><strong>{f.partner_name}・交往中</strong><span>親密度達 60 才能結婚</span></div>
          <div className="p0-grid"><Metric label="親密度" value={Number(f.dating_closeness || 0).toFixed(0)} /><Metric label="關係" value={Number(f.relationship || 0).toFixed(0)} /><Metric label="相遇" value={f.partner_meeting_method || '—'} /><Metric label="個性" value={f.partner_personality || '—'} /></div>
          <div className="p0-actions vertical-mobile">
            <button type="button" disabled={busy || Number(datingActions.talk?.remainingDays || 0) > 0} onClick={() => run(familyAction, 'dating_talk')}>聊天 $200 {Number(datingActions.talk?.remainingDays || 0) > 0 ? `(${datingActions.talk.remainingDays}日)` : ''}</button>
            <button type="button" disabled={busy || Number(datingActions.date?.remainingDays || 0) > 0} onClick={() => run(familyAction, 'dating_date')}>約會 $800 {Number(datingActions.date?.remainingDays || 0) > 0 ? `(${datingActions.date.remainingDays}日)` : ''}</button>
            <button type="button" disabled={busy || Number(datingActions.trip?.remainingDays || 0) > 0} onClick={() => run(familyAction, 'dating_trip')}>旅行 $1,800 {Number(datingActions.trip?.remainingDays || 0) > 0 ? `(${datingActions.trip.remainingDays}日)` : ''}</button>
          </div>
          <div className="p0-actions"><button type="button" disabled={busy || !family?.marriage?.eligible} onClick={() => run(familyAction, 'marry')}>結婚 $8,000</button><button type="button" className="danger" disabled={busy} onClick={() => run(familyAction, 'end_dating')}>分手</button></div>
          {!family?.marriage?.eligible && <small className="p0-hint">需要親密度 60、現金 $8,000，且不能在服刑中。</small>}
        </section>}

        {f.married && <section className="p0-card">
          <div className="p0-title"><strong>{f.partner_name}・家庭</strong><span>{f.children || 0}/{family?.childrenLimit || 4} 名子女</span></div>
          <div className="p0-grid"><Metric label="幸福" value={Number(f.happiness || 0).toFixed(0)} /><Metric label="關係" value={Number(f.relationship || 0).toFixed(0)} /><Metric label="伴侶日收入" value={money(f.partner_daily_income)} /><Metric label="婚姻天數" value={`${f.marriage_days || 0} 天`} /></div>
          <div className="p0-inline"><input value={childName} onChange={(e) => setChildName(e.target.value)} maxLength={12} placeholder="孩子姓名" /><button type="button" disabled={busy || !childName.trim() || Number(f.children || 0) >= Number(family?.childrenLimit || 4)} onClick={() => run(familyAction, 'add_child', { name: childName, educationPath: 'balanced' })}>新增子女 {money(family?.childCost || 2000)}</button></div>
          <small className="p0-hint">最多 4 名子女；每次新增支出 $2,000。教育基金與親子陪伴仍在「家庭」正式頁管理。</small>
        </section>}
      </div>}

      {tab === 'life' && <div className="p0-stack">
        <section className="p0-card">
          <div className="p0-title"><strong>每日生活費</strong><span>最低 {money(features?.economy?.minimumLivingCost || 30)}</span></div>
          <div className="p0-grid"><Metric label="設定生活費" value={money(features?.economy?.dailyLivingCost)} /><Metric label="昨日實際生活費" value={money(features?.economy?.actualLivingCost)} /><Metric label="昨日個人稅" value={money(features?.economy?.lastPersonalTax)} /><Metric label="房車維護" value={money(features?.economy?.dailyPropertyUpkeep)} /></div>
          <div className="p0-inline"><input type="number" min={features?.economy?.minimumLivingCost || 30} step="10" value={livingCost} onChange={(e) => setLivingCost(Number(e.target.value))} /><button type="button" disabled={busy || Number(livingCost) < Number(features?.economy?.minimumLivingCost || 30)} onClick={() => run(featureAction, 'set_living_cost', { amount: livingCost })}>更新生活費</button></div>
        </section>
        <section className="p0-card">
          <div className="p0-title"><strong>健康／休養</strong><span>恢復舊版數值</span></div>
          <div className="p0-grid"><Metric label="健康" value={`${Number(features?.health?.health || 0).toFixed(0)}/100`} /><Metric label="壓力" value={`${Number(features?.health?.stress || 0).toFixed(0)}/100`} /><Metric label="健檢保護" value={`${Number(features?.health?.checkupBuffDays || 0)} 天`} /><Metric label="疾病" value={String(features?.health?.activeIllnesses?.length || 0)} /></div>
          <div className="p0-actions"><button type="button" disabled={busy} onClick={() => run(featureAction, 'medical_checkup')}>健檢 $3,000・健康 +25</button><button type="button" disabled={busy} onClick={() => run(featureAction, 'stress_recovery')}>休養 $2,000・壓力 -35</button></div>
        </section>
        {features?.property?.lastMarketEvent && <section className="p0-card"><div className="p0-title"><strong>最近房車市場事件</strong><span>Day {features.property.lastMarketEvent.day}</span></div><p>{features.property.lastMarketEvent.title}｜{features.property.lastMarketEvent.desc}</p></section>}
      </div>}

      {tab === 'company' && <div className="p0-stack">
        {!company?.exists ? <section className="p0-card">
          <div className="p0-title"><strong>完整創業設定</strong><span>技能 Lv.3＋產業最低資本</span></div>
          <label><span>產業</span><select value={startup?.id || ''} onChange={(e) => setIndustry(e.target.value)}>{startupRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          {startup && <div className="p0-grid"><Metric label="技能" value={`${startup.requiredSkillName} Lv.${startup.currentLevel}/${startup.requiredLevel}`} /><Metric label="最低資本" value={money(startup.startCost)} /><Metric label="建議資本" value={money(startup.recommendedCapital)} /><Metric label="現金" value={money(company?.startupRequirements?.cash)} /></div>}
          <div className="p0-inline two-fields"><input value={startupName} onChange={(e) => setStartupName(e.target.value)} placeholder="公司名稱" /><input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))} placeholder="2～5碼英文代號" /></div>
          <div className="p0-inline"><input type="number" min={startup?.startCost || 10000} step="5000" value={capital} onChange={(e) => setCapital(Number(e.target.value))} /><button type="button" disabled={busy || !startupCanFound} onClick={() => run(companyAction, 'found', { name: startupName.trim(), ticker: ticker.trim(), industry: startup.id, capital, employees: 2 })}>成立 {ticker || '公司'}</button></div>
          <small className="p0-hint">舊版初始模型：2 名員工、現金 78%、固定資產 22%、RD 0%、品牌 5、初始估值為投入資本 75%。</small>
        </section> : <section className="p0-card">
          <div className="p0-title"><strong>{company.company?.name}（{company.company?.ticker || 'PCOR'}）</strong><span>{company.company?.public ? '已上市' : '私人公司'}</span></div>
          <div className="p0-grid"><Metric label="公司現金" value={money(company.company?.cash)} /><Metric label="固定資產" value={money(company.company?.fixed_assets)} /><Metric label="品牌" value={Number(company.company?.brand || 0).toFixed(1)} /><Metric label="估值" value={money(company.company?.valuation)} /></div>
          {company.company?.public ? <>
            <div className="p0-title minor"><strong>MYCO 目標殖利率</strong><span>最高 10%</span></div>
            <div className="p0-inline"><input type="number" min="0" max="10" step="0.5" value={targetYield} onChange={(e) => setTargetYield(Number(e.target.value))} /><button type="button" disabled={busy} onClick={() => run(companyAction, 'set_target_yield', { targetYield: targetYield / 100 })}>設定 {pct(targetYield)}</button></div>
            <div className="p0-grid"><Metric label="上次總配息" value={money(company.dividendPolicy?.lastTotal)} /><Metric label="每股" value={money(company.dividendPolicy?.lastPerShare)} /><Metric label="你上次收到" value={money(company.dividendPolicy?.lastPlayerIncome)} /><Metric label="累計收到" value={money(company.dividendPolicy?.totalReceived)} /></div>
            <small className="p0-hint">季度理論配息＝市值 × 年化目標殖利率 ÷ 4；同時受上季獲利 30% 上限、公司現金安全準備與董事會限制。</small>
          </> : <small className="p0-hint">完成 IPO 後可設定 MYCO 目標年化殖利率。</small>}
        </section>}
      </div>}

      {tab === 'retire' && <div className="p0-stack">
        <section className="p0-card">
          <div className="p0-title"><strong>退休／傳承路線</strong><span>選擇後才進入最終結算</span></div>
          <div className="p0-route-list">{retirementRoutes.map((row) => <label className={`${retirementRoute === row.id ? 'selected' : ''} ${!row.eligible ? 'disabled' : ''}`} key={row.id}><input type="radio" name="retirement-route" value={row.id} checked={retirementRoute === row.id} disabled={!row.eligible} onChange={() => setRetirementRoute(row.id)} /><div><strong>{row.name}</strong><span>{row.desc}</span></div></label>)}</div>
          {selectedRoute?.id === 'successor' && selectedRoute?.eligible && <label><span>接班人</span><select value={successorIndex} onChange={(e) => setSuccessorIndex(e.target.value)}>{(selectedRoute.successors || []).map((row) => <option key={row.index} value={row.index}>{row.name}・教育 Lv.{row.educationLevel}</option>)}</select></label>}
          {selectedRoute?.id === 'successor' && !selectedRoute?.eligible && <small className="p0-hint">需要玩家公司，以及至少一名已成年且教育 Lv.2 以上的子女。</small>}
          <button type="button" className="p0-retire" disabled={busy || !selectedRoute?.eligible || features?.gameOver} onClick={retire}>選擇「{selectedRoute?.name || '退休'}」並結算</button>
        </section>
      </div>}

      {notice && <div className="p0-notice">{notice}</div>}
    </div>}
  </aside>
}
