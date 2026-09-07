import { useMemo, useState } from 'react'
import { latestValue, macd, rsi, sliceByTimeframe, sma } from '../utils/indicators.js'
import IndicatorSettings from './IndicatorSettings.jsx'

const TIMEFRAMES = ['1W', '1M', '3M', '6M', '1Y', 'ALL']

function linePath(values, xFor, yFor) {
  let path = ''
  let drawing = false
  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) { drawing = false; return }
    path += `${drawing ? 'L' : 'M'}${xFor(index).toFixed(2)} ${yFor(value).toFixed(2)} `
    drawing = true
  })
  return path.trim()
}

function PriceChart({ candles, indicatorState, config }) {
  const width = 920
  const priceHeight = 330
  const volumeHeight = indicatorState.volume ? 82 : 0
  const totalHeight = priceHeight + volumeHeight
  const [hoverIndex, setHoverIndex] = useState(null)

  const computed = useMemo(() => {
    const closes = candles.map((c) => c.close)
    const lows = candles.map((c) => c.low)
    const highs = candles.map((c) => c.high)
    const low = Math.min(...lows)
    const high = Math.max(...highs)
    const padding = Math.max((high - low) * 0.08, Math.abs(high) * 0.005, 0.01)
    return {
      ma1: sma(closes, config.ma1), ma2: sma(closes, config.ma2), ma3: sma(closes, config.ma3),
      minPrice: low - padding, maxPrice: high + padding,
      maxVolume: Math.max(...candles.map((c) => c.volume), 1),
    }
  }, [candles, config])

  const step = width / Math.max(candles.length, 1)
  const bodyWidth = Math.max(2, Math.min(10, step * 0.62))
  const xFor = (index) => step * index + step / 2
  const yFor = (price) => 12 + ((computed.maxPrice - price) / Math.max(computed.maxPrice - computed.minPrice, 0.0001)) * (priceHeight - 28)
  const volumeY = (volume) => priceHeight + volumeHeight - (volume / computed.maxVolume) * Math.max(volumeHeight - 8, 0)

  function handleMouseMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1)))
    setHoverIndex(Math.min(candles.length - 1, Math.floor(ratio * candles.length)))
  }

  const hovered = hoverIndex == null ? candles[candles.length - 1] : candles[hoverIndex]
  const hoverX = hoverIndex == null ? null : xFor(hoverIndex)
  const maLines = [
    ['ma1', computed.ma1, 'ma20-line'], ['ma2', computed.ma2, 'ma50-line'], ['ma3', computed.ma3, 'ma200-line'],
  ]

  return (
    <div className="chart-wrap">
      <div className="ohlc-strip">
        <span>{hovered?.date}</span><span>O <strong>{hovered?.open.toFixed(2)}</strong></span>
        <span>H <strong>{hovered?.high.toFixed(2)}</strong></span><span>L <strong>{hovered?.low.toFixed(2)}</strong></span>
        <span>C <strong>{hovered?.close.toFixed(2)}</strong></span><span>Vol <strong>{Math.round(hovered?.volume || 0).toLocaleString()}</strong></span>
      </div>
      <svg className="kline-chart" viewBox={`0 0 ${width} ${totalHeight}`} role="img" aria-label="K線圖" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
        {[0.2, 0.4, 0.6, 0.8].map((ratio) => <line key={ratio} x1="0" y1={priceHeight * ratio} x2={width} y2={priceHeight * ratio} className="chart-grid" />)}
        {indicatorState.volume && candles.map((candle, index) => {
          const y = volumeY(candle.volume)
          return <rect key={`vol-${candle.date}`} x={xFor(index) - bodyWidth / 2} y={y} width={bodyWidth} height={Math.max(1, totalHeight - y)} className={candle.close >= candle.open ? 'volume-up' : 'volume-down'} />
        })}
        {candles.map((candle, index) => {
          const up = candle.close >= candle.open
          const x = xFor(index)
          const openY = yFor(candle.open), closeY = yFor(candle.close), highY = yFor(candle.high), lowY = yFor(candle.low)
          return <g key={candle.date} className={up ? 'candle-up' : 'candle-down'}><line x1={x} y1={highY} x2={x} y2={lowY} className="candle-wick" /><rect x={x - bodyWidth / 2} y={Math.min(openY, closeY)} width={bodyWidth} height={Math.max(1.5, Math.abs(closeY - openY))} rx="1" className="candle-body" /></g>
        })}
        {maLines.map(([key, values, className]) => indicatorState[key] ? <path key={key} d={linePath(values, xFor, yFor)} className={`ma-line ${className}`} /> : null)}
        {hoverX != null && <line x1={hoverX} y1="0" x2={hoverX} y2={totalHeight} className="crosshair" />}
      </svg>
    </div>
  )
}

