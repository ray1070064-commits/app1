import { useEffect, useState } from 'react'
import { careerAction } from '../../api/client.js'
import { ActionButton, Metric, Section, money } from './P1Ui.jsx'

export default function CareerPanel({ career, busy, run }) {
  const jobs = (career.jobs || []).filter((job) => job.id !== 'unemployed')
  const [jobId, setJobId] = useState('')
  const [employerSymbol, setEmployerSymbol] = useState('')

  useEffect(() => {
    if (!jobId && jobs.length) setJobId(career.currentJob?.id !== 'unemployed' ? career.currentJob?.id : jobs[0].id)
  }, [jobId, jobs.length, career.currentJob?.id])

  const target = jobs.find((job) => job.id === jobId) || jobs[0]
  const employers = target ? (career.employersBySkill?.[target.skill] || []) : []

  useEffect(() => {
    if (!employers.length) { setEmployerSymbol(''); return }
    if (!employers.some((row) => row.symbol === employerSymbol)) setEmployerSymbol(employers[0].symbol)
  }, [jobId, career.employersBySkill])

  const employer = employers.find((row) => row.symbol === employerSymbol) || employers[0]
  const skillLevel = Number(career.skills?.[target?.skill]?.level || 0)
  const expOk = Number(career.totalWorkDays || 0) >= Number(target?.minExperienceDays || 0)
  const skillOk = skillLevel >= Number(target?.requiredLevel || 0)
  const currentEmployer = career.currentEmployer?.symbol || career.employer || ''
  const sameCombo = career.currentJob?.id === target?.id && currentEmployer === employer?.symbol
  const offerPay = target && employer ? Number(target.dailySalary || 0) * .70 * Number(employer.salaryMultiplier || 1) : 0

  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="目前職位" value={career.currentJob?.name || '待業'} />
      <Metric label="目前公司" value={career.currentEmployer?.displayTicker || career.currentEmployer?.name || career.employer || '—'} />
      <Metric label="實際日薪" value={money(career.currentJob?.dailySalary)} />
      <Metric label="職涯經驗" value={`${career.experienceDays || 0} 天`} />
      <Metric label="總年資" value={`${career.totalWorkDays || 0} 天`} />
      <Metric label="任職年資" value={`${career.employerDays || 0} 天`} />
      <Metric label="滿意度" value={Number(career.satisfaction || 0).toFixed(0)} />
      <Metric label="聲望" value={Number(career.reputation || 0).toFixed(0)} />
    </div>

    <Section title="應徵／在職跳槽">
      <div className="form-grid two">
        <label><span>職位</span><select value={target?.id || ''} onChange={(e) => setJobId(e.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.name}・技能 Lv.{job.requiredLevel}・基準 {money(Number(job.dailySalary || 0) * .70)}/日</option>)}</select></label>
        <label><span>公司</span><select value={employer?.symbol || ''} onChange={(e) => setEmployerSymbol(e.target.value)}>{employers.map((row) => <option key={row.symbol} value={row.symbol}>{row.displayTicker || row.symbol}・{row.name}・薪資倍率 {Number(row.salaryMultiplier || 1).toFixed(3)}</option>)}</select></label>
      </div>
      {target && <div className="deep-check-grid">
        <div className={skillOk ? 'passed' : ''}>{skillOk ? '✓' : '○'} {career.skills?.[target.skill]?.name || target.skill} Lv.{skillLevel} / {target.requiredLevel}</div>
        <div className={expOk ? 'passed' : ''}>{expOk ? '✓' : '○'} 總年資 {career.totalWorkDays || 0} / {target.minExperienceDays} 日</div>
        <div className={employer ? 'passed' : ''}>{employer ? '✓' : '○'} 預估日薪 {money(offerPay)}</div>
        <div>同職缺／公司冷卻 {career.applicationCooldownDays || 30} 日</div>
      </div>}
      <div className="life-action-row wrap">
        <ActionButton disabled={busy || !target || !employer || !skillOk || !expOk || sameCombo} onClick={() => run(careerAction, 'apply_job', { jobId: target.id, employerSymbol: employer.symbol })}>{sameCombo ? '目前已在此職位' : career.currentJob?.id !== 'unemployed' ? '提出跳槽／應徵' : '提出應徵'}</ActionButton>
        <ActionButton disabled={busy || !career.currentJob?.promotionTo} onClick={() => run(careerAction, 'promote', {})}>爭取升遷</ActionButton>
        <ActionButton disabled={busy || career.currentJob?.id === 'unemployed'} tone="danger" onClick={() => run(careerAction, 'quit', {})}>離職</ActionButton>
      </div>
    </Section>

    <Section title="技能與訓練">
      {career.training && <div className="status-banner">訓練中：{career.training.skill} → Lv.{career.training.target_level}，剩 {career.training.remaining_days} 日</div>}
      <div className="skill-grid">{Object.entries(career.skills || {}).map(([key, skill]) => <div className="skill-row" key={key}><div><strong>{skill.name}</strong><span>Lv.{skill.level}</span></div><ActionButton disabled={busy || Boolean(career.training) || skill.level >= 3} onClick={() => run(careerAction, 'start_training', { skill: key, targetLevel: skill.level + 1 })}>訓練</ActionButton></div>)}</div>
    </Section>
  </div>
}
