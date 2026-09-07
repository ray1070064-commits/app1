import { useEffect, useMemo, useState } from 'react'
import { cancelOrder, closePosition, getAssetDetails, getAssetNews, getAssetPtt, getMarketDepth, placeOrder } from '../api/client.js'
import { mockMarket, quickStartOptions } from '../data/mockMarket.js'
import AssetInfoPanel from './AssetInfoPanel.jsx'
import MarketChart from './MarketChart.jsx'
import OrderPanel from './OrderPanel.jsx'
import PortfolioPanel from './PortfolioPanel.jsx'
import Watchlist from './Watchlist.jsx'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2 }).format(Number(value || 0))
}

function buildPositionId(symbol, mode) { return `${symbol}:${mode}` }

export default function MarketTerminal({ player, onExit }) {
  const [selectedSymbol, setSelectedSymbol] = useState(mockMarket.assets[0].symbol)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [timeframe, setTimeframe] = useState('3M')
  const [indicatorState, setIndicatorState] = useState({ ma1: true, ma2: true, ma3: false, volume: true, rsi: false, macd: false })
  const [indicatorConfig, setIndicatorConfig] = useState({ ma1: 20, ma2: 50, ma3: 200, rsiPeriod: 14, macdFast: 12, macdSlow: 26, macdSignal: 9 })
  const [assetInfo, setAssetInfo] = useState(null)
  const [assetInfoLoading, setAssetInfoLoading] = useState(true)
  const [pttNonce, setPttNonce] = useState(0)
  const [positions, setPositions] = useState([])
  const [orders, setOrders] = useState([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [account, setAccount] = useState({ cash: Number(player.startBalance || 100000), equity: Number(player.startBalance || 100000), availableCash: Number(player.startBalance || 100000), usedMargin: 0 })

  const selected = useMemo(() => mockMarket.assets.find((asset) => asset.symbol === selectedSymbol) || mockMarket.assets[0], [selectedSymbol])
  const startJob = quickStartOptions.jobs.find((job) => job.id === player.jobId)

  useEffect(() => {
    let active = true
    setAssetInfoLoading(true)
    Promise.all([getAssetDetails(selectedSymbol), getAssetNews(selectedSymbol), getAssetPtt(selectedSymbol, pttNonce), getMarketDepth(selectedSymbol)])
      .then(([details, newsResult, pttResult, depthResult]) => {
        if (!active) return
        setAssetInfo({ ...details, news: newsResult?.news || details?.news || [], ptt: pttResult?.rows || details?.ptt || [], depth: depthResult?.depth || details?.depth })
      })
      .catch((error) => { if (active) setNotice(error.message || '標的資訊載入失敗') })
      .finally(() => { if (active) setAssetInfoLoading(false) })
    return () => { active = false }
  }, [selectedSymbol, pttNonce])

  function toggleIndicator(key) { setIndicatorState((current) => ({ ...current, [key]: !current[key] })) }

  function addOrIncreasePosition(order, price) {
    setPositions((current) => {
      const id = buildPositionId(order.symbol, order.mode)
      const found = current.find((position) => position.id === id)
      if (!found) return [...current, { id, symbol: order.symbol, mode: order.mode, quantity: order.quantity, avgPrice: price, leverage: order.leverage || 1, openedAt: Date.now() }]
      const totalQuantity = found.quantity + order.quantity
      const avgPrice = ((found.avgPrice * found.quantity) + (price * order.quantity)) / Math.max(totalQuantity, 0.0001)
      return current.map((position) => position.id === id ? { ...position, quantity: totalQuantity, avgPrice, leverage: order.leverage || position.leverage } : position)
    })
  }

  function reduceSpotPosition(order, price) {
    let soldQuantity = 0
    setPositions((current) => {
      const id = buildPositionId(order.symbol, 'SPOT')
      const found = current.find((position) => position.id === id)
      if (!found) return current
      soldQuantity = Math.min(found.quantity, order.quantity)
      const remaining = found.quantity - soldQuantity
      return remaining <= 0.0000001 ? current.filter((position) => position.id !== id) : current.map((position) => position.id === id ? { ...position, quantity: remaining } : position)
    })
    if (soldQuantity > 0) {
      const proceeds = soldQuantity * price
      setAccount((current) => ({ ...current, cash: current.cash + proceeds, availableCash: current.availableCash + proceeds }))
    }
    return soldQuantity
  }

  async function submitOrder(order) {
    setBusy(true); setNotice('')
    try {
      const result = await placeOrder(order)
      if (!result?.ok) throw new Error(result?.message || '下單失敗')
      if (result.positions && result.account) {
        setPositions(result.positions); setAccount(result.account); if (result.orders) setOrders(result.orders); setNotice(result.message || '委託已送出'); return
      }
      if (order.orderType === 'limit') {
        setOrders((current) => [...current, { id: result.order?.id || `limit-${Date.now()}`, ...order, status: 'pending' }]); setNotice(`${order.symbol} 限價單已掛出`); return
      }
      const price = selected.price, notional = order.quantity * price
      if (order.mode === 'SPOT' && order.side === 'sell') {
        const sold = reduceSpotPosition(order, price); setNotice(sold > 0 ? `${order.symbol} 已賣出 ${sold}` : `${order.symbol} 沒有可賣出的 Spot 持倉`); return
      }
      const requiredCash = order.mode === 'SPOT' ? notional : notional / Math.max(order.leverage || 1, 1)
      if (requiredCash > account.availableCash) { setNotice('可用資金不足'); return }
      addOrIncreasePosition(order, price)
      setAccount((current) => ({ ...current, cash: order.mode === 'SPOT' ? current.cash - requiredCash : current.cash, availableCash: current.availableCash - requiredCash, usedMargin: current.usedMargin + (order.mode === 'SPOT' ? 0 : requiredCash) }))
      setNotice(`${order.mode} ${order.symbol} 市價成交`)
    } catch (error) { setNotice(error.message || '下單失敗') } finally { setBusy(false) }
  }

  async function handleClose(position, percent) {
    setBusy(true); setNotice('')
    try {
      const closeQty = Math.min(position.quantity, position.quantity * Math.min(1, Math.max(0.01, percent / 100)))
      const result = await closePosition({ positionId: position.id, quantity: closeQty })
      if (!result?.ok) throw new Error(result?.message || '平倉失敗')
      if (result.positions && result.account) { setPositions(result.positions); setAccount(result.account); setNotice(result.message || '平倉完成'); return }
      const currentPrice = mockMarket.assets.find((asset) => asset.symbol === position.symbol)?.price || position.avgPrice
      const realized = (currentPrice - position.avgPrice) * closeQty * (position.mode === 'SHORT' ? -1 : 1)
      const released = position.mode === 'SPOT' ? currentPrice * closeQty : (position.avgPrice * closeQty) / Math.max(position.leverage || 1, 1)
      setPositions((current) => current.flatMap((item) => item.id !== position.id ? [item] : item.quantity - closeQty <= 0.0000001 ? [] : [{ ...item, quantity: item.quantity - closeQty }]))
      setAccount((current) => ({ ...current, cash: position.mode === 'SPOT' ? current.cash + released : current.cash + realized, availableCash: current.availableCash + released + (position.mode === 'SPOT' ? 0 : realized), usedMargin: Math.max(0, current.usedMargin - (position.mode === 'SPOT' ? 0 : released)), equity: current.equity + realized }))
      setNotice(`${position.symbol} 已平倉 ${percent}%`)
    } catch (error) { setNotice(error.message || '平倉失敗') } finally { setBusy(false) }
  }

  async function handleCancel(order) {
    setBusy(true)
    try { const result = await cancelOrder(order.id); if (!result?.ok) throw new Error(result?.message || '取消失敗'); setOrders((current) => current.filter((item) => item.id !== order.id)); setNotice(`${order.symbol} 掛單已取消`) }
    catch (error) { setNotice(error.message || '取消失敗') } finally { setBusy(false) }
  }

  const unrealized = positions.reduce((sum, position) => {
    const currentPrice = mockMarket.assets.find((asset) => asset.symbol === position.symbol)?.price || position.avgPrice
    return sum + (currentPrice - position.avgPrice) * position.quantity * (position.mode === 'SHORT' ? -1 : 1)
  }, 0)
  const displayEquity = account.cash + account.usedMargin + unrealized + positions.filter((position) => position.mode === 'SPOT').reduce((sum, position) => sum + (mockMarket.assets.find((asset) => asset.symbol === position.symbol)?.price || position.avgPrice) * position.quantity, 0)

  return <main className="terminal-shell">
    <header className="terminal-topbar"><div className="brand-inline"><span>◈</span><strong>資本人生</strong></div><div className="top-stats"><span>Day {mockMarket.day}</span><span>{player.startAge} 歲</span><span>{startJob?.name || '玩家'}</span><span>現金 <strong>{formatMoney(account.cash)}</strong></span><span>權益 <strong>{formatMoney(displayEquity)}</strong></span></div><button type="button" className="ghost-button" onClick={onExit}>主選單</button></header>
    <section className="macro-strip"><span><small>VIX</small><strong>{mockMarket.macro.vix}</strong></span><span><small>CPI</small><strong>{mockMarket.macro.cpi}%</strong></span><span><small>利率</small><strong>{mockMarket.macro.rate}%</strong></span><span><small>DXY</small><strong>{mockMarket.macro.dxy}</strong></span><span><small>可用資金</small><strong>{formatMoney(account.availableCash)}</strong></span>{account.usedMargin > 0 && <span><small>已用保證金</small><strong>{formatMoney(account.usedMargin)}</strong></span>}</section>
    <section className="terminal-grid terminal-grid-full">
      <Watchlist assets={mockMarket.assets} selectedSymbol={selected.symbol} onSelect={setSelectedSymbol} search={search} onSearchChange={setSearch} category={category} onCategoryChange={setCategory} />
      <section className="workspace-column">
        <section className="chart-panel panel"><div className="asset-header"><div><div className="asset-meta-row"><span className="asset-symbol">{selected.symbol}</span><span className="asset-chip">{selected.category}</span><span className="asset-chip muted">{selected.sector}</span></div><h2>{selected.name}</h2></div><div className="asset-quote"><strong>{formatMoney(selected.price)}</strong><span className={selected.change >= 0 ? 'up' : 'down'}>{selected.change >= 0 ? '+' : ''}{selected.change.toFixed(2)}%</span></div></div>
          <MarketChart asset={selected} timeframe={timeframe} onTimeframeChange={setTimeframe} indicatorState={indicatorState} onToggleIndicator={toggleIndicator} indicatorConfig={indicatorConfig} onIndicatorConfigChange={setIndicatorConfig} />
        </section>
        <AssetInfoPanel info={assetInfo} loading={assetInfoLoading} onRefreshPtt={() => setPttNonce((value) => value + 1)} />
        <PortfolioPanel positions={positions} orders={orders} assets={mockMarket.assets} onClose={handleClose} onCancel={handleCancel} />
      </section>
      <OrderPanel asset={selected} account={account} onSubmit={submitOrder} busy={busy} notice={notice} />
    </section>
  </main>
}
