import { useState } from 'react'
import { companyAction } from '../../api/client.js'
import BaseCompanyPanel from '../p1/CompanyPanel.jsx'
import { ActionButton, Section } from '../p1/P1Ui.jsx'

export default function CompanyPanel(props) {
  const { companyData, busy, run } = props
  const [count, setCount] = useState(5)
  const company = companyData?.company || {}

  return <>
    <BaseCompanyPanel {...props} />
    {company.exists && <div className="life-stack p2-extension-stack">
      <Section title="批次人事調整" actions={<span className="status-pill">目前 {Number(company.employees || 0)} 人</span>}>
        <div className="inline-form">
          <label><span>人數</span><input type="number" min="1" max="1000" value={count} onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} /></label>
          <ActionButton disabled={busy} onClick={() => run(companyAction, 'hire', { count })}>一次聘用 {count} 人</ActionButton>
          <ActionButton disabled={busy || Number(company.employees || 0) <= 1} tone="danger" onClick={() => run(companyAction, 'layoff', { count })}>一次裁員 {count} 人</ActionButton>
        </div>
        <div className="deep-note">批次聘僱會一次計入招募成本；批次裁員會影響公司治理與累計裁員紀錄。後端會依公司現金與最低人力限制再次驗證。</div>
      </Section>
    </div>}
  </>
}
