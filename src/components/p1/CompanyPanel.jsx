import { useEffect, useState } from 'react'
import { companyAction } from '../../api/client.js'
import { ActionButton, KeyValueTable, Metric, Section, money, num, pct } from './P1Ui.jsx'

export default function CompanyPanel({ companyData, busy, run }) {
  const c = companyData.company || {}
  const bs = companyData.balanceSheet || {}, cf = companyData.cashFlow || {}, gov = companyData.governance || {}
  const op = companyData.operating || {}, debt = companyData.debt || {}, cap = companyData.capacity || {}, research = companyData.research || {}, ipo = companyData.ipo || {}
  const startupRows = companyData.startupRequirements?.industries || []
  const [industry, setIndustry] = useState(startupRows[0]?.id || 'software')
  const startup = startupRows.find((row) => row.id === industry) || startupRows[0]
  const [found, setFound] = useState({ name: '玩家控股公司', ticker: 'PCOR', capital: 65000 })
  const [amount, setAmount] = useState(10000)
  const [releaseRatio, setReleaseRatio] = useState(.25)
  const [payout, setPayout] = useState(Number(c.dividend_payout_ratio || 0))
  const [targetYield, setTargetYield] = useState(Number(companyData.dividendPolicy?.targetYield || 0) * 100)

  useEffect(() => setPayout(Number(c.dividend_payout_ratio || 0)), [c.dividend_payout_ratio])
  useEffect(() => setTargetYield(Number(companyData.dividendPolicy?.targetYield || 0) * 100), [companyData.dividendPolicy?.targetYield])
  useEffect(() => {
    if (!startupRows.some((row) => row.id === industry) && startupRows[0]) setIndustry(startupRows[0].id)
  }, [startupRows, industry])
  useEffect(() => {
    if (startup && Number(found.capital) < Number(startup.startCost || 0)) setFound((current) => ({ ...current, capital: Number(startup.startCost || 0) }))
  }, [industry, startup?.startCost])

  if (!companyData.exists) {
    const required = Number(startup?.requiredLevel || 3)
    const current = Number(startup?.currentLevel || 0)
    const capitalOk = Number(found.capital) >= Number(startup?.startCost || 0)
    const canFound = Boolean(startup && current >= required && capitalOk && Number(companyData.startupRequirements?.cash || 0) >= Number(found.capital) && Number(companyData.startupRequirements?.prisonDays || 0) <= 0 && /^[A-Za-z]{2,5}$/.test(found.ticker.trim()) && found.name.trim())
    return <div className="life-stack"><Section title="成立公司">
      <div className="form-grid two">
        <label><span>公司名稱</span><input value={found.name} onChange={(e) => setFound({ ...found, name: e.target.value })} /></label>
        <label><span>英文代號</span><input value={found.ticker} maxLength={5} onChange={(e) => setFound({ ...found, ticker: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></label>
        <label><span>產業</span><select value={startup?.id || ''} onChange={(e) => setIndustry(e.target.value)}>{startupRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label><span>投入資本</span><input type="number" min={startup?.startCost || 10000} step="5000" value={found.capital} onChange={(e) => setFound({ ...found, capital: Number(e.target.value) })} /></label>
      </div>
      {startup && <div className="deep-check-grid">
        <div className={current >= required ? 'passed' : ''}>{current >= required ? '✓' : '○'} {startup.requiredSkillName} Lv.{current} / {required}</div>
        <div className={capitalOk ? 'passed' : ''}>{capitalOk ? '✓' : '○'} 最低資本 {money(startup.startCost)}</div>
        <div>推薦資本 {money(startup.recommendedCapital)}</div>
        <div className={Number(companyData.startupRequirements?.prisonDays || 0) <= 0 ? 'passed' : ''}>{Number(companyData.startupRequirements?.prisonDays || 0) <= 0 ? '✓' : '○'} 服刑限制</div>
      </div>}
      <div className="deep-note">正式舊版模型：創立後固定為 2 人；資本配置現金 78%、固定資產 22%、研發 0%、品牌 5、初始估值為投入資本 75%。代號限 2～5 碼英文字母且不可與市場標的重複。</div>
      <ActionButton disabled={busy || !canFound} onClick={() => run(companyAction, 'found', { name: found.name.trim(), ticker: found.ticker.trim().toUpperCase(), industry: startup.id, capital: Number(found.capital) })}>成立公司</ActionButton>
    </Section></div>
  }

  const policy = companyData.dividendPolicy || {}
  const ipoLabels = { exists: '公司存在', notPublic: '尚未上市', age: '公司年齡', quarterRevenue: '季度營收', valuation: '估值', cash: '公司現金', employees: '員工', brand: '品牌', profitableQuarters: '獲利季度', notBankrupt: '非破產' }

  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="公司" value={c.name} hint={`${c.ticker || 'PCOR'}・${c.public ? 'Public / MYCO' : 'Private'}`} />
      <Metric label="估值" value={money(c.valuation)} /><Metric label="公司現金" value={money(c.cash)} /><Metric label="負債" value={money(c.debt)} />
      <Metric label="員工" value={num(c.employees)} /><Metric label="今日營收" value={money(c.daily_revenue)} /><Metric label="今日淨利" value={money(c.daily_profit)} />
      <Metric label="玩家持股" value={pct(companyData.ownershipPct || 100)} /><Metric label="營運狀態" value={op.label || '—'} hint={`Runway ${Number(op.runwayDays || 0) >= 9999 ? '∞' : `${Number(op.runwayDays || 0).toFixed(1)} 天`}`} />
      <Metric label="董事會支持" value={`${Number(gov.boardSupport || 0).toFixed(0)}/100`} hint={gov.ceoControl ? 'CEO 控制權正常' : '重大行動受限'} />
      <Metric label="產能利用" value={pct((cap.utilization || 0) * 100)} /><Metric label="研發／人" value={money(research.perEmployee)} />
    </div>

    <div className="deep-two-column">
      <Section title="資產負債表"><KeyValueTable rows={[["現金", money(bs.cash)], ["應收帳款", money(bs.accountsReceivable)], ["庫存", money(bs.inventory)], ["固定資產", money(bs.fixedAssets)], ["研發資產", money(bs.rdAsset)], ["總資產", money(bs.totalAssets)], ["負債", money(bs.debt)], ["股東權益", money(bs.equity)], ["負債／資產", pct((bs.debtToAssets || 0) * 100)]]} /></Section>
      <Section title="現金流量表"><KeyValueTable rows={[["今日營運現金流", money(cf.dailyOperating)], ["今日自由現金流", money(cf.dailyFree)], ["上季營運現金流", money(cf.lastQuarterOperating)], ["上季投資現金流", money(cf.lastQuarterInvesting)], ["上季融資現金流", money(cf.lastQuarterFinancing)], ["上季自由現金流", money(cf.lastQuarterFree)], ["上季 CAPEX", money(cf.lastQuarterCapex)]]} /></Section>
    </div>

    <Section title="營運與投資">
      <div className="life-action-row wrap"><ActionButton disabled={busy} onClick={() => run(companyAction, 'hire', { count: 1 })}>聘 1 人</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'layoff', { count: 1 })}>裁 1 人</ActionButton></div>
      <div className="inline-form"><input type="number" min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /><ActionButton disabled={busy} onClick={() => run(companyAction, 'invest_rd', { amount })}>研發</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'invest_assets', { amount })}>CAPEX</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'invest_brand', { amount })}>品牌</ActionButton></div>
      <div className="deep-note">固定資產可支援約 {Number(cap.supportedEmployees || 0).toFixed(1)} 人；研發生產力加成 {pct((research.productivityBonus || 0) * 100)}；毛利加成 {pct((research.marginBonus || 0) * 100)}。</div>
    </Section>

    <Section title="資本結構與治理">
      <div className="deep-chip-row"><span>借款利率 {pct((debt.annualRate || 0) * 100, 2)}</span><span>可新增負債 {money(companyData.debtCapacity)}</span><span>流動性壓力 {gov.liquidityDistressDays || 0} 天</span><span>緊急信用 {money(gov.emergencyCreditUsed)}</span><span>重整 {gov.restructuringCount || 0} 次</span></div>
      <div className="life-action-row wrap"><ActionButton disabled={busy} onClick={() => run(companyAction, 'borrow', { amount })}>借款</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'repay_debt', { amount })}>還債</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'inject_capital', { amount })}>個人注資</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'emergency_credit', { amount })}>緊急信用</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'board_reform', { amount })}>治理改善</ActionButton>{(c.bankrupt || Number(gov.liquidityDistressDays || 0) >= 20) && <ActionButton disabled={busy} tone="danger" onClick={() => run(companyAction, 'restructure', {})}>公司重整</ActionButton>}</div>
    </Section>

    {!c.public && <Section title="IPO 準備" actions={<span className={`status-pill ${ipo.ready ? 'good' : ''}`}>{ipo.ready ? '可申請上市' : '尚未達標'}</span>}>
      <div className="deep-check-grid">{Object.entries(ipo.checks || {}).map(([key, ok]) => <div className={ok ? 'passed' : ''} key={key}>{ok ? '✓' : '○'} {ipoLabels[key] || key}</div>)}</div>
      <div className="inline-form"><label><span>釋股比例</span><input type="number" min="10" max="45" value={Math.round(releaseRatio * 100)} onChange={(e) => setReleaseRatio(Number(e.target.value) / 100)} /></label><ActionButton disabled={busy || !ipo.ready} onClick={() => run(companyAction, 'ipo', { releaseRatio })}>正式 IPO</ActionButton></div>
    </Section>}

    {c.public && <Section title="上市公司資本與配息政策">
      <div className="deep-grid-3">
        <Metric label="目標年化殖利率" value={pct(Number(policy.targetYield || 0) * 100)} hint={`上限 ${pct(Number(policy.maxTargetYield || .10) * 100)}`} />
        <Metric label="配息安全準備" value={money(policy.cashReserve)} /><Metric label="最近配息總額" value={money(policy.lastTotal)} />
        <Metric label="最近每股配息" value={money(policy.lastPerShare)} /><Metric label="玩家最近股息" value={money(policy.lastPlayerIncome)} /><Metric label="累計股息收入" value={money(policy.totalReceived)} />
      </div>
      <div className="form-grid two">
        <label><span>一般配息率 0～60%</span><input type="number" min="0" max="60" value={Math.round(payout * 100)} onChange={(e) => setPayout(Number(e.target.value) / 100)} /></label>
        <label><span>目標年化殖利率 0～{Math.round(Number(policy.maxTargetYield || .10) * 100)}%</span><input type="number" min="0" max={Math.round(Number(policy.maxTargetYield || .10) * 100)} step="0.5" value={targetYield} onChange={(e) => setTargetYield(Number(e.target.value))} /></label>
      </div>
      <div className="life-action-row wrap"><ActionButton disabled={busy} onClick={() => run(companyAction, 'set_dividend', { payoutRatio: payout })}>設定一般配息</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'set_target_yield', { targetYield: targetYield / 100 })}>設定目標殖利率</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'issue_shares', { ratio: .05 })}>增發 5%</ActionButton><ActionButton disabled={busy} onClick={() => run(companyAction, 'buyback', { ratio: .03 })}>回購 3%</ActionButton></div>
      <div className="deep-note">目標殖利率政策按季度計算，仍受獲利上限、公司現金安全準備與董事會支持限制。</div>
    </Section>}

    {companyData.events?.pending && <Section title="待處理公司決策" className="deep-alert-card"><strong>{companyData.events.pending.title}</strong><p>{companyData.events.pending.desc}</p><span>期限 Day {companyData.events.pending.deadlineDay ?? companyData.events.pending.deadline_day ?? '—'}</span></Section>}

    <Section title="季度財報歷史"><div className="record-list">{(c.history || []).slice().reverse().map((row, index) => <div className="record-row" key={`${row.day}-${index}`}><div><strong>Day {row.day}・季度財報</strong><span>{money(row.profit ?? row.daily_profit)}</span></div><p>營收 {money(row.revenue)}｜OCF {money(row.operatingCashFlow)}｜FCF {money(row.freeCashFlow)}｜稅 {money(row.tax)}｜CAPEX {money(row.capex)}</p></div>)}{!c.history?.length && <div className="empty-state">尚未完成第一季</div>}</div></Section>
  </div>
}
