import { useEffect, useState } from 'react'
import { powerRiskAction } from '../../api/client.js'
import { ActionButton, GOV_STYLE_LABELS, Metric, OFFENSE_LABELS, Section, money, pct } from './P1Ui.jsx'

export default function PowerPanel({ power, market, busy, run }) {
  const politics = power.politics || {}, underworld = power.underworld || {}, legal = power.legal || {}, insider = power.insider || {}
  const assets = (market?.assets || []).filter((item) => item.symbol && item.symbol !== 'MYCO')
  const [donation, setDonation] = useState(10000)
  const [symbol, setSymbol] = useState(assets[0]?.symbol || 'AAPL')
  const [direction, setDirection] = useState('neutral')
  const [blackAmount, setBlackAmount] = useState(10000)
  const [insideSymbol, setInsideSymbol] = useState(assets[0]?.symbol || 'AAPL')
  const [insideSource, setInsideSource] = useState('skill')
  const [stake, setStake] = useState(5000)
  const [defense, setDefense] = useState(5000)

  useEffect(() => {
    if (assets.length && !assets.some((item) => item.symbol === symbol)) setSymbol(assets[0].symbol)
    if (assets.length && !assets.some((item) => item.symbol === insideSymbol)) setInsideSymbol(assets[0].symbol)
  }, [market?.day, assets.length])

  const selected = assets.find((item) => item.symbol === symbol)

  return <div className="life-stack">
    <div className="life-metric-grid compact">
      <Metric label="政治 Lv." value={politics.level || 0} /><Metric label="影響力" value={Number(politics.influence || 0).toFixed(1)} />
      <Metric label="政治信任" value={Number(politics.trust || 0).toFixed(1)} /><Metric label="政府風格" value={GOV_STYLE_LABELS[politics.governmentStyle] || politics.governmentStyle || '中立'} />
      <Metric label="地下勢力" value={`Lv.${underworld.rank || 0}`} /><Metric label="非法資金" value={money(underworld.dirtyMoney)} />
      <Metric label="Legal Heat" value={Number(legal.heat || 0).toFixed(1)} /><Metric label="案件" value={legal.case?.stage || '無案件'} />
    </div>

    <Section title="政治與政策方向">
      <div className="life-action-row"><ActionButton disabled={busy || politics.level >= 3} onClick={() => run(powerRiskAction, 'train_politics', { targetLevel: (politics.level || 0) + 1 })}>政治訓練</ActionButton></div>
      <div className="inline-form"><input type="number" value={donation} onChange={(e) => setDonation(Number(e.target.value))} /><ActionButton disabled={busy || politics.level < 1} onClick={() => run(powerRiskAction, 'donate', { amount: donation, direction: -.75 })}>倡議偏左</ActionButton><ActionButton disabled={busy || politics.level < 1} onClick={() => run(powerRiskAction, 'donate', { amount: donation, direction: 0 })}>中性倡議</ActionButton><ActionButton disabled={busy || politics.level < 1} onClick={() => run(powerRiskAction, 'donate', { amount: donation, direction: .75 })}>倡議偏右</ActionButton></div>
      <div className="deep-note">政府偏向 {Number(politics.governmentBias || 0).toFixed(3)}｜累計政治投入 {money(politics.donationsTotal)}</div>
    </Section>

    <Section title="特殊市場／政治行動">
      <div className="form-grid two"><label><span>市場標的</span><select value={symbol} onChange={(e) => setSymbol(e.target.value)}>{assets.map((item) => <option key={item.symbol} value={item.symbol}>{item.displayTicker || item.symbol}・{item.name}</option>)}</select></label><div className="deep-note">目前：{selected?.name || symbol}｜{money(selected?.price || 0)}</div></div>
      <div className="p1-special-grid">
        <article><strong>政治關說</strong><span>冷卻 {Number(politics.stockCooldownDays || 0)} 日</span><p>消耗現金與政治影響力，安排隔日正面市場壓力；會增加法律風險。</p><ActionButton disabled={busy || !symbol || Number(politics.level || 0) < 1 || Number(politics.stockCooldownDays || 0) > 0} onClick={() => run(powerRiskAction, 'political_lobby', { symbol })}>對 {selected?.displayTicker || symbol} 發動</ActionButton></article>
        <article><strong>地下黑函</strong><span>冷卻 {Number(underworld.marketCooldownDays || 0)} 日</span><p>使用非法資金安排隔日負面市場壓力；可能形成反向效果與案件。</p><ActionButton disabled={busy || !symbol || Number(underworld.rank || 0) < 1 || Number(underworld.marketCooldownDays || 0) > 0} onClick={() => run(powerRiskAction, 'underworld_smear', { symbol })}>散布黑函</ActionButton></article>
        <article className="dangerous"><strong>地下政治介入</strong><span>冷卻 {Number(underworld.blackPoliticalCooldownDays || 0)} 日</span><p>使用黑金干預遊戲內政治方向，曝光會增加法律與聲望風險。</p><select value={direction} onChange={(e) => setDirection(e.target.value)}>{Object.entries(GOV_STYLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input type="number" min="5000" step="1000" value={blackAmount} onChange={(e) => setBlackAmount(Number(e.target.value))} /><ActionButton disabled={busy || Number(underworld.rank || 0) < 2 || Number(underworld.blackPoliticalCooldownDays || 0) > 0 || blackAmount < 5000} onClick={() => run(powerRiskAction, 'black_political_intervention', { direction, amount: blackAmount })}>投入 {money(blackAmount)}</ActionButton></article>
      </div>
    </Section>

    <Section title="地下勢力">
      <div className="life-action-row wrap"><ActionButton disabled={busy || underworld.rank >= 3} onClick={() => run(powerRiskAction, 'train_underworld', { targetLevel: (underworld.rank || 0) + 1 })}>提升勢力</ActionButton><ActionButton disabled={busy || !underworld.dirtyMoney} onClick={() => run(powerRiskAction, 'launder', { amount: underworld.dirtyMoney })}>處理全部非法資金</ActionButton><ActionButton disabled={busy || underworld.rank < 1} onClick={() => run(powerRiskAction, 'pause_underworld', { paused: !underworld.paused })}>{underworld.paused ? '恢復活動' : '暫停活動'}</ActionButton></div>
      <div className="deep-note">累計非法收入 {money(underworld.totalEarned)}｜累計支出 {money(underworld.totalSpent)}。此路線會提高刑事風險。</div>
    </Section>

    <Section title="非公開消息／內線風險">
      <div className="inline-form"><select value={insideSymbol} onChange={(e) => setInsideSymbol(e.target.value)}>{assets.map((item) => <option key={item.symbol} value={item.symbol}>{item.displayTicker || item.symbol}</option>)}</select><select value={insideSource} onChange={(e) => setInsideSource(e.target.value)}><option value="skill">職業技能</option><option value="politics">政治管道</option><option value="underworld">地下管道</option></select><ActionButton disabled={busy} onClick={() => run(powerRiskAction, 'buy_inside_info', { symbol: insideSymbol, source: insideSource, skill: 'finance' })}>取得消息</ActionButton></div>
      {insider.tip && <div className="status-banner">{insider.tip.symbol}・{insider.tip.direction}・可信度 {pct((insider.tip.accuracy || 0) * 100)}・有效至 Day {insider.tip.expiresDay}</div>}
      <div className="inline-form"><input type="number" value={stake} onChange={(e) => setStake(Number(e.target.value))} /><ActionButton disabled={busy || !insider.tip || Boolean(insider.position)} onClick={() => run(powerRiskAction, 'open_insider_position', { stake })}>建立內線部位</ActionButton></div>
      {insider.position && <div className="deep-note">待結算：{insider.position.symbol}・{insider.position.direction}・投入 {money(insider.position.stake)}・Day {insider.position.resolve_day || insider.position.resolveDay}</div>}
    </Section>

    <Section title="法律案件">
      <div className="deep-grid-3"><Metric label="階段" value={legal.case?.stage || '無案件'} /><Metric label="證據" value={Number(legal.case?.evidence || 0).toFixed(1)} /><Metric label="來源" value={legal.case?.source || '—'} /><Metric label="案底" value={legal.criminalRecord ? '有' : '無'} /><Metric label="監禁" value={`${legal.prisonDays || 0} 天`} /><Metric label="Heat" value={Number(legal.heat || 0).toFixed(1)} /></div>
      {legal.case?.stage && legal.case.stage !== '無案件' && <div className="inline-form"><input type="number" value={defense} onChange={(e) => setDefense(Number(e.target.value))} /><ActionButton disabled={busy} onClick={() => run(powerRiskAction, 'legal_defense', { amount: defense })}>投入法律防禦</ActionButton></div>}
      <div className="deep-chip-row">{Object.entries(legal.offenses || {}).map(([key, count]) => Number(count) > 0 && <span key={key}>{OFFENSE_LABELS[key] || key} ×{count}</span>)}</div>
    </Section>

    {legal.history?.length > 0 && <Section title="判決／案件紀錄"><div className="record-list">{legal.history.slice().reverse().map((row, index) => <div className="record-row" key={`${row.day}-${index}`}><div><strong>Day {row.day}・{row.trigger || '法律案件'}</strong><span>{row.days || 0} 天</span></div><p>{(row.offenses || []).join('、')}｜罰金 {money(row.fine)}｜政府環境 {GOV_STYLE_LABELS[row.govStyle] || row.govStyle || '—'}</p></div>)}</div></Section>}
  </div>
}
