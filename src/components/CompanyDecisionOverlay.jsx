import { useEffect, useState } from 'react'
import { companyAction, getCompany } from '../api/client.js'

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

export default function CompanyDecisionOverlay() {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    try { setData(await getCompany()) }
    catch { /* session can be switching/restoring; next poll retries */ }
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
      setData(result); setNotice(result.message || '公司決策已執行')
    } catch (error) { setNotice(error.message || '公司決策失敗') }
    finally { setBusy(false) }
  }

  return <div className="parity-company-backdrop" role="dialog" aria-modal="true" aria-label="公司重大決策">
    <section className="parity-company-modal">
      <div className="parity-eyebrow">COMPANY DECISION</div>
      <div className="parity-modal-head"><div><h2>{pending.title || '公司重大決策'}</h2><p>{pending.desc}</p></div><span>期限 Day {pending.deadlineDay ?? pending.deadline_day ?? '—'}</span></div>
      <div className="parity-choice-grid">{(pending.choices || []).map((choice, index) => <button type="button" key={`${choice.label}-${index}`} disabled={busy} onClick={() => choose(index)}><strong>{choice.label || `方案 ${index + 1}`}</strong><span>{choice.result || '採取此方案。'}</span><small>現金 {Number(choice.cash || 0) >= 0 ? '+' : ''}{money(choice.cash || 0)}　品牌 {Number(choice.brand || 0) >= 0 ? '+' : ''}{Number(choice.brand || 0).toFixed(1)}　法律 Heat {Number(choice.legal || 0) >= 0 ? '+' : ''}{Number(choice.legal || 0).toFixed(1)}</small></button>)}</div>
      {notice && <div className="parity-notice">{notice}</div>}
      <div className="parity-modal-foot">若長期快轉前已有待處理決策，系統會先停下來讓你決定。</div>
    </section>
  </div>
}
