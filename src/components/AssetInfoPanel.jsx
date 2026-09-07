import { useEffect, useMemo, useState } from 'react'

function formatMoney(value) {
  const number = Number(value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: Math.abs(number) >= 1_000_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(number)
}

function formatPct(value, digits = 2) { return `${(Number(value || 0) * 100).toFixed(digits)}%` }
function Metric({ label, value }) { return <div className="info-metric"><span>{label}</span><strong>{value}</strong></div> }

function Overview({ info }) {
  const f = info.financials
  return <div className="asset-info-content">
    <div className="profile-copy"><div className="profile-nature">{info.profile.nature}</div><p>{info.profile.description}</p></div>
    {f ? <div className="info-metric-grid">
      <Metric label="市值" value={formatMoney(f.marketCap)} /><Metric label="季度營收" value={formatMoney(f.quarterRevenue)} />
      <Metric label="季度獲利" value={formatMoney(f.quarterProfit)} /><Metric label="淨利率" value={formatPct(f.netMargin)} />
      <Metric label="自由現金流" value={formatMoney(f.freeCashFlow)} /><Metric label="FCF Margin" value={formatPct(f.fcfMargin)} />
      <Metric label="負債 / 市值" value={formatPct(f.debtRatio)} /><Metric label="P/E" value={f.currentPe.toFixed(1)} /><Metric label="EPS" value={formatMoney(f.eps)} />
    </div> : <div className="info-empty-note">此標的沒有上市公司財務報表欄位。</div>}
  </div>
}

function Dividend({ info }) {
  const d = info.dividend || { type: '無', annualYield: 0, payoutRatio: 0, nextDay: null, estimatedPerShare: 0, intervalDays: 90 }
  return <div className="asset-info-content">
    <div className="dividend-hero">
      <div><span>收益類型</span><strong>{d.type}</strong></div><div><span>年化殖利率</span><strong>{d.annualYield > 0 ? formatPct(d.annualYield) : '—'}</strong></div>
      <div><span>預估單次 / 每單位</span><strong>{d.estimatedPerShare > 0 ? formatMoney(d.estimatedPerShare) : '—'}</strong></div><div><span>下次預估</span><strong>{d.nextDay ? `Day ${d.nextDay}` : '—'}</strong></div>
    </div>
    {d.annualYield > 0 && <div className="info-metric-grid compact"><Metric label="配發率" value={formatPct(d.payoutRatio)} /><Metric label="週期" value={`約 ${d.intervalDays} 日`} /></div>}
  </div>
}

function Fund({ info }) {
  if (!info.fund) return <div className="info-empty-note padded">此標的不是基金 / ETF。</div>
  const maxWeight = Math.max(...info.fund.components.map((row) => row.weight), 0.01)
  return <div className="asset-info-content"><div className="fund-summary"><span>年費率</span><strong>{formatPct(info.fund.expenseRatio, 3)}</strong></div><div className="component-list">
    {info.fund.components.map((row) => <div className="component-row" key={row.symbol}><div className="component-label"><strong>{row.symbol}</strong><span>{row.name}</span></div><div className="component-track"><i style={{ width: `${Math.max(4, (row.weight / maxWeight) * 100)}%` }} /></div><strong>{formatPct(row.weight, 1)}</strong></div>)}
  </div></div>
}

const NEWS_LEVELS = ['全部', '重大', '重要', '財報', '一般']
function News({ rows }) {
  const [filter, setFilter] = useState('全部')
  const filtered = useMemo(() => rows.filter((row) => filter === '全部' || row.importance === filter), [rows, filter])
  return <div className="asset-info-content"><div className="news-filter">{NEWS_LEVELS.map((level) => <button type="button" key={level} className={filter === level ? 'active' : ''} onClick={() => setFilter(level)}>{level}</button>)}</div><div className="structured-news-list">
    {filtered.map((row, index) => <article className="structured-news-row" key={`${row.day}-${row.title}-${index}`}><div className="news-badges"><span className={`importance importance-${row.importance}`}>{row.importance}</span><span>{row.category}</span><span>Day {row.day}</span></div><strong>{row.title}</strong><p>{row.desc}</p></article>)}
  </div></div>
}

function Ptt({ rows, onRefresh }) {
  return <div className="asset-info-content"><div className="ptt-toolbar"><span>模擬鄉民聊天室</span><button type="button" onClick={onRefresh}>換一批</button></div><div className="ptt-feed">
    {rows.map((row, index) => <div className={`ptt-row tone-${row.tone || 'neutral'}`} key={`${row.user}-${index}`}><strong>{row.user}</strong><span>{row.message}</span></div>)}
  </div></div>
}

function Depth({ depth }) {
  const safe = depth || { bids: [], asks: [], spreadPct: 0, imbalance: 0 }
  const maxSize = Math.max(...[...safe.bids, ...safe.asks].map((row) => row.size), 1)
  return <div className="asset-info-content depth-content"><div className="depth-summary"><Metric label="Spread" value={`${Number(safe.spreadPct || 0).toFixed(3)}%`} /><Metric label="買賣失衡" value={`${Number(safe.imbalance || 0) >= 0 ? '+' : ''}${(Number(safe.imbalance || 0) * 100).toFixed(1)}%`} /></div><div className="depth-book">
    <div className="depth-side asks"><div className="depth-head"><span>賣價</span><span>量</span></div>{[...safe.asks].reverse().map((row, index) => <div className="depth-level" key={`a-${index}`}><i style={{ width: `${(row.size / maxSize) * 100}%` }} /><strong>{row.price.toFixed(row.price >= 100 ? 2 : 4)}</strong><span>{row.size.toLocaleString()}</span></div>)}</div>
    <div className="depth-mid">MID</div>
    <div className="depth-side bids"><div className="depth-head"><span>買價</span><span>量</span></div>{safe.bids.map((row, index) => <div className="depth-level" key={`b-${index}`}><i style={{ width: `${(row.size / maxSize) * 100}%` }} /><strong>{row.price.toFixed(row.price >= 100 ? 2 : 4)}</strong><span>{row.size.toLocaleString()}</span></div>)}</div>
  </div></div>
}

export default function AssetInfoPanel({ info, loading, onRefreshPtt }) {
  const [tab, setTab] = useState('overview')
  const tabs = [['overview', '概況'], ['dividend', '配息 / 收益'], ...(info?.fund ? [['fund', 'ETF 成分']] : []), ['news', '新聞'], ['ptt', 'PTT'], ['depth', '市場深度']]

  useEffect(() => {
    if (tab === 'fund' && info && !info.fund) setTab('overview')
  }, [info, tab])

  if (loading || !info) return <section className="asset-info-panel panel"><div className="empty-state">載入標的資訊…</div></section>
  return <section className="asset-info-panel panel"><div className="asset-info-tabs">{tabs.map(([id, label]) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === 'overview' && <Overview info={info} />}{tab === 'dividend' && <Dividend info={info} />}{tab === 'fund' && <Fund info={info} />}{tab === 'news' && <News rows={info.news || []} />}{tab === 'ptt' && <Ptt rows={info.ptt || []} onRefresh={onRefreshPtt} />}{tab === 'depth' && <Depth depth={info.depth} />}
  </section>
}
