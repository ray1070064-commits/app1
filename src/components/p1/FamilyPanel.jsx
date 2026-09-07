import { useEffect, useState } from 'react'
import { familyAction } from '../../api/client.js'
import { ActionButton, Bar, EDUCATION_PATHS, Metric, Section, childStage, money, pct } from './P1Ui.jsx'

export default function FamilyPanel({ familyData, busy, run }) {
  const f = familyData.family || {}
  const buffs = familyData.buffs || {}
  const candidate = familyData.candidate || {}
  const methods = familyData.meetingMethods || []
  const dating = familyData.datingActions || {}
  const marriage = familyData.marriage || {}
  const [meeting, setMeeting] = useState(f.partner_meeting_method || methods[0]?.id || 'friend')
  const [childName, setChildName] = useState('安安')
  const [educationPath, setEducationPath] = useState('balanced')
  const [educationAmount, setEducationAmount] = useState(5000)
  const [settings, setSettings] = useState({ reserve: 10000, relationship: 70, parenting: 30, dating: 7 })

  useEffect(() => {
    if (!methods.some((row) => row.id === meeting) && methods[0]) setMeeting(methods[0].id)
  }, [methods, meeting])
  useEffect(() => setSettings({
    reserve: Number(f.auto_family_cash_reserve ?? 10000), relationship: Number(f.auto_relationship_threshold ?? 70),
    parenting: Number(f.auto_parenting_interval_days ?? 30), dating: Number(f.auto_dating_interval_days ?? 7),
  }), [f.auto_family_cash_reserve, f.auto_relationship_threshold, f.auto_parenting_interval_days, f.auto_dating_interval_days])

  const meetingInfo = methods.find((row) => row.id === meeting)
  const childrenLimit = Number(familyData.childrenLimit || 4)
  const childCost = Number(familyData.childCost || 2000)

  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="關係" value={Number(f.relationship || 0).toFixed(0)} />
      <Metric label="幸福" value={Number(f.happiness || 0).toFixed(0)} />
      <Metric label="伴侶" value={f.partner_name || '無'} hint={f.partner_job || ''} />
      <Metric label="交往親密度" value={Number(f.dating_closeness || 0).toFixed(0)} />
      <Metric label="子女" value={`${f.children || 0}/${childrenLimit}`} />
      <Metric label="昨日家庭收入" value={money(f.last_family_income)} />
      <Metric label="昨日家庭支出" value={money(f.last_family_expense)} />
      <Metric label="累計家庭支援" value={money(f.family_support_total)} />
    </div>

    {!f.dating && !f.married && <Section title="相遇與交往">
      <div className="form-grid two">
        <label><span>相遇方式</span><select value={meeting} onChange={(e) => setMeeting(e.target.value)}>{methods.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <div className="deep-note">{meetingInfo?.desc || '選擇你想主動擴展生活圈的方式。'}</div>
      </div>
      {!candidate.name ? <ActionButton disabled={busy} onClick={() => run(familyAction, 'find_partner', { meetingMethod: meeting })}>認識新對象</ActionButton> : <article className="p1-candidate-card">
        <div className="p1-candidate-head"><div><strong>{candidate.name}</strong><span>{Number(candidate.age || 0).toFixed(1)} 歲</span></div><b>化學反應 {Number(candidate.chemistry || 0).toFixed(1)}</b></div>
        <div className="deep-grid-3">
          <Metric label="職涯" value={candidate.careerName || candidate.career || '—'} />
          <Metric label="個性" value={candidate.personalityName || candidate.personality || '—'} />
          <Metric label="相遇" value={candidate.meetingName || meetingInfo?.name || '—'} />
        </div>
        <p>{candidate.personalityDesc || candidate.careerDesc || candidate.meetingDesc || ''}</p>
        <div className="life-action-row"><ActionButton disabled={busy} onClick={() => run(familyAction, 'accept_candidate', {})}>接受並開始交往</ActionButton><ActionButton disabled={busy} tone="danger" onClick={() => run(familyAction, 'skip_candidate', {})}>略過</ActionButton></div>
      </article>}
    </Section>}

    {f.dating && !f.married && <Section title={`${f.partner_name || '伴侶'}・交往中`} actions={<span className={`status-pill ${marriage.eligible ? 'good' : ''}`}>{marriage.eligible ? '可結婚' : '尚未達標'}</span>}>
      <div className="deep-grid-3">
        <Metric label="相遇方式" value={f.partner_meeting_method || '—'} />
        <Metric label="個性" value={f.partner_personality || '—'} />
        <Metric label="伴侶日收入" value={money(f.partner_daily_income)} />
      </div>
      <div className="deep-progress-pair"><Bar label="交往親密度" value={f.dating_closeness} /><Bar label="關係" value={f.relationship} /></div>
      <div className="life-action-row wrap">
        <ActionButton disabled={busy || Number(dating.talk?.remainingDays || 0) > 0} onClick={() => run(familyAction, 'dating_talk', {})}>聊天 {money(dating.talk?.cost || 200)} {Number(dating.talk?.remainingDays || 0) > 0 ? `・${dating.talk.remainingDays}日` : ''}</ActionButton>
        <ActionButton disabled={busy || Number(dating.date?.remainingDays || 0) > 0} onClick={() => run(familyAction, 'dating_date', {})}>約會 {money(dating.date?.cost || 800)} {Number(dating.date?.remainingDays || 0) > 0 ? `・${dating.date.remainingDays}日` : ''}</ActionButton>
        <ActionButton disabled={busy || Number(dating.trip?.remainingDays || 0) > 0} onClick={() => run(familyAction, 'dating_trip', {})}>旅行 {money(dating.trip?.cost || 1800)} {Number(dating.trip?.remainingDays || 0) > 0 ? `・${dating.trip.remainingDays}日` : ''}</ActionButton>
      </div>
      <div className="deep-note">結婚需要親密度 {Number(marriage.requiredCloseness || 60)}、現金 {money(marriage.cost || 8000)}，且不能在服刑中。</div>
      <div className="life-action-row"><ActionButton disabled={busy || !marriage.eligible} onClick={() => run(familyAction, 'marry', {})}>結婚 {money(marriage.cost || 8000)}</ActionButton><ActionButton disabled={busy} tone="danger" onClick={() => run(familyAction, 'end_dating', {})}>分手</ActionButton></div>
    </Section>}

    {f.married && <Section title="伴侶與家庭">
      <div className="deep-grid-3">
        <Metric label="相遇方式" value={f.partner_meeting_method || '—'} /><Metric label="個性" value={f.partner_personality || '—'} />
        <Metric label="職涯 Lv." value={`Lv.${f.partner_level || 1}`} /><Metric label="伴侶日收入" value={money(f.partner_daily_income)} />
        <Metric label="伴侶年齡" value={`${Number(f.partner_age || 0).toFixed(1)} 歲`} /><Metric label="婚姻天數" value={`${f.marriage_days || 0} 天`} />
      </div>
      <div className="deep-progress-pair"><Bar label="關係" value={f.relationship} /><Bar label="幸福" value={f.happiness} /></div>
      <div className="deep-note">穩定後盾：{f.stable_support_unlocked ? '已解鎖' : `累積中（${f.high_happiness_streak || 0}/365 天）`}｜長照累計 {money(f.long_term_care_total)}</div>
    </Section>}

    {f.married && <Section title="家庭管理">
      <div className="inline-form"><input value={childName} onChange={(e) => setChildName(e.target.value)} maxLength={12} placeholder="孩子姓名" /><select value={educationPath} onChange={(e) => setEducationPath(e.target.value)}>{EDUCATION_PATHS.map(([key, label]) => <option key={key} value={key}>{label}教育</option>)}</select><ActionButton disabled={busy || !childName.trim() || Number(f.children || 0) >= childrenLimit} onClick={() => run(familyAction, 'add_child', { name: childName, educationPath })}>新增子女 {money(childCost)}</ActionButton></div>
      <div className="deep-note">最多 {childrenLimit} 名子女；每次新增支出 {money(childCost)}。</div>
      <div className="deep-settings-grid">
        <label className="toggle-row compact-toggle"><span>自動家庭照顧</span><input type="checkbox" checked={Boolean(f.auto_family_care)} onChange={(e) => run(familyAction, 'settings', { autoFamilyCare: e.target.checked })} /></label>
        <label><span>保留現金</span><input type="number" value={settings.reserve} onChange={(e) => setSettings({ ...settings, reserve: Number(e.target.value) })} /></label>
        <label><span>關係門檻</span><input type="number" value={settings.relationship} onChange={(e) => setSettings({ ...settings, relationship: Number(e.target.value) })} /></label>
        <label><span>育兒間隔</span><input type="number" value={settings.parenting} onChange={(e) => setSettings({ ...settings, parenting: Number(e.target.value) })} /></label>
        <label><span>約會間隔</span><input type="number" value={settings.dating} onChange={(e) => setSettings({ ...settings, dating: Number(e.target.value) })} /></label>
        <ActionButton disabled={busy} onClick={() => run(familyAction, 'settings', { autoFamilyCare: Boolean(f.auto_family_care), autoFamilyCashReserve: settings.reserve, autoRelationshipThreshold: settings.relationship, autoParentingIntervalDays: settings.parenting, autoDatingIntervalDays: settings.dating })}>儲存</ActionButton>
      </div>
    </Section>}

    <Section title="家庭加成"><div className="deep-chip-row"><span>減壓 {Number(buffs.stress_relief || 0).toFixed(2)}</span><span>升遷 +{pct((buffs.promotion_bonus || 0) * 100)}</span><span>疾病 ×{Number(buffs.illness_mult || 1).toFixed(2)}</span><span>公司營收 ×{Number(buffs.company_rev_mult || 1).toFixed(2)}</span><span>罰金 ×{Number(buffs.fine_mult || 1).toFixed(2)}</span><span>伴侶貢獻 {pct((buffs.partner_contribution_rate || 0) * 100)}</span></div></Section>

    {f.child_profiles?.length > 0 && <Section title="子女教育與下一代" actions={<div className="inline-form compact-inline"><input type="number" min="100" step="500" value={educationAmount} onChange={(e) => setEducationAmount(Number(e.target.value))} /></div>}>
      <div className="deep-child-grid">{f.child_profiles.map((child, index) => <article className="deep-child-card" key={`${child.name}-${index}`}><div className="deep-child-head"><div><strong>{child.name}</strong><span>{childStage(child.age_days)}・{(Number(child.age_days || 0) / 365).toFixed(1)} 歲</span></div><b>教育 Lv.{child.education_level || 0}</b></div><div className="deep-chip-row"><span>教育基金 {money(child.education_fund)}</span><span>路線 {EDUCATION_PATHS.find((x) => x[0] === child.education_path)?.[1] || child.education_path}</span>{Number(child.adult_income || 0) > 0 && <span>{child.adult_career}・{money(child.adult_income)}/日</span>}</div><div className="deep-progress-stack"><Bar label="學習" value={child.learning} /><Bar label="自信" value={child.confidence} /><Bar label="親密" value={child.parent_bond} /><Bar label="興趣" value={child.interest} /></div>{childStage(child.age_days) !== '成年' && <><div className="inline-form"><select value={child.education_path || 'balanced'} onChange={(e) => run(familyAction, 'set_child_path', { index, educationPath: e.target.value })}>{EDUCATION_PATHS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ActionButton disabled={busy} onClick={() => run(familyAction, 'fund_child_education', { index, amount: educationAmount })}>投入教育 {money(educationAmount)}</ActionButton></div><div className="life-action-row"><ActionButton disabled={busy} onClick={() => run(familyAction, 'parent_child', { index, cost: 300 })}>陪伴孩子 $300</ActionButton></div></>}</article>)}</div>
    </Section>}

    {(familyData.eventHistory || f.family_event_history)?.length > 0 && <Section title="家庭時間線"><div className="record-list">{(familyData.eventHistory || f.family_event_history || []).slice().reverse().map((row, index) => <div className="record-row" key={`${row.day}-${index}`}><div><strong>Day {row.day}・{row.title}</strong><span>{row.kind}</span></div><p>{row.desc}</p></div>)}</div></Section>}
  </div>
}
