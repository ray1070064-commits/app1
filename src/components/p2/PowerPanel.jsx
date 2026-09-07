import { useEffect, useState } from 'react'
import { powerRiskAction } from '../../api/client.js'
import BasePowerPanel from '../p1/PowerPanel.jsx'
import { ActionButton, Section, money } from '../p1/P1Ui.jsx'

export default function PowerPanel(props) {
  const { power, busy, run } = props
  const underworld = power?.underworld || {}
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    const dirty = Number(underworld.dirtyMoney || 0)
    if (amount <= 0 || amount > dirty) setAmount(Math.min(dirty, Math.max(1000, Math.floor(dirty / 2))))
  }, [underworld.dirtyMoney])

  const dirty = Number(underworld.dirtyMoney || 0)
  const safeAmount = Math.max(0, Math.min(dirty, Number(amount || 0)))
  const estimatedNet = safeAmount * .82

  return <>
    <BasePowerPanel {...props} />
    <div className="life-stack p2-extension-stack">
      <Section title="非法資金精細處理" actions={<span className="status-pill">可處理 {money(dirty)}</span>}>
        <div className="inline-form">
          <label><span>處理金額</span><input type="number" min="0" max={dirty} step="1000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <ActionButton disabled={busy || safeAmount <= 0} onClick={() => run(powerRiskAction, 'launder', { amount: safeAmount })}>處理 {money(safeAmount)}</ActionButton>
          <ActionButton disabled={busy || dirty <= 0} onClick={() => run(powerRiskAction, 'launder', { amount: dirty })}>全部處理</ActionButton>
        </div>
        <div className="deep-note">目前 shared core 費率為 18%；處理 {money(safeAmount)} 後約轉為 {money(estimatedNet)} 可用現金，同時會留下洗錢／非法資金處理的法律風險紀錄。</div>
      </Section>

      <Section title="地下資金 Ledger">
        <div className="record-list">{(underworld.ledger || []).slice().reverse().map((row, index) => <div className="record-row" key={`${row.day}-${index}`}><div><strong>Day {row.day}・{row.type || '地下結算'}</strong><span>{money(row.net || 0)}</span></div><p>Gross {money(row.gross || 0)}｜成本 {money(row.overhead || 0)}{row.rank ? `｜Lv.${row.rank}` : ''}</p></div>)}{!(underworld.ledger || []).length && <div className="empty-state">尚無地下資金紀錄。</div>}</div>
      </Section>
    </div>
  </>
}
