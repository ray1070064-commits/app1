import React from 'react'

export function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

export function pct(value, digits = 1) { return `${Number(value || 0).toFixed(digits)}%` }
export function num(value, digits = 0) { return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: digits }) }
export function childStage(ageDays) {
  const years = Number(ageDays || 0) / 365
  if (years < 3) return '幼兒'
  if (years < 7) return '兒童'
  if (years < 13) return '學童'
  if (years < 18) return '青少年'
  return '成年'
}

export function Metric({ label, value, hint }) {
  return <div className="life-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}

export function Section({ title, children, actions, className = '' }) {
  return <section className={`life-card ${className}`}><div className="life-card-title"><h3>{title}</h3>{actions}</div>{children}</section>
}

export function ActionButton({ children, onClick, disabled, tone = '' }) {
  return <button type="button" className={`life-action ${tone}`} disabled={disabled} onClick={onClick}>{children}</button>
}

export function Bar({ label, value }) {
  const width = Math.max(0, Math.min(100, Number(value || 0)))
  return <div className="deep-progress"><div className="deep-progress-head"><span>{label}</span><strong>{width.toFixed(1)}</strong></div><div className="deep-progress-track"><i style={{ width: `${width}%` }} /></div></div>
}

export function KeyValueTable({ rows }) {
  return <div className="deep-table">{rows.map(([label, value]) => <div className="deep-table-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
}

export const EDUCATION_PATHS = [['balanced', '均衡'], ['academic', '學術'], ['creative', '創意'], ['sports', '運動']]
export const GOV_STYLE_LABELS = { far_left: '全民福祉（極左）', left: '社會市場（左）', neutral: '中間平衡', right: '市場保守（右）', far_right: '資本極化（極右）' }
export const OFFENSE_LABELS = { inside_info_purchase: '非法取得非公開消息', insider_trading: '內線交易', money_laundering: '洗錢／非法資金處理', market_manipulation: '市場操縱', influence_peddling: '不當關說', organized_crime: '地下組織活動', political_corruption: '非法政治介入' }
