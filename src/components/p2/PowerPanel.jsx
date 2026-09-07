import { useEffect, useState } from 'react'
import { powerRiskAction } from '../../api/client.js'
import BasePowerPanel from '../p1/PowerPanel.jsx'
import { ActionButton, Section, money } from '../p1/P1Ui.jsx'

export default function PowerPanel(props) {
  const { power, busy, run } = props
  const underworld = power?.underworld || {}
  const legal = power?.legal || {}
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    const dirty = Number(underworld.dirtyMoney || 0)
    if (amount <= 0 || amount > dirty) setAmount(dirty >= 500 ? Math.min(dirty, Math.max(500, Math.floor(dirty / 2 / 500) * 500)) : dirty)
  }, [underworld.dirtyMoney])

  const dirty = Number(underworld.dirtyMoney || 0)
  const safeAmount = Math.max(0, Math.min(dirty, Number(amount || 0)))
  const rank = Math.max(1, Math.min(3, Number(underworld.rank || 1)))
  const feeMin = Math.max(.14, .30 - rank * .03)
  const feeMax = Math.max(.22, .38 - rank * .03)
  const caughtProbability = Math.min(.24, .025 + Math.min(1, safeAmount / 50000) * .08 + Math.max(0, Number(legal.heat || 0) - 20) / 900)
  const netMin = safeAmount * (1 - feeMax)
  const netMax = safeAmount * (1 - feeMin)

  return <>
    <BasePowerPanel {...props} />
    <div className="life-stack p2-extension-stack">
      <Section title="非法資金精細處理" actions={<span className="status-pill">可處理 {money(dirty)}</span>}>
        <div className="inline-form">
          <label><span>處理金額</span><input type="number" min="500" max={Math.max(500, dirty)} step="500" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <ActionButton disabled={busy || safeAmount < 500} onClick={() => run(powerRiskAction, 'launder', { amount: safeAmount })}>處理 {money(safeAmount)}</ActionButton>
          <ActionButton disabled={busy || dirty < 500} onClick={() => run(powerRiskAction, 'launder', { amount: dirty })}>全部處理</ActionButton>
        </div>
        <div className="deep-chip-row">
          <span>費率約 {(feeMin * 100).toFixed(0)}～{(feeMax * 100).toFixed(0)}%</span>
          <span>查獲風險約 {(caughtProbability * 100).toFixed(1)}%</span>
          <span>成功可得約 {money(netMin)}～{money(netMax)}</span>
          <span>累計轉出 {money(underworld.totalConverted || 0)}</span>
          <span>累計沒收 {money(underworld.totalSeized || 0)}</span>
        </div>
        <div className="deep-note">已恢復舊版規則：費率會依地下勢力等級隨機變動；單次金額越大、Legal Heat 越高，遭查獲與沒收的機率越高。遭查獲時會直接進一步強化法律案件。</div>
      </Section>

      <Section title="地下資金 Ledger">
        <div className="record-list">{(underworld.ledger || []).slice().reverse().map((row, index) => <div className="record-row" key={`${row.day}-${index}`}><div><strong>Day {row.day}・{row.type || '地下結算'}</strong><span>{money(row.net || 0)}</span></div><p>Gross {money(row.gross || 0)}｜成本／沒收 {money(row.overhead || 0)}{row.rank ? `｜Lv.${row.rank}` : ''}</p></div>)}{!(underworld.ledger || []).length && <div className="empty-state">尚無地下資金紀錄。</div>}</div>
      </Section>
    </div>
  </>
}