function RsiChart({ candles, period }) {
  const width = 920, height = 130
  const values = useMemo(() => rsi(candles.map((c) => c.close), period), [candles, period])
  const step = width / Math.max(values.length, 1), xFor = (i) => step * i + step / 2, yFor = (v) => 10 + ((100 - v) / 100) * (height - 20)
  const current = latestValue(values)
  return <div className="indicator-card"><div className="indicator-title"><span>RSI {period}</span><strong>{current == null ? '—' : current.toFixed(1)}</strong></div><svg className="indicator-chart" viewBox={`0 0 ${width} ${height}`}><line x1="0" y1={yFor(70)} x2={width} y2={yFor(70)} className="threshold-line" /><line x1="0" y1={yFor(30)} x2={width} y2={yFor(30)} className="threshold-line" /><path d={linePath(values, xFor, yFor)} className="rsi-line" /></svg></div>
}

function MacdChart({ candles, fast, slow, signalPeriod }) {
  const width = 920, height = 150
  const result = useMemo(() => macd(candles.map((c) => c.close), fast, slow, signalPeriod), [candles, fast, slow, signalPeriod])
  const all = [...result.line, ...result.signal, ...result.histogram].filter((v) => v != null && Number.isFinite(v))
  const maxAbs = Math.max(...all.map((v) => Math.abs(v)), 0.001), step = width / Math.max(candles.length, 1)
  const xFor = (i) => step * i + step / 2, yFor = (v) => height / 2 - (v / maxAbs) * (height * 0.4), zeroY = yFor(0)
  return <div className="indicator-card"><div className="indicator-title"><span>MACD {fast} / {slow} / {signalPeriod}</span><strong>{latestValue(result.line)?.toFixed(2) ?? '—'} / {latestValue(result.signal)?.toFixed(2) ?? '—'}</strong></div><svg className="indicator-chart" viewBox={`0 0 ${width} ${height}`}><line x1="0" y1={zeroY} x2={width} y2={zeroY} className="chart-grid" />{result.histogram.map((value, index) => value == null ? null : <rect key={index} x={xFor(index) - Math.max(1, step * 0.28)} y={Math.min(yFor(value), zeroY)} width={Math.max(2, step * 0.56)} height={Math.max(1, Math.abs(zeroY - yFor(value)))} className={value >= 0 ? 'macd-up' : 'macd-down'} />)}<path d={linePath(result.line, xFor, yFor)} className="macd-line" /><path d={linePath(result.signal, xFor, yFor)} className="signal-line" /></svg></div>
}

export default function MarketChart({ asset, timeframe, onTimeframeChange, indicatorState, onToggleIndicator, indicatorConfig, onIndicatorConfigChange }) {
  const candles = useMemo(() => sliceByTimeframe(asset.candles, timeframe), [asset, timeframe])
  const toggles = [
    ['ma1', `MA${indicatorConfig.ma1}`], ['ma2', `MA${indicatorConfig.ma2}`], ['ma3', `MA${indicatorConfig.ma3}`],
    ['volume', 'VOL'], ['rsi', 'RSI'], ['macd', 'MACD'],
  ]
  return <>
    <div className="chart-command-row"><div className="timeframe-tabs">{TIMEFRAMES.map((item) => <button type="button" key={item} className={timeframe === item ? 'active' : ''} onClick={() => onTimeframeChange(item)}>{item}</button>)}</div><div className="indicator-toggles">{toggles.map(([key, label]) => <button type="button" key={key} className={indicatorState[key] ? 'active' : ''} onClick={() => onToggleIndicator(key)}>{label}</button>)}</div></div>
    <IndicatorSettings config={indicatorConfig} onChange={onIndicatorConfigChange} />
    <PriceChart candles={candles} indicatorState={indicatorState} config={indicatorConfig} />
    {indicatorState.rsi && <RsiChart candles={candles} period={indicatorConfig.rsiPeriod} />}
    {indicatorState.macd && <MacdChart candles={candles} fast={indicatorConfig.macdFast} slow={indicatorConfig.macdSlow} signalPeriod={indicatorConfig.macdSignal} />}
  </>
}
