import { useEffect, useMemo, useState } from 'react'
import {
  advanceTime,
  cancelOrder,
  closePosition,
  getAssetDetails,
  getAssetNews,
  getAssetPtt,
  getMarketDepth,
  getMarketHistory,
  getMarketSnapshot,
  placeOrder,
} from '../api/client.js'
import { mockMarket, quickStartOptions } from '../data/mockMarket.js'
import AssetInfoPanel from './AssetInfoPanel.jsx'
import MarketChart from './MarketChart.jsx'
import OrderPanel from './OrderPanel.jsx'
import PortfolioPanel from './PortfolioPanel.jsx'
import Watchlist from './Watchlist.jsx'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

function buildPositionId(symbol, mode) { return `${symbol}:${mode}` }

function normalizeSnapshot(snapshot, fallbackBalance) {
  if (!snapshot?.assets?.length) return mockMarket
  return {
    ...snapshot,
    macro: { ...mockMarket.macro, ...(snapshot.macro || {}) },
    account: snapshot.account || {
      cash: fallbackBalance,
      equity: fallbackBalance,
      availableCash: fallbackBalance,
      usedMargin: 0,
    },
    positions: snapshot.positions || [],
    orders: snapshot.orders || [],
  }
}

export default function MarketTerminal({ player, onExit }) {
  const initialMarket = normalizeSnapshot(player.snapshot, Number(player.startBalance || 100000))
  const [market, setMarket] = useState(initialMarket)
  const [selectedSymbol, setSelectedSymbol] = useState(initialMarket.assets?.[0]?.symbol || mockMarket.assets[0].symbol)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [timeframe, setTimeframe] = useState('3M')
  const [candles, setCandles] = useState([])
  const [indicatorState, setIndicatorState] = useState({ ma1: true, ma2: true, ma3: false, volume: true, rsi: false, macd: false })
  const [indicatorConfig, setIndicatorConfig] = useState({ ma1: 20, ma2: 50, ma3: 200, rsiPeriod: 14, macdFast: 12, macdSlow: 26, macdSignal: 9 })
  const [assetInfo, setAssetInfo] = useState(null)
  const [assetInfoLoading, setAssetInfoLoading] = useState(true)
  const [pttNonce, setPttNonce] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [positions, setPositions] = useState(initialMarket.positions || [])
  const [orders, setOrders] = useState(initialMarket.orders || [])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [account, setAccount] = useState(initialMarket.account || { cash: Number(player.startBalance || 100000), equity: Number(player.startBalance || 100000), availableCash: Number(player.startBalance || 100000), usedMargin: 0 })

  const assets = market.assets?.length ? market.assets : mockMarket.assets
  const selected = useMemo(() => assets.find((asset) => asset.symbol === selectedSymbol) || assets[0] || mockMarket.assets[0], [assets, selectedSymbol])
  const chartAsset = useMemo(() => ({ ...selected, candles }), [selected, candles])
  const startJob = quickStartOptions.jobs.find((job) => job.id === player.jobId)

  function applySnapshot(snapshot) {
    const next = normalizeSnapshot(snapshot, Number(player.startBalance || 100000))
    setMarket(next)
    if (next.account) setAccount(next.account)
    setPositions(next.positions || [])
    setOrders(next.orders || [])
    if (!next.assets.some((asset) => asset.symbol === selectedSymbol) && next.assets[0]) {
      setSelectedSymbol(next.assets[0].symbol)
    }
    return next
  }

  async function refreshMarket() {
    const snapshot = await getMarketSnapshot()
    return applySnapshot(snapshot)
  }

  async function refreshHistory(symbol = selectedSymbol, frame = timeframe) {
    const result = await getMarketHistory(symbol, frame)
    setCandles(result?.candles || [])
  }

  useEffect(() => {
    let active = true
    getMarketSnapshot()
      .then((snapshot) => { if (active) applySnapshot(snapshot) })
      .catch((error) => { if (active) setNotice(error.message || '市場資料載入失敗') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getMarketHistory(selectedSymbol, timeframe)
      .then((result) => { if (active) setCandles(result?.candles || []) })
      .catch((error) => { if (active) setNotice(error.message || 'K 線載入失敗') })
    return () => { active = false }
  }, [selectedSymbol, timeframe, refreshKey])

  useEffect(() => {
    let active = true
    setAssetInfoLoading(true)
    Promise.allSettled([
      getAssetDetails(selectedSymbol),
      getAssetNews(selectedSymbol),
      getAssetPtt(selectedSymbol, pttNonce),
      getMarketDepth(selectedSymbol),
    ]).then(([detailsResult, newsResult, pttResult, depthResult]) => {
      if (!active) return
      const details = detailsResult.status === 'fulfilled' ? detailsResult.value : null
      const news = newsResult.status === 'fulfilled' ? newsResult.value : null
      const ptt = pttResult.status === 'fulfilled' ? pttResult.value : null
      const depth = depthResult.status === 'fulfilled' ? depthResult.value : null
      if (!details) {
        setNotice(detailsResult.reason?.message || '標的資訊載入失敗')
        return
      }
      setAssetInfo({
        ...details,
        news: news?.news || details?.news || [],
        ptt: ptt?.rows || details?.ptt || [],
        depth: depth?.depth || details?.depth || { bids: [], asks: [], spreadPct: 0, imbalance: 0 },
      })
    }).finally(() => { if (active) setAssetInfoLoading(false) })
    return () => { active = false }
  }, [selectedSymbol, pttNonce, refreshKey])

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
      setNotice(`${position.symbol} 已平倉 ${percent}%`)
      await refreshMarket()
    } catch (error) { setNotice(error.message || '平倉失敗') } finally { setBusy(false) }
  }

  async function handleCancel(order) {
    setBusy(true)
    try {
      const result = await cancelOrder(order.id)
      if (!result?.ok) throw new Error(result?.message || '取消失敗')
      if (result.orders) setOrders(result.orders); else setOrders((current) => current.filter((item) => item.id !== order.id))
      if (result.account) setAccount(result.account)
      setNotice(`${order.symbol} 掛單已取消`)
    } catch (error) { setNotice(error.message || '取消失敗') } finally { setBusy(false) }
  }

  async function handleAdvance(days) {
    setBusy(true); setNotice('')
    try {
      const result = await advanceTime(days)
      if (!result?.ok) throw new Error(result?.message || '市場推進失敗')
      if (result.snapshot) applySnapshot(result.snapshot); else await refreshMarket()
      setRefreshKey((value) => value + 1)
      setNotice(result.message || `市場已推進 ${days} 日`)
    } catch (error) {
      setNotice(error.message || '市場推進失敗')
    } finally {
      setBusy(false)
    }
  }

  const displayEquity = Number(account.equity ?? account.cash ?? 0)
  const age = Number(market.age ?? player.startAge ?? 25)
  const macro = market.macro || mockMarket.macro

  return <main className="terminal-shell">
    <header className="terminal-topbar">
      <div className="brand-inline"><span>◈</span><strong>資本人生</strong></div>
      <div className="top-stats">
        <span>Day {market.day ?? 1}</span>
        <span>{age.toFixed(age % 1 === 0 ? 0 : 1)} 歲</span>
        <span>{startJob?.name || '玩家'}</span>
        <span>現金 <strong>{formatMoney(account.cash)}</strong></span>
        <span>權益 <strong>{formatMoney(displayEquity)}</strong></span>
      </div>
      <div className="advance-controls" aria-label="時間推進">
        <button type="button" className="ghost-button" disabled={busy} onClick={() => handleAdvance(1)}>+1 日</button>
        <button type="button" className="ghost-button" disabled={busy} onClick={() => handleAdvance(7)}>+7 日</button>
        <button type="button" className="ghost-button" disabled={busy} onClick={() => handleAdvance(30)}>+30 日</button>
        <button type="button" className="ghost-button" disabled={busy} onClick={() => handleAdvance(182)}>+半年</button>
        <button type="button" className="ghost-button" disabled={busy} onClick={() => handleAdvance(365)}>+1 年</button>
      </div>
      <button type="button" className="ghost-button" onClick={onExit}>主選單</button>
    </header>

    <section className="macro-strip">
      <span><small>VIX</small><strong>{Number(macro.vix || 0).toFixed(1)}</strong></span>
      <span><small>CPI</small><strong>{Number(macro.cpi || 0).toFixed(2)}%</strong></span>
      <span><small>利率</small><strong>{Number(macro.rate || 0).toFixed(2)}%</strong></span>
      <span><small>DXY</small><strong>{Number(macro.dxy || 0).toFixed(1)}</strong></span>
      <span><small>可用資金</small><strong>{formatMoney(account.availableCash)}</strong></span>
      {account.usedMargin > 0 && <span><small>已用保證金</small><strong>{formatMoney(account.usedMargin)}</strong></span>}
    </section>

    <section className="terminal-grid terminal-grid-full">
      <Watchlist assets={assets} selectedSymbol={selected.symbol} onSelect={setSelectedSymbol} search={search} onSearchChange={setSearch} category={category} onCategoryChange={setCategory} />
      <section className="workspace-column">
        <section className="chart-panel panel">
          <div className="asset-header">
            <div>
              <div className="asset-meta-row"><span className="asset-symbol">{selected.displayTicker || selected.symbol}</span><span className="asset-chip">{selected.category}</span><span className="asset-chip muted">{selected.sector}</span></div>
              <h2>{selected.name}</h2>
            </div>
            <div className="asset-quote"><strong>{formatMoney(selected.price)}</strong><span className={Number(selected.change || 0) >= 0 ? 'up' : 'down'}>{Number(selected.change || 0) >= 0 ? '+' : ''}{Number(selected.change || 0).toFixed(2)}%</span></div>
          </div>
          {candles.length > 0
            ? <MarketChart asset={chartAsset} timeframe={timeframe} onTimeframeChange={setTimeframe} indicatorState={indicatorState} onToggleIndicator={toggleIndicator} indicatorConfig={indicatorConfig} onIndicatorConfigChange={setIndicatorConfig} />
            : <div className="empty-state">載入 K 線…</div>}
        </section>
        <AssetInfoPanel info={assetInfo} loading={assetInfoLoading} onRefreshPtt={() => setPttNonce((value) => value + 1)} />
        <PortfolioPanel positions={positions} orders={orders} assets={assets} onClose={handleClose} onCancel={handleCancel} />
      </section>
      <OrderPanel asset={selected} account={account} positions={positions} onSubmit={submitOrder} busy={busy} notice={notice} />
    </section>
  </main>
}
